import { adminOnly, configured, db, errorResponse, HttpError, telegramUser } from "./_shared.js";
import { cleanPromoCode, legacyPromoCodes } from "./_promos.js";

async function getPromos() {
    const [records, rewards] = await Promise.all([
        db("promo_codes?select=code,percent,active,created_at,updated_at&order=created_at.desc"),
        db("season_winners?category=eq.community&discount_code=not.is.null&select=discount_code,discount_redeemed,name,author_username,author_id&order=created_at.desc&limit=100"),
    ]);
    const byCode = new Map(records.map((entry) => [entry.code, { ...entry, source: "database" }]));
    for (const [code, percent] of legacyPromoCodes()) {
        if (!byCode.has(code)) byCode.set(code, { code, percent, active: true, source: "environment" });
    }
    return {
        promos: [...byCode.values()].sort((a, b) => Number(b.active) - Number(a.active) || a.code.localeCompare(b.code)),
        rewards: rewards.map((entry) => ({
            code: entry.discount_code,
            percent: 50,
            active: !entry.discount_redeemed,
            name: entry.name,
            author_username: entry.author_username,
            author_id: entry.author_id,
        })),
    };
}

function validPercent(value) {
    const percent = Number(value);
    if (!Number.isInteger(percent) || percent < 1 || percent > 90) throw new HttpError(400, "Скидка должна быть от 1% до 90%");
    return percent;
}

export default async function handler(request, response) {
    response.setHeader("Cache-Control", "no-store");
    try {
        if (!configured()) return response.status(503).json({ ok: false, configured: false, error: "Сервер не настроен. В локальном режиме изменения только для просмотра." });
        const user = telegramUser(request);
        adminOnly(user);

        if (request.method === "GET") return response.status(200).json({ ok: true, configured: true, ...await getPromos() });
        if (request.method !== "POST") throw new HttpError(405, "Метод не поддерживается");

        const { action } = request.body || {};
        if (!["create", "update", "disable", "enable"].includes(action)) throw new HttpError(400, "Неизвестная операция");

        const { promos, rewards } = await getPromos();
        const originalCode = action === "create" ? "" : cleanPromoCode(request.body.oldCode);
        const original = promos.find((item) => item.code === originalCode);
        if (action !== "create" && !original) throw new HttpError(404, "Промокод не найден");

        const nextCode = action === "create" || action === "update" ? cleanPromoCode(request.body.code) : originalCode;
        const percent = action === "create" || action === "update" ? validPercent(request.body.percent) : original.percent;
        const conflict = promos.some((item) => item.code === nextCode && item.code !== originalCode);
        const personalConflict = (action === "create" || action === "update" || action === "enable") && rewards.some((item) => item.code === nextCode);
        if (conflict || (action === "create" && promos.some((item) => item.code === nextCode)) || personalConflict) {
            throw new HttpError(409, "Такой промокод уже существует. Выбери другое название.");
        }

        await db("rpc/manage_promo_code", {
            method: "POST",
            body: {
                p_action: action,
                p_old_code: originalCode || nextCode,
                p_new_code: nextCode,
                p_old_percent: original?.percent || percent,
                p_percent: percent,
                p_active: original?.active ?? true,
                p_shadow_old: legacyPromoCodes().has(originalCode),
            },
        });

        return response.status(200).json({ ok: true, ...await getPromos() });
    } catch (error) {
        return errorResponse(response, error);
    }
}
