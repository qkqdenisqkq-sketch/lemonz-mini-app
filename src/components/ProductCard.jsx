export default function ProductCard({
    product,
    onOpen,
}) {
    return (
        <article className="product-card">
            <button
                type="button"
                className="product-image-button"
                onClick={() => onOpen(product)}
                aria-label={`Открыть фигурку ${product.name}`}
            >
                <div className="product-image">
                    <img
                        src={product.image}
                        alt={product.name}
                    />
                </div>
            </button>

            <p className="category">
                {product.category}
            </p>

            <h3>{product.name}</h3>

            <div className="product-footer">
                <strong>
                    от{" "}
                    {Number(
                        product.price
                    ).toLocaleString("ru-RU")}{" "}
                    ₽
                </strong>

                <button
                    type="button"
                    className="primary-button"
                    onClick={() => onOpen(product)}
                >
                    Выбрать
                </button>
            </div>
        </article>
    );
}