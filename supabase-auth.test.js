import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { db } from "./api/_shared.js";
import media from "./api/media.js";
import perfumeImage from "./api/admin-perfume-image.js";

const botToken = "dummy-telegram-token";
const modernKey = ["sb", "secret", "dummy_test_key_not_a_credential"].join("_");
const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aT9sAAAAASUVORK5CYII=";

function environment(t, key) {
    const values = {
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: key,
        TELEGRAM_BOT_TOKEN: botToken,
        ADMIN_TELEGRAM_IDS: "12345",
    };
    const previous = Object.fromEntries(Object.keys(values).map(name => [name, process.env[name]]));
    Object.assign(process.env, values);
    t.after(() => {
        for (const [name, value] of Object.entries(previous)) {
            if (value === undefined) delete process.env[name];
            else process.env[name] = value;
        }
    });
}

function signedIdentity() {
    const params = new URLSearchParams({
        auth_date: String(Math.floor(Date.now() / 1000)),
        user: JSON.stringify({ id: 12345, username: "test_admin" }),
    });
    const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("\n");
    const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
    params.set("hash", crypto.createHmac("sha256", secret).update(check).digest("hex"));
    return params.toString();
}

test("database requests send modern secret keys only through apikey", async t => {
    environment(t, modernKey);
    t.mock.method(globalThis, "fetch", async (_url, options) => {
        const headers = new Headers(options.headers);
        assert.equal(headers.get("apikey"), modernKey);
        assert.equal(headers.has("authorization"), false);
        return Response.json([{ id: 1 }]);
    });
    assert.deepEqual(await db("perfume_config?id=eq.1"), [{ id: 1 }]);
});

test("database requests retain compatibility with legacy service-role JWTs", async t => {
    environment(t, "dummy-legacy-jwt");
    t.mock.method(globalThis, "fetch", async (_url, options) => {
        assert.equal(new Headers(options.headers).get("authorization"), "Bearer dummy-legacy-jwt");
        return Response.json([]);
    });
    assert.deepEqual(await db("seasons"), []);
});

for (const [name, handler] of [["community media", media], ["perfume admin photos", perfumeImage]]) {
    test(`${name} uploads support modern secret keys after Telegram authorization`, async t => {
        environment(t, modernKey);
        let uploads = 0;
        t.mock.method(globalThis, "fetch", async (url, options) => {
            assert.ok(url.includes("/storage/v1/object/lemonz-media/"));
            assert.equal(options.method, "POST");
            const headers = new Headers(options.headers);
            assert.equal(headers.get("apikey"), modernKey);
            assert.equal(headers.has("authorization"), false);
            assert.equal(headers.get("content-type"), "image/png");
            uploads++;
            return Response.json({ Key: "test.png" });
        });
        const response = {
            setHeader() {},
            status(code) { this.statusCode = code; return this; },
            json(body) { this.body = body; return this; },
        };
        await handler({ method: "POST", headers: { "x-telegram-init-data": signedIdentity() }, body: { base64: png, mime: "image/png" } }, response);
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.ok, true);
        assert.equal(uploads, 1);
    });
}
