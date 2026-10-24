import { useEffect, useMemo, useState } from "react";
import LemonzIcon from "../components/LemonzIcon";
import { CATEGORY_ICONS } from "../data/products";

// These exact image regions come from the design reference supplied by LEMONZ.
// Keeping the portraits independent from the surrounding HTML means the layout,
// product names, prices and navigation remain responsive and interactive.
const REFERENCE = "/home-reference.png";
const REFERENCE_WIDTH = 941;
const REFERENCE_REGIONS = {
    vote: { x: 30, y: 501, width: 432, height: 226 },
    auction: { x: 478, y: 501, width: 433, height: 226 },
    clove: { x: 34, y: 914, width: 202, height: 207 },
    iso: { x: 259, y: 914, width: 202, height: 207 },
    reyna: { x: 484, y: 914, width: 202, height: 207 },
    gojo: { x: 710, y: 914, width: 202, height: 207 },
    neon: { x: 34, y: 1335, width: 202, height: 197 },
    pink: { x: 259, y: 1335, width: 202, height: 197 },
    headphones: { x: 484, y: 1335, width: 202, height: 197 },
    lily: { x: 710, y: 1335, width: 202, height: 197 },
};

const SLIDES = [
    { id: "valorant", title: "НОВАЯ КОЛЛЕКЦИЯ", eyebrow: "VALORANT", description: "Любимые агенты\nв новом стиле", image: "/home-hero-dolls.png" },
    { id: "collection", title: "ОСОБЕННЫЕ ГЕРОИ", eyebrow: "LEMONZ", description: "Каждая фигурка\nсо своим характером", image: "/Chamber.png" },
    { id: "characters", title: "ТВОЯ КОЛЛЕКЦИЯ", eyebrow: "LEAGUE OF LEGENDS", description: "Оживи любимую\nвселенную", image: "/Jinx.png" },
    { id: "handmade", title: "СДЕЛАНО С ДУШОЙ", eyebrow: "HANDMADE", description: "Дизайн, печать\nи ручная покраска", image: "/Clove.png" },
];

const HOME_CATEGORIES = [
    { name: "Valorant", icon: CATEGORY_ICONS.Valorant, category: "Valorant" },
    { name: "Dota 2", icon: CATEGORY_ICONS["Dota 2"], category: "Dota 2" },
    { name: "League of Legends", icon: CATEGORY_ICONS["League of Legends"], category: "League of Legends" },
    { name: "Anime", icon: CATEGORY_ICONS.Anime, category: "Anime" },
    { name: "Другие", icon: CATEGORY_ICONS["Аксессуары"], category: "Аксессуары" },
];

const POPULAR_SHOWCASE = [
    { name: "Clove", category: "Valorant", art: "clove", samplePrice: 9500 },
    { name: "Iso", category: "Valorant", art: "iso", samplePrice: 9500 },
    { name: "Reyna", category: "Valorant", art: "reyna", samplePrice: 9500 },
    { name: "Gojo", category: "Anime", art: "gojo", samplePrice: 8900 },
];

const NEW_SHOWCASE = [
    { name: "Neon", category: "Valorant", art: "neon", samplePrice: 9500 },
    { name: "Ahri", category: "League of Legends", art: "pink", samplePrice: 9500 },
    { name: "Iso", category: "Valorant", art: "headphones", samplePrice: 9500 },
    { name: "Sage", category: "Valorant", art: "lily", samplePrice: 9500 },
];

function ReferenceCrop({ region, className = "" }) {
    const crop = REFERENCE_REGIONS[region];
    return (
        <span className={`storefront-reference-crop ${className}`} style={{ aspectRatio: `${crop.width} / ${crop.height}` }} aria-hidden="true">
            <img
                src={REFERENCE}
                alt=""
                draggable="false"
                loading={region === "vote" || region === "auction" ? "eager" : "lazy"}
                style={{
                    width: `${(REFERENCE_WIDTH / crop.width) * 100}%`,
                    left: `-${(crop.x / crop.width) * 100}%`,
                    top: `-${(crop.y / crop.height) * 100}%`,
                }}
            />
        </span>
    );
}

function Shelf({ title, entries, catalog, favoriteProductIds, onToggleFavorite, onOpenProduct, onUnavailable, onOpenCatalog }) {
    return (
        <section className="storefront-shelf" aria-label={title}>
            <div className="storefront-section-title">
                <h2>{title}</h2>
                <button type="button" onClick={onOpenCatalog}>Смотреть все <LemonzIcon name="arrow" size={16} /></button>
            </div>
            <div className="storefront-product-track">
                {entries.map((entry, index) => {
                    const product = catalog.find((item) => item.name.toLowerCase() === entry.name.toLowerCase());
                    const isFavorite = product ? favoriteProductIds.includes(product.id) : false;
                    const open = () => product ? onOpenProduct(product) : onUnavailable(entry.name);
                    return (
                        <article className="storefront-product" key={`${entry.name}-${index}`}>
                            <div className="storefront-product-photo">
                                <button type="button" className="storefront-open-photo" onClick={open} aria-label={`Посмотреть ${entry.name}`}>
                                    <ReferenceCrop region={entry.art} />
                                </button>
                                <button
                                    type="button"
                                    className={`storefront-favorite ${isFavorite ? "is-favorite" : ""}`}
                                    onClick={() => product ? onToggleFavorite(product.id) : onUnavailable(entry.name)}
                                    aria-label={isFavorite ? `Убрать ${entry.name} из избранного` : `Добавить ${entry.name} в избранное`}
                                ><LemonzIcon name="heart" size={15} /></button>
                            </div>
                            <div className="storefront-product-details">
                                <button type="button" onClick={open} className="storefront-product-name">{entry.name}</button>
                                <p>{entry.category}</p>
                                <div className="storefront-product-footer">
                                    <strong>{Number(product?.price ?? entry.samplePrice).toLocaleString("ru-RU")} ₽</strong>
                                    <button type="button" aria-label={`Выбрать ${entry.name}`} onClick={open}><LemonzIcon name="bag" size={15} /></button>
                                </div>
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}

export default function Storefront({ products, favoriteProductIds = [], onToggleFavorite, onOpenProduct, onUnavailable, onNavigate, onOpenCategory }) {
    const [slideIndex, setSlideIndex] = useState(0);
    const slide = SLIDES[slideIndex];
    const changeSlide = (direction) => setSlideIndex((current) => (current + direction + SLIDES.length) % SLIDES.length);

    useEffect(() => {
        const timer = window.setTimeout(() => setSlideIndex((current) => (current + 1) % SLIDES.length), 12000);
        return () => window.clearTimeout(timer);
    }, [slideIndex]);

    const catalog = useMemo(() => products || [], [products]);

    return (
        <div className="storefront-page">
            <section className="storefront-hero" aria-label="Коллекции LEMONZ">
                <img className="storefront-hero-image" src={slide.image} alt="" />
                <div className="storefront-hero-scrim" />
                <div className="storefront-hero-text">
                    <h1>{slide.title}</h1><strong>{slide.eyebrow}</strong>
                    <p>{slide.description}</p>
                    <button type="button" onClick={() => onNavigate("Каталог")}>Смотреть <LemonzIcon name="arrow" size={18} /></button>
                </div>
                <button type="button" className="storefront-hero-arrow storefront-hero-arrow-prev" onClick={() => changeSlide(-1)} aria-label="Предыдущий баннер"><LemonzIcon name="chevron-left" size={22} /></button>
                <button type="button" className="storefront-hero-arrow storefront-hero-arrow-next" onClick={() => changeSlide(1)} aria-label="Следующий баннер"><LemonzIcon name="chevron-right" size={22} /></button>
                <div className="storefront-hero-dots" aria-label="Выбор баннера">
                    {SLIDES.map((item, index) => (
                        <button key={item.id} type="button" className={slideIndex === index ? "active" : ""} aria-label={`Баннер ${index + 1}`} aria-pressed={slideIndex === index} onClick={() => setSlideIndex(index)} />
                    ))}
                </div>
            </section>

            <section className="storefront-features" aria-label="Голосование и аукцион">
                <button type="button" className="storefront-feature" onClick={() => onNavigate("Голосование")} aria-label="Голосование - выбери следующего героя LEMONZ">
                    <ReferenceCrop region="vote" />
                </button>
                <button type="button" className="storefront-feature" onClick={() => onNavigate("Аукцион")} aria-label="Аукцион - уникальные фигурки и эксклюзивы">
                    <ReferenceCrop region="auction" />
                </button>
            </section>

            <nav className="storefront-categories" aria-label="Категории фигурок">
                {HOME_CATEGORIES.map((category, index) => (
                    <button key={category.name} type="button" className={index === 0 ? "active" : ""} onClick={() => onOpenCategory(category.category)}>
                        <img src={category.icon} alt="" /><span>{category.name}</span>
                    </button>
                ))}
            </nav>

            <Shelf title="Популярное" entries={POPULAR_SHOWCASE} catalog={catalog} favoriteProductIds={favoriteProductIds} onToggleFavorite={onToggleFavorite} onOpenProduct={onOpenProduct} onUnavailable={onUnavailable} onOpenCatalog={() => onNavigate("Каталог")} />
            <Shelf title="Новинки" entries={NEW_SHOWCASE} catalog={catalog} favoriteProductIds={favoriteProductIds} onToggleFavorite={onToggleFavorite} onOpenProduct={onOpenProduct} onUnavailable={onUnavailable} onOpenCatalog={() => onNavigate("Каталог")} />
        </div>
    );
}
