import { useEffect, useMemo, useRef, useState } from "react";
import LemonzIcon from "./LemonzIcon";
import { CUSTOM_OPTIONS } from "../data/products";

const money = (amount) => Number(amount).toLocaleString("ru-RU");

export default function ProductDetail({
    product,
    onClose,
    onAdd,
    showMessage,
    isFavorite = false,
    onToggleFavorite,
}) {
    const [selectedOptions, setSelectedOptions] = useState([]);
    const [nickname, setNickname] = useState("");
    const [imageFailed, setImageFailed] = useState(false);
    const backButtonRef = useRef(null);

    const totalPrice = useMemo(() => {
        const optionsPrice = CUSTOM_OPTIONS.reduce(
            (total, option) => total + (selectedOptions.includes(option.id) ? option.price : 0),
            0,
        );
        return Number(product.price) + optionsPrice;
    }, [product.price, selectedOptions]);

    useEffect(() => {
        const previousFocus = document.activeElement;
        backButtonRef.current?.focus({ preventScroll: true });

        const handleKeyDown = (event) => {
            if (event.key === "Escape") onClose();
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
        };
    }, [onClose]);

    const toggleOption = (optionId) => {
        setSelectedOptions((current) =>
            current.includes(optionId)
                ? current.filter((id) => id !== optionId)
                : [...current, optionId],
        );
    };

    const handleAdd = () => {
        const needsNickname = selectedOptions.includes("nickname");
        if (needsNickname && !nickname.trim()) {
            showMessage("Введите ник или отключите эту опцию");
            return;
        }

        onAdd({
            product,
            options: CUSTOM_OPTIONS.filter((option) => selectedOptions.includes(option.id)),
            nickname: needsNickname ? nickname.trim() : "",
            unitPrice: totalPrice,
        });
    };

    return (
        <div
            className="product-detail-overlay"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                className="product-detail-page"
                role="dialog"
                aria-modal="true"
                aria-labelledby="product-detail-title"
            >
                <header className="product-detail-topbar">
                    <button
                        ref={backButtonRef}
                        className="product-detail-round-button"
                        type="button"
                        onClick={onClose}
                        aria-label="Вернуться к каталогу"
                    >
                        <LemonzIcon name="back" size={22} />
                    </button>
                    <div className="product-detail-topbar-brand">
                        <span className="product-detail-brand-icon"><LemonzIcon name="planet" size={21} /></span>
                        <span>LEMONZ <small>КАРТОЧКА ФИГУРКИ</small></span>
                    </div>
                    <button
                        className={`product-detail-round-button product-detail-favorite ${isFavorite ? "active" : ""}`}
                        type="button"
                        onClick={onToggleFavorite}
                        aria-label={isFavorite ? "Удалить из избранного" : "Добавить в избранное"}
                        aria-pressed={isFavorite}
                    >
                        <LemonzIcon name="heart" size={21} />
                    </button>
                </header>

                <div className="product-detail-scroll">
                    <div className="product-detail-layout">
                        <div className="product-detail-media">
                            <div className="product-detail-photo">
                                <div className="product-detail-glow" aria-hidden="true" />
                                <span className="product-detail-photo-badge"><span /> LEMONZ ORIGINAL</span>
                                {!imageFailed && product.image ? (
                                    <img
                                        src={product.image}
                                        alt={`Фигурка ${product.name}`}
                                        onError={() => setImageFailed(true)}
                                    />
                                ) : (
                                    <div className="product-detail-photo-empty">
                                        <LemonzIcon name="package" size={57} />
                                        <span>Фото скоро появится</span>
                                    </div>
                                )}
                                <span className="product-detail-photo-watermark" aria-hidden="true">LZ</span>
                            </div>
                            <div className="product-detail-photo-footer">
                                <span><LemonzIcon name="diamond" size={16} /> Авторский дизайн</span>
                                <span><LemonzIcon name="badge-check" size={16} /> LEMONZ</span>
                            </div>
                        </div>

                        <div className="product-detail-content">
                            <div className="product-detail-eyebrow">
                                <span>КОЛЛЕКЦИЯ <strong>{product.category}</strong></span>
                                {product.isNew && <span className="product-detail-new-tag">NEW</span>}
                            </div>
                            <h2 id="product-detail-title">{product.name}</h2>
                            <p className="product-detail-subtitle">Коллекционная фигурка от LEMONZ</p>

                            <div className="product-detail-price-panel">
                                <div><small>Базовая стоимость</small><strong>{money(product.price)} ₽</strong></div>
                                <span>НА ЗАКАЗ</span>
                            </div>

                            <div className="product-detail-benefits">
                                <span><LemonzIcon name="package" size={18} /> 3D-печать</span>
                                <span><LemonzIcon name="heart" size={18} /> Ручная покраска</span>
                            </div>

                            <div className="product-detail-section-heading">
                                <div><small>СДЕЛАЙ ЕЁ СВОЕЙ</small><h3>Персонализация</h3></div>
                                <span>{selectedOptions.length} из {CUSTOM_OPTIONS.length}</span>
                            </div>

                            <div className="product-detail-options">
                                {CUSTOM_OPTIONS.map((option) => {
                                    const selected = selectedOptions.includes(option.id);
                                    return (
                                        <button
                                            key={option.id}
                                            type="button"
                                            className={`product-detail-option ${selected ? "selected" : ""}`}
                                            aria-pressed={selected}
                                            onClick={() => toggleOption(option.id)}
                                        >
                                            <span className="product-detail-option-check">{selected ? "✓" : "+"}</span>
                                            <span className="product-detail-option-text">
                                                <strong>{option.title}</strong>
                                                <small>{option.description}</small>
                                            </span>
                                            <b>+{money(option.price)} ₽</b>
                                        </button>
                                    );
                                })}
                            </div>

                            {selectedOptions.includes("nickname") && (
                                <label className="product-detail-nickname">
                                    <span>Ник для фигурки</span>
                                    <input
                                        type="text"
                                        maxLength={24}
                                        value={nickname}
                                        placeholder="Например, lemonzprime"
                                        onChange={(event) => setNickname(event.target.value)}
                                    />
                                </label>
                            )}

                            <div className="product-detail-note">
                                <LemonzIcon name="badge-check" size={21} />
                                <p>Каждая фигурка создаётся индивидуально. Дополнительные детали и пожелания можно обсудить при оформлении заказа.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <footer className="product-detail-checkout">
                    <div className="product-detail-checkout-price">
                        <small>Итого</small>
                        <strong>{money(totalPrice)} ₽</strong>
                    </div>
                    <button type="button" onClick={handleAdd} className="product-detail-add-button">
                        <LemonzIcon name="bag" size={20} />
                        <span>В корзину</span>
                        <LemonzIcon name="arrow" size={18} />
                    </button>
                </footer>
            </section>
        </div>
    );
}
