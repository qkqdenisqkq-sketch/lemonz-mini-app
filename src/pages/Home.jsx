import ProductCard from "../components/ProductCard";

export default function Home({
    products,
    user,
    onOpenCatalog,
    onOpenProduct,
}) {
    const popularProducts = products
        .filter(
            (product) =>
                product.popular
        )
        .slice(0, 4);

    const visibleProducts =
        popularProducts.length > 0
            ? popularProducts
            : products.slice(0, 4);

    return (
        <>
            <section className="hero">
                <p className="eyebrow">
                    LEMONZ FIGURINES
                </p>

                <h1>
                    Найди своего любимого
                    персонажа
                </h1>

                <p className="hero-description">
                    Коллекционные фигурки
                    ручной работы
                </p>

                {user && (
                    <p className="welcome">
                        Привет,{" "}
                        {user.first_name}!
                    </p>
                )}

                <button
                    type="button"
                    className="primary-button hero-button"
                    onClick={onOpenCatalog}
                >
                    Смотреть каталог
                </button>
            </section>

            <section className="catalog">
                <div className="section-title">
                    <div>
                        <p className="section-label">
                            КОЛЛЕКЦИЯ
                        </p>

                        <h2>
                            Популярные фигурки
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="text-button"
                        onClick={onOpenCatalog}
                    >
                        Все
                    </button>
                </div>

                <div className="product-grid">
                    {visibleProducts.map(
                        (product) => (
                            <ProductCard
                                key={
                                    product.id
                                }
                                product={
                                    product
                                }
                                onOpen={
                                    onOpenProduct
                                }
                            />
                        )
                    )}
                </div>
            </section>
        </>
    );
}