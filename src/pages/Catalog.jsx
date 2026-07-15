import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import ProductCard from "../components/ProductCard";

import {
    DEFAULT_CATEGORIES,
    PRICE_FILTERS,
} from "../data/products";

export default function Catalog({
    products,
    onOpenProduct,
}) {
    const [searchQuery, setSearchQuery] =
        useState("");

    const [priceFilterId, setPriceFilterId] =
        useState("all");

    const [activeCategory, setActiveCategory] =
        useState(DEFAULT_CATEGORIES[0]);

    const sectionRefs = useRef({});
    const categoryNavigationRef =
        useRef(null);
    const categoryButtonRefs =
        useRef({});
    const scrollFrameRef = useRef(null);

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

    const selectedPriceFilter =
        PRICE_FILTERS.find(
            (filter) =>
                filter.id ===
                priceFilterId
        ) ?? PRICE_FILTERS[0];

    const filteredProducts =
        useMemo(() => {
            const normalizedQuery =
                searchQuery
                    .trim()
                    .toLowerCase();

            return products.filter(
                (product) => {
                    const matchesSearch =
                        !normalizedQuery ||
                        product.name
                            .toLowerCase()
                            .includes(
                                normalizedQuery
                            ) ||
                        product.category
                            .toLowerCase()
                            .includes(
                                normalizedQuery
                            );

                    const matchesPrice =
                        product.price >=
                            selectedPriceFilter.min &&
                        product.price <=
                            selectedPriceFilter.max;

                    return (
                        matchesSearch &&
                        matchesPrice
                    );
                }
            );
        }, [
            products,
            searchQuery,
            selectedPriceFilter,
        ]);

    const visibleCategories =
        useMemo(() => {
            return categories.filter(
                (category) =>
                    filteredProducts.some(
                        (product) =>
                            product.category ===
                            category
                    )
            );
        }, [
            categories,
            filteredProducts,
        ]);

    /*
     * Определяет активную категорию
     * при прокрутке страницы.
     */
    useEffect(() => {
        const updateActiveCategory =
            () => {
                if (
                    scrollFrameRef.current
                ) {
                    cancelAnimationFrame(
                        scrollFrameRef.current
                    );
                }

                scrollFrameRef.current =
                    requestAnimationFrame(
                        () => {
                            const fixedOffset =
                                155;

                            let currentCategory =
                                visibleCategories[0];

                            visibleCategories.forEach(
                                (
                                    category
                                ) => {
                                    const section =
                                        sectionRefs
                                            .current[
                                            category
                                        ];

                                    if (
                                        !section
                                    ) {
                                        return;
                                    }

                                    const sectionTop =
                                        section
                                            .getBoundingClientRect()
                                            .top;

                                    if (
                                        sectionTop <=
                                        fixedOffset
                                    ) {
                                        currentCategory =
                                            category;
                                    }
                                }
                            );

                            if (
                                currentCategory
                            ) {
                                setActiveCategory(
                                    currentCategory
                                );
                            }
                        }
                    );
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

            if (
                scrollFrameRef.current
            ) {
                cancelAnimationFrame(
                    scrollFrameRef.current
                );
            }
        };
    }, [visibleCategories]);

    /*
     * При смене категории горизонтально
     * центрирует активную кнопку.
     *
     * Вертикальная позиция страницы
     * при этом не меняется.
     */
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

        const targetLeft =
            activeButton.offsetLeft -
            navigation.clientWidth / 2 +
            activeButton.offsetWidth / 2;

        navigation.scrollTo({
            left: targetLeft,
            behavior: "smooth",
        });
    }, [activeCategory]);

    /*
     * Если после фильтрации активная
     * категория пропала, выбираем первую.
     */
    useEffect(() => {
        if (
            visibleCategories.length ===
            0
        ) {
            return;
        }

        if (
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

        const categoryPanelHeight =
            document
                .querySelector(
                    ".category-navigation-shell"
                )
                ?.getBoundingClientRect()
                .height ?? 64;

        const sectionPosition =
            section
                .getBoundingClientRect()
                .top +
            window.scrollY;

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

    const resetFilters = () => {
        setSearchQuery("");
        setPriceFilterId("all");

        if (
            visibleCategories.length > 0
        ) {
            setActiveCategory(
                visibleCategories[0]
            );
        }
    };

    return (
        <section className="catalog catalog-page">
            <div className="catalog-heading">
                <p className="section-label">
                    КАТАЛОГ
                </p>

                <h1>
                    Выбери свою вселенную
                </h1>

                <p>
                    Используй поиск, фильтр и
                    закреплённую панель
                    категорий.
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
                        onChange={(
                            event
                        ) =>
                            setSearchQuery(
                                event.target
                                    .value
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

            {visibleCategories.length >
                0 && (
                <div className="category-navigation-placeholder">
                    <div className="category-navigation-shell">
                        <nav
                            className="category-navigation"
                            ref={
                                categoryNavigationRef
                            }
                            aria-label="Категории фигурок"
                        >
                            {visibleCategories.map(
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
                                        {
                                            category
                                        }
                                    </button>
                                )
                            )}
                        </nav>
                    </div>
                </div>
            )}

            {filteredProducts.length ===
            0 ? (
                <div className="empty-search">
                    <div>⌕</div>

                    <h2>
                        Ничего не найдено
                    </h2>

                    <p>
                        Измени запрос или
                        сбрось фильтры.
                    </p>

                    <button
                        type="button"
                        className="primary-button"
                        onClick={
                            resetFilters
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
                                        <div>
                                            <p className="section-label">
                                                КАТЕГОРИЯ
                                            </p>

                                            <h2>
                                                {
                                                    category
                                                }
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
                                            (
                                                product
                                            ) => (
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
                            );
                        }
                    )}
                </div>
            )}
        </section>
    );
}