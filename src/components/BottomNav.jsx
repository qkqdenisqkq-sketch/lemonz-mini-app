import LemonzIcon from "./LemonzIcon";

export default function BottomNav({
    activePage,
    onNavigate,
    cartCount,
    isAdmin,
}) {
    const pages = [
        "Главная",
        "Каталог",
        "Корзина",
        "Профиль",
    ];

    const icons = { "Главная": "home", "Каталог": "grid", "Корзина": "cart", "Профиль": "user", "Админ": "settings" };

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
                    <span className="bottom-nav-icon" aria-hidden="true"><LemonzIcon name={icons[page]} size={24} /></span>
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
