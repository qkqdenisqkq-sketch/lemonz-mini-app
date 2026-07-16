import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import ProductCard from "../components/ProductCard";

import {
    CATALOG_FILTERS,
    CATEGORY_LOGOS,
    DEFAULT_CATEGORIES,
} from "../data/products";

export default function Home({
    products,
    user,
    onOpenProduct,
    favoriteProductIds = [],
    onToggleFavorite,
}) {
    const [activeBanner, setActiveBanner] =
        useState(0);

    const [
        previousBanner,
        setPreviousBanner,
    ] = useState(null);

    const [
        bannerAnimating,
        setBannerAnimating,
    ] = useState(false);

    const bannerAnimationTimer =
        useRef(null);

    const banners = [
        {
            id: "hero",
            badge: "LEMONZ FIGURINES",
            title: "Найди своего любимого персонажа",
            description:
                "Коллекционные фигурки ручной работы",
            buttonText:
                "Смотреть каталог",
            filterId: "priceAsc",
            images: [
                "/Clove.png",
                "/Jett.png",
                "/Chamber.png",
            ],
        },
        {
            id: "new",
            badge: "НОВИНКИ",
            title: "Новые фигурки",
            description:
                "Свежие персонажи уже в каталоге",
            buttonText:
                "Смотреть новинки",
            filterId: "new",
            images: [
                "/Clove.png",
                "/Jett.png",
                "/Chamber.png",
            ],
        },
        {
            id: "popular",
            badge: "ПОПУЛЯРНОЕ",
            title: "Хиты коллекции",
            description:
                "Самые популярные фигурки Lemonz",
            buttonText:
                "Смотреть хиты",
            filterId: "popular",
            images: [
                "/Jinx.png",
                "/Killjoy.png",
                "/Axe.png",
            ],
        },
        {
            id: "custom",
            badge: "КАСТОМ",
            title: "Создай свой образ",
            description:
                "Добавь ник, измени позу или оружие",
            buttonText:
                "Выбрать персонажа",
            filterId: "priceAsc",
            images: [
                "/Jett.png",
                "/Clove.png",
            ],
        },
    ];
    const [searchOpen, setSearchOpen] =
        useState(false);

    const [searchQuery, setSearchQuery] =
        useState("");

    const [filterId, setFilterId] =
        useState("priceAsc");

    const [activeCategory, setActiveCategory] =
        useState(DEFAULT_CATEGORIES[0]);

    const sectionRefs = useRef({});
    const categoryNavigationRef =
        useRef(null);
    const categoryButtonRefs =
        useRef({});
    const searchInputRef = useRef(null);

    const categories = useMemo(() => {
        const productCategories =
            products.map(
                (product) =>
                    product.category
            );

        return Array.from(
            new Set([
                ...DEFAULT_CATEGORIES,
                ...productCategories,
            ])
        ).filter(Boolean);
    }, [products]);

    const preparedProducts = useMemo(() => {
        const normalizedQuery =
            searchQuery
                .trim()
                .toLowerCase();

        let result = products.filter(
            (product) => {
                if (!normalizedQuery) {
                    return true;
                }

                return (
                    product.name
                        .toLowerCase()
                        .includes(
                            normalizedQuery
                        ) ||
                    product.category
                        .toLowerCase()
                        .includes(
                            normalizedQuery
                        )
                );
            }
        );

        if (filterId === "popular") {
            result = result.filter(
                (product) =>
                    product.popular
            );
        }

        if (filterId === "new") {
            result = result.filter(
                (product) =>
                    product.isNew
            );
        }

        if (filterId === "priceAsc") {
            result = [...result].sort(
                (first, second) =>
                    first.price -
                    second.price
            );
        }

        if (filterId === "priceDesc") {
            result = [...result].sort(
                (first, second) =>
                    second.price -
                    first.price
            );
        }

        return result;
    }, [
        products,
        searchQuery,
        filterId,
    ]);

    useEffect(() => {
        if (
            searchOpen &&
            searchInputRef.current
        ) {
            searchInputRef.current.focus();
        }
    }, [searchOpen]);

    useEffect(() => {
        const navigation =
            categoryNavigationRef.current;

        if (!navigation) {
            return;
        }

        const handleWheel = (event) => {
            event.preventDefault();
            event.stopPropagation();

            const delta =
                Math.abs(event.deltaY) >=
                Math.abs(event.deltaX)
                    ? event.deltaY
                    : event.deltaX;

            navigation.scrollLeft += delta;
        };

        navigation.addEventListener(
            "wheel",
            handleWheel,
            {
                passive: false,
            }
        );

        return () => {
            navigation.removeEventListener(
                "wheel",
                handleWheel
            );
        };
    }, []);

    useEffect(() => {
        const updateActiveCategory =
            () => {
                const fixedOffset = 150;
                let currentCategory =
                    categories[0];

                categories.forEach(
                    (category) => {
                        const section =
                            sectionRefs.current[
                                category
                            ];

                        if (
                            section &&
                            section.getBoundingClientRect()
                                .top <=
                                fixedOffset
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
        };
    }, [categories]);

    useEffect(() => {
        const navigation =
            categoryNavigationRef.current;

        const activeButton =
            categoryButtonRefs.current[
                activeCategory
            ];

        if (
            !navigation ||
            !activeButton
        ) {
            return;
        }

        navigation.scrollTo({
            left:
                activeButton.offsetLeft -
                navigation.clientWidth /
                    2 +
                activeButton.offsetWidth /
                    2,
            behavior: "smooth",
        });
    }, [activeCategory]);

    const scrollToCategory = (
        category
    ) => {
        const section =
            sectionRefs.current[category];

        if (!section) {
            return;
        }

        setActiveCategory(category);

        const headerHeight =
            document
                .querySelector(".header")
                ?.getBoundingClientRect()
                .height ?? 68;

        const panelHeight =
            document
                .querySelector(
                    ".category-navigation-shell"
                )
                ?.getBoundingClientRect()
                .height ?? 64;

        const target =
            section.getBoundingClientRect()
                .top +
            window.scrollY -
            headerHeight -
            panelHeight -
            12;

        window.scrollTo({
            top: Math.max(0, target),
            behavior: "smooth",
        });
    };

    const toggleSearch = () => {
        if (searchOpen) {
            setSearchOpen(false);
            setSearchQuery("");
            return;
        }

        setSearchOpen(true);
    };


    useEffect(() => {
        return () => {
            if (
                bannerAnimationTimer.current
            ) {
                window.clearTimeout(
                    bannerAnimationTimer.current
                );
            }
        };
    }, []);

    const switchBanner = (
        nextIndex
    ) => {
        if (
            bannerAnimating ||
            nextIndex === activeBanner
        ) {
            return;
        }

        if (
            bannerAnimationTimer.current
        ) {
            window.clearTimeout(
                bannerAnimationTimer.current
            );
        }

        setPreviousBanner(
            activeBanner
        );
        setBannerAnimating(
            true
        );
        setActiveBanner(
            nextIndex
        );

        bannerAnimationTimer.current =
            window.setTimeout(() => {
                setPreviousBanner(
                    null
                );
                setBannerAnimating(
                    false
                );
            }, 430);
    };

    const handleBannerAction = (
        banner
    ) => {
        if (
            banner.filterId &&
            banner.filterId !== "all"
        ) {
            setFilterId(
                banner.filterId
            );
        } else {
            setFilterId(
                "priceAsc"
            );
        }

        window.setTimeout(() => {
            const catalog =
                document.querySelector(
                    ".home-catalog"
                );

            if (catalog) {
                const target =
                    catalog.getBoundingClientRect()
                        .top +
                    window.scrollY -
                    76;

                window.scrollTo({
                    top:
                        Math.max(
                            0,
                            target
                        ),
                    behavior:
                        "smooth",
                });
            }
        }, 50);
    };

    return (
        <>
            

            <section
                className="home-banners reference-banners"
                aria-label="Новости и предложения"
            >
                <div className="reference-banner-grid">
                    <article
                        className="reference-banner-main"
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                            handleBannerAction(
                                banners[
                                    activeBanner
                                ]
                            )
                        }
                        onKeyDown={(event) => {
                            if (
                                event.key ===
                                    "Enter" ||
                                event.key ===
                                    " "
                            ) {
                                event.preventDefault();

                                handleBannerAction(
                                    banners[
                                        activeBanner
                                    ]
                                );
                            }
                        }}
                    >
                        {previousBanner !==
                            null && (
                            <div className="reference-main-layer reference-main-outgoing">
                                <div className="reference-main-copy">
                                    <span className="promo-badge">
                                        {
                                            banners[
                                                previousBanner
                                            ].badge
                                        }
                                    </span>

                                    <h2>
                                        {
                                            banners[
                                                previousBanner
                                            ].title
                                        }
                                    </h2>

                                    <p>
                                        {
                                            banners[
                                                previousBanner
                                            ].description
                                        }
                                    </p>
                                </div>

                                <div className="reference-main-figures">
                                    {banners[
                                        previousBanner
                                    ].images.map(
                                        (
                                            image,
                                            imageIndex
                                        ) => (
                                            <img
                                                key={`old-${banners[
                                                    previousBanner
                                                ].id}-${image}-${imageIndex}`}
                                                src={image}
                                                alt=""
                                                className={`reference-figure reference-figure-${
                                                    imageIndex +
                                                    1
                                                }`}
                                                onError={(
                                                    event
                                                ) => {
                                                    event.currentTarget.style.display =
                                                        "none";
                                                }}
                                            />
                                        )
                                    )}
                                </div>
                            </div>
                        )}

                        <div
                            key={
                                banners[
                                    activeBanner
                                ].id
                            }
                            className={`reference-main-layer reference-main-current ${
                                bannerAnimating
                                    ? "reference-main-incoming"
                                    : ""
                            }`}
                        >
                            <div className="reference-main-copy">
                                <span className="promo-badge">
                                    {
                                        banners[
                                            activeBanner
                                        ].badge
                                    }
                                </span>

                                <h2>
                                    {
                                        banners[
                                            activeBanner
                                        ].title
                                    }
                                </h2>

                                <p>
                                    {
                                        banners[
                                            activeBanner
                                        ].description
                                    }
                                </p>
                            </div>

                            <div className="reference-main-figures">
                                {banners[
                                    activeBanner
                                ].images.map(
                                    (
                                        image,
                                        imageIndex
                                    ) => (
                                        <img
                                            key={`new-${banners[
                                                activeBanner
                                            ].id}-${image}-${imageIndex}`}
                                            src={image}
                                            alt=""
                                            className={`reference-figure reference-figure-${
                                                imageIndex +
                                                1
                                            }`}
                                            onError={(
                                                event
                                            ) => {
                                                event.currentTarget.style.display =
                                                    "none";
                                            }}
                                        />
                                    )
                                )}
                            </div>
                        </div>

                        <div
                            className="reference-banner-dots"
                            onClick={(
                                event
                            ) =>
                                event.stopPropagation()
                            }
                        >
                            {banners.map(
                                (
                                    banner,
                                    index
                                ) => (
                                    <button
                                        key={
                                            banner.id
                                        }
                                        type="button"
                                        className={
                                            activeBanner ===
                                            index
                                                ? "active"
                                                : ""
                                        }
                                        onClick={() =>
                                            switchBanner(
                                                index
                                            )
                                        }
                                        aria-label={`Открыть баннер ${
                                            index +
                                            1
                                        }`}
                                    />
                                )
                            )}
                        </div>
                    </article>

                    <button
                        type="button"
                        className="reference-banner-side"
                        onClick={() =>
                            switchBanner(
                                (
                                    activeBanner +
                                    1
                                ) %
                                    banners.length
                            )
                        }
                    >
                        <div className="reference-side-image">
                            <img
                                src={
                                    banners[
                                        (
                                            activeBanner +
                                            1
                                        ) %
                                            banners.length
                                    ].images[
                                        0
                                    ]
                                }
                                alt=""
                                onError={(
                                    event
                                ) => {
                                    event.currentTarget.style.display =
                                        "none";
                                }}
                            />
                        </div>

                        <div className="reference-side-copy">
                            <span className="promo-badge">
                                {
                                    banners[
                                        (
                                            activeBanner +
                                            1
                                        ) %
                                            banners.length
                                    ].badge
                                }
                            </span>

                            <h3>
                                {
                                    banners[
                                        (
                                            activeBanner +
                                            1
                                        ) %
                                            banners.length
                                    ].title
                                }
                            </h3>

                            <p>
                                {
                                    banners[
                                        (
                                            activeBanner +
                                            1
                                        ) %
                                            banners.length
                                    ].description
                                }
                            </p>
                        </div>
                    </button>
                </div>
            </section>

            <section className="catalog home-catalog">
                <div className="section-title catalog-main-title">
                    <div>
                        <p className="section-label">
                            КАТАЛОГ
                        </p>

                        <h2>
                            Все фигурки
                        </h2>
                    </div>

                    <button
                        type="button"
                        className={`search-toggle-button ${
                            searchOpen
                                ? "active"
                                : ""
                        }`}
                        onClick={toggleSearch}
                        aria-label={
                            searchOpen
                                ? "Закрыть поиск"
                                : "Открыть поиск"
                        }
                    >
                        {searchOpen
                            ? "×"
                            : "⌕"}
                    </button>
                </div>

                <div className="catalog-controls">
                    <div
                        className={`collapsible-search ${
                            searchOpen
                                ? "open"
                                : ""
                        }`}
                    >
                        <label className="search-field">
                            <span className="search-icon">
                                ⌕
                            </span>

                            <input
                                ref={
                                    searchInputRef
                                }
                                type="search"
                                value={
                                    searchQuery
                                }
                                placeholder="Найти персонажа"
                                onChange={(
                                    event
                                ) =>
                                    setSearchQuery(
                                        event
                                            .target
                                            .value
                                    )
                                }
                            />
                        </label>
                    </div>

                    <select
                        className="catalog-sort"
                        value={filterId}
                        onChange={(event) =>
                            setFilterId(
                                event.target
                                    .value
                            )
                        }
                    >
                        {CATALOG_FILTERS.map(
                            (filter) => (
                                <option
                                    key={
                                        filter.id
                                    }
                                    value={
                                        filter.id
                                    }
                                >
                                    {
                                        filter.title
                                    }
                                </option>
                            )
                        )}
                    </select>
                </div>

                <div className="category-navigation-placeholder">
                    <div className="category-navigation-shell">
                        <nav
                            className="category-navigation"
                            ref={
                                categoryNavigationRef
                            }
                            aria-label="Категории товаров"
                        >
                            {categories.map(
                                (
                                    category
                                ) => (
                                    <button
                                        key={
                                            category
                                        }
                                        type="button"
                                        ref={(
                                            element
                                        ) => {
                                            categoryButtonRefs.current[
                                                category
                                            ] =
                                                element;
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
                                        <span
                                            className="category-logo"
                                            aria-hidden="true"
                                        >
                                            {
                                                CATEGORY_LOGOS[
                                                    category
                                                ] ?? "•"
                                            }
                                        </span>

                                        <span>
                                            {
                                                category
                                            }
                                        </span>
                                    </button>
                                )
                            )}
                        </nav>
                    </div>
                </div>

                <div className="category-sections">
                    {categories.map(
                        (category) => {
                            const categoryProducts =
                                preparedProducts.filter(
                                    (
                                        product
                                    ) =>
                                        product.category ===
                                        category
                                );

                            return (
                                <section
                                    key={
                                        category
                                    }
                                    className="category-section"
                                    ref={(
                                        element
                                    ) => {
                                        sectionRefs.current[
                                            category
                                        ] =
                                            element;
                                    }}
                                >
                                    <div className="category-heading">
                                        <div className="category-title-with-logo">
                                            <span
                                                className="category-heading-logo"
                                                aria-hidden="true"
                                            >
                                                {
                                                    CATEGORY_LOGOS[
                                                        category
                                                    ] ?? "•"
                                                }
                                            </span>

                                            <div>

                                                <h2>
                                                    {
                                                        category
                                                    }
                                                </h2>
                                            </div>
                                        </div>

                                        <span>
                                            {
                                                categoryProducts.length
                                            }
                                        </span>
                                    </div>

                                    {categoryProducts.length >
                                    0 ? (
                                        <div className="product-grid">
                                            {categoryProducts.map(
                                                (
                                                    product
                                                ) => (
                                                    <div
                                                        className="favorite-product-wrapper"
                                                        key={
                                                            product.id
                                                        }
                                                    >
                                                        <button
                                                            type="button"
                                                            className={`favorite-button ${
                                                                favoriteProductIds.includes(
                                                                    product.id
                                                                )
                                                                    ? "active"
                                                                    : ""
                                                            }`}
                                                            onClick={(
                                                                event
                                                            ) => {
                                                                event.stopPropagation();

                                                                onToggleFavorite?.(
                                                                    product.id
                                                                );
                                                            }}
                                                            aria-label={
                                                                favoriteProductIds.includes(
                                                                    product.id
                                                                )
                                                                    ? "Удалить из избранного"
                                                                    : "Добавить в избранное"
                                                            }
                                                        >
                                                            ♥
                                                        </button>

                                                        <ProductCard
                                                            product={
                                                                product
                                                            }
                                                            onOpen={
                                                                onOpenProduct
                                                            }
                                                        />
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    ) : (
                                        <div className="empty-category">
                                            <span>
                                                Скоро
                                            </span>

                                            <p>
                                                Товары в этой
                                                категории появятся
                                                позже.
                                            </p>
                                        </div>
                                    )}
                                </section>
                            );
                        }
                    )}
                </div>
            </section>
        </>
    );
}
