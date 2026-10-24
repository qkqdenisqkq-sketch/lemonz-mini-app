export const PRODUCT_SUBCATEGORIES = ["Фигурки", "Брелки", "Лампы", "Декор"];

const SUBCATEGORY_ALIASES = {
    фигурка: "Фигурки",
    фигурки: "Фигурки",
    брелок: "Брелки",
    брелки: "Брелки",
    лампа: "Лампы",
    лампы: "Лампы",
    декор: "Декор",
};

// Existing products predate subcategories, so they stay visible as figurines.
export function getProductSubcategory(product) {
    const value = String(product?.subcategory || "").trim().toLowerCase();
    return SUBCATEGORY_ALIASES[value] || "Фигурки";
}

export function filterCatalogProducts(products, { category, subcategory = "Фигурки", query = "" } = {}) {
    const search = String(query).trim().toLocaleLowerCase("ru");
    return (Array.isArray(products) ? products : []).filter((product) => {
        if (!product || (category && product.category !== category)) return false;
        if (getProductSubcategory(product) !== subcategory) return false;
        return !search || `${product.name || ""} ${product.category || ""}`.toLocaleLowerCase("ru").includes(search);
    });
}

export function sortCatalogProducts(products, sort = "popular") {
    const list = [...products];
    if (sort === "priceAsc") return list.sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === "priceDesc") return list.sort((a, b) => Number(b.price) - Number(a.price));
    if (sort === "new") return list.sort((a, b) => Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)));
    if (sort === "name") return list.sort((a, b) => String(a.name).localeCompare(String(b.name), "ru"));
    return list.sort((a, b) => Number(Boolean(b.popular)) - Number(Boolean(a.popular)));
}
