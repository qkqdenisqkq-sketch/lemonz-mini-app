export default function BottomNav({
    activePage,
    onNavigate,
    cartCount,
    isAdmin,
}) {
    const pages = [
        "Главная",
        "Корзина",
        "Профиль",
    ];

    if (isAdmin) {
        pages.push("Админ");
    }

    return (
        <nav
            className={`bottom-navigation ${
                isAdmin
                    ? "admin-navigation"
                    : ""
            }`}
        >
            {pages.map((page) => (
                <button
                    key={page}
                    type="button"
                    className={
                        activePage === page
                            ? "active"
                            : ""
                    }
                    onClick={() =>
                        onNavigate(page)
                    }
                >
                    <span>{page}</span>

                    {page === "Корзина" &&
                        cartCount > 0 && (
                            <span className="cart-badge">
                                {cartCount}
                            </span>
                        )}
                </button>
            ))}
        </nav>
    );
}
