import {
    useEffect,
    useMemo,
    useState,
} from "react";

import Header from "./components/Header";
import BottomNav from "./components/BottomNav";
import ProductDetail from "./components/ProductDetail";
import ScrollTop from "./components/ScrollTop";

import Home from "./pages/Home";
import Storefront from "./pages/Storefront";
import Voting from "./pages/Voting";
import Auctions from "./pages/Auctions";
import Cart from "./pages/Cart";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";

import {
    DEFAULT_PRODUCTS,
} from "./data/products";

import {
    useLocalStorage,
} from "./hooks/useLocalStorage";

import {
    useTelegram,
} from "./hooks/useTelegram";

import "./styles/app.css";
import "./styles/lemonz-light.css";
import "./styles/storefront.css";
import "./styles/auction-detail.css";
import "./styles/auction-list.css";
import "./styles/product-detail.css";
import "./styles/theme.css";
import "./styles/admin-workspace.css";
import "./styles/voting-reference.css";

function App() {
    const [activePage, setActivePage] =
        useState("Главная");

    const [auctionDetailOpen, setAuctionDetailOpen] = useState(false);

    const [theme, setTheme] = useLocalStorage("lemonz-theme", "light");
    const activeTheme = theme === "dark" ? "dark" : "light";

    useEffect(() => {
        document.documentElement.dataset.lemonzTheme = activeTheme;
        return () => { delete document.documentElement.dataset.lemonzTheme; };
    }, [activeTheme]);

    const [products, setProducts] =
        useLocalStorage(
            "lemonz-products",
            DEFAULT_PRODUCTS
        );

    const [cart, setCart] =
        useLocalStorage(
            "lemonz-cart",
            []
        );

    const [
        favoriteProductIds,
        setFavoriteProductIds,
    ] = useLocalStorage(
        "lemonz-favorites",
        []
    );

    const [
        selectedProduct,
        setSelectedProduct,
    ] = useState(null);

    const [
        showScrollTop,
        setShowScrollTop,
    ] = useState(false);

    const {
        user,
        isAdmin,
        haptic,
        showMessage,
    } = useTelegram();

    const favoriteProducts =
        useMemo(() => {
            return products.filter(
                (product) =>
                    favoriteProductIds.includes(
                        product.id
                    )
            );
        }, [
            products,
            favoriteProductIds,
        ]);

    const toggleFavorite = (
        productId
    ) => {
        haptic();

        setFavoriteProductIds(
            (currentIds) => {
                if (
                    currentIds.includes(
                        productId
                    )
                ) {
                    return currentIds.filter(
                        (id) =>
                            id !==
                            productId
                    );
                }

                return [
                    ...currentIds,
                    productId,
                ];
            }
        );
    };

    const cartCount = useMemo(() => {
        return cart.reduce(
            (total, item) =>
                total +
                Number(
                    item.quantity ?? 0
                ),
            0
        );
    }, [cart]);

    const cartTotal = useMemo(() => {
        return cart.reduce(
            (total, item) =>
                total +
                Number(
                    item.unitPrice ?? 0
                ) *
                    Number(
                        item.quantity ?? 0
                    ),
            0
        );
    }, [cart]);

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(
                window.scrollY > 450
            );
        };

        window.addEventListener(
            "scroll",
            handleScroll,
            {
                passive: true,
            }
        );

        handleScroll();

        return () => {
            window.removeEventListener(
                "scroll",
                handleScroll
            );
        };
    }, []);

    useEffect(() => {
        document.body.classList.toggle(
            "modal-open",
            Boolean(
                selectedProduct
            )
        );

        return () => {
            document.body.classList.remove(
                "modal-open"
            );
        };
    }, [selectedProduct]);

    useEffect(() => {
        if (
            activePage === "Админ" &&
            !isAdmin
        ) {
            const timer = window.setTimeout(() => setActivePage("Главная"), 0);
            return () => window.clearTimeout(timer);
        }
    }, [
        activePage,
        isAdmin,
    ]);

    const navigate = (page) => {
        if (
            page === "Админ" &&
            !isAdmin
        ) {
            showMessage(
                "У вас нет доступа к админ-панели"
            );

            return;
        }

        haptic();

        setActivePage(page);

        window.setTimeout(() => {
            if (page === "Каталог") {
                document.querySelector(".home-catalog")?.scrollIntoView({ behavior: "smooth" });
            } else {
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        }, 0);
    };

    const addConfiguredProduct = ({
        product,
        options,
        nickname,
        unitPrice,
    }) => {
        const configurationKey =
            JSON.stringify({
                productId:
                    product.id,
                optionIds: options
                    .map(
                        (option) =>
                            option.id
                    )
                    .sort(),
                nickname,
            });

        const existingItem =
            cart.find(
                (item) =>
                    item.configurationKey ===
                    configurationKey
            );

        if (existingItem) {
            setCart(
                (currentCart) =>
                    currentCart.map(
                        (item) =>
                            item.configurationKey ===
                            configurationKey
                                ? {
                                      ...item,
                                      quantity:
                                          Number(
                                              item.quantity ??
                                                  0
                                          ) +
                                          1,
                                  }
                                : item
                    )
            );
        } else {
            setCart(
                (currentCart) => [
                    ...currentCart,
                    {
                        cartId: `${
                            product.id
                        }-${Date.now()}`,
                        configurationKey,
                        productId:
                            product.id,
                        name:
                            product.name,
                        category:
                            product.category,
                        image:
                            product.image,
                        unitPrice,
                        options,
                        nickname,
                        quantity: 1,
                    },
                ]
            );
        }

        haptic("success");
        setSelectedProduct(null);
    };

    const increaseQuantity = (
        cartId
    ) => {
        haptic();

        setCart(
            (currentCart) =>
                currentCart.map(
                    (item) =>
                        item.cartId ===
                        cartId
                            ? {
                                  ...item,
                                  quantity:
                                      Number(
                                          item.quantity ??
                                              0
                                      ) +
                                      1,
                              }
                            : item
                )
        );
    };

    const decreaseQuantity = (
        cartId
    ) => {
        haptic();

        setCart(
            (currentCart) =>
                currentCart
                    .map(
                        (item) =>
                            item.cartId ===
                            cartId
                                ? {
                                      ...item,
                                      quantity:
                                          Number(
                                              item.quantity ??
                                                  0
                                          ) -
                                          1,
                                  }
                                : item
                    )
                    .filter(
                        (item) =>
                            item.quantity >
                            0
                    )
        );
    };

    const removeFromCart = (
        cartId
    ) => {
        haptic("warning");

        setCart(
            (currentCart) =>
                currentCart.filter(
                    (item) =>
                        item.cartId !==
                        cartId
                )
        );
    };

    const clearCart = () => {
        if (
            cart.length === 0
        ) {
            return;
        }

        const confirmed =
            window.confirm(
                "Очистить корзину?"
            );

        if (!confirmed) {
            return;
        }

        haptic("warning");
        setCart([]);
    };

const checkout = async (comment = "") => {
    if (cart.length === 0) {
        showMessage("Корзина пуста");
        return;
    }

    const orderNumber = `LF-${Date.now()}`;

    const order = {
        orderNumber,
        createdAt: new Date().toISOString(),

        customer: {
            telegramId: user?.id ?? null,
            firstName:
                user?.first_name ??
                "Пользователь",
            lastName:
                user?.last_name ?? "",
            username:
                user?.username ?? "",
        },

        items: cart.map((item) => ({
            productId: item.productId,
            name: item.name,
            category: item.category,
            image: item.image,
            unitPrice: Number(
                item.unitPrice
            ),
            quantity: Number(
                item.quantity
            ),
            nickname:
                item.nickname ?? "",
            options:
                item.options ?? [],
        })),

        comment:
            String(
                comment ?? ""
            ).trim(),

        total:
            Number(
                cartTotal
            ),
    };

    try {
        haptic("medium");

        const response = await fetch(
            "/api/create-order",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json",
                },
                body: JSON.stringify(order),
            }
        );

        const responseText =
            await response.text();

        let result;

        try {
            result =
                responseText
                    ? JSON.parse(
                          responseText
                      )
                    : {};
        } catch {
            throw new Error(
                response.ok
                    ? "Сервер вернул некорректный ответ"
                    : responseText
                          .slice(
                              0,
                              180
                          )
                          .trim() ||
                      `Ошибка сервера ${response.status}`
            );
        }

        if (
            !response.ok ||
            !result.ok
        ) {
            throw new Error(
                result.error ||
                    `Ошибка сервера ${response.status}`
            );
        }

        haptic("success");

        showMessage(
            `Заказ ${orderNumber} отправлен! Мы свяжемся с вами в Telegram.`
        );

        setCart([]);
    } catch (error) {
        console.error(
            "Ошибка отправки заказа:",
            error
        );

        haptic("warning");

        showMessage(
            `Не удалось отправить заказ: ${
                error?.message ??
                "неизвестная ошибка"
            }`
        );
    }
};

    const saveProduct = (
        preparedProduct
    ) => {
        if (!isAdmin) {
            showMessage(
                "Нет доступа к редактированию"
            );

            return;
        }

        if (
            preparedProduct.id !==
            null
        ) {
            setProducts(
                (currentProducts) =>
                    currentProducts.map(
                        (product) =>
                            product.id ===
                            preparedProduct.id
                                ? {
                                      ...product,
                                      ...preparedProduct,
                                  }
                                : product
                    )
            );

            return;
        }

        setProducts(
            (currentProducts) => [
                ...currentProducts,
                {
                    ...preparedProduct,
                    id: Date.now(),
                },
            ]
        );
    };

    const deleteProduct = (
        productId
    ) => {
        if (!isAdmin) {
            return;
        }

        const product =
            products.find(
                (item) =>
                    item.id ===
                    productId
            );

        const confirmed =
            window.confirm(
                `Удалить фигурку «${
                    product?.name ??
                    ""
                }»?`
            );

        if (!confirmed) {
            return;
        }

        setProducts(
            (currentProducts) =>
                currentProducts.filter(
                    (item) =>
                        item.id !==
                        productId
                )
        );

        setCart(
            (currentCart) =>
                currentCart.filter(
                    (item) =>
                        item.productId !==
                        productId
                )
        );
    };

    const resetProducts = () => {
        if (!isAdmin) {
            return;
        }

        const confirmed =
            window.confirm(
                "Вернуть исходный список фигурок?"
            );

        if (!confirmed) {
            return;
        }

        setProducts(
            DEFAULT_PRODUCTS
        );
    };

    const scrollToTop = () => {
        haptic();

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    return (
        <div className={`app theme-${activeTheme} ${activePage === "Аукцион" ? (auctionDetailOpen ? "auction-detail-mode" : "auction-list-mode") : ""}`}>
            {activePage !== "Аукцион" && activePage !== "Голосование" && <Header
                user={user}
                cartCount={cartCount}
                theme={activeTheme}
                onToggleTheme={() => { haptic(); setTheme((current) => current === "dark" ? "light" : "dark"); }}
                onHome={() =>
                    navigate("Главная")
                }
                onSearch={() => {
                    navigate("Каталог");
                    window.setTimeout(() => document.querySelector(".search-toggle-button")?.click(), 90);
                }}
                onFavorites={() => navigate("Профиль")}
                onCart={() => navigate("Корзина")}
                onProfile={() =>
                    navigate("Профиль")
                }
            />}

            <main>
                {activePage === "Главная" && (
                    <Storefront
                        products={products}
                        favoriteProductIds={favoriteProductIds}
                        onToggleFavorite={toggleFavorite}
                        onOpenProduct={setSelectedProduct}
                        onUnavailable={(name) => showMessage(`Фигурка ${name} пока представлена только как концепт. Следи за новинками LEMONZ!`)}
                        onNavigate={navigate}
                        onOpenCategory={(category) => {
                            navigate("Каталог");
                            window.setTimeout(() => {
                                const section = [...document.querySelectorAll(".category-section")].find((item) => item.querySelector(".category-heading h2")?.textContent?.trim() === category);
                                section?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }, 140);
                        }}
                    />
                )}

                {activePage === "Каталог" && (
                    <div className="catalog-screen">
                    <Home
                        onNavigate={navigate}
                        products={
                            products
                        }
                        user={user}
                        favoriteProductIds={
                            favoriteProductIds
                        }
                        onToggleFavorite={
                            toggleFavorite
                        }
                        onOpenCatalog={() =>
                            navigate(
                                "Каталог"
                            )
                        }
                        onOpenProduct={
                            setSelectedProduct
                        }
                    />
                    </div>
                )}

                {activePage === "Голосование" && (
                    <Voting user={user} isAdmin={isAdmin} showMessage={showMessage} haptic={haptic} />
                )}

                {activePage === "Аукцион" && (
                    <Auctions user={user} isAdmin={isAdmin} showMessage={showMessage} haptic={haptic} onDetailChange={setAuctionDetailOpen} onHome={() => navigate("Главная")} />
                )}


                {activePage ===
                    "Корзина" && (
                    <Cart
                        cart={cart}
                        cartCount={
                            cartCount
                        }
                        cartTotal={
                            cartTotal
                        }
                        onOpenCatalog={() =>
                            navigate(
                                "Каталог"
                            )
                        }
                        onIncrease={
                            increaseQuantity
                        }
                        onDecrease={
                            decreaseQuantity
                        }
                        onRemove={
                            removeFromCart
                        }
                        onClear={
                            clearCart
                        }
                        onCheckout={
                            checkout
                        }
                    />
                )}

                {activePage ===
                    "Профиль" && (
                    <Profile
                        user={user}
                        isAdmin={
                            isAdmin
                        }
                        favoriteProducts={
                            favoriteProducts
                        }
                        onOpenProduct={
                            setSelectedProduct
                        }
                        onToggleFavorite={
                            toggleFavorite
                        }
                        onOpenCatalog={() =>
                            navigate(
                                "Главная"
                            )
                        }
                        onOpenAdmin={() =>
                            navigate(
                                "Админ"
                            )
                        }
                    />
                )}

                {activePage ===
                    "Админ" &&
                    isAdmin && (
                        <Admin
                            user={user}
                            isAdmin={isAdmin}
                            showMessage={showMessage}
                            haptic={haptic}
                            products={
                                products
                            }
                            onSave={
                                saveProduct
                            }
                            onDelete={
                                deleteProduct
                            }
                            onReset={
                                resetProducts
                            }
                        />
                    )}
            </main>

            <ScrollTop
                visible={
                    showScrollTop
                }
                onClick={
                    scrollToTop
                }
            />

            {!(activePage === "Аукцион" && auctionDetailOpen) && <BottomNav
                activePage={
                    activePage
                }
                onNavigate={
                    navigate
                }
                cartCount={
                    cartCount
                }
                isAdmin={
                    isAdmin
                }
            />}

            {selectedProduct && (
                <ProductDetail
                    product={
                        selectedProduct
                    }
                    isFavorite={favoriteProductIds.includes(selectedProduct.id)}
                    onToggleFavorite={() => toggleFavorite(selectedProduct.id)}
                    onClose={() =>
                        setSelectedProduct(
                            null
                        )
                    }
                    onAdd={
                        addConfiguredProduct
                    }
                    showMessage={
                        showMessage
                    }
                />
            )}
        </div>
    );
}

export default App;
