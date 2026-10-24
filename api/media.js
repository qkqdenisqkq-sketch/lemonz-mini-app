import crypto from "node:crypto";
import { errorResponse, HttpError, requireConfigured, telegramUser } from "./_shared.js";

const MIME = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };

export default async function handler(request, response) {
    try {
        if (request.method !== "POST") throw new HttpError(405, "Метод не поддерживается");
        requireConfigured();
        const user = telegramUser(request);
        const { base64, mime } = request.body || {};
        if (!MIME[mime] || typeof base64 !== "string" || base64.length > 4.2 * 1024 * 1024) throw new HttpError(400, "Допустимы PNG, JPEG, WEBP и GIF до 3 МБ");
        const buffer = Buffer.from(base64, "base64");
        if (!buffer.length || buffer.length > 3 * 1024 * 1024) throw new HttpError(400, "Файл слишком большой");
        const signature = buffer.subarray(0, 12);
        const png = buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
        const jpeg = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
        const webp = signature.subarray(0, 4).toString() === "RIFF" && signature.subarray(8, 12).toString() === "WEBP";
        const gif = ["GIF87a", "GIF89a"].includes(signature.subarray(0, 6).toString());
        if (!({ "image/png": png, "image/jpeg": jpeg, "image/webp": webp, "image/gif": gif })[mime]) throw new HttpError(400, "Формат изображения не совпадает с содержимым");
        const objectPath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${MIME[mime]}`;
        const base = process.env.SUPABASE_URL.replace(/\/$/, "");
        const upload = await fetch(`${base}/storage/v1/object/lemonz-media/${objectPath}`, {
            method: "POST", headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": mime, "x-upsert": "false" }, body: buffer,
        });
        if (!upload.ok) throw new HttpError(500, "Не удалось загрузить изображение. Проверь bucket lemonz-media.");
        return response.status(200).json({ ok: true, url: `${base}/storage/v1/object/public/lemonz-media/${objectPath}` });
    } catch (error) { errorResponse(response, error); }
}
