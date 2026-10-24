import { adminOnly, clean, configured, db, errorResponse, HttpError, telegramUser, validMedia } from "./_shared.js";

const integer = (value, label, min = 1) => {
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < min) throw new HttpError(400, `Некорректное поле: ${label}`);
    return number;
};

async function getLots(user, isAdmin) {
    const [lots, bids] = await Promise.all([
        db("auction_lots?select=*&order=created_at.desc&limit=100"),
        db("auction_bids?select=id,lot_id,username,amount,created_at&order=created_at.desc&limit=2000"),
    ]);
    return lots.map((lot) => ({
        ...lot,
        winner_id: (isAdmin || String(lot.winner_id) === String(user?.id)) ? lot.winner_id : null,
        offered_to_id: (isAdmin || String(lot.offered_to_id) === String(user?.id)) ? lot.offered_to_id : null,
        declined_user_ids: undefined,
        bids: bids.filter((bid) => bid.lot_id === lot.id),
    }));
}

async function getState(user) {
    const isAdmin = user && (process.env.ADMIN_TELEGRAM_IDS || "").split(",").some((id) => Number(id.trim()) === user.id);
    const [lots, agreement, bans] = await Promise.all([
        getLots(user, isAdmin),
        user ? db(`auction_agreements?user_id=eq.${user.id}&select=user_id&limit=1`) : Promise.resolve([]),
        user ? db(`auction_bans?user_id=eq.${user.id}&select=blocked_until&limit=1`) : Promise.resolve([]),
    ]);
    return { ok: true, configured: true, lots, agreement: agreement.length > 0, blockedUntil: bans[0]?.blocked_until || null };
}

async function saveLot(body) {
    const lot = body.lot || {};
    const prepared = {
        title: clean(lot.title, 120), description: clean(lot.description, 2000),
        image_url: validMedia(lot.image_url), size_cm: clean(lot.size_cm, 60),
        gallery: Array.isArray(lot.gallery) ? lot.gallery.slice(0, 10).map(validMedia) : [],
        one_of_one: Boolean(lot.one_of_one),
        start_price: integer(lot.start_price, "стартовая цена"),
        step: integer(lot.step, "шаг ставки"),
    };
    if (!prepared.title || !prepared.description) throw new HttpError(400, "Укажи название и описание");
    if (body.lotId) {
        const id = integer(body.lotId, "лот");
        const rows = await db(`auction_lots?id=eq.${id}&select=id,current_bid,status`);
        if (!rows.length || rows[0].status === "paid") throw new HttpError(409, "Нельзя изменить этот лот");
        if (Number(rows[0].current_bid) > 0) { delete prepared.start_price; delete prepared.step; }
        await db(`auction_lots?id=eq.${id}`, { method: "PATCH", body: prepared, prefer: "return=minimal" });
        return;
    }
    const hours = integer(lot.duration_hours, "длительность");
    if (hours > 720) throw new HttpError(400, "Максимум 30 дней");
    await db("auction_lots", { method: "POST", body: { ...prepared, status: "active", ends_at: new Date(Date.now() + hours * 3600000).toISOString() }, prefer: "return=minimal" });
}

export default async function handler(request, response) {
    response.setHeader("Cache-Control", "no-store");
    try {
        if (request.method === "GET") {
            if (!configured()) return response.status(200).json({ ok: true, configured: false });
            return response.status(200).json(await getState(telegramUser(request, false)));
        }
        if (request.method !== "POST") throw new HttpError(405, "Метод не поддерживается");
        const user = telegramUser(request); const body = request.body || {};
        switch (body.operation) {
            case "agree":
                await db("auction_agreements", { method: "POST", body: { user_id: user.id }, prefer: "resolution=merge-duplicates,return=minimal" });
                break;
            case "bid":
                await db("rpc/place_auction_bid", { method: "POST", body: { p_user: user.id, p_username: user.username, p_lot: integer(body.lotId, "лот"), p_amount: integer(body.amount, "ставка") } });
                break;
            case "accept_offer":
                await db("rpc/respond_auction_offer", { method: "POST", body: { p_user: user.id, p_lot: integer(body.lotId, "лот"), p_accept: true } });
                break;
            case "decline_offer":
                await db("rpc/respond_auction_offer", { method: "POST", body: { p_user: user.id, p_lot: integer(body.lotId, "лот"), p_accept: false } });
                break;
            case "admin_save_lot": adminOnly(user); await saveLot(body); break;
            case "admin_end":
                adminOnly(user);
                await db(`auction_lots?id=eq.${integer(body.lotId, "лот")}&status=eq.active`, { method: "PATCH", body: { ends_at: new Date().toISOString() }, prefer: "return=minimal" });
                await db("rpc/settle_auctions", { method: "POST", body: {} });
                break;
            case "admin_cancel":
                adminOnly(user);
                await db(`auction_lots?id=eq.${integer(body.lotId, "лот")}&status=neq.paid`, { method: "PATCH", body: { status: "cancelled" }, prefer: "return=minimal" });
                break;
            case "admin_paid":
                adminOnly(user);
                await db("rpc/mark_auction_paid", { method: "POST", body: { p_lot: integer(body.lotId, "лот") } });
                break;
            case "admin_unblock":
                adminOnly(user);
                await db(`auction_bans?user_id=eq.${integer(body.userId, "пользователь")}`, { method: "DELETE", prefer: "return=minimal" });
                break;
            default: throw new HttpError(400, "Неизвестная операция");
        }
        return response.status(200).json({ ok: true });
    } catch (error) { errorResponse(response, error); }
}
