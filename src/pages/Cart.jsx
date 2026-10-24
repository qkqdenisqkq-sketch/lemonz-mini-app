import { useState } from "react";

export default function Cart({
    cart,
    cartCount,
    cartTotal,
    cartDiscount,
    cartFinalTotal,
    appliedPromo,
    onApplyPromo,
    onRemovePromo,
    demoPromoHint,
    onOpenCatalog,
    onIncrease,
    onDecrease,
    onRemove,
    onClear,
    onCheckout,
}) {
    const [comment, setComment] =
        useState("");
    const [promoInput, setPromoInput] = useState("");
    const [promoError, setPromoError] = useState("");
    const [checkingPromo, setCheckingPromo] = useState(false);

    const handlePromo = async (event) => {
        event.preventDefault();
        if (checkingPromo) return;
        setCheckingPromo(true);
        setPromoError("");
        try {
            await onApplyPromo(promoInput);
        } catch (error) {
            setPromoError(error?.message || "Не удалось применить промокод");
        } finally {
            setCheckingPromo(false);
        }
    };

    const handleCheckout = () => {
        onCheckout(comment.trim());
    };

    return (
        <section className="cart-page">
            <div className="page-heading">
                <div>
                    <p className="section-label">
                        ТВОЙ ЗАКАЗ
                    </p>

                    <h1>Корзина</h1>
                </div>

                {cart.length > 0 && (
                    <button
                        type="button"
                        className="text-button danger-button"
                        onClick={onClear}
                    >
                        Очистить
                    </button>
                )}
            </div>

            {cart.length === 0 ? (
                <div className="empty-cart">
                    <div className="empty-cart-icon">
                        🛒
                    </div>

                    <h2>
                        Корзина пока пустая
                    </h2>

                    <p>
                        Добавь фигурки с
                        главной страницы.
                    </p>

                    <button
                        type="button"
                        className="primary-button large-button"
                        onClick={onOpenCatalog}
                    >
                        Перейти к фигуркам
                    </button>
                </div>
            ) : (
                <>
                    <div className="cart-list">
                        {cart.map((item) => (
                            <article
                                className="cart-item"
                                key={item.cartId}
                            >
                                <div className="cart-item-image">
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                    />
                                </div>

                                <div className="cart-item-info">
                                    <p className="category">
                                        {item.category}
                                    </p>

                                    <h3>
                                        {item.name}
                                    </h3>

                                    {item.options?.length >
                                        0 && (
                                        <div className="cart-options">
                                            {item.options.map(
                                                (
                                                    option
                                                ) => (
                                                    <span
                                                        key={
                                                            option.id
                                                        }
                                                    >
                                                        {
                                                            option.title
                                                        }
                                                    </span>
                                                )
                                            )}

                                            {item.nickname && (
                                                <span>
                                                    Ник:{" "}
                                                    {
                                                        item.nickname
                                                    }
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <strong>
                                        {Number(
                                            item.unitPrice
                                        ).toLocaleString(
                                            "ru-RU"
                                        )}{" "}
                                        ₽
                                    </strong>

                                    <div className="cart-actions">
                                        <div className="quantity-control">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onDecrease(
                                                        item.cartId
                                                    )
                                                }
                                            >
                                                −
                                            </button>

                                            <span>
                                                {
                                                    item.quantity
                                                }
                                            </span>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onIncrease(
                                                        item.cartId
                                                    )
                                                }
                                            >
                                                +
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            className="remove-button"
                                            onClick={() =>
                                                onRemove(
                                                    item.cartId
                                                )
                                            }
                                        >
                                            Удалить
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>

                    <label className="order-comment">
                        <span>
                            Комментарий к заказу
                        </span>

                        <textarea
                            value={comment}
                            maxLength={500}
                            placeholder="Например: желаемый цвет подиума, сроки, детали персонажа или доставки"
                            onChange={(event) =>
                                setComment(
                                    event.target
                                        .value
                                )
                            }
                        />

                        <small>
                            {comment.length}/500
                        </small>
                    </label>

                    <section className="cart-promo" aria-label="Промокод">
                        <div className="cart-promo-heading">
                            <span className="cart-promo-icon" aria-hidden="true">%</span>
                            <div>
                                <h2>Есть промокод?</h2>
                                <p>Примени его и получи скидку на заказ</p>
                            </div>
                        </div>

                        {appliedPromo ? (
                            <div className="cart-promo-applied" role="status">
                                <div>
                                    <strong>✓ {appliedPromo.code}</strong>
                                    <span>{appliedPromo.label}</span>
                                </div>
                                <button type="button" onClick={() => { onRemovePromo(); setPromoInput(""); setPromoError(""); }}>
                                    Убрать
                                </button>
                            </div>
                        ) : (
                            <form className="cart-promo-form" onSubmit={handlePromo}>
                                <input
                                    type="text"
                                    value={promoInput}
                                    onChange={(event) => { setPromoInput(event.target.value.toUpperCase()); setPromoError(""); }}
                                    placeholder="Введи промокод"
                                    aria-label="Промокод"
                                    maxLength={32}
                                    autoComplete="off"
                                    spellCheck={false}
                                    disabled={checkingPromo}
                                />
                                <button type="submit" disabled={checkingPromo || !promoInput.trim()}>
                                    {checkingPromo ? "Проверяем..." : "Применить"}
                                </button>
                            </form>
                        )}
                        {promoError && <p className="cart-promo-error" role="alert">{promoError}</p>}
                        {demoPromoHint && !appliedPromo && <small className="cart-promo-hint">Демо-код для проверки дизайна: {demoPromoHint}</small>}
                    </section>

                    <div className="cart-summary">
                        <div className="summary-row">
                            <span>
                                Товаров
                            </span>

                            <span>
                                {cartCount}
                            </span>
                        </div>

                        <div className="summary-row cart-price-before">
                            <span>Сумма товаров</span>
                            <span>{Number(cartTotal).toLocaleString("ru-RU")} ₽</span>
                        </div>

                        {cartDiscount > 0 && <div className="summary-row cart-price-discount" aria-live="polite">
                            <span>Скидка по промокоду</span>
                            <strong>−{Number(cartDiscount).toLocaleString("ru-RU")} ₽</strong>
                        </div>}

                        <div className="summary-row total-row" aria-live="polite">
                            <span>
                                Итого
                            </span>

                            <strong>
                                {Number(
                                    cartFinalTotal
                                ).toLocaleString(
                                    "ru-RU"
                                )}{" "}
                                ₽
                            </strong>
                        </div>

                        <button
                            type="button"
                            className="primary-button checkout-button"
                            onClick={
                                handleCheckout
                            }
                        >
                            Оформить заказ
                        </button>
                    </div>
                </>
            )}
        </section>
    );
}
