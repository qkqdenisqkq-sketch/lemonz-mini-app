import { useState } from "react";

import {
    DEFAULT_CATEGORIES,
} from "../data/products";

const createEmptyForm = () => ({
    name: "",
    category: DEFAULT_CATEGORIES[0],
    price: 7000,
    image: "",
    popular: false,
});

export default function Admin({
    products,
    onSave,
    onDelete,
    onReset,
}) {
    const [editingId, setEditingId] =
        useState(null);

    const [form, setForm] =
        useState(createEmptyForm);

    const resetForm = () => {
        setEditingId(null);
        setForm(createEmptyForm());
    };

    const startEditing = (product) => {
        setEditingId(product.id);

        setForm({
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

    const handleSubmit = (event) => {
        event.preventDefault();

        const preparedPrice =
            Number(form.price);

        if (!form.name.trim()) {
            window.alert(
                "Введите название фигурки"
            );

            return;
        }

        if (!form.category.trim()) {
            window.alert(
                "Введите категорию"
            );

            return;
        }

        if (
            !Number.isFinite(
                preparedPrice
            ) ||
            preparedPrice < 0
        ) {
            window.alert(
                "Укажите корректную цену"
            );

            return;
        }

        onSave({
            id: editingId,
            name: form.name.trim(),
            category:
                form.category.trim(),
            price: preparedPrice,
            image:
                form.image.trim() ||
                "/placeholder.png",
            popular: form.popular,
        });

        resetForm();
    };

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
                    Здесь можно добавлять,
                    удалять и редактировать
                    фигурки.
                </p>
            </div>

            <form
                className="admin-form"
                onSubmit={handleSubmit}
            >
                <div className="admin-form-title">
                    <h2>
                        {editingId !== null
                            ? "Редактировать фигурку"
                            : "Добавить фигурку"}
                    </h2>

                    {editingId !== null && (
                        <button
                            type="button"
                            className="text-button"
                            onClick={resetForm}
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
                        value={form.name}
                        placeholder="Например, Sage"
                        onChange={(event) =>
                            setForm(
                                (current) => ({
                                    ...current,
                                    name:
                                        event.target
                                            .value,
                                })
                            )
                        }
                    />
                </label>

                <label className="field">
                    <span>
                        Категория
                    </span>

                    <input
                        type="text"
                        value={form.category}
                        list="admin-category-options"
                        placeholder="Valorant"
                        onChange={(event) =>
                            setForm(
                                (current) => ({
                                    ...current,
                                    category:
                                        event.target
                                            .value,
                                })
                            )
                        }
                    />

                    <datalist id="admin-category-options">
                        {DEFAULT_CATEGORIES.map(
                            (category) => (
                                <option
                                    key={
                                        category
                                    }
                                    value={
                                        category
                                    }
                                />
                            )
                        )}
                    </datalist>
                </label>

                <label className="field">
                    <span>
                        Цена, ₽
                    </span>

                    <input
                        type="number"
                        min="0"
                        step="100"
                        value={form.price}
                        onChange={(event) =>
                            setForm(
                                (current) => ({
                                    ...current,
                                    price:
                                        event.target
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
                        type="text"
                        value={form.image}
                        placeholder="/Sage.png"
                        onChange={(event) =>
                            setForm(
                                (current) => ({
                                    ...current,
                                    image:
                                        event.target
                                            .value,
                                })
                            )
                        }
                    />

                    <small>
                        Картинка должна находиться
                        в папке public. Например:
                        /Sage.png
                    </small>
                </label>

                <label className="admin-checkbox">
                    <input
                        type="checkbox"
                        checked={form.popular}
                        onChange={(event) =>
                            setForm(
                                (current) => ({
                                    ...current,
                                    popular:
                                        event.target
                                            .checked,
                                })
                            )
                        }
                    />

                    <span>
                        Показывать на главной
                    </span>
                </label>

                <button
                    type="submit"
                    className="primary-button admin-save-button"
                >
                    {editingId !== null
                        ? "Сохранить изменения"
                        : "Добавить фигурку"}
                </button>
            </form>

            <div className="admin-products-heading">
                <div>
                    <p className="section-label">
                        ТОВАРЫ
                    </p>

                    <h2>
                        Фигурки:{" "}
                        {products.length}
                    </h2>
                </div>

                <button
                    type="button"
                    className="text-button danger-button"
                    onClick={onReset}
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
                                    {Number(
                                        product.price
                                    ).toLocaleString(
                                        "ru-RU"
                                    )}{" "}
                                    ₽
                                </strong>

                                {product.popular && (
                                    <span className="popular-label">
                                        На главной
                                    </span>
                                )}

                                <div className="admin-product-actions">
                                    <button
                                        type="button"
                                        className="secondary-button"
                                        onClick={() =>
                                            startEditing(
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
        </section>
    );
}