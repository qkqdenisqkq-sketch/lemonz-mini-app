import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import promoHandler from "./api/promo-code.js";
import orderHandler from "./api/create-order.js";
import adminHandler from "./api/admin-promos.js";
import { cartPricing } from "./src/lib/cartPricing.js";

const savedFetch = globalThis.fetch;
const botToken = "test-only-bot-token";
process.env.TELEGRAM_BOT_TOKEN = botToken;
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only-service-key";
process.env.TELEGRAM_ORDERS_CHAT_ID = "987654";
process.env.LEMONZ_PROMO_CODES = "LEMONZ10:10,FRIENDS15:15";
process.env.ADMIN_TELEGRAM_IDS = "12345";
test.after(() => { globalThis.fetch = savedFetch; });

const cart = [
    { cartId: "clove-1", name: "Clove", unitPrice: 7000, quantity: 2 },
    { cartId: "chamber-1", name: "Chamber", unitPrice: 6000, quantity: 1 },
];

function signedTelegram(userId) {
    const params = new URLSearchParams({
        auth_date: String(Math.floor(Date.now() / 1000)),
        user: JSON.stringify({ id: userId, first_name: "Test" }),
    });
    const string = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("\n");
    const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
    params.set("hash", crypto.createHmac("sha256", secret).update(string).digest("hex"));
    return params.toString();
}

function mockPromoBackend({ rows = [], rewards = [] } = {}) {
    const state = { rows: structuredClone(rows), rewards: structuredClone(rewards), telegramText: "", telegramCalls: 0 };
    globalThis.fetch = async (input, options = {}) => {
        const url = new URL(input);
        const body = options.body ? JSON.parse(options.body) : null;
        const route = url.pathname.split("/rest/v1/")[1];
        let result = null;
        if (route === "promo_codes") {
            const codeFilter = url.searchParams.get("code");
            result = state.rows.filter((row) => !codeFilter || row.code === codeFilter.replace(/^eq\./, ""));
        } else if (route === "season_winners") {
            const codeFilter = url.searchParams.get("discount_code");
            result = state.rewards.filter((row) => !codeFilter || codeFilter === "not.is.null" || row.discount_code === codeFilter.replace(/^eq\./, ""));
        } else if (route === "rpc/manage_promo_code") {
            const old = state.rows.find((item) => item.code === body.p_old_code);
            if (body.p_action === "create") state.rows.push({ code: body.p_new_code, percent: body.p_percent, active: true });
            else if (body.p_action === "update") {
                if (body.p_old_code === body.p_new_code) {
                    if (old) old.percent = body.p_percent;
                    else state.rows.push({ code: body.p_new_code, percent: body.p_percent, active: body.p_active });
                } else {
                    if (body.p_shadow_old) {
                        if (old) old.active = false;
                        else state.rows.push({ code: body.p_old_code, percent: body.p_old_percent, active: false });
                    } else state.rows = state.rows.filter((item) => item.code !== body.p_old_code);
                    state.rows.push({ code: body.p_new_code, percent: body.p_percent, active: body.p_active });
                }
            } else {
                if (old) old.active = body.p_action === "enable";
                else state.rows.push({ code: body.p_old_code, percent: body.p_old_percent, active: body.p_action === "enable" });
            }
        } else if (url.hostname === "api.telegram.org") {
            state.telegramText = body.text;
            state.telegramCalls++;
            result = { ok: true };
        } else throw new Error(`Unexpected fetch ${input}`);
        return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
    };
    return state;
}

async function call(handler, body, telegramId = null, method = "POST") {
    const req = {
        method,
        headers: telegramId ? { "x-telegram-init-data": signedTelegram(telegramId) } : {},
        body,
    };
    const res = {
        statusCode: 200,
        setHeader() { return this; },
        status(code) { this.statusCode = code; return this; },
        json(value) { this.data = value; return this; },
    };
    await handler(req, res);
    return res;
}

test("обычный процентный промокод рассчитывает скидку сразу", async () => {
    mockPromoBackend();
    const response = await call(promoHandler, { code: "lemonz10", items: cart });
    assert.equal(response.statusCode, 200);
    assert.equal(response.data.pricing.subtotal, 20000);
    assert.equal(response.data.pricing.discount, 2000);
    assert.equal(response.data.pricing.total, 18000);
    assert.equal(response.data.promo.scope, "order");
});

test("недействительный промокод отклоняется", async () => {
    mockPromoBackend();
    const result = await call(promoHandler, { code: "NOTACODE", items: cart }, 12345);
    assert.equal(result.statusCode, 404);
});

test("личная награда даёт 50% на одну фигурку и требует владельца", async () => {
    mockPromoBackend({ rewards: [{
        discount_code: "WINNER2026", author_id: 12345, name: "Clove", normalized_key: "clove", discount_redeemed: false,
    }] });
    const response = await call(promoHandler, { code: "WINNER2026", items: cart }, 12345);
    assert.equal(response.statusCode, 200);
    assert.equal(response.data.promo.eligibleCartId, "clove-1");
    assert.equal(response.data.pricing.discount, 3500);
    assert.equal(response.data.pricing.total, 16500);

    const stranger = await call(promoHandler, { code: "WINNER2026", items: cart }, 99999);
    assert.equal(stranger.statusCode, 404);
});

test("изменение корзины немедленно изменяет итоговую цену", () => {
    const percent = { scope: "order", percent: 10 };
    assert.equal(cartPricing(cart, percent).total, 18000);
    assert.equal(cartPricing([{ ...cart[0], quantity: 1 }, cart[1]], percent).total, 11700);
    const winner = { scope: "figure", percent: 50, eligibleCartId: "clove-1" };
    assert.equal(cartPricing(cart, winner).discount, 3500);
    assert.equal(cartPricing([cart[1]], winner).discount, 0);
});

test("заказ пересчитывает скидку на сервере и передаёт её в Telegram", async () => {
    const state = mockPromoBackend();
    const response = await call(orderHandler, {
        orderNumber: "LF-1", customer: { telegramId: 12345, firstName: "Сергей" },
        items: cart, promoCode: "LEMONZ10", total: 18000,
    });
    assert.equal(response.statusCode, 200);
    assert.match(state.telegramText, /LEMONZ10/);
    assert.match(state.telegramText, /Скидка: −2\s?000 ₽/);
    assert.match(state.telegramText, /Итого: 18\s?000 ₽/);
});

test("поддельная итоговая сумма не отправляется как заказ", async () => {
    const state = mockPromoBackend();
    const response = await call(orderHandler, {
        orderNumber: "LF-2", items: cart, promoCode: "LEMONZ10", total: 100,
    });
    assert.equal(response.statusCode, 409);
    assert.equal(state.telegramCalls, 0);
});

test("админ создаёт, меняет и отключает промокод, скидка сразу обновляется для корзины", async () => {
    mockPromoBackend();
    const created = await call(adminHandler, { action: "create", code: "HORROR20", percent: 20 }, 12345);
    assert.equal(created.statusCode, 200);
    assert.ok(created.data.promos.some((item) => item.code === "HORROR20" && item.active));

    const updated = await call(adminHandler, { action: "update", oldCode: "HORROR20", code: "HALLOWEEN25", percent: 25 }, 12345);
    assert.equal(updated.statusCode, 200);
    assert.ok(updated.data.promos.some((item) => item.code === "HALLOWEEN25" && item.percent === 25));
    const quote = await call(promoHandler, { code: "HALLOWEEN25", items: cart });
    assert.equal(quote.data.pricing.total, 15000);

    const disabled = await call(adminHandler, { action: "disable", oldCode: "HALLOWEEN25" }, 12345);
    assert.equal(disabled.statusCode, 200);
    const invalid = await call(promoHandler, { code: "HALLOWEEN25", items: cart });
    assert.equal(invalid.statusCode, 404);
    const restored = await call(adminHandler, { action: "enable", oldCode: "HALLOWEEN25" }, 12345);
    assert.equal(restored.statusCode, 200);
    assert.equal((await call(promoHandler, { code: "HALLOWEEN25", items: cart })).statusCode, 200);
});

test("код из окружения можно переименовать, старый после этого отключается", async () => {
    mockPromoBackend();
    const result = await call(adminHandler, { action: "update", oldCode: "LEMONZ10", code: "LEMONZ20", percent: 20 }, 12345);
    assert.equal(result.statusCode, 200);
    assert.equal((await call(promoHandler, { code: "LEMONZ10", items: cart })).statusCode, 404);
    assert.equal((await call(promoHandler, { code: "LEMONZ20", items: cart })).data.pricing.total, 16000);
});

test("обычный пользователь не может управлять кодами", async () => {
    mockPromoBackend();
    const result = await call(adminHandler, { action: "create", code: "NOACCESS", percent: 50 }, 56789);
    assert.equal(result.statusCode, 403);
});

test("код личной награды нельзя заменить общим промокодом", async () => {
    mockPromoBackend({ rewards: [{ discount_code: "WINNER2026", author_id: 12345, name: "Clove", normalized_key: "clove", discount_redeemed: false }] });
    const result = await call(adminHandler, { action: "create", code: "WINNER2026", percent: 25 }, 12345);
    assert.equal(result.statusCode, 409);
});
