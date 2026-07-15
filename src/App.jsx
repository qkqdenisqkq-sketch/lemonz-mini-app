import {
    useEffect,
    useMemo,
    useState,
} from "react";

import Header from "./components/Header";
import BottomNav from "./components/BottomNav";
import ProductModal from "./components/ProductModal";
import ScrollTop from "./components/ScrollTop";

import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
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

function App() {
    const [activePage, setActivePage] =
        useState("Главная");

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
            setActivePage("Главная");
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

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
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

    const checkout = () => {
        if (
            cart.length === 0
        ) {
            showMessage(
                "Корзина пуста"
            );

            return;
        }

        haptic("success");

        showMessage(
            `Заказ на сумму ${cartTotal.toLocaleString(
                "ru-RU"
            )} ₽ готов к оформлению`
        );
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
        <div className="app">
            <Header
                user={user}
                onHome={() =>
                    navigate("Главная")
                }
                onProfile={() =>
                    navigate("Профиль")
                }
            />

            <main>
                {activePage ===
                    "Главная" && (
                    <Home
                        products={
                            products
                        }
                        user={user}
                        onOpenCatalog={() =>
                            navigate(
                                "Каталог"
                            )
                        }
                        onOpenProduct={
                            setSelectedProduct
                        }
                    />
                )}

                {activePage ===
                    "Каталог" && (
                    <Catalog
                        products={
                            products
                        }
                        onOpenProduct={
                            setSelectedProduct
                        }
                    />
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

            <BottomNav
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
            />

            {selectedProduct && (
                <ProductModal
                    product={
                        selectedProduct
                    }
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