export default function Cart({
    cart,
    cartCount,
    cartTotal,
    onOpenCatalog,
    onIncrease,
    onDecrease,
    onRemove,
    onClear,
    onCheckout,
}) {
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
                        Добавь фигурки из
                        каталога, и они
                        появятся здесь.
                    </p>

                    <button
                        type="button"
                        className="primary-button large-button"
                        onClick={
                            onOpenCatalog
                        }
                    >
                        Открыть каталог
                    </button>
                </div>
            ) : (
                <>
                    <div className="cart-list">
                        {cart.map((item) => (
                            <article
                                className="cart-item"
                                key={
                                    item.cartId
                                }
                            >
                                <div className="cart-item-image">
                                    <img
                                        src={
                                            item.image
                                        }
                                        alt={
                                            item.name
                                        }
                                    />
                                </div>

                                <div className="cart-item-info">
                                    <p className="category">
                                        {
                                            item.category
                                        }
                                    </p>

                                    <h3>
                                        {item.name}
                                    </h3>

                                    {item.options
                                        ?.length >
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
                                                aria-label="Уменьшить количество"
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
                                                aria-label="Увеличить количество"
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

                    <div className="cart-summary">
                        <div className="summary-row">
                            <span>
                                Товаров
                            </span>

                            <span>
                                {cartCount}
                            </span>
                        </div>

                        <div className="summary-row total-row">
                            <span>
                                Итого
                            </span>

                            <strong>
                                {Number(
                                    cartTotal
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
                                onCheckout
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