import { useEffect, useMemo, useState } from "react";
import LemonzIcon from "../components/LemonzIcon";
import FigureArt from "../components/FigureArt";
import { CATEGORY_ICONS } from "../data/products";
import { getStorefrontShelves } from "../lib/storefrontShelves";

// Only the two activity banners use the reference artwork. Figurine shelves
// always use the real catalog images and admin-controlled category flags.
const REFERENCE = "/home-reference.png";
const REFERENCE_WIDTH = 941;
const REFERENCE_REGIONS = {
    vote: { x: 30, y: 501, width: 432, height: 226 },
    auction: { x: 478, y: 501, width: 433, height: 226 },
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

function Shelf({ title, products, favoriteProductIds, onToggleFavorite, onOpenProduct }) {
    return (
        <section className="storefront-shelf" aria-label={title}>
            <div className="storefront-section-title">
                <h2>{title}</h2>
            </div>
            {products.length > 0 ? (
            <div className="storefront-product-track" role="region" aria-label={`Листай по горизонтали: ${title}`} tabIndex={0}>
                {products.map((product) => {
                    const isFavorite = favoriteProductIds.includes(product.id);
                    const open = () => onOpenProduct(product);
                    return (
                        <article className="storefront-product" key={product.id}>
                            <div className="storefront-product-photo">
                                <button type="button" className="storefront-open-photo" onClick={open} aria-label={`Посмотреть ${product.name}`}>
                                    <FigureArt src={product.image} name={product.name} />
                                </button>
                                <button
                                    type="button"
                                    className={`storefront-favorite ${isFavorite ? "is-favorite" : ""}`}
                                    onClick={() => onToggleFavorite(product.id)}
                                    aria-label={isFavorite ? `Убрать ${product.name} из избранного` : `Добавить ${product.name} в избранное`}
                                ><LemonzIcon name="heart" size={15} /></button>
                            </div>
                            <div className="storefront-product-details">
                                <button type="button" onClick={open} className="storefront-product-name">{product.name}</button>
                                <p>{product.category}</p>
                                <div className="storefront-product-footer">
                                    <strong>{Number(product.price).toLocaleString("ru-RU")} ₽</strong>
                                    <button type="button" aria-label={`Выбрать ${product.name}`} onClick={open}><LemonzIcon name="bag" size={15} /></button>
                                </div>
                            </div>
                        </article>
                    );
                })}
            </div>
            ) : <p className="storefront-shelf-empty">Скоро здесь появятся фигурки.</p>}
        </section>
    );
}

export default function Storefront({ products, favoriteProductIds = [], onToggleFavorite, onOpenProduct, onNavigate, onOpenCategory }) {
    const [slideIndex, setSlideIndex] = useState(0);
    const slide = SLIDES[slideIndex];
    const changeSlide = (direction) => setSlideIndex((current) => (current + direction + SLIDES.length) % SLIDES.length);

    useEffect(() => {
        const timer = window.setTimeout(() => setSlideIndex((current) => (current + 1) % SLIDES.length), 12000);
        return () => window.clearTimeout(timer);
    }, [slideIndex]);

    const { popular, newArrivals } = useMemo(() => getStorefrontShelves(products), [products]);

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

            <Shelf title="Популярное" products={popular} favoriteProductIds={favoriteProductIds} onToggleFavorite={onToggleFavorite} onOpenProduct={onOpenProduct} />
            <Shelf title="Новинки" products={newArrivals} favoriteProductIds={favoriteProductIds} onToggleFavorite={onToggleFavorite} onOpenProduct={onOpenProduct} />
        </div>
    );
}
