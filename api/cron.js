import { db, errorResponse, HttpError, notifyUser, requireConfigured } from "./_shared.js";

export default async function handler(request, response) {
    response.setHeader("Cache-Control", "no-store");
    try {
        if (request.method !== "GET" && request.method !== "POST") throw new HttpError(405, "Метод не поддерживается");
        if (!process.env.CRON_SECRET || request.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) throw new HttpError(401, "Нет доступа к планировщику");
        requireConfigured();
        await db("rpc/advance_season", { method: "POST", body: { p_force: false } });
        await db("rpc/settle_auctions", { method: "POST", body: {} });
        const notifications = await db("bot_notifications?sent_at=is.null&attempts=lt.5&select=id,user_id,message,attempts&order=id.asc&limit=50");
        let sent = 0;
        for (const notice of notifications) {
            try {
                const needsPaymentHelp = /Оплати|Оплатить|Оплата/.test(notice.message);
                const text = needsPaymentHelp && process.env.PAYMENT_INSTRUCTIONS ? `${notice.message}\n\n${process.env.PAYMENT_INSTRUCTIONS}` : notice.message;
                if (await notifyUser(notice.user_id, text)) {
                    await db(`bot_notifications?id=eq.${notice.id}&sent_at=is.null`, { method: "PATCH", body: { sent_at: new Date().toISOString() }, prefer: "return=minimal" });
                    sent++;
                } else {
                    await db(`bot_notifications?id=eq.${notice.id}`, { method: "PATCH", body: { attempts: notice.attempts + 1, last_attempt_at: new Date().toISOString() }, prefer: "return=minimal" });
                }
            } catch (error) { console.error("Bot notification failed", notice.id, error.message); }
        }
        return response.status(200).json({ ok: true, notifications: sent });
    } catch (error) { errorResponse(response, error); }
}
