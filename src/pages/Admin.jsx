import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    DEFAULT_CATEGORIES,
} from "../data/products";

const EMPTY_FORM = {
    id: null,
    name: "",
    category:
        DEFAULT_CATEGORIES[0] ??
        "Valorant",
    price: 7000,
    image: "",
    popular: false,
    isNew: true,
};

function compressImage(file) {
    return new Promise(
        (resolve, reject) => {
            if (
                !file.type.startsWith(
                    "image/"
                )
            ) {
                reject(
                    new Error(
                        "Выберите файл изображения"
                    )
                );
                return;
            }

            const reader =
                new FileReader();

            reader.onerror = () => {
                reject(
                    new Error(
                        "Не удалось прочитать изображение"
                    )
                );
            };

            reader.onload = () => {
                const image =
                    new Image();

                image.onerror = () => {
                    reject(
                        new Error(
                            "Не удалось открыть изображение"
                        )
                    );
                };

                image.onload = () => {
                    const maxSize =
                        1200;

                    const scale =
                        Math.min(
                            1,
                            maxSize /
                                Math.max(
                                    image.width,
                                    image.height
                                )
                        );

                    const width =
                        Math.max(
                            1,
                            Math.round(
                                image.width *
                                    scale
                            )
                        );

                    const height =
                        Math.max(
                            1,
                            Math.round(
                                image.height *
                                    scale
                            )
                        );

                    const canvas =
                        document.createElement(
                            "canvas"
                        );

                    canvas.width =
                        width;
                    canvas.height =
                        height;

                    const context =
                        canvas.getContext(
                            "2d"
                        );

                    if (!context) {
                        reject(
                            new Error(
                                "Браузер не поддерживает обработку изображений"
                            )
                        );
                        return;
                    }

                    context.clearRect(
                        0,
                        0,
                        width,
                        height
                    );

                    context.drawImage(
                        image,
                        0,
                        0,
                        width,
                        height
                    );

                    const outputType =
                        file.type ===
                        "image/png"
                            ? "image/png"
                            : "image/webp";

                    const dataUrl =
                        canvas.toDataURL(
                            outputType,
                            0.86
                        );

                    resolve(
                        dataUrl
                    );
                };

                image.src =
                    String(
                        reader.result
                    );
            };

            reader.readAsDataURL(
                file
            );
        }
    );
}

export default function Admin({
    products,
    onSave,
    onDelete,
    onReset,
}) {
    const [
        form,
        setForm,
    ] = useState(
        EMPTY_FORM
    );

    const [
        selectedCategory,
        setSelectedCategory,
    ] = useState(
        DEFAULT_CATEGORIES[0] ??
            "Valorant"
    );

    const [
        imageLoading,
        setImageLoading,
    ] = useState(false);

    const [
        imageError,
        setImageError,
    ] = useState("");

    const fileInputRef =
        useRef(null);

    const categoryTabsRef =
        useRef(null);

    useEffect(() => {
        const tabs =
            categoryTabsRef.current;

        if (!tabs) {
            return;
        }

        const handleWheel = (
            event
        ) => {
            event.preventDefault();
            event.stopPropagation();

            const delta =
                Math.abs(
                    event.deltaY
                ) >=
                Math.abs(
                    event.deltaX
                )
                    ? event.deltaY
                    : event.deltaX;

            tabs.scrollLeft +=
                delta;
        };

        tabs.addEventListener(
            "wheel",
            handleWheel,
            {
                passive: false,
            }
        );

        return () => {
            tabs.removeEventListener(
                "wheel",
                handleWheel
            );
        };
    }, []);

    const categories =
        useMemo(() => {
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

    const groupedProducts =
        useMemo(() => {
            return categories.reduce(
                (
                    result,
                    category
                ) => {
                    result[category] =
                        products.filter(
                            (product) =>
                                product.category ===
                                category
                        );

                    return result;
                },
                {}
            );
        }, [
            products,
            categories,
        ]);

    const visibleProducts =
        groupedProducts[
            selectedCategory
        ] ?? [];

    const updateField = (
        field,
        value
    ) => {
        setForm(
            (current) => ({
                ...current,
                [field]: value,
            })
        );
    };

    const resetForm = () => {
        setForm({
            ...EMPTY_FORM,
            category:
                selectedCategory ||
                DEFAULT_CATEGORIES[0] ||
                "Valorant",
        });

        setImageError("");
        setImageLoading(
            false
        );

        if (
            fileInputRef.current
        ) {
            fileInputRef.current.value =
                "";
        }
    };

    const editProduct = (
        product
    ) => {
        setForm({
            id: product.id,
            name:
                product.name ??
                "",
            category:
                product.category ??
                DEFAULT_CATEGORIES[0],
            price:
                Number(
                    product.price ??
                        0
                ),
            image:
                product.image ??
                "",
            popular:
                Boolean(
                    product.popular
                ),
            isNew:
                Boolean(
                    product.isNew
                ),
        });

        setSelectedCategory(
            product.category
        );

        setImageError("");

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    const handleImageUpload =
        async (event) => {
            const file =
                event.target
                    .files?.[0];

            if (!file) {
                return;
            }

            if (
                file.size >
                12 * 1024 * 1024
            ) {
                setImageError(
                    "Файл слишком большой. Максимум 12 МБ."
                );
                return;
            }

            setImageLoading(
                true
            );
            setImageError("");

            try {
                const imageData =
                    await compressImage(
                        file
                    );

                updateField(
                    "image",
                    imageData
                );
            } catch (error) {
                setImageError(
                    error?.message ??
                        "Не удалось загрузить изображение"
                );
            } finally {
                setImageLoading(
                    false
                );
            }
        };

    const saveProduct = (
        event
    ) => {
        event.preventDefault();

        const name =
            form.name.trim();

        const category =
            form.category.trim();

        const price =
            Number(form.price);

        if (!name) {
            window.alert(
                "Укажите название фигурки"
            );
            return;
        }

        if (!category) {
            window.alert(
                "Выберите категорию"
            );
            return;
        }

        if (
            !Number.isFinite(
                price
            ) ||
            price < 0
        ) {
            window.alert(
                "Укажите корректную цену"
            );
            return;
        }

        if (!form.image) {
            window.alert(
                "Загрузите изображение или укажите путь к нему"
            );
            return;
        }

        onSave({
            id: form.id,
            name,
            category,
            price,
            image:
                form.image,
            popular:
                Boolean(
                    form.popular
                ),
            isNew:
                Boolean(
                    form.isNew
                ),
        });

        setSelectedCategory(
            category
        );

        resetForm();
    };

    return (
        <section className="admin-page">
            <div className="page-heading admin-page-heading">
                <div>
                    <p className="section-label">
                        УПРАВЛЕНИЕ
                    </p>

                    <h1>
                        Админ-панель
                    </h1>
                </div>

                <button
                    type="button"
                    className="secondary-button"
                    onClick={
                        onReset
                    }
                >
                    Сбросить
                </button>
            </div>

            <form
                className="admin-form admin-product-form"
                onSubmit={
                    saveProduct
                }
            >
                <div className="admin-form-title">
                    <div>
                        <p className="section-label">
                            ТОВАР
                        </p>

                        <h2>
                            {form.id !==
                            null
                                ? "Редактирование"
                                : "Новая фигурка"}
                        </h2>
                    </div>

                    {form.id !==
                        null && (
                        <button
                            type="button"
                            className="text-button"
                            onClick={
                                resetForm
                            }
                        >
                            Отмена
                        </button>
                    )}
                </div>

                <label className="field">
                    <span>
                        Название
                    </span>

                    <input
                        type="text"
                        value={
                            form.name
                        }
                        placeholder="Например, Jett"
                        onChange={(
                            event
                        ) =>
                            updateField(
                                "name",
                                event
                                    .target
                                    .value
                            )
                        }
                    />
                </label>

                <label className="field">
                    <span>
                        Категория
                    </span>

                    <select
                        value={
                            form.category
                        }
                        onChange={(
                            event
                        ) =>
                            updateField(
                                "category",
                                event
                                    .target
                                    .value
                            )
                        }
                    >
                        {categories.map(
                            (category) => (
                                <option
                                    key={
                                        category
                                    }
                                    value={
                                        category
                                    }
                                >
                                    {
                                        category
                                    }
                                </option>
                            )
                        )}
                    </select>
                </label>

                <label className="field">
                    <span>
                        Цена, ₽
                    </span>

                    <input
                        type="number"
                        min="0"
                        step="100"
                        value={
                            form.price
                        }
                        onChange={(
                            event
                        ) =>
                            updateField(
                                "price",
                                event
                                    .target
                                    .value
                            )
                        }
                    />
                </label>

                <div className="admin-image-field">
                    <span className="admin-field-label">
                        Изображение
                    </span>

                    <div className="admin-image-upload">
                        <div className="admin-image-preview">
                            {form.image ? (
                                <img
                                    src={
                                        form.image
                                    }
                                    alt="Предпросмотр товара"
                                />
                            ) : (
                                <div className="admin-image-placeholder">
                                    <span>
                                        +
                                    </span>

                                    <p>
                                        Изображение
                                        не выбрано
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="admin-image-controls">
                            <input
                                ref={
                                    fileInputRef
                                }
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={
                                    handleImageUpload
                                }
                                hidden
                            />

                            <button
                                type="button"
                                className="primary-button admin-upload-button"
                                disabled={
                                    imageLoading
                                }
                                onClick={() =>
                                    fileInputRef.current?.click()
                                }
                            >
                                {imageLoading
                                    ? "Обработка..."
                                    : "Загрузить с устройства"}
                            </button>

                            <label className="field admin-image-url-field">
                                <span>
                                    Или путь / ссылка
                                </span>

                                <input
                                    type="text"
                                    value={
                                        form.image
                                    }
                                    placeholder="/Jett.png"
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "image",
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                />
                            </label>

                            {form.image && (
                                <button
                                    type="button"
                                    className="text-button danger-button"
                                    onClick={() => {
                                        updateField(
                                            "image",
                                            ""
                                        );

                                        if (
                                            fileInputRef.current
                                        ) {
                                            fileInputRef.current.value =
                                                "";
                                        }
                                    }}
                                >
                                    Удалить изображение
                                </button>
                            )}

                            {imageError && (
                                <p className="admin-image-error">
                                    {
                                        imageError
                                    }
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="admin-product-flags">
                    <label className="admin-checkbox">
                        <input
                            type="checkbox"
                            checked={
                                form.popular
                            }
                            onChange={(
                                event
                            ) =>
                                updateField(
                                    "popular",
                                    event
                                        .target
                                        .checked
                                )
                            }
                        />

                        <span>
                            Популярный
                        </span>
                    </label>

                    <label className="admin-checkbox">
                        <input
                            type="checkbox"
                            checked={
                                form.isNew
                            }
                            onChange={(
                                event
                            ) =>
                                updateField(
                                    "isNew",
                                    event
                                        .target
                                        .checked
                                )
                            }
                        />

                        <span>
                            Новинка
                        </span>
                    </label>
                </div>

                <button
                    type="submit"
                    className="primary-button admin-save-button"
                    disabled={
                        imageLoading
                    }
                >
                    {form.id !==
                    null
                        ? "Сохранить изменения"
                        : "Добавить фигурку"}
                </button>
            </form>

            <div className="admin-catalog-section">
                <div className="admin-products-heading">
                    <div>
                        <p className="section-label">
                            ТЕКУЩИЕ ТОВАРЫ
                        </p>

                        <h2>
                            Категории
                        </h2>
                    </div>

                    <span className="admin-total-products">
                        {
                            products.length
                        }
                    </span>
                </div>

                <div
                    ref={
                        categoryTabsRef
                    }
                    className="admin-category-tabs"
                >
                    {categories.map(
                        (category) => {
                            const count =
                                groupedProducts[
                                    category
                                ]?.length ??
                                0;

                            return (
                                <button
                                    key={
                                        category
                                    }
                                    type="button"
                                    className={
                                        selectedCategory ===
                                        category
                                            ? "active"
                                            : ""
                                    }
                                    onClick={() => {
                                        setSelectedCategory(
                                            category
                                        );

                                        if (
                                            form.id ===
                                            null
                                        ) {
                                            updateField(
                                                "category",
                                                category
                                            );
                                        }
                                    }}
                                >
                                    <span>
                                        {
                                            category
                                        }
                                    </span>

                                    <strong>
                                        {
                                            count
                                        }
                                    </strong>
                                </button>
                            );
                        }
                    )}
                </div>

                <div className="admin-category-panel">
                    <div className="admin-category-panel-title">
                        <h3>
                            {
                                selectedCategory
                            }
                        </h3>

                        <span>
                            {
                                visibleProducts.length
                            }{" "}
                            товаров
                        </span>
                    </div>

                    {visibleProducts.length >
                    0 ? (
                        <div className="admin-products">
                            {visibleProducts.map(
                                (
                                    product
                                ) => (
                                    <article
                                        key={
                                            product.id
                                        }
                                        className="admin-product"
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

                                            <strong className="admin-product-price">
                                                {Number(
                                                    product.price
                                                ).toLocaleString(
                                                    "ru-RU"
                                                )}{" "}
                                                ₽
                                            </strong>

                                            <div className="admin-product-badges">
                                                {product.popular && (
                                                    <span>
                                                        Популярное
                                                    </span>
                                                )}

                                                {product.isNew && (
                                                    <span>
                                                        Новинка
                                                    </span>
                                                )}
                                            </div>

                                            <div className="admin-product-actions">
                                                <button
                                                    type="button"
                                                    className="secondary-button"
                                                    onClick={() =>
                                                        editProduct(
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
                                                        onDelete(
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
                    ) : (
                        <div className="admin-empty-category">
                            <div>
                                +
                            </div>

                            <h3>
                                В этой категории пока нет товаров
                            </h3>

                            <p>
                                Выбери её в форме
                                выше и добавь первую
                                фигурку.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
