import { useMemo, useRef, useState, useEffect } from "react";
import FigureArt from "../components/FigureArt";
import LemonzIcon from "../components/LemonzIcon";
import { DEFAULT_CATEGORIES } from "../data/products";
import { PRODUCT_SUBCATEGORIES, filterCatalogProducts, sortCatalogProducts } from "../lib/catalog";

const FEATURED_CATEGORIES = ["Valorant", "Dota 2", "Anime"];
const CATEGORY_TABS = [
    { id: "Все", title: "Все" },
    { id: "Valorant", title: "Valorant", color: "valorant", icon: "V" },
    { id: "Dota 2", title: "Dota 2", color: "dota", icon: "D2" },
    { id: "Anime", title: "Anime", color: "anime", icon: "A" },
    { id: "Другие", title: "Другие", color: "other", icon: "★" },
];

const SORT_OPTIONS = [
    { value: "popular", label: "По популярности" },
    { value: "new", label: "Сначала новинки" },
    { value: "priceAsc", label: "Сначала дешевле" },
    { value: "priceDesc", label: "Сначала дороже" },
    { value: "name", label: "По названию" },
];

function productCountLabel(count, subcategory) {
    const forms = {
        Фигурки: ["фигурка", "фигурки", "фигурок"],
        Брелки: ["брелок", "брелка", "брелков"],
        Лампы: ["лампа", "лампы", "ламп"],
        Декор: ["товар", "товара", "товаров"],
    };
    const [one, few, many] = forms[subcategory] || forms.Декор;
    const mod10 = count % 10;
    const mod100 = count % 100;
    const word = mod10 === 1 && mod100 !== 11 ? one : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many;
    return `${count} ${word}`;
}

function CatalogCard({ product, isFavorite, onToggleFavorite, onOpenProduct }) {
    return <article className="catalog-reference-card">
        <div className="catalog-reference-photo">
            <button type="button" className="catalog-reference-photo-action" onClick={() => onOpenProduct(product)} aria-label={`Посмотреть ${product.name}`}>
                <FigureArt src={product.image} name={product.name} />
            </button>
            <button type="button" className={`catalog-reference-heart ${isFavorite ? "is-favorite" : ""}`}
                onClick={() => onToggleFavorite(product.id)} aria-label={`${isFavorite ? "Убрать из избранного" : "Добавить в избранное"}: ${product.name}`}
                aria-pressed={isFavorite}>
                <LemonzIcon name="heart" size={19} />
            </button>
        </div>
        <div className="catalog-reference-card-info">
            <button type="button" className="catalog-reference-name" onClick={() => onOpenProduct(product)}>{product.name}</button>
            <span className="catalog-reference-universe">{product.category}</span>
            <div className="catalog-reference-bottom">
                <strong>{Number(product.price || 0).toLocaleString("ru-RU")} ₽</strong>
                <button type="button" className="catalog-reference-bag" onClick={() => onOpenProduct(product)} aria-label={`Выбрать ${product.name}`}>
                    <LemonzIcon name="bag" size={19} />
                </button>
            </div>
        </div>
    </article>;
}

function CatalogSection({ category, products, subcategory, onSelectSubcategory, sort, query, favoriteProductIds, onToggleFavorite, onOpenProduct }) {
    const filtered = sortCatalogProducts(filterCatalogProducts(products, { category, subcategory, query }), sort);
    return <section className="catalog-reference-section" aria-label={category}>
        <div className="catalog-reference-section-heading">
            <h2>{category}</h2>
            <span>· {productCountLabel(filtered.length, subcategory)}</span>
        </div>
        <div className="catalog-reference-subcategories" role="group" aria-label={`Подкатегории: ${category}`}>
            {PRODUCT_SUBCATEGORIES.map((item) => <button
                key={item}
                type="button"
                className={subcategory === item ? "active" : ""}
                onClick={() => onSelectSubcategory(category, item)}
                aria-pressed={subcategory === item}
            >{item}</button>)}
        </div>
        {filtered.length > 0 ? <div className="catalog-reference-grid">
            {filtered.map((product) => <CatalogCard
                key={product.id}
                product={product}
                isFavorite={favoriteProductIds.includes(product.id)}
                onToggleFavorite={onToggleFavorite}
                onOpenProduct={onOpenProduct}
            />)}
        </div> : <div className="catalog-reference-empty">В этой подкатегории пока нет товаров.</div>}
    </section>;
}

export default function Catalog({ products = [], activeCategory = "Все", onCategoryChange, favoriteProductIds = [], onToggleFavorite, onOpenProduct, searchOpen = false, onCloseSearch }) {
    const [sort, setSort] = useState("popular");
    const [subcategories, setSubcategories] = useState({});
    const [query, setQuery] = useState("");
    const searchRef = useRef(null);

    useEffect(() => {
        if (searchOpen) searchRef.current?.focus();
    }, [searchOpen]);

    const allCategories = useMemo(() => {
        const categories = new Set((Array.isArray(products) ? products : []).map((product) => product.category).filter(Boolean));
        return [...DEFAULT_CATEGORIES.filter((category) => categories.has(category)), ...[...categories].filter((category) => !DEFAULT_CATEGORIES.includes(category))];
    }, [products]);

    const visibleCategories = useMemo(() => {
        if (activeCategory === "Все") return allCategories;
        if (activeCategory === "Другие") return allCategories.filter((category) => !FEATURED_CATEGORIES.includes(category));
        return [activeCategory];
    }, [activeCategory, allCategories]);

    const activeTab = activeCategory === "Все" || FEATURED_CATEGORIES.includes(activeCategory) ? activeCategory : "Другие";
    const selectSubcategory = (category, subcategory) => setSubcategories((current) => ({ ...current, [category]: subcategory }));

    return <div className="catalog-reference-page">
        <div className="catalog-reference-title-row">
            <h1>Каталог</h1>
            <div className="catalog-reference-sort-wrap">
                <select aria-label="Сортировка каталога" value={sort} onChange={(event) => setSort(event.target.value)}>
                    {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <LemonzIcon name="chevron-down" size={19} />
            </div>
        </div>

        {searchOpen && <div className="catalog-reference-search">
            <LemonzIcon name="search" size={19} />
            <input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти персонажа или вселенную" aria-label="Поиск по каталогу" />
            <button type="button" onClick={() => { onCloseSearch?.(); setQuery(""); }} aria-label="Закрыть поиск">×</button>
        </div>}

        <nav className="catalog-reference-category-tabs" aria-label="Вселенные каталога">
            {CATEGORY_TABS.map((category) => <button key={category.id} type="button"
                className={activeTab === category.id ? "active" : ""}
                onClick={() => onCategoryChange(category.id)} aria-pressed={activeTab === category.id}>
                {category.icon && <span className={`catalog-reference-tab-icon ${category.color}`}>{category.icon}</span>}
                {category.title}
            </button>)}
        </nav>

        {visibleCategories.length > 0 ? visibleCategories.map((category) => <CatalogSection
            key={category}
            category={category}
            products={products}
            subcategory={subcategories[category] || PRODUCT_SUBCATEGORIES[0]}
            onSelectSubcategory={selectSubcategory}
            sort={sort}
            query={query}
            favoriteProductIds={favoriteProductIds}
            onToggleFavorite={onToggleFavorite}
            onOpenProduct={onOpenProduct}
        />) : <div className="catalog-reference-empty">В выбранном разделе пока нет товаров.</div>}
    </div>;
}
