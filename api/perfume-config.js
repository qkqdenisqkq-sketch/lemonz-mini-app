import crypto from "node:crypto";
import { adminOnly, db, errorResponse, HttpError, requireConfigured, telegramUser } from "./_shared.js";
import { normalizePerfumeConfig, changePerfumeConfig } from "../src/lib/perfumeKits.js";

async function load() {
  const records = await db("perfume_config?id=eq.1&select=visible,kits,version");
  if (!records?.length) throw new HttpError(503, "Таблица конструктора не настроена. Выполни SQL-миграцию.");
  return normalizePerfumeConfig(records[0]);
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store, max-age=0");
  try {
    requireConfigured();
    if (request.method === "GET") {
      const config = await load();
      return response.status(200).json({ ok: true, ...config });
    }
    if (request.method !== "POST") throw new HttpError(405, "Метод не поддерживается");
    const user = telegramUser(request);
    adminOnly(user);
    const previous = await load();
    const { action, ...payload } = request.body || {};
    if (["create","update"].includes(action) && ["art","previewImage"].some(key => String(payload.kit?.[key] || "").startsWith("data:"))) throw new HttpError(400, "Загрузи фотографию через кнопку в админ-панели, затем сохрани.");
    let next;
    try { next = changePerfumeConfig(previous, action, payload, () => "kit-" + crypto.randomUUID()); }
    catch (error) { throw new HttpError(400, error?.message || "Проверь данные оформления"); }
    const updated = await db(
      `perfume_config?id=eq.1&version=eq.${previous.version}&select=visible,kits,version`,
      {
        method: "PATCH",
        body: { visible: next.visible, kits: next.kits, version: previous.version + 1 },
        prefer: "return=representation",
      }
    );
    if (!updated?.length) throw new HttpError(409, "Настройки уже изменились на другом устройстве. Обнови страницу.");
    return response.status(200).json({ ok: true, ...normalizePerfumeConfig(updated[0]) });
  } catch (error) { return errorResponse(response, error); }
}
