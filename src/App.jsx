import { useState } from "react";
import "./App.css";

const products = [
    {
        id: 1,
        name: "Jinx",
        category: "League of Legends",
        price: 7000,
        image: "/Jinx.png",
    },
    {
        id: 2,
        name: "Clove",
        category: "Valorant",
        price: 7000,
        image: "/Clove.png",
    },
    {
        id: 3,
        name: "Chamber",
        category: "Valorant",
        price: 7000,
        image: "/Chamber.png",
    },
];

function App() {
    const [activePage, setActivePage] = useState("Главная");
    const [cart, setCart] = useState([]);

    const telegram = window.Telegram?.WebApp;
    const user = telegram?.initDataUnsafe?.user;

    const showMessage = (message) => {
        if (
            telegram?.initData &&
            typeof telegram.showAlert === "function"
        ) {
            telegram.showAlert(message);
        } else {
            window.alert(message);
        }
    };

const handleOrder = (product) => {
    telegram?.HapticFeedback?.impactOccurred?.("medium");

    const alreadyAdded = cart.some(
        (item) => item.id === product.id
    );

    if (alreadyAdded) {
        showMessage(
            `${product.name} уже находится в корзине`
        );

        return;
    }

    setCart((currentCart) => [
        ...currentCart,
        product,
    ]);

    showMessage(
        `${product.name} добавлена в корзину`
    );
};

    const handleNavigation = (page) => {
        setActivePage(page);

        if (page !== "Главная") {
            showMessage(
                `Раздел «${page}» пока находится в разработке`
            );
        }
    };

    const handleShowAll = () => {
        showMessage("Здесь будет полный каталог фигурок");
    };

    const handleProfile = () => {
        if (user) {
            showMessage(`Профиль пользователя: ${user.first_name}`);
        } else {
            showMessage(
                "Данные профиля появятся после запуска через Telegram"
            );
        }
    };

    return (
        <div className="app">
            <header className="header">
                <div>
                    <span className="logo-icon">L</span>
                    <span className="logo-text">Lemonz</span>
                </div>

                <button
                    className="profile-button"
                    type="button"
                    onClick={handleProfile}
                >
                    {user?.first_name?.[0] ?? "С"}
                </button>
            </header>

            <main>
                <section className="hero">
                    <p className="eyebrow">
                        LEMONZ FIGURINES
                    </p>

                    <h1>
                        Найди своего любимого персонажа
                    </h1>

                    <p className="hero-description">
                        Коллекционные фигурки ручной работы
                    </p>

                    {user && (
                        <p className="welcome">
                            Привет, {user.first_name}!
                        </p>
                    )}
                </section>

                <section className="catalog">
                    <div className="section-title">
                        <h2>Популярные фигурки</h2>

                        <button
                            type="button"
                            onClick={handleShowAll}
                        >
                            Все
                        </button>
                    </div>

                    <div className="product-grid">
                        {products.map((product) => {
                            const isInCart = cart.some(
                                (item) => item.id === product.id
                            );

                            return (
                                <article
                                    className="product-card"
                                    key={product.id}
                                >
                                    <div className="product-image">
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                        />
                                    </div>

                                    <p className="category">
                                        {product.category}
                                    </p>

                                    <h3>{product.name}</h3>

                                    <div className="product-footer">
                                        <strong>
                                            {product.price.toLocaleString(
                                                "ru-RU"
                                            )}{" "}
                                            ₽
                                        </strong>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleOrder(product)
                                            }
                                        >
                                            {isInCart
                                                ? "В корзине"
                                                : "Купить"}
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>
            </main>

            <nav className="bottom-navigation">
                {["Главная", "Каталог", "Корзина", "Профиль"].map(
                    (page) => (
                        <button
                            key={page}
                            type="button"
                            className={
                                activePage === page
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                handleNavigation(page)
                            }
                        >
                            {page === "Корзина" && cart.length > 0
                                ? `Корзина (${cart.length})`
                                : page}
                        </button>
                    )
                )}
            </nav>
        </div>
    );
}

export default App;