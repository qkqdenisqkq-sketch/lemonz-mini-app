import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import handler from "./api/community.js";

const BOT_TOKEN = "dummy-test-token-not-a-real-credential";
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "dummy-test-service-key";
process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN;
process.env.ADMIN_TELEGRAM_IDS = "12345";

const originalFetch = globalThis.fetch;
test.after(() => { globalThis.fetch = originalFetch; });

function telegramData(userId) {
    const params = new URLSearchParams({
        auth_date: String(Math.floor(Date.now() / 1000)),
        user: JSON.stringify({ id: userId, username: `test_${userId}` }),
    });
    const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("\n");
    const secret = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
    params.set("hash", crypto.createHmac("sha256", secret).update(check).digest("hex"));
    return params.toString();
}

function mockDatabase({ startsAt = new Date(Date.now() - 3600000).toISOString() } = {}) {
    const state = {
        season: { id: 1, number: 1, status: "active", starts_at: startsAt, ends_at: new Date(Date.now() + 86400000).toISOString() },
        candidates: [{ id: 7, season_id: 1, category: "lemonz", name: "Clove", universe: "Valorant", image_url: "/Clove.png", description: "", normalized_key: "clove", removed: false }],
        log: [],
    };
    globalThis.fetch = async (input, options = {}) => {
        const url = new URL(input);
        const path = url.pathname.split("/rest/v1/")[1];
        const method = options.method || "GET";
        const payload = options.body ? JSON.parse(options.body) : undefined;
        state.log.push({ method, path, payload });
        let result;
        if (path === "seasons") {
            if (method === "PATCH") Object.assign(state.season, payload);
            result = [state.season];
        } else if (path === "candidates") {
            const filter = url.searchParams.get("id");
            const selected = state.candidates.filter((item) => !filter || item.id === Number(filter.replace("eq.", "")));
            if (method === "PATCH") { selected.forEach((item) => Object.assign(item, payload)); result = selected; }
            else if (method === "DELETE") { state.candidates = state.candidates.filter((item) => !selected.includes(item)); result = selected; }
            else if (method === "POST") { const newItem = { id: 8, ...payload }; state.candidates.push(newItem); result = [newItem]; }
            else result = selected;
        } else if (path === "season_winners") result = [];
        else throw new Error(`Unexpected database request: ${method} ${path}`);
        return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
    };
    return state;
}

async function operation(body, id = 12345) {
    const req = { method: "POST", headers: { "x-telegram-init-data": telegramData(id) }, body };
    const res = {
        statusCode: 200,
        setHeader() { return this; },
        status(code) { this.statusCode = code; return this; },
        json(data) { this.data = data; return this; },
    };
    await handler(req, res);
    return res;
}

test("администратор редактирует кандидата во время сезона без удаления его голосов", async () => {
    const state = mockDatabase();
    const result = await operation({ operation: "admin_update_candidate", candidateId: 7, name: "Clove Prime", universe: "Valorant", image_url: "/Clove.png" });
    assert.equal(result.statusCode, 200);
    assert.equal(state.candidates[0].name, "Clove Prime");
    assert.ok(state.log.some((record) => record.method === "PATCH" && record.path === "candidates"));
    assert.ok(!state.log.some((record) => record.path === "votes"));
});

test("удаление кандидата ограничено активным сезоном", async () => {
    const state = mockDatabase();
    const result = await operation({ operation: "admin_delete_candidate", candidateId: 7 });
    assert.equal(result.statusCode, 200);
    assert.equal(state.candidates.length, 0);
    assert.ok(state.log.some((record) => record.method === "DELETE" && record.path === "candidates"));
});

test("срок голосования можно изменить, неверные даты отклоняются", async () => {
    const state = mockDatabase();
    const startsAt = new Date(Date.now() - 60000).toISOString();
    const endsAt = new Date(Date.now() + 7 * 86400000).toISOString();
    const valid = await operation({ operation: "admin_set_season_dates", startsAt, endsAt });
    assert.equal(valid.statusCode, 200);
    assert.equal(state.season.ends_at, endsAt);
    const invalid = await operation({ operation: "admin_set_season_dates", startsAt: endsAt, endsAt: startsAt });
    assert.equal(invalid.statusCode, 400);
});

test("обычный пользователь не может менять кандидатов", async () => {
    const state = mockDatabase();
    const result = await operation({ operation: "admin_delete_candidate", candidateId: 7 }, 98765);
    assert.equal(result.statusCode, 403);
    assert.equal(state.candidates.length, 1);
});

test("голос нельзя подать до запланированного начала сезона", async () => {
    mockDatabase({ startsAt: new Date(Date.now() + 86400000).toISOString() });
    const result = await operation({ operation: "vote", category: "lemonz", candidateId: 7 }, 98765);
    assert.equal(result.statusCode, 409);
});
