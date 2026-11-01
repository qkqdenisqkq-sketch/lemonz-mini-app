import { PERFUME_MAX_ITEMS, PERFUME_PANELS, PERFUMES } from "../data/perfumes.js";

export function perfumeCount(selections) {
  return Object.values(selections || {}).reduce((sum, count) => sum + Math.max(0, Number(count) || 0), 0);
}
export function updatePerfumeSelection(selections, id, delta, perfumes = PERFUMES) {
  const valid = perfumes.some((perfume) => perfume.id === id);
  if (!valid || !Number.isInteger(delta) || !delta) return selections;
  const current = Math.max(0, Number(selections?.[id] || 0));
  if (delta > 0 && perfumeCount(selections) >= PERFUME_MAX_ITEMS) return selections;
  const next = Math.max(0, Math.min(PERFUME_MAX_ITEMS, current + delta));
  const updated = { ...(selections || {}) };
  if (next) updated[id] = next;
  else delete updated[id];
  return updated;
}
export function selectedPerfumes(selections, perfumes = PERFUMES) {
  return perfumes.filter((perfume) => Number(selections?.[perfume.id]) > 0).map((perfume) => ({
    ...perfume, count: Number(selections[perfume.id])
  }));
}
export function perfumeTotal(selections, perfumes = PERFUMES) {
  return selectedPerfumes(selections, perfumes).reduce((sum, perfume) => sum + perfume.price * perfume.count, 0);
}
export function buildPerfumeCartItem(selections, panelId, timestamp = Date.now(), kits = PERFUME_PANELS, perfumes = PERFUMES) {
  const entries = selectedPerfumes(selections, perfumes);
  if (!entries.length || perfumeCount(selections) > PERFUME_MAX_ITEMS) return null;
  const panel = kits.find((item) => item.id === panelId) || kits[0];
  if (!panel) return null;
  const contents = entries.flatMap((item) => Array.from({ length: item.count }, () => item.name));
  return {
    cartId: "perfume-" + timestamp,
    configurationKey: JSON.stringify({ type: "perfume-set", panel: panel.id, scents: contents.slice().sort() }),
    productId: "perfume-set",
    perfumePanelId: panel.id,
    perfumeSelection: Object.fromEntries(entries.map((item) => [item.id, item.count])),
    name: "Набор ароматов LEMONZ · " + panel.name,
    category: "Парфюм",
    image: panel.previewImage || panel.art,
    unitPrice: perfumeTotal(selections, perfumes),
    quantity: 1,
    options: [
      { id: "panel-" + panel.id, title: "Коробка: " + panel.name, price: 0 },
      ...entries.map((item) => ({ id: "scent-" + item.id, title: item.name + " · 2 мл × " + item.count, price: item.price * item.count })),
    ],
    nickname: "",
  };
}
