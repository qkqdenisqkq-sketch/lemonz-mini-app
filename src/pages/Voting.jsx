import { useCallback, useEffect, useState } from "react";
import FigureArt from "../components/FigureArt";
import LemonzIcon from "../components/LemonzIcon";
import { api, remaining, SAMPLE_SEASON, uploadMedia } from "../lib/communityApi";
import { useLocalStorage } from "../hooks/useLocalStorage";

const EMPTY = { name: "", universe: "", image_url: "", description: "" };
const SEASON_MS = 14 * 24 * 60 * 60 * 1000;

function seasonCountdown(endsAt, now) {
    const left = Math.max(0, new Date(endsAt || 0).getTime() - now);
    return `${String(Math.floor(left / 86400000)).padStart(2, "0")} дн. ${String(Math.floor(left / 3600000) % 24).padStart(2, "0")} ч.`;
}

function seasonProgress(season, now) {
    const end = new Date(season.ends_at || 0).getTime();
    const start = new Date(season.starts_at || end - SEASON_MS).getTime();
    const period = end - start;
    return Number.isFinite(period) && period > 0 ? Math.max(0, Math.min(100, (now - start) / period * 100)) : 0;
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
    const [previewSeason, setPreviewSeason] = useLocalStorage("lemonz-preview-season-v1", {});
    const [previewBallots, setPreviewBallots] = useLocalStorage("lemonz-preview-ballots-v1", {});
    const [voteFeedback, setVoteFeedback] = useState("");
    const [showArchive, setShowArchive] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    const [proposalOpen, setProposalOpen] = useState(false);
    const [proposal, setProposal] = useState(EMPTY);
    const [commentsFor, setCommentsFor] = useState(null);
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState("");
    const [commentMedia, setCommentMedia] = useState("");
    const [busy, setBusy] = useState(false);
    const [editingCandidate, setEditingCandidate] = useState(null);

    const previewIdentity = user?.id ? String(user.id) : "local-guest";
    const previewVotes = previewBallots[previewIdentity] || {};
    const previewVoteCounts = Object.values(previewBallots).reduce((counts, ballot) => {
        for (const candidateId of Object.values(ballot || {})) {
            if (candidateId != null) counts[candidateId] = (counts[candidateId] || 0) + 1;
        }
        return counts;
    }, {});
    const demoData = {
        ...SAMPLE_SEASON,
        ...previewSeason,
        candidates: previewSeason.candidates || SAMPLE_SEASON.candidates,
    };
    const visibleData = demo ? {
        ...demoData,
        myVotes: previewVotes,
        candidates: demoData.candidates.map((candidate) => ({
            ...candidate,
            votes: candidate.votes + (previewVoteCounts[candidate.id] || 0),
        })),
    } : data;
    const votingPending = new Date(visibleData.starts_at || 0).getTime() > now;
    const votingClosed = new Date(visibleData.ends_at || 0).getTime() <= now;
    const votingBlocked = votingPending || votingClosed;

    const refresh = useCallback(async () => {
        try {
            const result = await api("/api/community");
            if (result.configured) { setData(result.season || { candidates: [], myVotes: {}, winners: [] }); setDemo(false); }
            else { setData(SAMPLE_SEASON); setDemo(true); }
        } catch { /* Keep the last known mode if the server is temporarily unreachable. */ }
    }, []);

    useEffect(() => {
        const initial = setTimeout(refresh, 0);
        const poll = setInterval(refresh, 12000);
        const clock = setInterval(() => setNow(Date.now()), 1000);
        return () => { clearTimeout(initial); clearInterval(poll); clearInterval(clock); };
    }, [refresh]);

    const submit = async (operation, payload) => {
        if (demo) {
            if (operation === "vote") {
                const { category, candidateId } = payload;
                const candidate = demoData.candidates.find((item) => item.id === candidateId && item.category === category);
                if (!(["lemonz", "community"].includes(category) && (candidateId === null || candidate))) {
                    showMessage("Не удалось выбрать персонажа");
                    return false;
                }
                setPreviewBallots((current) => ({
                    ...current,
                    [previewIdentity]: { ...(current[previewIdentity] || {}), [category]: candidateId },
                }));
                setVoteFeedback(candidateId === null ? "Пробный голос отменён" : "Пробный голос принят");
                haptic("success");
                return true;
            }
            if (operation === "admin_set_season_dates") {
                setPreviewSeason((current) => ({ ...current, starts_at: payload.startsAt, ends_at: payload.endsAt }));
                return true;
            }
            if (operation === "admin_update_candidate") {
                const existing = demoData.candidates.find((item) => item.id === payload.candidateId);
                if (!existing) { showMessage("Персонаж не найден"); return false; }
                if (demoData.candidates.some((item) => item.id !== payload.candidateId && item.name.toLowerCase() === payload.name.trim().toLowerCase())) { showMessage("Этот персонаж уже участвует"); return false; }
                setPreviewSeason((current) => ({ ...current, candidates: (current.candidates || SAMPLE_SEASON.candidates).map((item) => item.id === payload.candidateId ? { ...item, name: payload.name, universe: payload.universe, image_url: payload.image_url, description: payload.description, previewCrop: item.name === payload.name && item.image_url === payload.image_url ? item.previewCrop : undefined } : item) }));
                return true;
            }
            if (operation === "admin_add_candidate") {
                if (demoData.candidates.filter((item) => item.category === "lemonz").length >= 3) { showMessage("В категории LEMONZ уже три персонажа"); return false; }
                if (demoData.candidates.some((item) => item.name.toLowerCase() === payload.name.trim().toLowerCase())) { showMessage("Этот персонаж уже участвует"); return false; }
                const nextId = Math.max(6, ...demoData.candidates.map((item) => Number(String(item.id).replace(/^p/, "")) || 0)) + 1;
                setPreviewSeason((current) => ({ ...current, candidates: [...(current.candidates || SAMPLE_SEASON.candidates), { ...payload, id: `p${nextId}`, votes: 0, comments: 0 }] }));
                return true;
            }
            if (operation === "admin_delete_candidate") {
                setPreviewSeason((current) => ({ ...current, candidates: (current.candidates || SAMPLE_SEASON.candidates).filter((item) => item.id !== payload.candidateId) }));
                setPreviewBallots((current) => Object.fromEntries(Object.entries(current).map(([identity, ballot]) => [identity, Object.fromEntries(Object.entries(ballot).filter(([, id]) => id !== payload.candidateId))])));
                return true;
            }
            showMessage("Это пробная версия. Для общих предложений и комментариев настрой сервер и базу данных.");
            return false;
        }
        if (!user?.id) { showMessage("Открой приложение через Telegram, чтобы участвовать."); return false; }
        setBusy(true);
        try {
            await api("/api/community", { method: "POST", body: JSON.stringify({ operation, ...payload }) });
            haptic("success"); await refresh();
            if (operation === "vote") setVoteFeedback(payload.candidateId === null ? "Голос отменён" : "Голос учтён");
            return true;
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

    const removeCandidate = async (item) => {
        const message = `Удалить «${item.name}» из текущего сезона?\n${item.votes || 0} голосов и ${item.comments || 0} комментариев будут удалены без восстановления. Пользователи смогут проголосовать снова.`;
        if (!window.confirm(message)) return;
        if (await submit("admin_delete_candidate", { candidateId: item.id })) showMessage(`«${item.name}» удалён из голосования`);
    };

    if (adminView && isAdmin) {
        const suggestions = (visibleData.candidates || []).filter((item) => item.category === "community")
            .sort((a, b) => b.votes - a.votes);
        const choices = (visibleData.candidates || []).filter((item) => item.category === "lemonz");
        return <div className="engagement-page admin-engagement-screen">
            <div className="admin-engagement-header"><span>УПРАВЛЕНИЕ СЕЗОНОМ</span><h2>Голосование</h2><p>Сезон №{visibleData.number || "-"} · До завершения {remaining(visibleData.ends_at || new Date(), now)}</p></div>
            {demo && <div className="demo-notice">Пробный режим. Редактирование персонажей и сроков работает, но сохраняется только на этом устройстве. Для общего голосования подключи сервер.</div>}
            <VoteAdmin submit={submit} candidates={choices} season={visibleData} busy={busy} demo={demo} showMessage={showMessage} onEdit={setEditingCandidate} onRemove={removeCandidate} onResetPreview={() => { if (window.confirm("Сбросить все пробные изменения персонажей, дат и голосов на этом устройстве?")) { setPreviewSeason({}); setPreviewBallots({}); showMessage("Пробные данные восстановлены"); } }} now={now} />
            <section className="admin-content-panel">
                <div className="admin-content-title"><h3>Предложения сообщества</h3><span>{suggestions.length}</span></div>
                {suggestions.length === 0 ? <p className="admin-content-empty">В текущем сезоне ещё нет предложений.</p> : suggestions.map((item) => <article className="admin-compact-row" key={item.id}>
                    <FigureArt src={item.image_url} name={item.name} />
                    <div className="admin-compact-info"><strong>{item.name}</strong><small>{item.universe} · {item.votes || 0} голосов</small><small>Автор: @{item.author_username || "Telegram"}</small><div className="admin-compact-actions"><button type="button" onClick={() => openComments(item)}>Комментарии ({item.comments || 0})</button><button type="button" disabled={busy} onClick={() => setEditingCandidate(item)}>Редактировать</button><button type="button" className="danger" disabled={busy} onClick={() => removeCandidate(item)}>Удалить</button></div></div>
                </article>)}
            </section>
            <section className="admin-content-panel"><div className="admin-content-title"><h3>Архив победителей</h3><span>{(data.winners || []).length}</span></div>{(data.winners || []).length === 0 ? <p className="admin-content-empty">Пока нет завершённых сезонов.</p> : (data.winners || []).map((winner) => <div className="admin-archive-row" key={winner.id}><span>Сезон №{winner.season_number} · {winner.category === "lemonz" ? "LEMONZ" : "Сообщество"}</span><strong>{winner.name}</strong></div>)}</section>
            {editingCandidate && <CandidateEditModal key={editingCandidate.id || "new"} candidate={editingCandidate} busy={busy} demo={demo} showMessage={showMessage} onSubmit={submit} onClose={() => setEditingCandidate(null)} />}
            {commentsFor && <div className="engagement-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setCommentsFor(null); }}><div className="engagement-modal comments-modal"><button type="button" className="modal-exit" onClick={() => setCommentsFor(null)}>✕</button><h2>Комментарии · {commentsFor.name}</h2><div className="comment-feed">{comments.length === 0 && <p>Комментариев пока нет.</p>}{comments.map((item) => <div className="comment-item" key={item.id}><strong>@{item.username || "user"}</strong><span>{new Date(item.created_at).toLocaleDateString("ru-RU")}</span>{item.text && <p>{item.text}</p>}{item.media_url && <img src={item.media_url} alt="Вложение" />}<button type="button" disabled={demo || busy} onClick={async () => { if (window.confirm("Удалить комментарий?") && await submit("admin_delete_comment", { commentId: item.id })) setComments((await api(`/api/community?comments=${encodeURIComponent(commentsFor.id)}`)).comments || []); }}>Удалить</button></div>)}</div></div></div>}
        </div>;
    }

    return <div className="engagement-page vote-page vote-reference-page">
        <div className="vote-showcase" role="img" aria-label="Фигурки LEMONZ с глазами-пуговицами на тёмном фоне" />
        <div className="vote-page-content">
            <div className="vote-season-topline"><h1>ГОЛОСОВАНИЕ</h1><button type="button" className="vote-past-link" onClick={() => setShowArchive((previous) => !previous)}>Прошлые сезоны <LemonzIcon name="chevron-right" size={20} /></button></div>
            <div className="vote-season-subtitle">Сезон № {visibleData.number || "-"} · {votingPending ? "До начала" : "До конца"} {seasonCountdown(votingPending ? visibleData.starts_at : visibleData.ends_at, now)}</div>
            <div className="vote-season-progress" role="progressbar" aria-label="Прогресс сезона" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(seasonProgress(visibleData, now))}><span style={{ width: `${seasonProgress(visibleData, now)}%` }} /></div>
            {votingBlocked && <div className="vote-preview-status">{votingPending ? "Голосование ещё не началось" : "Сезон завершён. Ожидается новый"}</div>}
            {demo && <div className="vote-preview-status">ПРОБНЫЙ РЕЖИМ · голоса только на этом устройстве</div>}
            <VoteGroup category="lemonz" title="ВЫБОР LEMONZ" subtitle="Выбери до 1 персонажа" candidates={visibleData.candidates || []} myVotes={visibleData.myVotes} busy={busy || votingBlocked} demo={demo} onComments={openComments} onVote={(category, candidateId) => submit("vote", { category, candidateId })} />
            <VoteGroup category="community" title="ВЫБОР СООБЩЕСТВА" subtitle="Предложи героя и выиграй скидку 50%" candidates={visibleData.candidates || []} myVotes={visibleData.myVotes} busy={busy || votingBlocked} demo={demo} onComments={openComments} onVote={(category, candidateId) => submit("vote", { category, candidateId })} />
            {voteFeedback && <div className="vote-action-feedback" role="status"><LemonzIcon name="badge-check" size={17} />{voteFeedback}<button type="button" onClick={() => setVoteFeedback("")} aria-label="Скрыть сообщение">×</button></div>}
            <button type="button" className="vote-propose-button" disabled={votingBlocked} onClick={() => setProposalOpen(true)}><span aria-hidden="true">+</span>Предложить дизайн</button>
            {demo && <p className="vote-demo-footnote">Пробное голосование: выбор сохраняется только на этом устройстве и не влияет на общий рейтинг. Чтобы голоса учитывались у всех, подключи Telegram и сервер.</p>}
            <details className="vote-rules"><summary>Как работает голосование?</summary><p>В каждом сезоне выбираем двух победителей: одного от LEMONZ и одного от сообщества. Длительность сезона задаётся в админ-панели. У каждого Telegram-аккаунта по одному голосу на категорию, голос можно перенести или отменить. Автор победившей идеи сообщества получает персональную одноразовую скидку 50%.</p><p>В новом сезоне предложения и голоса обнуляются, прошлые победители больше не участвуют.</p></details>
            {showArchive && <section className="winner-history vote-archive" id="vote-archive"><h2>Прошлые сезоны</h2>{(visibleData.winners || []).length === 0 ? <p>Архив пока пуст. Здесь появятся победители завершённых сезонов.</p> : visibleData.winners.map((winner) => <div key={winner.id}><span>Сезон {winner.season_number} · {winner.category === "lemonz" ? "LEMONZ" : "Сообщество"}</span><strong>{winner.name}</strong></div>)}</section>}
        {(data.discounts || []).length > 0 && <section className="winner-history"><h2>Мои награды</h2>{data.discounts.map((reward) => <div key={reward.id}><strong>−50% на {reward.name}</strong><span>{reward.discount_redeemed ? "Скидка использована" : `Личный код: ${reward.discount_code} · Одно использование`}</span></div>)}</section>}
        </div>

        {proposalOpen && <div className="engagement-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setProposalOpen(false); }}><form className="engagement-modal" onSubmit={submitProposal}><button type="button" className="modal-exit" onClick={() => setProposalOpen(false)}>✕</button><h2>Предложить дизайн</h2><p>Первый предложивший персонажа становится автором идеи на этот сезон.</p><label>Персонаж<input required maxLength={80} placeholder="Например, Jinx" value={proposal.name} onChange={(event) => setProposal({ ...proposal, name: event.target.value })} /></label><label>Вселенная<input required maxLength={80} placeholder="Arcane / League of Legends" value={proposal.universe} onChange={(event) => setProposal({ ...proposal, universe: event.target.value })} /></label><label>Фото персонажа<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => handleUpload(event.target.files[0], (url) => setProposal((previous) => ({ ...previous, image_url: url })))} /></label>{proposal.image_url && <small>✓ Файл загружен</small>}<label>Комментарий<textarea rows="3" maxLength={600} placeholder="Каким ты видишь дизайн?" value={proposal.description} onChange={(event) => setProposal({ ...proposal, description: event.target.value })} /></label><div className="identity-note">Автор: @{user?.username || user?.first_name || "Telegram"}</div><button disabled={busy || demo} className="engagement-primary">Отправить предложение</button></form></div>}
        {commentsFor && <div className="engagement-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setCommentsFor(null); }}><div className="engagement-modal comments-modal"><button type="button" className="modal-exit" onClick={() => setCommentsFor(null)}>✕</button><h2>Комментарии · {commentsFor.name}</h2><div className="comment-feed">{comments.length === 0 && <p>Пока тихо. Напиши первым!</p>}{comments.map((item) => <div className="comment-item" key={item.id}><strong>@{item.username || "user"}</strong><span>{new Date(item.created_at).toLocaleDateString("ru-RU")}</span>{item.text && <p>{item.text}</p>}{item.media_url && <img src={item.media_url} alt="Вложение" />}{isAdmin && <button type="button" onClick={async () => { await submit("admin_delete_comment", { commentId: item.id }); setComments((await api(`/api/community?comments=${commentsFor.id}`)).comments || []); }}>Удалить</button>}</div>)}</div><form onSubmit={submitComment}><textarea maxLength={1500} rows="2" value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Твой комментарий..." /><label className="upload-label">📎 Добавить фото или GIF<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => handleUpload(event.target.files[0], setCommentMedia)} /></label>{commentMedia && <small>✓ Вложение прикреплено</small>}<button disabled={busy || demo} className="engagement-primary">Отправить</button></form></div></div>}
    </div>;
}

function toLocalDateTime(iso) {
    const date = new Date(iso);
    if (!Number.isFinite(date.getTime())) return "";
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function SeasonScheduleEditor({ season, submit, busy, demo, showMessage, now }) {
    const [draft, setDraft] = useState(null);
    const dates = draft ?? {
        startsAt: toLocalDateTime(season.starts_at || now),
        endsAt: toLocalDateTime(season.ends_at || now + SEASON_MS),
    };
    const setPreset = (days) => {
        const starts = now;
        setDraft({ startsAt: toLocalDateTime(starts), endsAt: toLocalDateTime(starts + days * 86400000) });
    };
    const saveDates = async () => {
        const start = new Date(dates.startsAt);
        const end = new Date(dates.endsAt);
        if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
            showMessage("Укажи корректные даты: окончание должно быть позже начала");
            return;
        }
        if (end.getTime() <= now + 60000 || end.getTime() - start.getTime() < 15 * 60000 || end.getTime() - start.getTime() > 90 * 86400000) {
            showMessage("Период должен быть от 15 минут до 90 дней, окончание - не раньше чем через минуту");
            return;
        }
        if (await submit("admin_set_season_dates", { startsAt: start.toISOString(), endsAt: end.toISOString() })) {
            setDraft(null);
            showMessage("Даты голосования сохранены. Уже полученные голоса не изменились.");
        }
    };
    return <section className="engagement-admin admin-season-editor">
        <h2>Срок голосования</h2>
        <p>Выбери быстрый период или укажи свои дату и время. Можно менять даже во время сезона, все голоса останутся.</p>
        <div className="admin-season-presets" role="group" aria-label="Быстрый выбор продолжительности">
            {[1, 3, 7, 14, 30].map((days) => <button type="button" key={days} disabled={busy} onClick={() => setPreset(days)}>{days} {days === 1 ? "день" : days < 5 ? "дня" : "дней"}</button>)}
        </div>
        <div className="admin-season-date-fields"><label>Начало<input type="datetime-local" value={dates.startsAt} disabled={busy} onChange={(event) => setDraft({ ...dates, startsAt: event.target.value })} /></label><label>Окончание<input type="datetime-local" value={dates.endsAt} disabled={busy} onChange={(event) => setDraft({ ...dates, endsAt: event.target.value })} /></label></div>
        <button type="button" className="engagement-primary" disabled={busy || !draft} onClick={saveDates}>Сохранить период{demo ? " (пробно)" : ""}</button>
        <small className="admin-season-hint">Если начало в будущем, голосование откроется автоматически в выбранное время. Допустимая продолжительность - от 15 минут до 90 дней.</small>
    </section>;
}

function VoteAdmin({ submit, candidates = [], season, busy = false, demo = false, showMessage, onEdit, onRemove, onResetPreview, now }) {
    const [userId, setUserId] = useState("");
    const [discountCode, setDiscountCode] = useState("");
    return <>
        <SeasonScheduleEditor season={season} submit={submit} busy={busy} demo={demo} showMessage={showMessage} now={now} />
        <section className="engagement-admin admin-choice-editor">
            <h2>Выбор LEMONZ · {candidates.length}/3</h2>
            <p>Редактируй или удаляй участников даже после начала голосования. При изменении персонажа его голоса сохраняются, при удалении - снимаются.</p>
            <div className="admin-choice-list">{candidates.length === 0 && <p className="admin-content-empty">Добавь первого персонажа LEMONZ.</p>}{candidates.map((item) => <div className="admin-compact-row" key={item.id}>
                <FigureArt src={item.image_url} name={item.name} />
                <div className="admin-compact-info"><strong>{item.name}</strong><small>{item.universe}</small><small>{item.votes || 0} голосов · {item.comments || 0} комментариев</small><div className="admin-compact-actions"><button type="button" disabled={busy} onClick={() => onEdit(item)}>Редактировать</button><button type="button" className="danger" disabled={busy} onClick={() => onRemove(item)}>Удалить</button></div></div>
            </div>)}</div>
            <button type="button" className="engagement-primary" disabled={busy || candidates.length >= 3} onClick={() => onEdit({ category: "lemonz", ...EMPTY })}>＋ Добавить персонажа LEMONZ</button>
        </section>
        <section className="engagement-admin admin-choice-editor">
            <h2>Управление сезоном</h2>
            <p>Завершение сезона определит победителей и создаст новый сезон. Победители сохранятся в архиве.</p>
            <button type="button" disabled={busy || demo} onClick={() => { if (window.confirm("Завершить сезон и начать следующий? Все текущие голоса и предложения будут обнулены.")) submit("admin_next_season", {}); }}>Завершить сезон и начать новый</button>
            {demo && <button type="button" disabled={busy} onClick={onResetPreview}>Сбросить пробные изменения</button>}
            <h3>Блокировка накрутки</h3>
            <input type="number" placeholder="Telegram ID нарушителя или владельца скидки" value={userId} onChange={(event) => setUserId(event.target.value)} />
            <button type="button" disabled={busy || demo || !userId.trim()} onClick={() => submit("admin_block_user", { userId })}>Заблокировать и удалить голоса</button>
            <button type="button" disabled={busy || demo || !userId.trim()} onClick={() => submit("admin_unblock_user", { userId })}>Снять блокировку</button>
            <h3>Погасить скидку 50%</h3>
            <input placeholder="Одноразовый код" value={discountCode} onChange={(event) => setDiscountCode(event.target.value)} />
            <button type="button" disabled={busy || demo || !userId.trim() || !discountCode.trim()} onClick={() => { if (window.confirm("Отметить эту скидку использованной?")) submit("admin_redeem_discount", { userId, code: discountCode }); }}>Отметить использованной</button>
        </section>
    </>;
}

function CandidateEditModal({ candidate, onSubmit, onClose, busy, demo, showMessage }) {
    const [draft, setDraft] = useState({ name: candidate.name || "", universe: candidate.universe || "", image_url: candidate.image_url || "", description: candidate.description || "" });
    const [uploading, setUploading] = useState(false);
    const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
    const uploadPhoto = async (file) => {
        if (!file || demo) return;
        setUploading(true);
        try { update("image_url", await uploadMedia(file)); }
        catch (error) { showMessage(error.message); }
        finally { setUploading(false); }
    };
    const save = async (event) => {
        event.preventDefault();
        const prepared = { ...draft, name: draft.name.trim(), universe: draft.universe.trim(), image_url: draft.image_url.trim() };
        if (prepared.name.length < 2 || prepared.universe.length < 2) { showMessage("Заполни имя и вселенную"); return; }
        if (candidate.id && candidate.votes > 0 && prepared.name !== candidate.name && !window.confirm(`За «${candidate.name}» уже проголосовали ${candidate.votes} раз. При смене имени все эти голоса останутся у обновлённого персонажа. Продолжить?`)) return;
        const operation = candidate.id ? "admin_update_candidate" : "admin_add_candidate";
        if (await onSubmit(operation, { ...prepared, category: candidate.category, ...(candidate.id ? { candidateId: candidate.id } : {}) })) {
            onClose();
            showMessage(candidate.id ? "Персонаж обновлён. Голоса сохранены." : "Персонаж добавлен в голосование.");
        }
    };
    return <div className="engagement-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form className="engagement-modal admin-candidate-edit-modal" onSubmit={save}>
        <button className="modal-exit" type="button" onClick={onClose} aria-label="Закрыть">✕</button>
        <h2>{candidate.id ? `Редактировать ${candidate.name}` : "Добавить персонажа"}</h2>
        <p>{candidate.category === "lemonz" ? "Выбор LEMONZ" : `Предложение @${candidate.author_username || "Telegram"}`}. Изменения появятся у всех пользователей после сохранения.</p>
        {candidate.votes > 0 && <div className="admin-candidate-vote-notice">Уже собрано {candidate.votes} голосов. Редактирование сохраняет их за этим вариантом.</div>}
        <div className="admin-candidate-preview"><FigureArt src={draft.image_url} name={draft.name || "Персонаж"} /></div>
        <label>Имя персонажа<input required maxLength={80} value={draft.name} onChange={(event) => update("name", event.target.value)} /></label>
        <label>Вселенная<input required maxLength={80} value={draft.universe} onChange={(event) => update("universe", event.target.value)} /></label>
        <label>Фото (URL или путь)<input value={draft.image_url} maxLength={1000} placeholder="/Clove.png" onChange={(event) => update("image_url", event.target.value)} /></label>
        <label className="upload-label">📎 {uploading ? "Загрузка фотографии..." : "Загрузить фотографию"}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={demo || busy || uploading} onChange={(event) => uploadPhoto(event.target.files?.[0])} /></label>
        <label>Комментарий / описание<textarea rows="3" maxLength={600} value={draft.description} onChange={(event) => update("description", event.target.value)} /></label>
        <button className="engagement-primary" disabled={busy || uploading}>Сохранить изменения{demo ? " (пробно)" : ""}</button>
    </form></div>;
}
