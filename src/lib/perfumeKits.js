import { PERFUME_PANELS } from "../data/perfumes.js";
import { normalizeAromas, changeAromas } from "./perfumeAromas.js";

export const DEFAULT_PERFUME_KITS = PERFUME_PANELS.map((item) => ({
  id: item.id, name: item.name, art: item.art,
  previewImage: "", accent: item.accent, dark: item.dark,
}));

export function normalizePerfumeKits(kits) {
  if (!Array.isArray(kits)) return DEFAULT_PERFUME_KITS.map((kit) => ({ ...kit }));
  const ids = new Set();
  return kits.filter((kit) => {
    if (!kit || typeof kit.id !== "string" || !kit.id || ids.has(kit.id)) return false;
    ids.add(kit.id);
    return true;
  }).map((kit) => ({
    id: kit.id, name: String(kit.name || "").slice(0, 60),
    art: String(kit.art || ""), previewImage: String(kit.previewImage || ""),
    accent: /^#[0-9a-f]{6}$/i.test(kit.accent || "") ? kit.accent : "#b678e7",
    dark: /^#[0-9a-f]{6}$/i.test(kit.dark || "") ? kit.dark : "#241328",
  }));
}

export function normalizePerfumeConfig(value) {
  return {
    visible: typeof value?.visible === "boolean" ? value.visible : true,
    kits: normalizePerfumeKits(value?.kits),
    perfumes: normalizeAromas(value?.perfumes),
    version: Number.isSafeInteger(value?.version) ? value.version : 0,
  };
}

export function validatePerfumeKit(input) {
  const name = String(input?.name || "").trim();
  if (!name || name.length > 60) throw Error("Укажи название до 60 символов");
  const art = String(input?.art || "").trim();
  const previewImage = String(input?.previewImage || "").trim();
  if (!art || (art.length > 1000 && !art.startsWith("data:")) || (previewImage.length > 1000 && !previewImage.startsWith("data:"))) throw Error("Нужно изображение оформления (до 1000 символов)");
  for (const url of [art, previewImage].filter(Boolean)) {
    if (/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(url) && url.length <= 500000) continue;
    if (url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\") && !url.includes("..")) continue;
    try { if (new URL(url).protocol === "https:") continue; } catch { /* invalid */ }
    throw Error("Используй HTTPS-ссылку или путь к файлу на сайте");
  }
  const accent = String(input?.accent || "#b678e7");
  const dark = String(input?.dark || "#241328");
  if (!/^#[0-9a-f]{6}$/i.test(accent) || !/^#[0-9a-f]{6}$/i.test(dark)) throw Error("Укажи цвета в формате #RRGGBB");
  return { name, art, previewImage, accent, dark };
}

export function changePerfumeConfig(current, action, payload, generateId = () => "kit-" + Date.now()) {
  const config = normalizePerfumeConfig(current);
  if (["aromaCreate","aromaUpdate","aromaDelete"].includes(action)) {
    return { ...config, perfumes: changeAromas(config.perfumes, action, payload, generateId) };
  }
  if (action === "visibility") {
    if (typeof payload?.visible !== "boolean") throw Error("Некорректная настройка видимости");
    return { ...config, visible: payload.visible };
  }
  if (action === "create") {
    if (config.kits.length >= 30) throw Error("Максимум 30 оформлений");
    const validated = validatePerfumeKit(payload?.kit);
    if (config.kits.some((kit) => kit.name.toLowerCase() === validated.name.toLowerCase())) throw Error("Такое название уже используется");
    const id = generateId();
    if (!id || config.kits.some((kit) => kit.id === id)) throw Error("Не удалось создать уникальный ID");
    return { ...config, kits: [...config.kits, { id, ...validated }] };
  }
  if (!["update", "delete"].includes(action)) throw Error("Неизвестное действие");
  const id = String(payload?.id || "");
  const existing = config.kits.find((kit) => kit.id === id);
  if (!existing) throw Error("Оформление не найдено");
  if (action === "delete") {
    if (config.kits.length === 1) throw Error("Нельзя удалить последнее оформление. Сначала добавь новое или скрой конструктор.");
    return { ...config, kits: config.kits.filter((kit) => kit.id !== id) };
  }
  const validated = validatePerfumeKit(payload?.kit);
  if (config.kits.some((kit) => kit.id !== id && kit.name.toLowerCase() === validated.name.toLowerCase())) throw Error("Такое название уже используется");
  return { ...config, kits: config.kits.map((kit) => kit.id === id ? { ...kit, ...validated } : kit) };
}
