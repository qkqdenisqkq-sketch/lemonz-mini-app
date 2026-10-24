import { useCallback, useEffect, useState } from "react";
import FigureArt from "../components/FigureArt";
import { api, remaining, SAMPLE_SEASON, uploadMedia } from "../lib/communityApi";

const CATEGORIES = [{ id: "lemonz", label: "Выбор LEMONZ" }, { id: "community", label: "Выбор сообщества" }];
const EMPTY = { name: "", universe: "", image_url: "", description: "" };

export default function Voting({ user, isAdmin, adminView = false, showMessage, haptic }) {
    const [data, setData] = useState(SAMPLE_SEASON);
    const [demo, setDemo] = useState(true);
    const [tab, setTab] = useState("lemonz");
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
        if (await submit("suggest", proposal)) { setProposalOpen(false); setProposal(EMPTY); setTab("community"); }
    };

    const submitComment = async (event) => {
        event.preventDefault();
        if (!commentText.trim() && !commentMedia) return;
        if (await submit("comment", { candidateId: commentsFor.id, text: commentText, media_url: commentMedia })) {
            setCommentText(""); setCommentMedia("");
            setComments((await api(`/api/community?comments=${encodeURIComponent(commentsFor.id)}`)).comments || []);
        }
    };

    const selected = (data.candidates || []).filter((item) => item.category === tab)
        .sort((a, b) => b.votes - a.votes || new Date(a.created_at || 0) - new Date(b.created_at || 0));

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

    return <div className="engagement-page vote-page">
        <div className="engagement-heading"><span className="engagement-kicker">LEMONZ COMMUNITY</span><h1>ГОЛОСОВАНИЕ <span>✦</span></h1><p>Ты решаешь, какого персонажа мы создадим следующим.</p></div>
        <div className="season-clock"><div><span>СЕЗОН №{data.number || "-"}</span><strong>{remaining(data.ends_at || new Date(), now)}</strong></div><p>До окончания голосования</p></div>
        {demo && <div className="demo-notice">Демо-режим. Голоса и предложения станут доступны после настройки сервера.</div>}
        <div className="engagement-tabs" role="tablist" aria-label="Категории голосования">{CATEGORIES.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>{item.label}</button>)}</div>
        <div className="category-explain"><strong>{tab === "lemonz" ? "3 персонажа от LEMONZ" : "Идеи нашего сообщества"}</strong><p>Один голос в этой категории. Можно отменить или перенести его.</p></div>
        {selected.length === 0 && <div className="empty-view">Пока нет предложений. Стань первым!</div>}
        <div className="vote-list">{selected.map((item, index) => <article className="vote-card" key={item.id}>
            <span className="ranking">#{index + 1}</span><FigureArt src={item.image_url} name={item.name} />
            <div className="vote-card-info"><h3>{item.name}</h3><span>{item.universe}</span><strong>{item.votes || 0} <small>голосов</small></strong><button type="button" className="comments-link" onClick={() => openComments(item)}>☏ Комментарии ({item.comments || 0})</button></div>
            <button type="button" disabled={busy || demo || !user?.id} className={`vote-action ${data.myVotes?.[tab] === item.id ? "selected" : ""}`} onClick={() => submit("vote", { candidateId: data.myVotes?.[tab] === item.id ? null : item.id, category: tab })}>{data.myVotes?.[tab] === item.id ? "✓" : "+1"}</button>
            {item.author_username && <div className="vote-author">Предложил: @{item.author_username}</div>}
            {isAdmin && !demo && item.category === "community" && <button type="button" className="admin-delete" onClick={() => { if (window.confirm("Удалить предложение?")) submit("admin_delete_candidate", { candidateId: item.id }); }}>Удалить</button>}
        </article>)}</div>
        {tab === "community" && <button type="button" className="engagement-primary wide" onClick={() => setProposalOpen(true)}>＋ Предложить персонажа</button>}
        <section className="voting-info"><h2>Как это работает?</h2><p>Каждые 14 дней выбираем двух победителей. Автор победившей идеи сообщества получает персональную одноразовую скидку 50% на фигурку своего героя.</p><p>В новом сезоне предложения и голоса обнуляются. Победители прошлых сезонов больше не участвуют.</p></section>
        <section className="winner-history"><h2>Архив победителей</h2>{(data.winners || []).length === 0 ? <p>Здесь появятся победители завершённых сезонов.</p> : data.winners.map((winner) => <div key={winner.id}><span>Сезон {winner.season_number} · {winner.category === "lemonz" ? "LEMONZ" : "Сообщество"}</span><strong>{winner.name}</strong></div>)}</section>
        {(data.discounts || []).length > 0 && <section className="winner-history"><h2>Мои награды</h2>{data.discounts.map((reward) => <div key={reward.id}><strong>−50% на {reward.name}</strong><span>{reward.discount_redeemed ? "Скидка использована" : `Личный код: ${reward.discount_code} · Одно использование`}</span></div>)}</section>}
        {isAdmin && !demo && <VoteAdmin submit={submit} candidates={(data.candidates || []).filter((item) => item.category === "lemonz")} busy={busy} demo={demo} showMessage={showMessage} />}

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
