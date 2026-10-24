import { useCallback, useEffect, useRef, useState } from "react";
import FigureArt from "../components/FigureArt";
import LemonzIcon from "../components/LemonzIcon";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { api, remaining, rubles, SAMPLE_LOTS, uploadMedia } from "../lib/communityApi";

const RULES = "Я понимаю, что в случае победы должен оплатить фигурку в течение 24 часов. При неоплате мой доступ к участию в аукционах будет заблокирован на 30 дней";
const LOT_STATUS = { active: "Активен", awaiting_payment: "Ожидает оплаты", offered: "Предложен следующему", paid: "Оплачен", cancelled: "Отменён", ended: "Завершён" };

export default function Auctions({ user, isAdmin, adminView = false, showMessage, haptic, onDetailChange, onHome }) {
    const [lots, setLots] = useState(SAMPLE_LOTS);
    const [demo, setDemo] = useState(true);
    const [filter, setFilter] = useState("active");
    const [selectedId, setSelectedId] = useState(null);
    const [now, setNow] = useState(() => Date.now());
    const [bidValue, setBidValue] = useState("");
    const [rulesChecked, setRulesChecked] = useState(false);
    const [agreement, setAgreement] = useState(false);
    const [blockedUntil, setBlockedUntil] = useState(null);
    const [busy, setBusy] = useState(false);
    const [showAdminForm, setShowAdminForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [unblockId, setUnblockId] = useState("");
    const [savedLots, setSavedLots] = useLocalStorage("lemonz-auction-bookmarks", []);

    const refresh = useCallback(async () => {
        try {
            const result = await api("/api/auction");
            if (result.configured) {
                setLots(result.lots || []); setDemo(false);
                setAgreement(Boolean(result.agreement)); setBlockedUntil(result.blockedUntil);
            } else setDemo(true);
        } catch { setDemo(true); }
    }, []);

    useEffect(() => {
        const initial = setTimeout(refresh, 0);
        const poll = setInterval(refresh, 7000);
        const clock = setInterval(() => setNow(Date.now()), 1000);
        return () => { clearTimeout(initial); clearInterval(poll); clearInterval(clock); };
    }, [refresh]);

    const act = async (operation, payload = {}) => {
        if (demo) { showMessage("Это демонстрация дизайна. Для реальных ставок нужно подключить сервер."); return false; }
        if (!user?.id) { showMessage("Открой приложение через Telegram."); return false; }
        setBusy(true);
        try {
            await api("/api/auction", { method: "POST", body: JSON.stringify({ operation, ...payload }) });
            haptic("success"); await refresh(); return true;
        } catch (error) { showMessage(error.message); await refresh(); return false; }
        finally { setBusy(false); }
    };

    const lot = lots.find((item) => item.id === selectedId);
    const viewingLot = Boolean(lot);
    useEffect(() => {
        onDetailChange?.(viewingLot);
        return () => onDetailChange?.(false);
    }, [viewingLot, onDetailChange]);
    const minBid = lot ? (Number(lot.current_bid) > 0 ? Number(lot.current_bid) + Number(lot.step) : Number(lot.start_price)) : 0;
    const banned = blockedUntil && new Date(blockedUntil).getTime() > now;
    const isActive = (item) => item.status === "active" && new Date(item.ends_at).getTime() > now;
    const filtered = lots.filter((item) => filter === "saved" ? savedLots.includes(String(item.id)) : filter === "active" ? isActive(item) : !isActive(item));

    const confirmBid = async () => {
        if (!lot) return false;
        if (banned) { showMessage(`Ставки заблокированы до ${new Date(blockedUntil).toLocaleDateString("ru-RU")}`); return false; }
        const amount = Number(bidValue || minBid);
        if (!Number.isSafeInteger(amount) || amount < minBid) { showMessage(`Минимальная ставка: ${rubles(minBid)}`); return false; }
        if (!agreement && !rulesChecked) { showMessage("Сначала подтверди условия участия."); return false; }
        if (!window.confirm(`Подтвердить ставку ${rubles(amount)}? Отменить её самостоятельно нельзя. Оплата только после победы.`)) return false;
        if (!agreement && !(await act("agree"))) return false;
        if (await act("bid", { lotId: lot.id, amount })) { setBidValue(""); setRulesChecked(false); return true; }
        return false;
    };

    if (adminView && isAdmin) {
        const activeLots = lots.filter(isActive).length;
        const editingLot = lots.find((item) => item.id === editingId) || null;
        return <div className="engagement-page admin-engagement-screen">
            <div className="admin-engagement-header"><span>УПРАВЛЕНИЕ ТОРГАМИ</span><h2>Аукцион</h2><p>Лоты, ставки, оплаты и блокировки участников</p></div>
            {demo && <div className="demo-notice">Демонстрационный режим. Создание и изменение лотов появятся после настройки сервера и Telegram-авторизации.</div>}
            <div className="admin-stat-grid"><div><small>Всего лотов</small><strong>{lots.length}</strong></div><div><small>Активных</small><strong>{activeLots}</strong></div></div>
            <button type="button" className="engagement-primary admin-create-lot" disabled={demo || busy} onClick={() => { setEditingId(null); setShowAdminForm(true); }}>＋ Создать новый лот</button>
            <section className="admin-content-panel"><div className="admin-content-title"><h3>Все аукционы</h3><span>{lots.length}</span></div>
                {lots.length === 0 && <p className="admin-content-empty">Пока нет лотов. Создай первый аукцион.</p>}
                {lots.map((item) => <article className="admin-compact-row" key={item.id}>
                    <FigureArt src={item.image_url} name={item.title} />
                    <div className="admin-compact-info"><strong>{item.title}</strong><small>{isActive(item) ? `Активен · ${remaining(item.ends_at, now)}` : `Статус: ${LOT_STATUS[item.status] || item.status}`}</small><small>{item.current_bid ? "Ставка" : "Старт"}: {rubles(item.current_bid || item.start_price)} · Шаг: {rubles(item.step)}</small><small>Участников: {new Set((item.bids || []).map((bid) => bid.username)).size} · Ставок: {(item.bids || []).length}</small>{item.winner_id && <small>Победитель Telegram ID: {item.winner_id}</small>}
                        <div className="admin-compact-actions"><button type="button" disabled={demo || busy || item.status === "paid"} onClick={() => { setEditingId(item.id); setShowAdminForm(true); }}>Изменить</button>{isActive(item) && <button type="button" disabled={demo || busy} onClick={() => { if (window.confirm(`Завершить торги «${item.title}»?`)) act("admin_end", { lotId: item.id }); }}>Завершить</button>}{!["paid", "cancelled"].includes(item.status) && <button type="button" className="danger" disabled={demo || busy} onClick={() => { if (window.confirm(`Отменить аукцион «${item.title}»?`)) act("admin_cancel", { lotId: item.id }); }}>Отменить</button>}{["awaiting_payment", "offered"].includes(item.status) && <button type="button" disabled={demo || busy} onClick={() => { if (window.confirm("Подтвердить получение оплаты?") ) act("admin_paid", { lotId: item.id }); }}>Оплачен</button>}</div>
                        {(item.bids || []).length > 0 && <details className="admin-bid-details"><summary>История ставок ({item.bids.length})</summary>{item.bids.map((bid) => <div key={bid.id}><span>@{bid.username || "user"}</span><strong>{rubles(bid.amount)}</strong></div>)}</details>}
                    </div>
                </article>)}
            </section>
            <section className="engagement-admin"><h2>Разблокировать участника</h2><p>Укажи Telegram ID пользователя, которому нужно вернуть доступ к ставкам.</p><input type="number" placeholder="Telegram ID" value={unblockId} onChange={(event) => setUnblockId(event.target.value)} /><button type="button" disabled={demo || busy || !unblockId.trim()} onClick={() => act("admin_unblock", { userId: unblockId })}>Снять блокировку</button></section>
            {showAdminForm && <LotEditor key={editingLot?.id || "new"} original={editingLot} busy={busy} onClose={() => { setShowAdminForm(false); setEditingId(null); }} onSave={async (payload) => { if (await act("admin_save_lot", payload)) { setShowAdminForm(false); setEditingId(null); } }} onUpload={uploadMedia} showMessage={showMessage} />}
        </div>;
    }

    return <div className={`engagement-page auction-page ${lot ? "auction-lot-screen" : "auction-hub-screen"}`}>
        {!lot ? <AuctionLanding
            demo={demo}
            now={now}
            filter={filter}
            setFilter={setFilter}
            filtered={filtered}
            lots={lots}
            savedLots={savedLots}
            setSavedLots={setSavedLots}
            banned={Boolean(banned)}
            blockedUntil={blockedUntil}
            isActive={isActive}
            isAdmin={isAdmin}
            unblockId={unblockId}
            setUnblockId={setUnblockId}
            onAdd={() => setShowAdminForm(true)}
            onUnblock={() => act("admin_unblock", { userId: unblockId })}
            onHome={onHome}
            haptic={haptic}
            onOpenLot={(item) => { setSelectedId(item.id); setBidValue(""); haptic(); window.scrollTo(0, 0); }}
        /> : <AuctionLotDetail
            key={lot.id}
            lot={lot}
            demo={demo}
            now={now}
            active={isActive(lot)}
            minBid={minBid}
            busy={busy}
            banned={Boolean(banned)}
            agreement={agreement}
            rulesChecked={rulesChecked}
            setRulesChecked={setRulesChecked}
            bidValue={bidValue}
            setBidValue={setBidValue}
            confirmBid={confirmBid}
            user={user}
            isAdmin={isAdmin}
            haptic={haptic}
            savedLots={savedLots}
            setSavedLots={setSavedLots}
            act={act}
            onBack={() => setSelectedId(null)}
            onEdit={() => setShowAdminForm(true)}
        />}
        {showAdminForm && <LotEditor original={lot} busy={busy} onClose={() => setShowAdminForm(false)} onSave={async (payload) => { if (await act("admin_save_lot", payload)) setShowAdminForm(false); }} onUpload={uploadMedia} showMessage={showMessage} />}
    </div>;
}

function AuctionPreviewArt({ item, demo }) {
    return demo && item.id === "preview-1"
        ? <div className="auction-hub-reference-photo"><img src="/auction-detail-reference.png" alt="Clove Midnight Edition" /></div>
        : <FigureArt src={item.image_url} name={item.title} />;
}

function AuctionLanding({
    demo, now, filter, setFilter, filtered, lots, savedLots, setSavedLots,
    banned, blockedUntil, isActive, isAdmin, unblockId, setUnblockId,
    onAdd, onUnblock, onHome, onOpenLot, haptic,
}) {
    const first = filtered[0];
    const others = filtered.slice(1);
    const savedCount = lots.filter((item) => savedLots.includes(String(item.id))).length;

    const toggleSaved = (item) => {
        haptic();
        const id = String(item.id);
        setSavedLots((current) => current.includes(id) ? current.filter((saved) => saved !== id) : [...current, id]);
    };

    return <>
        <div className="auction-lot-topbar auction-hub-topbar">
            <button type="button" onClick={onHome} aria-label="На главную"><LemonzIcon name="back" size={28} /></button>
            <h2>АУКЦИОН</h2>
            <button type="button" onClick={() => { setFilter(filter === "saved" ? "active" : "saved"); haptic(); }} aria-label="Сохранённые лоты" aria-pressed={filter === "saved"} className={filter === "saved" ? "is-saved" : ""}><LemonzIcon name="bookmark" size={27} /></button>
        </div>

        <section className="auction-hub-intro">
            <span className="auction-hub-kicker"><LemonzIcon name="diamond" size={15} /> LEMONZ · ONE OF ONE</span>
            <h1>Уникальные фигурки.<br /><span>Только в одном экземпляре.</span></h1>
            <p>Готовые авторские работы. Побеждает самая высокая ставка.</p>
        </section>

        <div className="auction-hub-tabs" role="group" aria-label="Фильтр аукционов">
            <button type="button" className={filter === "active" ? "active" : ""} onClick={() => setFilter("active")}>Активные <span>{lots.filter(isActive).length}</span></button>
            <button type="button" className={filter === "ended" ? "active" : ""} onClick={() => setFilter("ended")}>Завершённые</button>
            <button type="button" className={filter === "saved" ? "active" : ""} onClick={() => setFilter("saved")}>Сохранённые <span>{savedCount}</span></button>
        </div>

        {banned && <div className="ban-notice">Участие в торгах заблокировано до {new Date(blockedUntil).toLocaleDateString("ru-RU")}. Просматривать лоты можно.</div>}
        {!first && <div className="auction-hub-empty">
            <LemonzIcon name={filter === "saved" ? "bookmark" : "diamond"} size={34} />
            <strong>{filter === "saved" ? "Пока нет сохранённых лотов" : "Здесь пока нет фигурок"}</strong>
            <p>{filter === "saved" ? "Нажми на закладку у понравившейся фигурки." : "Скоро появятся новые эксклюзивные работы LEMONZ."}</p>
            {filter !== "active" && <button type="button" onClick={() => setFilter("active")}>Смотреть активные</button>}
        </div>}

        {first && <section className="auction-hub-featured" aria-label="Аукционный лот">
            <button type="button" className="auction-hub-featured-open" onClick={() => onOpenLot(first)} aria-label={`Посмотреть лот ${first.title}`}>
                <div className="auction-hub-featured-image">
                    <AuctionPreviewArt item={first} demo={demo} />
                    {first.one_of_one && <span className="auction-hub-rarity"><LemonzIcon name="diamond" size={16} /> ONE OF ONE · 1/1</span>}
                    <span className={`auction-hub-time-pill ${isActive(first) ? "" : "ended"}`}><LemonzIcon name="clock" size={14} /> {isActive(first) ? remaining(first.ends_at, now) : "Завершён"}</span>
                </div>
                <div className="auction-hub-featured-body">
                    <div className="auction-hub-maker"><span className="auction-lot-avatar">LEMONZ</span> LEMONZ ORIGINAL <LemonzIcon name="badge-check" size={16} /></div>
                    <h2>{first.title}</h2>
                    <p>Готовая фигурка <span>·</span> {first.size_cm || "Размер уточняется"} {first.one_of_one && <><span>·</span> Эксклюзив 1/1</>}</p>
                    <div className="auction-hub-price-box">
                        <div><small>{first.current_bid ? "ТЕКУЩАЯ СТАВКА" : "СТАРТОВАЯ ЦЕНА"}</small><strong>{rubles(first.current_bid || first.start_price)}</strong></div>
                        <div><small>ДО КОНЦА</small><strong>{isActive(first) ? remaining(first.ends_at, now) : "00:00:00"}</strong></div>
                    </div>
                    <span className="auction-hub-feature-cta">Посмотреть фигурку <LemonzIcon name="arrow" size={17} /></span>
                </div>
            </button>
            <button type="button" className={`auction-hub-save ${savedLots.includes(String(first.id)) ? "saved" : ""}`} onClick={() => toggleSaved(first)} aria-label={savedLots.includes(String(first.id)) ? "Убрать из сохранённых" : "Сохранить лот"}><LemonzIcon name="bookmark" size={19}/></button>
        </section>}

        {others.length > 0 && <section className="auction-hub-more">
            <div className="auction-hub-section-title"><h2>{filter === "ended" ? "Прошедшие торги" : "Другие лоты"}</h2><span>{others.length}</span></div>
            <div className="auction-hub-list">{others.map((item) => <article key={item.id} className="auction-hub-small-card">
                <button type="button" className="auction-hub-small-open" onClick={() => onOpenLot(item)} aria-label={`Посмотреть лот ${item.title}`}>
                    <div className="auction-hub-small-image"><AuctionPreviewArt item={item} demo={demo} />{item.one_of_one && <span className="auction-hub-small-diamond"><LemonzIcon name="diamond" size={15}/></span>}</div>
                    <div className="auction-hub-small-body">
                        <span className="auction-hub-small-kicker">LEMONZ ORIGINAL</span>
                        <h3>{item.title}</h3>
                        <p>{item.size_cm || "Размер уточняется"} <span>·</span> {item.one_of_one ? "Эксклюзив 1/1" : "Авторская работа"}</p>
                        <small>{item.current_bid ? "Текущая ставка" : "Стартовая цена"}</small>
                        <strong>{rubles(item.current_bid || item.start_price)}</strong>
                        <span className="auction-hub-small-time"><LemonzIcon name="clock" size={14}/>{isActive(item) ? remaining(item.ends_at, now) : "Торги завершены"}</span>
                    </div>
                </button>
                <button type="button" className={`auction-hub-save ${savedLots.includes(String(item.id)) ? "saved" : ""}`} onClick={() => toggleSaved(item)} aria-label={savedLots.includes(String(item.id)) ? "Убрать из сохранённых" : "Сохранить лот"}><LemonzIcon name="bookmark" size={18}/></button>
            </article>)}</div>
        </section>}

        <section className="auction-hub-rules">
            <LemonzIcon name="package" size={26} />
            <div><strong>Без предоплаты</strong><p>Участие бесплатное. Оплата только после победы, в течение 24 часов. Неоплата приводит к блокировке ставок на 30 дней.</p></div>
        </section>
        {demo && <p className="auction-hub-demo">Демо-режим: фотографии и ставки приведены для примера. Настоящие торги будут доступны после подключения сервера.</p>}
        {isAdmin && !demo && <section className="engagement-admin"><h2>Администратор</h2><button type="button" onClick={onAdd}>＋ Добавить лот</button><h3>Снять блокировку ставок</h3><input type="number" placeholder="Telegram ID" value={unblockId} onChange={(event) => setUnblockId(event.target.value)} /><button type="button" onClick={onUnblock}>Разблокировать пользователя</button></section>}
    </>;
}

function timeSince(iso, now) {
    const delta = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
    if (!Number.isFinite(delta)) return "";
    if (delta < 60) return "только что";
    if (delta < 3600) return `${Math.floor(delta / 60)} мин назад`;
    if (delta < 86400) return `${Math.floor(delta / 3600)} ч назад`;
    return new Date(iso).toLocaleDateString("ru-RU");
}

function AuctionLotDetail({
    lot, demo, now, active, minBid, busy, banned,
    agreement, rulesChecked, setRulesChecked, bidValue, setBidValue,
    confirmBid, user, isAdmin, haptic, act, onBack, onEdit, savedLots, setSavedLots,
}) {
    const [photoIndex, setPhotoIndex] = useState(0);
    const [bidSheetOpen, setBidSheetOpen] = useState(false);
    const touchStart = useRef(null);
    useEffect(() => {
        if (!bidSheetOpen) return;
        const handleKeyDown = (event) => {
            if (event.key === "Escape") setBidSheetOpen(false);
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [bidSheetOpen]);
    const photos = [lot.image_url, ...(Array.isArray(lot.gallery) ? lot.gallery : [])].filter(Boolean);
    const imageIndex = Math.min(photoIndex, Math.max(photos.length - 1, 0));
    const bookmarked = savedLots.includes(String(lot.id));
    const bidCount = lot.bids?.length || 0;
    const interest = bidCount >= 3 ? "Высокий интерес" : bidCount > 0 ? "Есть интерес" : "Ждём первые ставки";
    const activity = bidCount ? Math.min(100, Math.round(100 * bidCount / (bidCount + 1))) : 0;

    const toggleBookmark = () => {
        haptic();
        setSavedLots((current) => bookmarked ? current.filter((id) => id !== String(lot.id)) : [...current, String(lot.id)]);
    };
    const nextPhoto = (step) => {
        if (photos.length < 2) return;
        setPhotoIndex((current) => (current + step + photos.length) % photos.length);
        haptic();
    };
    const openBidSheet = () => {
        setBidValue(String(minBid));
        setBidSheetOpen(true);
        haptic();
    };
    const handleConfirmBid = async () => {
        if (await confirmBid()) setBidSheetOpen(false);
    };

    return <>
        <div className="auction-lot-topbar">
            <button type="button" onClick={onBack} aria-label="Назад к аукционам"><LemonzIcon name="back" size={28} /></button>
            <h2>АУКЦИОН</h2>
            <button type="button" onClick={toggleBookmark} className={bookmarked ? "is-saved" : ""} aria-label={bookmarked ? "Убрать из сохранённых" : "Сохранить лот"} aria-pressed={bookmarked}><LemonzIcon name="bookmark" size={27} /></button>
        </div>

        <section className="auction-lot-gallery" aria-label="Фотографии фигурки">
            <div
                className="auction-lot-photo"
                onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }}
                onTouchEnd={(event) => {
                    if (touchStart.current === null) return;
                    const swipe = event.changedTouches[0]?.clientX - touchStart.current;
                    if (Math.abs(swipe) > 45) nextPhoto(swipe < 0 ? 1 : -1);
                    touchStart.current = null;
                }}
            >
                {demo && lot.id === "preview-1" && imageIndex === 0
                    ? <div className="auction-lot-demo-image"><img src="/auction-detail-reference.png" alt="Clove · Midnight Edition, демонстрационное фото" /></div>
                    : <FigureArt src={photos[imageIndex]} name={lot.title} />}
                {lot.one_of_one && <span className="auction-lot-rarity"><LemonzIcon name="diamond" size={18} /> ONE OF ONE · 1/1</span>}
                {photos.length > 1 && <>
                    <button type="button" className="auction-lot-gallery-arrow prev" aria-label="Предыдущее фото" onClick={() => nextPhoto(-1)}><LemonzIcon name="chevron-left" size={19} /></button>
                    <button type="button" className="auction-lot-gallery-arrow next" aria-label="Следующее фото" onClick={() => nextPhoto(1)}><LemonzIcon name="chevron-right" size={19} /></button>
                </>}
                <span className="auction-lot-photo-count">{imageIndex + 1} / {Math.max(photos.length, 1)}</span>
            </div>
            <div className="auction-lot-dots" aria-label="Переключить фотографию">
                {photos.map((src, index) => <button key={`${src}-${index}`} type="button" className={index === imageIndex ? "active" : ""} onClick={() => setPhotoIndex(index)} aria-label={`Фото ${index + 1}`} aria-pressed={index === imageIndex} />)}
            </div>
        </section>

        <div className="auction-lot-description">
            <h1>{lot.title}</h1>
            <p>Готовая фигурка <span>·</span> {lot.size_cm || "Размер уточняется"} {lot.one_of_one && <><span>·</span> Эксклюзив 1/1</>}</p>
            <div className="auction-lot-maker"><span className="auction-lot-avatar">LEMONZ</span><strong>LEMONZ ORIGINAL</strong><LemonzIcon name="badge-check" size={19} /></div>
            {lot.description && <p className="auction-lot-full-description">{lot.description}</p>}
        </div>

        <div className="auction-lot-stats">
            <div className="auction-lot-stat"><span>ТЕКУЩАЯ СТАВКА</span><strong>{rubles(lot.current_bid || lot.start_price)}</strong></div>
            <div className="auction-lot-stat"><span><LemonzIcon name="clock" size={20} /> ДО КОНЦА</span><strong className="auction-lot-timer">{active ? remaining(lot.ends_at, now) : "00:00:00"}</strong></div>
        </div>
        <div className="auction-lot-interest">
            <div className="auction-lot-interest-track"><span style={{ width: `${activity}%` }} /></div>
            <span>{interest} <LemonzIcon name="flame" size={15} /></span>
        </div>

        {active ? <>
            <div className="auction-lot-next"><LemonzIcon name="trending-up" size={21} /><span>Следующая ставка от <strong>{rubles(minBid)}</strong></span></div>
            <button type="button" className="auction-lot-bid-action" onClick={openBidSheet} disabled={busy || banned}><LemonzIcon name="gavel" size={23} />{banned ? "Ставки заблокированы" : "Сделать ставку"}</button>
            {banned && <div className="ban-notice">Участие в аукционах заблокировано. Просмотр лота остаётся доступным.</div>}
        </> : <div className="auction-closed">{lot.status === "paid" ? "Фигурка оплачена" : "Торги завершены"}</div>}

        {lot.winner_id && String(lot.winner_id) === String(user?.id) && lot.status === "awaiting_payment" && <div className="win-notice">Ты победил! Свяжись с LEMONZ и оплати до {new Date(lot.payment_deadline).toLocaleString("ru-RU")}.</div>}
        {lot.status === "offered" && String(lot.offered_to_id) === String(user?.id) && <div className="win-notice"><strong>Тебе предложили выкупить этот лот за {rubles(lot.offer_price)}!</strong><p>Можно отказаться без штрафа.</p><button type="button" onClick={() => act("accept_offer", { lotId: lot.id })}>Принять предложение</button><button type="button" onClick={() => act("decline_offer", { lotId: lot.id })}>Отказаться</button></div>}

        <section className="auction-lot-bids">
            <h2>История ставок</h2>
            {!bidCount && <p className="auction-lot-empty-bids">Пока нет ставок. Ты можешь стать первым!</p>}
            {(lot.bids || []).map((bid, index) => {
                const username = String(bid.username || "telegram_user").replace(/^@/, "");
                return <div className="auction-lot-bid-row" key={bid.id || index}>
                    <span className={`auction-lot-bid-avatar avatar-${index % 4}`}>{username.slice(0, 1).toUpperCase()}</span>
                    <span className="auction-lot-bid-user">@{username}</span>
                    <strong>{rubles(bid.amount)}</strong>
                    <small>· {timeSince(bid.created_at, now)}</small>
                </div>;
            })}
        </section>
        <div className="auction-lot-shipping"><LemonzIcon name="package" size={22} /><span>Фигурка готова к отправке <span>·</span> Доставка обсуждается после победы</span></div>
        {demo && <div className="auction-lot-demo-note">Демонстрационный лот. Пример ставок и фотографий, деньги не списываются.</div>}

        {isAdmin && !demo && <section className="engagement-admin"><h2>Управление лотом</h2><button type="button" onClick={onEdit}>Редактировать</button><button type="button" onClick={() => { if (window.confirm("Завершить торги досрочно?")) act("admin_end", { lotId: lot.id }); }}>Завершить торги</button><button type="button" onClick={() => { if (window.confirm("Отменить лот?")) act("admin_cancel", { lotId: lot.id }); }}>Отменить</button>{["awaiting_payment", "offered"].includes(lot.status) && <button type="button" onClick={() => act("admin_paid", { lotId: lot.id })}>Подтвердить оплату</button>}</section>}

        {bidSheetOpen && <div className="auction-lot-bid-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setBidSheetOpen(false); }}>
            <section className="auction-lot-bid-sheet" role="dialog" aria-modal="true" aria-label="Новая ставка">
                <div className="auction-lot-sheet-heading"><div><span>АУКЦИОН LEMONZ</span><h2>Сделать ставку</h2></div><button type="button" aria-label="Закрыть" onClick={() => setBidSheetOpen(false)}><LemonzIcon name="x" size={22}/></button></div>
                <p>Минимальная следующая ставка: <strong>{rubles(minBid)}</strong></p>
                <label>Сумма ставки, ₽<input autoFocus type="number" inputMode="numeric" min={minBid} step="1" value={bidValue} onChange={(event) => setBidValue(event.target.value)} /></label>
                {!agreement && <label className="terms-check"><input type="checkbox" checked={rulesChecked} onChange={(event) => setRulesChecked(event.target.checked)} /><span>{RULES}.</span></label>}
                <button type="button" className="auction-lot-bid-action" disabled={busy || demo || banned || (!agreement && !rulesChecked)} onClick={handleConfirmBid}>{busy ? "Сохраняем ставку..." : `Подтвердить ${rubles(Number(bidValue) || minBid)}`}</button>
                <small>{demo ? "Демо-режим: реальные ставки недоступны." : "Без предоплаты. Ставку нельзя отменить. Оплата только после победы."}</small>
            </section>
        </div>}
    </>;
}

function LotEditor({ original, busy, onClose, onSave, onUpload, showMessage }) {
    const [form, setForm] = useState({ title: original?.title || "", description: original?.description || "", image_url: original?.image_url || "", size_cm: original?.size_cm || "18 см", start_price: original?.start_price || 7000, step: original?.step || 500, duration_hours: 48, one_of_one: original?.one_of_one ?? true });
    const [gallery, setGallery] = useState(original?.gallery || []);
    const upload = async (file, isGallery) => {
        if (!file) return;
        try { const url = await onUpload(file); if (isGallery) setGallery((current) => [...current, url]); else setForm((current) => ({ ...current, image_url: url })); }
        catch (error) { showMessage(error.message); }
    };
    return <div className="engagement-overlay"><form className="engagement-modal" onSubmit={(event) => { event.preventDefault(); onSave({ lotId: original?.id, lot: { ...form, gallery } }); }}><button className="modal-exit" type="button" onClick={onClose}>✕</button><h2>{original ? "Редактировать лот" : "Новый лот"}</h2><label>Название<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label>Описание<textarea required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><label>Размер<input value={form.size_cm} onChange={(event) => setForm({ ...form, size_cm: event.target.value })} /></label><label>Обложка<input type="file" accept="image/*" onChange={(event) => upload(event.target.files[0], false)} /></label><label>Дополнительные фото<input type="file" accept="image/*" onChange={(event) => upload(event.target.files[0], true)} /></label><small>{gallery.length} дополнительных фото</small><label>Стартовая цена<input type="number" min="1" value={form.start_price} onChange={(event) => setForm({ ...form, start_price: event.target.value })} /></label><label>Шаг ставки<input type="number" min="1" value={form.step} onChange={(event) => setForm({ ...form, step: event.target.value })} /></label>{!original && <label>Продолжительность, часов<input type="number" min="1" value={form.duration_hours} onChange={(event) => setForm({ ...form, duration_hours: event.target.value })} /></label>}<label className="terms-check"><input type="checkbox" checked={form.one_of_one} onChange={(event) => setForm({ ...form, one_of_one: event.target.checked })} />ONE OF ONE · 1/1</label><button disabled={busy} className="engagement-primary">Сохранить лот</button></form></div>;
}
