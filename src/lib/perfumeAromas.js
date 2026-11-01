import { PERFUMES, PERFUME_FAMILIES, PERFUME_GENDERS } from "../data/perfumes.js";

export const DEFAULT_AROMAS = PERFUMES.map(item => ({ ...item, image: "" }));

function safeImage(source, allowLocal = true) {
  const value = String(source || "").trim();
  if (!value) return "";
  if (value.length > 750000) throw Error("Изображение слишком большое");
  if (/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(value) && value.length <= 750000 && allowLocal) return value;
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") && !value.includes("..")) return value;
  try { if (new URL(value).protocol === "https:" && value.length <= 1000) return value; } catch { /* ignore invalid */ }
  throw Error("Выбери PNG/JPEG/WEBP или корректную HTTPS-ссылку");
}

export function validateAroma(item, { allowLocal = true } = {}) {
  const name = String(item?.name || "").trim().slice(0, 55);
  const notes = String(item?.notes || "").trim().slice(0, 200);
  if (!name || !notes) throw Error("Заполни название и описание нот");
  const price = Number(item?.price);
  if (!Number.isInteger(price) || price < 1 || price > 100000) throw Error("Укажи стоимость от 1 до 100 000 ₽");
  const family = String(item?.family || "");
  const gender = String(item?.gender || "");
  if (!PERFUME_FAMILIES.includes(family) || family === "Все") throw Error("Выбери категорию аромата");
  if (!PERFUME_GENDERS.includes(gender) || gender === "Все") throw Error("Выбери тип аромата");
  const symbol = String(item?.symbol || "✿").trim().slice(0, 8) || "✿";
  const color = /^#[0-9a-f]{6}$/i.test(item?.color || "") ? item.color : "#e4caf3";
  return { name, notes, family, gender, price, image: safeImage(item?.image, allowLocal), symbol, color };
}

export function normalizeAromas(aromas) {
  if (!Array.isArray(aromas)) return DEFAULT_AROMAS.map(item => ({ ...item }));
  const seen = new Set();
  return aromas.filter(item => {
    const id = String(item?.id || "").trim();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  }).map(item => ({
    id: String(item.id),
    name: String(item.name || "").slice(0, 55),
    notes: String(item.notes || "").slice(0, 200),
    family: PERFUME_FAMILIES.includes(item.family) && item.family !== "Все" ? item.family : "Свежие",
    gender: PERFUME_GENDERS.includes(item.gender) && item.gender !== "Все" ? item.gender : "Унисекс",
    price: Number.isInteger(Number(item.price)) && Number(item.price) > 0 ? Number(item.price) : 390,
    symbol: String(item.symbol || "✿").slice(0, 8),
    image: String(item.image || ""),
    color: /^#[0-9a-f]{6}$/i.test(item.color || "") ? item.color : "#e4caf3",
  }));
}

export function changeAromas(aromas, action, payload, newId = () => "aroma-" + Date.now(), opts = {}) {
  const list = normalizeAromas(aromas);
  if (action === "aromaCreate") {
    if (list.length >= 200) throw Error("Максимум 200 ароматов");
    const validated = validateAroma(payload?.aroma, opts);
    if (list.some(item => item.name.toLocaleLowerCase("ru") === validated.name.toLocaleLowerCase("ru"))) throw Error("Аромат с таким названием уже существует");
    const id = newId();
    if (!id || list.some(item => item.id === id)) throw Error("Повтори добавление аромата");
    return [...list, { id, ...validated }];
  }
  const id = String(payload?.id || "");
  if (!list.some(item => item.id === id)) throw Error("Аромат не найден");
  if (action === "aromaDelete") return list.filter(item => item.id !== id);
  if (action !== "aromaUpdate") throw Error("Неизвестное действие");
  const validated = validateAroma(payload?.aroma, opts);
  if (list.some(item => item.id !== id && item.name.toLocaleLowerCase("ru") === validated.name.toLocaleLowerCase("ru"))) throw Error("Аромат с таким названием уже существует");
  return list.map(item => item.id === id ? { ...item, ...validated } : item);
}
