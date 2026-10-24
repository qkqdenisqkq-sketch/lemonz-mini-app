import { useCallback, useEffect, useState } from "react";
import FigureArt from "../components/FigureArt";
import LemonzIcon from "../components/LemonzIcon";
import { api, remaining, SAMPLE_SEASON, uploadMedia } from "../lib/communityApi";

const EMPTY = { name: "", universe: "", image_url: "", description: "" };
const SEASON_MS = 14 * 24 * 60 * 60 * 1000;

function seasonCountdown(endsAt, now) {
    const left = Math.max(0, new Date(endsAt || 0).getTime() - now);
    return `${String(Math.floor(left / 86400000)).padStart(2, "0")} дн. ${String(Math.floor(left / 3600000) % 24).padStart(2, "0")} ч.`;
}

function VotePortrait({ item }) {
    if (!item.previewCrop) return <FigureArt src={item.image_url} name={item.name} className="vote-portrait" />;
    const [x, y] = item.previewCrop;
    const unit = 138;
    return <div className="vote-portrait vote-reference-portrait">
        <img src="/voting-design-reference.png" alt={item.name} loading="lazy" style={{ width: `${941 / unit * 100}%`, left: `${-x / unit * 100}%`, top: `${-y / unit * 100}%` }} />
    </div>;
}

function VoteGroup({ category, title, subtitle, candidates, myVotes, busy, onVote, onComments, demo }) {
    const items = candidates.filter((item) => item.category === category)
        .sort((a, b) => (b.votes || 0) - (a.votes || 0) || new Date(a.created_at || 0) - new Date(b.created_at || 0));
    const maxVotes = Math.max(1, ...items.map((item) => Number(item.votes) || 0));
    const chosenId = myVotes?.[category];
    return <section className="vote-section" aria-label={title}>
        <div className="vote-section-header">
            <div className="vote-section-heading"><h2>{title}</h2><p>{subtitle}</p></div>
            <span className="vote-section-badge">{chosenId ? 1 : 0}/1 голос</span>
        </div>
        <div className="vote-section-list">
            {items.length === 0 && <div className="vote-section-empty">Пока нет предложений. Предложи персонажа первым!</div>}
            {items.map((item) => {
                const isSelected = chosenId === item.id;
                const votes = Math.max(0, Number(item.votes) || 0);
                return <article className={`vote-entry ${isSelected ? "is-selected" : ""}`} key={item.id}>
                    <VotePortrait item={item} />
                    <div className="vote-entry-main">
                        <div className="vote-entry-name"><h3>{item.name}</h3>{category === "community" && item.author_username && <span>· @{item.author_username}</span>}</div>
                        <div className="vote-entry-progress" role="progressbar" aria-label={`Рейтинг ${item.name}`} aria-valuemin="0" aria-valuemax={maxVotes} aria-valuenow={votes}><span style={{ width: `${votes ? Math.min(100, (votes / maxVotes) * 70) : 0}%` }} /></div>
                        <button type="button" className="vote-entry-comments" onClick={() => onComments(item)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.5 11.5a8.5 8.5 0 0 1-8.8 8.5 8.8 8.8 0 0 1-3.7-.8L3.5 21l1.2-4.6A8.5 8.5 0 1 1 20.5 11.5Z" /></svg><span>Комментарии ({item.comments || 0})</span></button>
                    </div>
                    <div className="vote-entry-count"><strong>{votes}</strong><span>{votes % 10 === 1 && votes % 100 !== 11 ? "голос" : [2, 3, 4].includes(votes % 10) && ![12, 13, 14].includes(votes % 100) ? "голоса" : "голосов"}</span></div>
                    <button type="button" className={`vote-entry-select ${isSelected ? "is-selected" : ""}`} disabled={busy} aria-label={`${isSelected ? "Отменить голос за" : "Проголосовать за"} ${item.name}`} aria-pressed={isSelected} title={demo ? "Демо. Настрой сервер для голосования" : undefined} onClick={() => onVote(category, isSelected ? null : item.id)}>{isSelected && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7" /></svg>}</button>
                </article>;
            })}
        </div>
    </section>;
}

export default function Voting({ user, isAdmin, adminView = false, showMessage, haptic }) {
    const [data, setData] = useState(SAMPLE_SEASON);
    const [demo, setDemo] = useState(true);
    const [showArchive, setShowArchive] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    const [proposalOpen, setProposalOpen] = useState(false);
    const [proposal, setProposal] = useState(EMPTY);
    const [commentsFor, setCommentsFor] = useState(null);
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState("");
    const [commentMedia, setCommentMedia] = useState("");
    const [busy, setBusy] = useState(false);

    const refresh = useCallback(async () => {
        try {
            const result = await api("/api/community");
            if (result.configured) { setData(result.season || { candidates: [], myVotes: {}, winners: [] }); setDemo(false); }
            else setDemo(true);
        } catch { setDemo(true); }
    }, []);

    useEffect(() => {
        const initial = setTimeout(refresh, 0);
        const poll = setInterval(refresh, 12000);
        const clock = setInterval(() => setNow(Date.now()), 1000);
        return () => { clearTimeout(initial); clearInterval(poll); clearInterval(clock); };
    }, [refresh]);

    const submit = async (operation, payload) => {
        if (demo) { showMessage("Сейчас показан дизайн-пример. Для участия нужно настроить сервер и базу данных."); return false; }
        if (!user?.id) { showMessage("Открой приложение через Telegram, чтобы участвовать."); return false; }
        setBusy(true);
        try {
            await api("/api/community", { method: "POST", body: JSON.stringify({ operation, ...payload }) });
            haptic("success"); await refresh(); return true;
        } catch (error) { showMessage(error.message); return false; }
        finally { setBusy(false); }
    };

    const openComments = async (item) => {
        setCommentsFor(item); setComments([]); setCommentText(""); setCommentMedia("");
        if (!demo) {
            try { setComments((await api(`/api/community?comments=${encodeURIComponent(item.id)}`)).comments || []); }
            catch (error) { showMessage(error.message); }
        }
    };

    const handleUpload = async (file, update) => {
        if (!file || demo) return;
        setBusy(true);
        try { update(await uploadMedia(file)); }
        catch (error) { showMessage(error.message); }
        finally { setBusy(false); }
    };

    const submitProposal = async (event) => {
        event.preventDefault();
        if (await submit("suggest", proposal)) { setProposalOpen(false); setProposal(EMPTY); }
    };

    const submitComment = async (event) => {
        event.preventDefault();
        if (!commentText.trim() && !commentMedia) return;
        if (await submit("comment", { candidateId: commentsFor.id, text: commentText, media_url: commentMedia })) {
            setCommentText(""); setCommentMedia("");
            setComments((await api(`/api/community?comments=${encodeURIComponent(commentsFor.id)}`)).comments || []);
        }
    };

    if (adminView && isAdmin) {
        const suggestions = (data.candidates || []).filter((item) => item.category === "community")
            .sort((a, b) => b.votes - a.votes);
        const choices = (data.candidates || []).filter((item) => item.category === "lemonz");
        return <div className="engagement-page admin-engagement-screen">
            <div className="admin-engagement-header"><span>УПРАВЛЕНИЕ СЕЗОНОМ</span><h2>Голосование</h2><p>Сезон №{data.number || "-"} · До завершения {remaining(data.ends_at || new Date(), now)}</p></div>
            {demo && <div className="demo-notice">Демонстрационный режим. Настрой сервер и базу данных, чтобы сохранять изменения голосования.</div>}
            <VoteAdmin submit={submit} candidates={choices} busy={busy} demo={demo} showMessage={showMessage} />
            <section className="admin-content-panel">
                <div className="admin-content-title"><h3>Предложения сообщества</h3><span>{suggestions.length}</span></div>
                {suggestions.length === 0 ? <p className="admin-content-empty">В текущем сезоне ещё нет предложений.</p> : suggestions.map((item) => <article className="admin-compact-row" key={item.id}>
                    <FigureArt src={item.image_url} name={item.name} />
                    <div className="admin-compact-info"><strong>{item.name}</strong><small>{item.universe} · {item.votes || 0} голосов</small><small>Автор: @{item.author_username || "Telegram"}</small><div className="admin-compact-actions"><button type="button" onClick={() => openComments(item)}>Комментарии ({item.comments || 0})</button><button type="button" className="danger" disabled={demo || busy} onClick={() => { if (window.confirm(`Удалить предложение «${item.name}»?`)) submit("admin_delete_candidate", { candidateId: item.id }); }}>Удалить</button></div></div>
                </article>)}
            </section>
            <section className="admin-content-panel"><div className="admin-content-title"><h3>Архив победителей</h3><span>{(data.winners || []).length}</span></div>{(data.winners || []).length === 0 ? <p className="admin-content-empty">Пока нет завершённых сезонов.</p> : (data.winners || []).map((winner) => <div className="admin-archive-row" key={winner.id}><span>Сезон №{winner.season_number} · {winner.category === "lemonz" ? "LEMONZ" : "Сообщество"}</span><strong>{winner.name}</strong></div>)}</section>
            {commentsFor && <div className="engagement-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setCommentsFor(null); }}><div className="engagement-modal comments-modal"><button type="button" className="modal-exit" onClick={() => setCommentsFor(null)}>✕</button><h2>Комментарии · {commentsFor.name}</h2><div className="comment-feed">{comments.length === 0 && <p>Комментариев пока нет.</p>}{comments.map((item) => <div className="comment-item" key={item.id}><strong>@{item.username || "user"}</strong><span>{new Date(item.created_at).toLocaleDateString("ru-RU")}</span>{item.text && <p>{item.text}</p>}{item.media_url && <img src={item.media_url} alt="Вложение" />}<button type="button" disabled={demo || busy} onClick={async () => { if (window.confirm("Удалить комментарий?") && await submit("admin_delete_comment", { commentId: item.id })) setComments((await api(`/api/community?comments=${encodeURIComponent(commentsFor.id)}`)).comments || []); }}>Удалить</button></div>)}</div></div></div>}
        </div>;
    }

    return <div className="engagement-page vote-page vote-reference-page">
        <div className="vote-showcase" role="img" aria-label="Фигурки LEMONZ с глазами-пуговицами на тёмном фоне" />
        <div className="vote-page-content">
            <div className="vote-season-topline"><h1>ГОЛОСОВАНИЕ</h1><button type="button" className="vote-past-link" onClick={() => setShowArchive((previous) => !previous)}>Прошлые сезоны <LemonzIcon name="chevron-right" size={20} /></button></div>
            <div className="vote-season-subtitle">Сезон № {data.number || "-"} · До конца {seasonCountdown(data.ends_at, now)}</div>
            <div className="vote-season-progress" role="progressbar" aria-label="Прогресс сезона" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(Math.max(0, Math.min(100, (1 - Math.max(0, new Date(data.ends_at || 0).getTime() - now) / SEASON_MS) * 100)))}><span style={{ width: `${Math.max(0, Math.min(100, (1 - Math.max(0, new Date(data.ends_at || 0).getTime() - now) / SEASON_MS) * 100))}%` }} /></div>
            <VoteGroup category="lemonz" title="ВЫБОР LEMONZ" subtitle="Выбери до 1 персонажа" candidates={data.candidates || []} myVotes={data.myVotes} busy={busy} demo={demo} onComments={openComments} onVote={(category, candidateId) => submit("vote", { category, candidateId })} />
            <VoteGroup category="community" title="ВЫБОР СООБЩЕСТВА" subtitle="Предложи героя и выиграй скидку 50%" candidates={data.candidates || []} myVotes={data.myVotes} busy={busy} demo={demo} onComments={openComments} onVote={(category, candidateId) => submit("vote", { category, candidateId })} />
            <button type="button" className="vote-propose-button" onClick={() => setProposalOpen(true)}><span aria-hidden="true">+</span>Предложить дизайн</button>
            {demo && <p className="vote-demo-footnote">Это демонстрационный пример. Голоса и предложения будут сохраняться после подключения сервера.</p>}
            <details className="vote-rules"><summary>Как работает голосование?</summary><p>Каждые 14 дней выбираем двух победителей: одного от LEMONZ и одного от сообщества. У каждого Telegram-аккаунта по одному голосу на категорию, голос можно перенести или отменить. Автор победившей идеи сообщества получает персональную одноразовую скидку 50%.</p><p>В новом сезоне предложения и голоса обнуляются, прошлые победители больше не участвуют.</p></details>
            {showArchive && <section className="winner-history vote-archive" id="vote-archive"><h2>Прошлые сезоны</h2>{(data.winners || []).length === 0 ? <p>Архив пока пуст. Здесь появятся победители завершённых сезонов.</p> : data.winners.map((winner) => <div key={winner.id}><span>Сезон {winner.season_number} · {winner.category === "lemonz" ? "LEMONZ" : "Сообщество"}</span><strong>{winner.name}</strong></div>)}</section>}
        {(data.discounts || []).length > 0 && <section className="winner-history"><h2>Мои награды</h2>{data.discounts.map((reward) => <div key={reward.id}><strong>−50% на {reward.name}</strong><span>{reward.discount_redeemed ? "Скидка использована" : `Личный код: ${reward.discount_code} · Одно использование`}</span></div>)}</section>}
        {isAdmin && !demo && <VoteAdmin submit={submit} candidates={(data.candidates || []).filter((item) => item.category === "lemonz")} busy={busy} demo={demo} showMessage={showMessage} />}
        </div>

        {proposalOpen && <div className="engagement-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setProposalOpen(false); }}><form className="engagement-modal" onSubmit={submitProposal}><button type="button" className="modal-exit" onClick={() => setProposalOpen(false)}>✕</button><h2>Предложить дизайн</h2><p>Первый предложивший персонажа становится автором идеи на этот сезон.</p><label>Персонаж<input required maxLength={80} placeholder="Например, Jinx" value={proposal.name} onChange={(event) => setProposal({ ...proposal, name: event.target.value })} /></label><label>Вселенная<input required maxLength={80} placeholder="Arcane / League of Legends" value={proposal.universe} onChange={(event) => setProposal({ ...proposal, universe: event.target.value })} /></label><label>Фото персонажа<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => handleUpload(event.target.files[0], (url) => setProposal((previous) => ({ ...previous, image_url: url })))} /></label>{proposal.image_url && <small>✓ Файл загружен</small>}<label>Комментарий<textarea rows="3" maxLength={600} placeholder="Каким ты видишь дизайн?" value={proposal.description} onChange={(event) => setProposal({ ...proposal, description: event.target.value })} /></label><div className="identity-note">Автор: @{user?.username || user?.first_name || "Telegram"}</div><button disabled={busy || demo} className="engagement-primary">Отправить предложение</button></form></div>}
        {commentsFor && <div className="engagement-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setCommentsFor(null); }}><div className="engagement-modal comments-modal"><button type="button" className="modal-exit" onClick={() => setCommentsFor(null)}>✕</button><h2>Комментарии · {commentsFor.name}</h2><div className="comment-feed">{comments.length === 0 && <p>Пока тихо. Напиши первым!</p>}{comments.map((item) => <div className="comment-item" key={item.id}><strong>@{item.username || "user"}</strong><span>{new Date(item.created_at).toLocaleDateString("ru-RU")}</span>{item.text && <p>{item.text}</p>}{item.media_url && <img src={item.media_url} alt="Вложение" />}{isAdmin && <button type="button" onClick={async () => { await submit("admin_delete_comment", { commentId: item.id }); setComments((await api(`/api/community?comments=${commentsFor.id}`)).comments || []); }}>Удалить</button>}</div>)}</div><form onSubmit={submitComment}><textarea maxLength={1500} rows="2" value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Твой комментарий..." /><label className="upload-label">📎 Добавить фото или GIF<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => handleUpload(event.target.files[0], setCommentMedia)} /></label>{commentMedia && <small>✓ Вложение прикреплено</small>}<button disabled={busy || demo} className="engagement-primary">Отправить</button></form></div></div>}
    </div>;
}

function VoteAdmin({ submit, candidates = [], busy = false, demo = false, showMessage }) {
    const [draft, setDraft] = useState(null);
    const [uploading, setUploading] = useState(null);
    const [userId, setUserId] = useState("");
    const [discountCode, setDiscountCode] = useState("");
    const choices = draft ?? Array.from({ length: 3 }, (_, index) => ({
        name: candidates[index]?.name || "",
        universe: candidates[index]?.universe || "",
        image_url: candidates[index]?.image_url || "",
    }));
    const updateChoice = (index, key, value) => setDraft((current) => (current ?? choices).map((choice, position) => position === index ? { ...choice, [key]: value } : choice));
    const uploadChoicePhoto = async (index, file) => {
        if (!file || demo) return;
        setUploading(index);
        try { updateChoice(index, "image_url", await uploadMedia(file)); }
        catch (error) { showMessage(error.message); }
        finally { setUploading(null); }
    };
    const save = async () => {
        const parsed = choices.map((item) => ({ name: item.name.trim(), universe: item.universe.trim(), image_url: item.image_url.trim() }));
        if (parsed.length !== 3 || parsed.some((item) => !item.name || !item.universe)) { showMessage("Заполни имена и вселенные всех трёх персонажей"); return; }
        if (await submit("admin_choices", { choices: parsed })) setDraft(null);
    };
    return <section className="engagement-admin admin-choice-editor">
        <h2>Выбор LEMONZ · 3 персонажа</h2>
        <p>Редактируй трёх героев сезона. Укажи имена, вселенные и фотографии, затем сохрани весь список.</p>
        <div className="admin-choice-list">{choices.map((choice, index) => <div className="admin-choice-card" key={index}>
            <div className="admin-choice-preview"><span>ПЕРСОНАЖ {index + 1}</span><FigureArt src={choice.image_url} name={choice.name || `Герой ${index + 1}`} /></div>
            <div className="admin-choice-fields"><label>Имя<input maxLength={80} value={choice.name} onChange={(event) => updateChoice(index, "name", event.target.value)} placeholder="Например, Clove" /></label><label>Вселенная<input maxLength={80} value={choice.universe} onChange={(event) => updateChoice(index, "universe", event.target.value)} placeholder="Valorant" /></label><label>Фото (URL / путь)<input value={choice.image_url} onChange={(event) => updateChoice(index, "image_url", event.target.value)} placeholder="/Clove.png" /></label><label className="admin-upload-label">{uploading === index ? "Загрузка..." : "Загрузить фото"}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={demo || busy || uploading !== null} onChange={(event) => uploadChoicePhoto(index, event.target.files?.[0])} /></label></div>
        </div>)}</div>
        <button type="button" className="engagement-primary" disabled={demo || busy || uploading !== null} onClick={save}>Сохранить персонажей</button>
        <h3>Сезоны</h3>
        <p>После завершения сезона голоса и предложения сбросятся, а победители сохранятся в архиве.</p>
        <button type="button" disabled={busy || demo} onClick={() => { if (window.confirm("Завершить сезон и начать следующий? Все текущие голоса и предложения будут обнулены.")) submit("admin_next_season", {}); }}>Завершить сезон и начать новый</button>
        <h3>Блокировка накрутки</h3>
        <input type="number" placeholder="Telegram ID нарушителя или владельца скидки" value={userId} onChange={(event) => setUserId(event.target.value)} />
        <button type="button" disabled={busy || demo || !userId.trim()} onClick={() => submit("admin_block_user", { userId })}>Заблокировать и удалить голоса</button>
        <button type="button" disabled={busy || demo || !userId.trim()} onClick={() => submit("admin_unblock_user", { userId })}>Снять блокировку</button>
        <h3>Погасить скидку 50%</h3>
        <input placeholder="Одноразовый код" value={discountCode} onChange={(event) => setDiscountCode(event.target.value)} />
        <button type="button" disabled={busy || demo || !userId.trim() || !discountCode.trim()} onClick={() => { if (window.confirm("Отметить эту скидку использованной?")) submit("admin_redeem_discount", { userId, code: discountCode }); }}>Отметить использованной</button>
    </section>;
}
