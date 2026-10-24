import crypto from "node:crypto";

export const configured = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.TELEGRAM_BOT_TOKEN);

export class HttpError extends Error {
    constructor(status, message) { super(message); this.status = status; }
}

export function requireConfigured() {
    if (!configured()) throw new HttpError(503, "Сервер ещё не настроен. Нужны SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY и TELEGRAM_BOT_TOKEN.");
}

export function telegramUser(request, mandatory = true) {
    const raw = request.headers["x-telegram-init-data"] || "";
    if (!raw) {
        if (mandatory) throw new HttpError(401, "Войдите через Telegram Mini App");
        return null;
    }
    const params = new URLSearchParams(raw);
    const received = params.get("hash") || "";
    params.delete("hash");
    if (!/^[a-f0-9]{64}$/i.test(received)) throw new HttpError(401, "Некорректная подпись Telegram");
    const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("\n");
    const secret = crypto.createHmac("sha256", "WebAppData").update(process.env.TELEGRAM_BOT_TOKEN).digest();
    const expected = crypto.createHmac("sha256", secret).update(check).digest();
    if (!crypto.timingSafeEqual(Buffer.from(received, "hex"), expected)) throw new HttpError(401, "Telegram-авторизация не прошла проверку");
    const authDate = Number(params.get("auth_date"));
    if (!Number.isFinite(authDate) || Math.abs(Date.now() / 1000 - authDate) > 86400) throw new HttpError(401, "Авторизация Telegram устарела. Перезапустите Mini App.");
    let user;
    try { user = JSON.parse(params.get("user") || "null"); } catch { throw new HttpError(401, "Некорректные данные пользователя"); }
    if (!Number.isSafeInteger(Number(user?.id)) || Number(user.id) <= 0) throw new HttpError(401, "Отсутствует Telegram ID");
    return { id: Number(user.id), username: String(user.username || user.first_name || `user_${user.id}`).slice(0, 80) };
}

export function adminOnly(user) {
    const ids = [596691430, ...(process.env.ADMIN_TELEGRAM_IDS || "").split(",").map((id) => Number(id.trim()))];
    if (!ids.includes(user?.id)) throw new HttpError(403, "Только для администратора LEMONZ");
}

export async function db(path, { method = "GET", body, prefer } = {}) {
    requireConfigured();
    const response = await fetch(`${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${path}`, {
        method,
        headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            ...(prefer ? { Prefer: prefer } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
        console.error("Database error", response.status, data?.code);
        throw new HttpError(response.status === 409 ? 409 : 400, data?.message || "Не удалось выполнить запрос к базе данных");
    }
    return data;
}

export async function notifyUser(userId, text) {
    if (!process.env.TELEGRAM_BOT_TOKEN || !userId) return false;
    const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: userId, text }),
    });
    return response.ok;
}

export function errorResponse(response, error) {
    response.status(error.status || 500).json({ ok: false, error: error.status ? error.message : "Ошибка сервера" });
    if (!error.status) console.error(error);
}

export function clean(value, max = 100) { return String(value || "").trim().slice(0, max); }
export function validMedia(value) {
    const url = clean(value, 1000);
    if (!url) return "";
    if (url.startsWith("/") && !url.startsWith("//")) return url;
    try { if (new URL(url).protocol === "https:") return url; } catch { /* invalid */ }
    throw new HttpError(400, "Нужна корректная HTTPS-ссылка на изображение");
}

const CYRILLIC = { а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"i",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sh",ы:"y",э:"e",ю:"yu",я:"ya",ь:"",ъ:"" };
const ALIASES = {
    klov: "clove", clov: "clove", kloyv: "clove", clove: "clove",
    aiso: "iso", izo: "iso", iso: "iso",
    reina: "reyna", reyna: "reyna",
    kildzhoy: "killjoy", kiljoy: "killjoy", killjoy: "killjoy",
    pudzh: "pudge", pudj: "pudge", pudge: "pudge",
    dzhet: "jett", jet: "jett", jett: "jett",
    dzinks: "jinx", jinks: "jinx", jinx: "jinx",
    chamber: "chamber", chember: "chamber", cheimbr: "chamber",
};

export function canonical(name) {
    const normalized = String(name || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    const roman = [...normalized].map((char) => CYRILLIC[char] ?? char).join("").replace(/[^a-z0-9]/g, "");
    return ALIASES[roman] || roman;
}

export function similar(a, b) {
    if (a === b) return true;
    if (!a || !b || Math.abs(a.length - b.length) > 2 || Math.min(a.length, b.length) < 4) return false;
    const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const row = [i];
        for (let j = 1; j <= b.length; j++) row[j] = Math.min(row[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        previous.splice(0, previous.length, ...row);
    }
    return previous[b.length] <= (Math.max(a.length, b.length) > 7 ? 2 : 1);
}
