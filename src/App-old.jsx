import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import "./App.css";

/*
 * Замени число на свой Telegram ID.
 * Несколько администраторов можно указать через запятую.
 */
const ADMIN_TELEGRAM_IDS = [
    123456789,
];

const DEFAULT_CATEGORIES = [
    "Valorant",
    "Dota 2",
    "League of Legends",
];

const DEFAULT_PRODUCTS = [
    {
        id: 1,
        name: "Clove",
        category: "Valorant",
        price: 7000,
        image: "/Clove.png",
        popular: true,
    },
    {
        id: 2,
        name: "Chamber",
        category: "Valorant",
        price: 7000,
        image: "/Chamber.png",
        popular: true,
    },
    {
        id: 3,
        name: "Jett",
        category: "Valorant",
        price: 7000,
        image: "/Jett.png",
        popular: true,
    },
    {
        id: 4,
        name: "Killjoy",
        category: "Valorant",
        price: 7000,
        image: "/Killjoy.png",
        popular: false,
    },
    {
        id: 5,
        name: "Axe",
        category: "Dota 2",
        price: 7000,
        image: "/Axe.png",
        popular: true,
    },
    {
        id: 6,
        name: "Pudge",
        category: "Dota 2",
        price: 7000,
        image: "/Pudge.png",
        popular: false,
    },
    {
        id: 7,
        name: "Crystal Maiden",
        category: "Dota 2",
        price: 7500,
        image: "/CrystalMaiden.png",
        popular: false,
    },
    {
        id: 8,
        name: "Jinx",
        category: "League of Legends",
        price: 7000,
        image: "/Jinx.png",
        popular: true,
    },
    {
        id: 9,
        name: "Ahri",
        category: "League of Legends",
        price: 7000,
        image: "/Ahri.png",
        popular: false,
    },
    {
        id: 10,
        name: "Teemo",
        category: "League of Legends",
        price: 6500,
        image: "/Teemo.png",
        popular: false,
    },
];

const CUSTOM_OPTIONS = [
    {
        id: "nickname",
        title: "Добавить свой ник",
        description: "Надпись на подиуме или табличке",
        price: 500,
    },
    {
        id: "pose",
        title: "Изменить позу",
        description: "Индивидуальная поза фигурки",
        price: 1000,
    },
    {
        id: "weapon",
        title: "Поменять или добавить оружие",
        description: "Другое оружие или дополнительный предмет",
        price: 1000,
    },
];

const PRICE_FILTERS = [
    {
        id: "all",
        title: "Любая цена",
        min: 0,
        max: Infinity,
    },
    {
        id: "under7000",
        title: "До 7 000 ₽",
        min: 0,
        max: 7000,
    },
    {
        id: "7000to8000",
        title: "7 000 - 8 000 ₽",
        min: 7000,
        max: 8000,
    },
    {
        id: "over8000",
        title: "От 8 000 ₽",
        min: 8000,
        max: Infinity,
    },
];

function loadFromStorage(key, fallbackValue) {
    try {
        const storedValue = localStorage.getItem(key);

        if (!storedValue) {
            return fallbackValue;
        }

        return JSON.parse(storedValue);
    } catch {
        return fallbackValue;
    }
}

function formatPrice(price) {
    return Number(price).toLocaleString("ru-RU");
}

function App() {
    const [activePage, setActivePage] =
        useState("Главная");

    const [products, setProducts] = useState(() =>
        loadFromStorage(
            "lemonz-products",
            DEFAULT_PRODUCTS
        )
    );

    const [cart, setCart] = useState(() =>
        loadFromStorage("lemonz-cart", [])
    );

    const [activeCategory, setActiveCategory] =
        useState(DEFAULT_CATEGORIES[0]);

    const [searchQuery, setSearchQuery] =
        useState("");

    const [priceFilterId, setPriceFilterId] =
        useState("all");

    const [showScrollTop, setShowScrollTop] =
        useState(false);

    const [selectedProduct, setSelectedProduct] =
        useState(null);

    const [selectedOptions, setSelectedOptions] =
        useState([]);

    const [nickname, setNickname] =
        useState("");

    const [adminProductId, setAdminProductId] =
        useState(null);

    const [adminForm, setAdminForm] = useState({
        name: "",
        category: DEFAULT_CATEGORIES[0],
        price: 7000,
        image: "",
        popular: false,
    });

    const categoryRefs = useRef({});
    const categoryNavigationRef = useRef(null);
    const categoryButtonRefs = useRef({});
    const scrollFrameRef = useRef(null);

    const telegram = window.Telegram?.WebApp;
    const user = telegram?.initDataUnsafe?.user;

    /*
     * При npm run dev админ-панель доступна автоматически.
     * На Vercel она будет доступна только Telegram ID из списка.
     */
    const isAdmin =
        import.meta.env.DEV ||
        ADMIN_TELEGRAM_IDS.includes(
            Number(user?.id)
        );

    const categories = useMemo(() => {
        const productCategories = products.map(
            (product) => product.category
        );

        return Array.from(
            new Set([
                ...DEFAULT_CATEGORIES,
                ...productCategories,
            ])
        ).filter(Boolean);
    }, [products]);

    const selectedPriceFilter =
        PRICE_FILTERS.find(
            (filter) =>
                filter.id === priceFilterId
        ) ?? PRICE_FILTERS[0];

    const filteredProducts = useMemo(() => {
        const normalizedQuery =
            searchQuery.trim().toLowerCase();

        return products.filter((product) => {
            const matchesSearch =
                !normalizedQuery ||
                product.name
                    .toLowerCase()
                    .includes(normalizedQuery) ||
                product.category
                    .toLowerCase()
                    .includes(normalizedQuery);

            const matchesPrice =
                product.price >=
                    selectedPriceFilter.min &&
                product.price <=
                    selectedPriceFilter.max;

            return matchesSearch && matchesPrice;
        });
    }, [
        products,
        searchQuery,
        selectedPriceFilter,
    ]);

    const visibleCategories = useMemo(() => {
        return categories.filter((category) =>
            filteredProducts.some(
                (product) =>
                    product.category === category
            )
        );
    }, [categories, filteredProducts]);

    const cartItemsCount = cart.reduce(
        (total, item) =>
            total + item.quantity,
        0
    );

    const cartTotal = cart.reduce(
        (total, item) =>
            total +
            item.unitPrice * item.quantity,
        0
    );

    const closeProductModal = () => {
        setSelectedProduct(null);
        setSelectedOptions([]);
        setNickname("");

        document.body.classList.remove(
            "modal-open"
        );
    };

    useEffect(() => {
        telegram?.ready?.();
        telegram?.expand?.();
    }, [telegram]);

    useEffect(() => {
        localStorage.setItem(
            "lemonz-products",
            JSON.stringify(products)
        );
    }, [products]);

    useEffect(() => {
        localStorage.setItem(
            "lemonz-cart",
            JSON.stringify(cart)
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

    /*
     * Определение активной категории при прокрутке.
     */
    useEffect(() => {
        if (activePage !== "Каталог") {
            return undefined;
        }

        const updateActiveCategory = () => {
            if (scrollFrameRef.current) {
                cancelAnimationFrame(
                    scrollFrameRef.current
                );
            }

            scrollFrameRef.current =
                requestAnimationFrame(() => {
                    const fixedPanelsOffset = 155;

                    let currentCategory =
                        visibleCategories[0];

                    visibleCategories.forEach(
                        (category) => {
                            const section =
                                categoryRefs.current[
                                    category
                                ];

                            if (!section) {
                                return;
                            }

                            const sectionTop =
                                section.getBoundingClientRect()
                                    .top;

                            if (
                                sectionTop <=
                                fixedPanelsOffset
                            ) {
                                currentCategory =
                                    category;
                            }
                        }
                    );

                    if (currentCategory) {
                        setActiveCategory(
                            currentCategory
                        );
                    }
                });
        };

        window.addEventListener(
            "scroll",
            updateActiveCategory,
            {
                passive: true,
            }
        );

        updateActiveCategory();

        return () => {
            window.removeEventListener(
                "scroll",
                updateActiveCategory
            );

            if (scrollFrameRef.current) {
                cancelAnimationFrame(
                    scrollFrameRef.current
                );
            }
        };
    }, [
        activePage,
        visibleCategories,
    ]);

    /*
     * Горизонтально центрируем активную кнопку.
     * Вертикальное положение страницы не меняется.
     */
    useEffect(() => {
        if (activePage !== "Каталог") {
            return;
        }

        const navigation =
            categoryNavigationRef.current;

        const button =
            categoryButtonRefs.current[
                activeCategory
            ];

        if (!navigation || !button) {
            return;
        }

        const targetLeft =
            button.offsetLeft -
            navigation.clientWidth / 2 +
            button.offsetWidth / 2;

        navigation.scrollTo({
            left: targetLeft,
            behavior: "smooth",
        });
    }, [activeCategory, activePage]);

    useEffect(() => {
        if (
            visibleCategories.length > 0 &&
            !visibleCategories.includes(
                activeCategory
            )
        ) {
            setActiveCategory(
                visibleCategories[0]
            );
        }
    }, [
        activeCategory,
        visibleCategories,
    ]);

    useEffect(() => {
        if (
            activePage === "Админ" &&
            !isAdmin
        ) {
            setActivePage("Главная");
        }
    }, [activePage, isAdmin]);

    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === "Escape") {
                closeProductModal();
            }
        };

        window.addEventListener(
            "keydown",
            handleEscape
        );

        return () => {
            window.removeEventListener(
                "keydown",
                handleEscape
            );

            document.body.classList.remove(
                "modal-open"
            );
        };
    }, []);

    const showMessage = (message) => {
        if (
            telegram?.initData &&
            typeof telegram.showAlert ===
                "function"
        ) {
            telegram.showAlert(message);
            return;
        }

        window.alert(message);
    };

    const openPage = (page) => {
        if (
            page === "Админ" &&
            !isAdmin
        ) {
            showMessage(
                "У вас нет доступа к админ-панели"
            );
            return;
        }

        telegram?.HapticFeedback
            ?.selectionChanged?.();

        setActivePage(page);

        if (
            page === "Каталог" &&
            visibleCategories.length > 0
        ) {
            setActiveCategory(
                visibleCategories[0]
            );
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    const scrollToCategory = (category) => {
        const section =
            categoryRefs.current[category];

        if (!section) {
            return;
        }

        telegram?.HapticFeedback
            ?.selectionChanged?.();

        setActiveCategory(category);

        const headerHeight =
            document
                .querySelector(".header")
                ?.getBoundingClientRect()
                .height ?? 68;

        const categoryPanelHeight =
            document
                .querySelector(
                    ".category-navigation-shell"
                )
                ?.getBoundingClientRect()
                .height ?? 64;

        const sectionPosition =
            section.getBoundingClientRect()
                .top + window.scrollY;

        const targetPosition =
            sectionPosition -
            headerHeight -
            categoryPanelHeight -
            12;

        window.scrollTo({
            top: Math.max(
                0,
                targetPosition
            ),
            behavior: "smooth",
        });
    };

    const scrollToTop = () => {
        telegram?.HapticFeedback
            ?.selectionChanged?.();

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    const resetCatalogFilters = () => {
        setSearchQuery("");
        setPriceFilterId("all");
    };

    const openProductModal = (product) => {
        telegram?.HapticFeedback
            ?.selectionChanged?.();

        setSelectedProduct(product);
        setSelectedOptions([]);
        setNickname("");

        document.body.classList.add(
            "modal-open"
        );
    };

    const toggleCustomOption = (optionId) => {
        telegram?.HapticFeedback
            ?.selectionChanged?.();

        setSelectedOptions(
            (currentOptions) => {
                if (
                    currentOptions.includes(
                        optionId
                    )
                ) {
                    return currentOptions.filter(
                        (id) => id !== optionId
                    );
                }

                return [
                    ...currentOptions,
                    optionId,
                ];
            }
        );
    };

    const calculateConfiguredPrice = () => {
        if (!selectedProduct) {
            return 0;
        }

        const optionsTotal =
            CUSTOM_OPTIONS.reduce(
                (total, option) => {
                    if (
                        selectedOptions.includes(
                            option.id
                        )
                    ) {
                        return (
                            total +
                            option.price
                        );
                    }

                    return total;
                },
                0
            );

        return (
            selectedProduct.price +
            optionsTotal
        );
    };

    const createConfiguredCartItem = () => {
        if (!selectedProduct) {
            return null;
        }

        const options = CUSTOM_OPTIONS.filter(
            (option) =>
                selectedOptions.includes(
                    option.id
                )
        ).map((option) => ({
            id: option.id,
            title: option.title,
            price: option.price,
        }));

        const normalizedNickname =
            selectedOptions.includes(
                "nickname"
            )
                ? nickname.trim()
                : "";

        const configurationKey =
            JSON.stringify({
                productId:
                    selectedProduct.id,
                options: options
                    .map(
                        (option) =>
                            option.id
                    )
                    .sort(),
                nickname:
                    normalizedNickname,
            });

        return {
            cartId: `${selectedProduct.id}-${Date.now()}`,
            configurationKey,
            productId:
                selectedProduct.id,
            name: selectedProduct.name,
            category:
                selectedProduct.category,
            image: selectedProduct.image,
            unitPrice:
                calculateConfiguredPrice(),
            options,
            nickname:
                normalizedNickname,
            quantity: 1,
        };
    };

    const addConfiguredProductToCart = () => {
        if (!selectedProduct) {
            return;
        }

        if (
            selectedOptions.includes(
                "nickname"
            ) &&
            !nickname.trim()
        ) {
            showMessage(
                "Введите ник или отключите эту опцию"
            );
            return;
        }

        const configuredItem =
            createConfiguredCartItem();

        if (!configuredItem) {
            return;
        }

        const existingItem = cart.find(
            (item) =>
                item.configurationKey ===
                configuredItem.configurationKey
        );

        if (existingItem) {
            setCart((currentCart) =>
                currentCart.map((item) =>
                    item.configurationKey ===
                    configuredItem.configurationKey
                        ? {
                              ...item,
                              quantity:
                                  item.quantity +
                                  1,
                          }
                        : item
                )
            );
        } else {
            setCart((currentCart) => [
                ...currentCart,
                configuredItem,
            ]);
        }

        telegram?.HapticFeedback
            ?.notificationOccurred?.(
                "success"
            );

        closeProductModal();
    };

    const increaseQuantity = (cartId) => {
        setCart((currentCart) =>
            currentCart.map((item) =>
                item.cartId === cartId
                    ? {
                          ...item,
                          quantity:
                              item.quantity + 1,
                      }
                    : item
            )
        );
    };

    const decreaseQuantity = (cartId) => {
        setCart((currentCart) =>
            currentCart
                .map((item) =>
                    item.cartId === cartId
                        ? {
                              ...item,
                              quantity:
                                  item.quantity -
                                  1,
                          }
                        : item
                )
                .filter(
                    (item) =>
                        item.quantity > 0
                )
        );
    };

    const removeFromCart = (cartId) => {
        setCart((currentCart) =>
            currentCart.filter(
                (item) =>
                    item.cartId !== cartId
            )
        );
    };

    const clearCart = () => {
        if (
            cart.length === 0 ||
            !window.confirm(
                "Очистить корзину?"
            )
        ) {
            return;
        }

        setCart([]);
    };

    const checkout = () => {
        if (cart.length === 0) {
            showMessage("Корзина пуста");
            return;
        }

        showMessage(
            `Заказ на сумму ${formatPrice(
                cartTotal
            )} ₽ готов к оформлению`
        );
    };

    const resetAdminForm = () => {
        setAdminProductId(null);

        setAdminForm({
            name: "",
            category:
                categories[0] ??
                DEFAULT_CATEGORIES[0],
            price: 7000,
            image: "",
            popular: false,
        });
    };

    const startEditingProduct = (product) => {
        setAdminProductId(product.id);

        setAdminForm({
            name: product.name,
            category: product.category,
            price: product.price,
            image: product.image,
            popular: product.popular,
        });

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    const saveAdminProduct = (event) => {
        event.preventDefault();

        if (!isAdmin) {
            return;
        }

        const name =
            adminForm.name.trim();

        const category =
            adminForm.category.trim();

        const image =
            adminForm.image.trim();

        const price = Number(
            adminForm.price
        );

        if (!name || !category) {
            showMessage(
                "Заполните название и категорию"
            );
            return;
        }

        if (
            !Number.isFinite(price) ||
            price < 0
        ) {
            showMessage(
                "Укажите корректную цену"
            );
            return;
        }

        const preparedProduct = {
            name,
            category,
            price,
            image:
                image ||
                "/placeholder.png",
            popular:
                adminForm.popular,
        };

        if (adminProductId !== null) {
            setProducts(
                (currentProducts) =>
                    currentProducts.map(
                        (product) =>
                            product.id ===
                            adminProductId
                                ? {
                                      ...product,
                                      ...preparedProduct,
                                  }
                                : product
                    )
            );
        } else {
            setProducts(
                (currentProducts) => [
                    ...currentProducts,
                    {
                        id: Date.now(),
                        ...preparedProduct,
                    },
                ]
            );
        }

        resetAdminForm();
    };

    const deleteProduct = (productId) => {
        const product = products.find(
            (item) =>
                item.id === productId
        );

        if (
            !window.confirm(
                `Удалить фигурку «${
                    product?.name ?? ""
                }»?`
            )
        ) {
            return;
        }

        setProducts(
            (currentProducts) =>
                currentProducts.filter(
                    (item) =>
                        item.id !== productId
                )
        );

        setCart((currentCart) =>
            currentCart.filter(
                (item) =>
                    item.productId !==
                    productId
            )
        );

        if (
            adminProductId ===
            productId
        ) {
            resetAdminForm();
        }
    };

    const resetProducts = () => {
        if (
            !window.confirm(
                "Вернуть исходный список фигурок?"
            )
        ) {
            return;
        }

        setProducts(DEFAULT_PRODUCTS);
        resetAdminForm();
    };

    const renderProductCard = (product) => (
        <article
            className="product-card"
            key={product.id}
        >
            <button
                type="button"
                className="product-image-button"
                onClick={() =>
                    openProductModal(product)
                }
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
                    от {formatPrice(
                        product.price
                    )} ₽
                </strong>

                <button
                    type="button"
                    className="primary-button"
                    onClick={() =>
                        openProductModal(product)
                    }
                >
                    Выбрать
                </button>
            </div>
        </article>
    );

    const renderHome = () => {
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
                        onClick={() =>
                            openPage("Каталог")
                        }
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
                            onClick={() =>
                                openPage("Каталог")
                            }
                        >
                            Все
                        </button>
                    </div>

                    <div className="product-grid">
                        {visibleProducts.map(
                            renderProductCard
                        )}
                    </div>
                </section>
            </>
        );
    };

    const renderCatalog = () => (
        <section className="catalog catalog-page">
            <div className="catalog-heading">
                <p className="section-label">
                    КАТАЛОГ
                </p>

                <h1>
                    Выбери свою вселенную
                </h1>

                <p>
                    Используй поиск, фильтр
                    и закреплённую панель категорий.
                </p>
            </div>

            <div className="catalog-tools">
                <label className="search-field">
                    <span className="search-icon">
                        ⌕
                    </span>

                    <input
                        type="search"
                        value={searchQuery}
                        placeholder="Найти персонажа"
                        onChange={(event) =>
                            setSearchQuery(
                                event.target.value
                            )
                        }
                    />
                </label>

                <select
                    className="price-filter"
                    value={priceFilterId}
                    onChange={(event) =>
                        setPriceFilterId(
                            event.target.value
                        )
                    }
                >
                    {PRICE_FILTERS.map(
                        (filter) => (
                            <option
                                key={filter.id}
                                value={filter.id}
                            >
                                {filter.title}
                            </option>
                        )
                    )}
                </select>
            </div>

            <div className="category-navigation-placeholder">
                <div className="category-navigation-shell">
                    <nav
                        className="category-navigation"
                        ref={categoryNavigationRef}
                        aria-label="Категории фигурок"
                    >
                        {visibleCategories.map(
                            (category) => (
                                <button
                                    key={category}
                                    type="button"
                                    ref={(element) => {
                                        categoryButtonRefs.current[
                                            category
                                        ] = element;
                                    }}
                                    className={
                                        activeCategory ===
                                        category
                                            ? "active"
                                            : ""
                                    }
                                    onClick={() =>
                                        scrollToCategory(
                                            category
                                        )
                                    }
                                >
                                    {category}
                                </button>
                            )
                        )}
                    </nav>
                </div>
            </div>

            {filteredProducts.length === 0 ? (
                <div className="empty-search">
                    <div>⌕</div>

                    <h2>
                        Ничего не найдено
                    </h2>

                    <p>
                        Измени запрос или сбрось
                        фильтры.
                    </p>

                    <button
                        type="button"
                        className="primary-button"
                        onClick={
                            resetCatalogFilters
                        }
                    >
                        Сбросить фильтры
                    </button>
                </div>
            ) : (
                <div className="category-sections">
                    {visibleCategories.map(
                        (category) => {
                            const categoryProducts =
                                filteredProducts.filter(
                                    (product) =>
                                        product.category ===
                                        category
                                );

                            return (
                                <section
                                    key={category}
                                    className="category-section"
                                    ref={(element) => {
                                        categoryRefs.current[
                                            category
                                        ] = element;
                                    }}
                                >
                                    <div className="category-heading">
                                        <div>
                                            <p className="section-label">
                                                КАТЕГОРИЯ
                                            </p>

                                            <h2>
                                                {category}
                                            </h2>
                                        </div>

                                        <span>
                                            {
                                                categoryProducts.length
                                            }
                                        </span>
                                    </div>

                                    <div className="product-grid">
                                        {categoryProducts.map(
                                            renderProductCard
                                        )}
                                    </div>
                                </section>
                            );
                        }
                    )}
                </div>
            )}
        </section>
    );

    const renderCart = () => (
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
                        onClick={clearCart}
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
                        Добавь фигурки из каталога.
                    </p>

                    <button
                        type="button"
                        className="primary-button large-button"
                        onClick={() =>
                            openPage("Каталог")
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
                                        {formatPrice(
                                            item.unitPrice
                                        )}{" "}
                                        ₽
                                    </strong>

                                    <div className="cart-actions">
                                        <div className="quantity-control">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    decreaseQuantity(
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
                                                    increaseQuantity(
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
                                                removeFromCart(
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
                            <span>Товаров</span>
                            <span>
                                {cartItemsCount}
                            </span>
                        </div>

                        <div className="summary-row total-row">
                            <span>Итого</span>

                            <strong>
                                {formatPrice(
                                    cartTotal
                                )}{" "}
                                ₽
                            </strong>
                        </div>

                        <button
                            type="button"
                            className="primary-button checkout-button"
                            onClick={checkout}
                        >
                            Оформить заказ
                        </button>
                    </div>
                </>
            )}
        </section>
    );

    const renderProfile = () => (
        <section className="profile-page">
            <div className="profile-avatar">
                {user?.first_name?.[0] ??
                    "С"}
            </div>

            <p className="section-label">
                ПРОФИЛЬ
            </p>

            <h1>
                {user?.first_name ??
                    "Пользователь"}
            </h1>

            {user?.id && (
                <p className="profile-id">
                    Telegram ID: {user.id}
                </p>
            )}

            <p className="profile-description">
                Здесь появятся история заказов,
                доставка и избранные фигурки.
            </p>

            {isAdmin && (
                <button
                    type="button"
                    className="secondary-button profile-admin-button"
                    onClick={() =>
                        openPage("Админ")
                    }
                >
                    Открыть админ-панель
                </button>
            )}
        </section>
    );

    const renderAdmin = () => {
        if (!isAdmin) {
            return null;
        }

        return (
            <section className="admin-page">
                <div className="admin-heading">
                    <p className="section-label">
                        УПРАВЛЕНИЕ
                    </p>

                    <h1>
                        Админ-панель
                    </h1>

                    <p>
                        Добавление, удаление и
                        редактирование фигурок.
                    </p>
                </div>

                <form
                    className="admin-form"
                    onSubmit={
                        saveAdminProduct
                    }
                >
                    <div className="admin-form-title">
                        <h2>
                            {adminProductId !==
                            null
                                ? "Редактировать фигурку"
                                : "Добавить фигурку"}
                        </h2>

                        {adminProductId !==
                            null && (
                            <button
                                type="button"
                                className="text-button"
                                onClick={
                                    resetAdminForm
                                }
                            >
                                Отмена
                            </button>
                        )}
                    </div>

                    <label className="field">
                        <span>Название</span>

                        <input
                            value={
                                adminForm.name
                            }
                            onChange={(event) =>
                                setAdminForm(
                                    (current) => ({
                                        ...current,
                                        name: event
                                            .target
                                            .value,
                                    })
                                )
                            }
                        />
                    </label>

                    <label className="field">
                        <span>Категория</span>

                        <input
                            value={
                                adminForm.category
                            }
                            onChange={(event) =>
                                setAdminForm(
                                    (current) => ({
                                        ...current,
                                        category:
                                            event
                                                .target
                                                .value,
                                    })
                                )
                            }
                        />
                    </label>

                    <label className="field">
                        <span>Цена, ₽</span>

                        <input
                            type="number"
                            min="0"
                            value={
                                adminForm.price
                            }
                            onChange={(event) =>
                                setAdminForm(
                                    (current) => ({
                                        ...current,
                                        price: event
                                            .target
                                            .value,
                                    })
                                )
                            }
                        />
                    </label>

                    <label className="field">
                        <span>
                            Путь к изображению
                        </span>

                        <input
                            value={
                                adminForm.image
                            }
                            placeholder="/Sage.png"
                            onChange={(event) =>
                                setAdminForm(
                                    (current) => ({
                                        ...current,
                                        image: event
                                            .target
                                            .value,
                                    })
                                )
                            }
                        />
                    </label>

                    <label className="admin-checkbox">
                        <input
                            type="checkbox"
                            checked={
                                adminForm.popular
                            }
                            onChange={(event) =>
                                setAdminForm(
                                    (current) => ({
                                        ...current,
                                        popular:
                                            event
                                                .target
                                                .checked,
                                    })
                                )
                            }
                        />

                        Показывать на главной
                    </label>

                    <button
                        type="submit"
                        className="primary-button admin-save-button"
                    >
                        {adminProductId !==
                        null
                            ? "Сохранить"
                            : "Добавить фигурку"}
                    </button>
                </form>

                <div className="admin-products-heading">
                    <h2>
                        Фигурки:{" "}
                        {products.length}
                    </h2>

                    <button
                        type="button"
                        className="text-button danger-button"
                        onClick={
                            resetProducts
                        }
                    >
                        Сбросить
                    </button>
                </div>

                <div className="admin-products">
                    {products.map(
                        (product) => (
                            <article
                                className="admin-product"
                                key={
                                    product.id
                                }
                            >
                                <div className="admin-product-image">
                                    <img
                                        src={
                                            product.image
                                        }
                                        alt={
                                            product.name
                                        }
                                    />
                                </div>

                                <div className="admin-product-content">
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
                                        {formatPrice(
                                            product.price
                                        )}{" "}
                                        ₽
                                    </strong>

                                    <div className="admin-product-actions">
                                        <button
                                            type="button"
                                            className="secondary-button"
                                            onClick={() =>
                                                startEditingProduct(
                                                    product
                                                )
                                            }
                                        >
                                            Изменить
                                        </button>

                                        <button
                                            type="button"
                                            className="delete-button"
                                            onClick={() =>
                                                deleteProduct(
                                                    product.id
                                                )
                                            }
                                        >
                                            Удалить
                                        </button>
                                    </div>
                                </div>
                            </article>
                        )
                    )}
                </div>
            </section>
        );
    };

    const navigationPages = [
        "Главная",
        "Каталог",
        "Корзина",
        "Профиль",
    ];

    if (isAdmin) {
        navigationPages.push("Админ");
    }

    return (
        <div className="app">
            <header className="header">
                <button
                    type="button"
                    className="logo-button"
                    onClick={() =>
                        openPage("Главная")
                    }
                >
                    <span className="logo-icon">
                        L
                    </span>

                    <span className="logo-text">
                        Lemonz
                    </span>
                </button>

                <button
                    type="button"
                    className="profile-button"
                    onClick={() =>
                        openPage("Профиль")
                    }
                >
                    {user?.first_name?.[0] ??
                        "С"}
                </button>
            </header>

            <main>
                {activePage ===
                    "Главная" &&
                    renderHome()}

                {activePage ===
                    "Каталог" &&
                    renderCatalog()}

                {activePage ===
                    "Корзина" &&
                    renderCart()}

                {activePage ===
                    "Профиль" &&
                    renderProfile()}

                {activePage ===
                    "Админ" &&
                    renderAdmin()}
            </main>

            {showScrollTop && (
                <button
                    type="button"
                    className="scroll-top-button"
                    onClick={scrollToTop}
                    aria-label="Наверх"
                >
                    ↑
                </button>
            )}

            <nav
                className={`bottom-navigation ${
                    isAdmin
                        ? "admin-navigation"
                        : ""
                }`}
            >
                {navigationPages.map(
                    (page) => (
                        <button
                            key={page}
                            type="button"
                            className={
                                activePage ===
                                page
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                openPage(page)
                            }
                        >
                            {page}

                            {page ===
                                "Корзина" &&
                                cartItemsCount >
                                    0 && (
                                    <span className="cart-badge">
                                        {
                                            cartItemsCount
                                        }
                                    </span>
                                )}
                        </button>
                    )
                )}
            </nav>

            {selectedProduct && (
                <div
                    className="modal-overlay"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeProductModal();
                        }
                    }}
                >
                    <section className="product-modal">
                        <button
                            type="button"
                            className="modal-close"
                            onClick={
                                closeProductModal
                            }
                        >
                            ×
                        </button>

                        <div className="modal-product-preview">
                            <img
                                src={
                                    selectedProduct.image
                                }
                                alt={
                                    selectedProduct.name
                                }
                            />
                        </div>

                        <p className="category">
                            {
                                selectedProduct.category
                            }
                        </p>

                        <h2>
                            {
                                selectedProduct.name
                            }
                        </h2>

                        <div className="modal-base-price">
                            <span>
                                Базовая цена
                            </span>

                            <strong>
                                {formatPrice(
                                    selectedProduct.price
                                )}{" "}
                                ₽
                            </strong>
                        </div>

                        <p className="modal-section-title">
                            Дополнительные опции
                        </p>

                        <div className="custom-options">
                            {CUSTOM_OPTIONS.map(
                                (option) => {
                                    const selected =
                                        selectedOptions.includes(
                                            option.id
                                        );

                                    return (
                                        <button
                                            key={
                                                option.id
                                            }
                                            type="button"
                                            className={`custom-option ${
                                                selected
                                                    ? "selected"
                                                    : ""
                                            }`}
                                            onClick={() =>
                                                toggleCustomOption(
                                                    option.id
                                                )
                                            }
                                        >
                                            <span className="option-check">
                                                {selected
                                                    ? "✓"
                                                    : "+"}
                                            </span>

                                            <span className="option-content">
                                                <strong>
                                                    {
                                                        option.title
                                                    }
                                                </strong>

                                                <small>
                                                    {
                                                        option.description
                                                    }
                                                </small>
                                            </span>

                                            <b>
                                                +
                                                {formatPrice(
                                                    option.price
                                                )}{" "}
                                                ₽
                                            </b>
                                        </button>
                                    );
                                }
                            )}
                        </div>

                        {selectedOptions.includes(
                            "nickname"
                        ) && (
                            <label className="field nickname-field">
                                <span>
                                    Твой ник
                                </span>

                                <input
                                    value={
                                        nickname
                                    }
                                    onChange={(event) =>
                                        setNickname(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                />
                            </label>
                        )}

                        <div className="modal-total">
                            <span>
                                Итоговая цена
                            </span>

                            <strong>
                                {formatPrice(
                                    calculateConfiguredPrice()
                                )}{" "}
                                ₽
                            </strong>
                        </div>

                        <button
                            type="button"
                            className="primary-button modal-add-button"
                            onClick={
                                addConfiguredProductToCart
                            }
                        >
                            Добавить в корзину
                        </button>
                    </section>
                </div>
            )}
        </div>
    );
}

export default App;