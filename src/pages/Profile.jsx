export default function Profile({
    user,
    isAdmin,
    favoriteProducts = [],
    onOpenProduct,
    onToggleFavorite,
    onOpenCatalog,
    onOpenAdmin,
}) {
    const displayName = [
        user?.first_name,
        user?.last_name,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <section className="profile-page">
            <div className="profile-card">
                <div className="profile-avatar">
                    {user?.first_name?.[0] ??
                        "L"}
                </div>

                <div className="profile-main-info">
                    <p className="section-label">
                        ПРОФИЛЬ
                    </p>

                    <h1>
                        {displayName ||
                            "Пользователь Lemonz"}
                    </h1>

                    {user?.username && (
                        <p className="profile-username">
                            @{user.username}
                        </p>
                    )}
                </div>
            </div>

            <div className="profile-section-heading">
                <div>
                    <p className="section-label">
                        ИЗБРАННОЕ
                    </p>

                    <h2>
                        Любимые фигурки
                    </h2>
                </div>

                <span className="favorites-count">
                    {
                        favoriteProducts.length
                    }
                </span>
            </div>

            {favoriteProducts.length >
            0 ? (
                <div className="favorites-grid">
                    {favoriteProducts.map(
                        (product) => (
                            <article
                                key={
                                    product.id
                                }
                                className="favorite-profile-card"
                            >
                                <button
                                    type="button"
                                    className="favorite-button active"
                                    onClick={() =>
                                        onToggleFavorite?.(
                                            product.id
                                        )
                                    }
                                    aria-label="Удалить из избранного"
                                >
                                    ♥
                                </button>

                                <button
                                    type="button"
                                    className="favorite-profile-open"
                                    onClick={() =>
                                        onOpenProduct?.(
                                            product
                                        )
                                    }
                                >
                                    <div className="favorite-profile-image">
                                        <img
                                            src={
                                                product.image
                                            }
                                            alt={
                                                product.name
                                            }
                                        />
                                    </div>

                                    <p className="category">
                                        {
                                            product.category
                                        }
                                    </p>

                                    <h3>
                                        {
                                            product.name
                                        }
                                    </h3>

                                    <strong>
                                        {Number(
                                            product.price
                                        ).toLocaleString(
                                            "ru-RU"
                                        )}{" "}
                                        ₽
                                    </strong>
                                </button>
                            </article>
                        )
                    )}
                </div>
            ) : (
                <div className="favorites-empty">
                    <div className="favorites-empty-icon">
                        ♡
                    </div>

                    <h3>
                        Пока ничего не добавлено
                    </h3>

                    <p>
                        Нажимай на сердечко у
                        понравившейся фигурки,
                        и она появится здесь.
                    </p>

                    <button
                        type="button"
                        className="primary-button"
                        onClick={
                            onOpenCatalog
                        }
                    >
                        Смотреть фигурки
                    </button>
                </div>
            )}

            {isAdmin && (
                <button
                    type="button"
                    className="secondary-button profile-admin-button"
                    onClick={
                        onOpenAdmin
                    }
                >
                    Открыть админ-панель
                </button>
            )}
        </section>
    );
}
