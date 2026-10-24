import { canonical, configured, db, HttpError, telegramUser } from "./_shared.js";
import { cartPricing } from "../src/lib/cartPricing.js";

export function cleanPromoCode(value) {
    const code = String(value || "").trim().toUpperCase();
    if (!/^[A-Z0-9_-]{4,32}$/.test(code)) throw new HttpError(400, "Проверь написание промокода");
    return code;
}

export function validateOrderItems(items) {
    if (!Array.isArray(items) || !items.length || items.length > 50) throw new HttpError(400, "Корзина пуста или содержит слишком много позиций");
    const normalized = items.map((item, index) => ({
        ...item,
        cartId: String(item.cartId || `item-${index}`).slice(0, 100),
        name: String(item.name || "").trim().slice(0, 160),
        unitPrice: Number(item.unitPrice),
        quantity: Number(item.quantity),
    }));
    if (normalized.some((item) => !item.name || !Number.isSafeInteger(item.unitPrice) || item.unitPrice < 0 || item.unitPrice > 10000000 || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 100)) {
        throw new HttpError(400, "Проверь количество и стоимость товаров");
    }
    if (cartPricing(normalized).subtotal > 100000000) throw new HttpError(400, "Слишком большая сумма заказа");
    return normalized;
}

export function legacyPromoCodes() {
    // Example: LEMONZ_PROMO_CODES=LEMONZ10:10,FRIENDS15:15
    const codes = new Map();
    for (const entry of String(process.env.LEMONZ_PROMO_CODES || "").split(",")) {
        const matched = entry.trim().toUpperCase().match(/^([A-Z0-9_-]{4,32}):([0-9]{1,2})$/);
        if (matched && Number(matched[2]) > 0 && Number(matched[2]) <= 90) codes.set(matched[1], Number(matched[2]));
    }
    return codes;
}

export async function resolvePromo(request, value, items) {
    const code = cleanPromoCode(value);
    // Database records have priority, including inactive overrides of older
    // environment promo codes.
    if (configured()) {
        const rows = await db(`promo_codes?code=eq.${encodeURIComponent(code)}&select=code,percent,active&limit=1`);
        const stored = rows[0];
        if (stored) {
            if (!stored.active) throw new HttpError(404, "Промокод отключён");
            return { code, scope: "order", percent: stored.percent, label: `Скидка ${stored.percent}% на заказ` };
        }
    }

    const legacyPercent = legacyPromoCodes().get(code);
    if (legacyPercent) {
        return { code, scope: "order", percent: legacyPercent, label: `Скидка ${legacyPercent}% на заказ` };
    }

    if (!configured()) throw new HttpError(404, "Промокод не найден");
    // One-time 50% codes belong only to the Telegram user who won voting.
    const user = telegramUser(request);
    const matches = await db(`season_winners?discount_code=eq.${encodeURIComponent(code)}&category=eq.community&select=author_id,name,normalized_key,discount_redeemed&limit=1`);
    const reward = matches[0];
    if (!reward || reward.discount_redeemed || String(reward.author_id) !== String(user.id)) throw new HttpError(404, "Промокод не найден или уже использован");

    const eligible = items.find((item) => canonical(item.name) === reward.normalized_key);
    if (!eligible) throw new HttpError(409, `Этот промокод действует только на фигурку «${reward.name}». Добавь её в корзину.`);

    return {
        code, scope: "figure", percent: 50,
        eligibleCartId: eligible.cartId,
        label: `Скидка 50% на «${reward.name}» (1 шт.)`,
    };
}

export async function quotePromo(request, value, rawItems) {
    const items = validateOrderItems(rawItems);
    const promo = await resolvePromo(request, value, items);
    return { promo, pricing: cartPricing(items, promo) };
}
