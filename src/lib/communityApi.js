export const rubles = (value) => `${Number(value || 0).toLocaleString("ru-RU")} ₽`;

export function remaining(iso, now = Date.now()) {
    const seconds = Math.max(0, Math.floor((new Date(iso).getTime() - now) / 1000));
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days ? `${days}д ` : ""}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export async function api(path, options = {}) {
    const response = await fetch(path, {
        ...options,
        headers: { "Content-Type": "application/json", "X-Telegram-Init-Data": window.Telegram?.WebApp?.initData || "", ...options.headers },
    });
    const result = await response.json().catch(() => ({ error: "Некорректный ответ сервера" }));
    if (!response.ok || result.ok === false) throw new Error(result.error || `Ошибка ${response.status}`);
    return result;
}

export async function uploadMedia(file) {
    if (!file) return "";
    if (file.size > 3 * 1024 * 1024) throw new Error("Фото или GIF должны быть не более 3 МБ");
    const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
        reader.readAsDataURL(file);
    });
    return (await api("/api/media", { method: "POST", body: JSON.stringify({ base64, mime: file.type, filename: file.name }) })).url;
}

export const SAMPLE_SEASON = {
    id: "preview", number: 1, ends_at: new Date(Date.now() + 8 * 86400000 + 14 * 3600000).toISOString(),
    candidates: [
        { id: "p1", category: "lemonz", name: "Clove", universe: "Valorant", image_url: "/Clove.png", votes: 128, comments: 24, previewCrop: [55, 534] },
        { id: "p2", category: "lemonz", name: "Iso", universe: "Valorant", image_url: "/Iso.png", votes: 94, comments: 16, previewCrop: [55, 694] },
        { id: "p3", category: "lemonz", name: "Reyna", universe: "Valorant", image_url: "/Reyna.png", votes: 72, comments: 9, previewCrop: [55, 848] },
        { id: "p4", category: "community", name: "Jinx", universe: "Arcane", author_username: "mio_art", votes: 125, comments: 12, previewCrop: [55, 1140] },
        { id: "p5", category: "community", name: "Gojo", universe: "Jujutsu Kaisen", author_username: "satoru", votes: 84, comments: 7, previewCrop: [55, 1291] },
        { id: "p6", category: "community", name: "Stitch", universe: "Lilo & Stitch", author_username: "bluecat", votes: 29, comments: 4, previewCrop: [55, 1438] },
    ], myVotes: { lemonz: "p1" }, winners: [],
};

export const SAMPLE_LOTS = [
    {
        id: "preview-1", title: "Clove · Midnight Edition",
        description: "Готовая фигурка LEMONZ с авторским дизайном и ручной покраской.",
        size_cm: "18 см", image_url: "/Clove.png", gallery: [],
        one_of_one: true, start_price: 7500, current_bid: 8500, step: 500,
        status: "active", ends_at: new Date(Date.now() + 6 * 3600000).toISOString(),
        bids: [
            { id: "demo-bid-1", username: "darkviolet", amount: 8500, created_at: new Date(Date.now() - 2 * 60000).toISOString() },
            { id: "demo-bid-2", username: "mio_art", amount: 8000, created_at: new Date(Date.now() - 6 * 60000).toISOString() },
            { id: "demo-bid-3", username: "nekocat", amount: 7500, created_at: new Date(Date.now() - 13 * 60000).toISOString() },
        ],
    },
    { id: "preview-2", title: "Chamber · Gold Edition", description: "Демонстрационный лот с авторской покраской.", size_cm: "18 см", image_url: "/Chamber.png", gallery: [], one_of_one: true, start_price: 8500, current_bid: 0, step: 500, status: "active", ends_at: new Date(Date.now() + 63 * 3600000).toISOString(), bids: [] },
    { id: "preview-3", title: "Jinx · Blue Chaos", description: "Пример завершённого аукциона LEMONZ.", size_cm: "18 см", image_url: "/Jinx.png", gallery: [], one_of_one: true, start_price: 7000, current_bid: 9000, step: 500, status: "paid", ends_at: new Date(Date.now() - 2 * 86400000).toISOString(), bids: [] },
];
