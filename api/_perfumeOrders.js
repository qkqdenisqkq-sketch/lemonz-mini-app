import { HttpError } from "./_shared.js";

export function checkPerfumeItems(items, config) {
 const perfumes = new Map((config.perfumes || []).map(item => [item.id, item]));
 const kits = new Set((config.kits || []).map(item => item.id));
 for (const item of items) {
  if (item.productId !== "perfume-set") continue;
  if (!kits.has(item.perfumePanelId)) throw new HttpError(409,"Оформление набора больше не доступно. Собери его заново.");
  const selected = item.perfumeSelection;
  if (!selected || typeof selected !== "object" || Array.isArray(selected)) throw new HttpError(409,"Пересобери набор в конструкторе парфюма.");
  const rows = Object.entries(selected);
  const count = rows.reduce((sum, [id, value]) => {
    if (!perfumes.has(id) || !Number.isInteger(value) || value < 1 || value > 5) throw new HttpError(409,"Один из ароматов изменился или недоступен.");
    return sum + value;
  },0);
  if (count < 1 || count > 5) throw new HttpError(409,"В наборе должно быть от 1 до 5 ароматов.");
  const expected = rows.reduce((sum,[id,value]) => sum + perfumes.get(id).price * value, 0);
  if (item.unitPrice !== expected) throw new HttpError(409,"Цена аромата изменилась. Удали набор из корзины и собери заново.");
 }
}
