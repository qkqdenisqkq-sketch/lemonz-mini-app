import {
    useMemo,
    useState,
} from "react";

import {
    CUSTOM_OPTIONS,
} from "../data/products";

export default function ProductModal({
    product,
    onClose,
    onAdd,
    showMessage,
}) {
    const [
        selectedOptions,
        setSelectedOptions,
    ] = useState([]);

    const [nickname, setNickname] =
        useState("");

    const totalPrice = useMemo(() => {
        const optionsPrice =
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

        return product.price + optionsPrice;
    }, [
        product.price,
        selectedOptions,
    ]);

    const toggleOption = (optionId) => {
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

    const handleAdd = () => {
        const needsNickname =
            selectedOptions.includes(
                "nickname"
            );

        if (
            needsNickname &&
            !nickname.trim()
        ) {
            showMessage(
                "Введите ник или отключите эту опцию"
            );
            return;
        }

        const options =
            CUSTOM_OPTIONS.filter(
                (option) =>
                    selectedOptions.includes(
                        option.id
                    )
            );

        onAdd({
            product,
            options,
            nickname: needsNickname
                ? nickname.trim()
                : "",
            unitPrice: totalPrice,
        });
    };

    return (
        <div
            className="modal-overlay"
            onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget
                ) {
                    onClose();
                }
            }}
        >
            <section
                className="product-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="product-modal-title"
            >
                <button
                    type="button"
                    className="modal-close"
                    onClick={onClose}
                    aria-label="Закрыть"
                >
                    ×
                </button>

                <div className="modal-product-preview">
                    <img
                        src={product.image}
                        alt={product.name}
                    />
                </div>

                <p className="category">
                    {product.category}
                </p>

                <h2 id="product-modal-title">
                    {product.name}
                </h2>

                <div className="modal-base-price">
                    <span>
                        Базовая цена
                    </span>

                    <strong>
                        {product.price.toLocaleString(
                            "ru-RU"
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
                                        toggleOption(
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
                                        {option.price.toLocaleString(
                                            "ru-RU"
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
                            type="text"
                            maxLength="24"
                            value={nickname}
                            placeholder="Например, lemonzprime"
                            onChange={(event) =>
                                setNickname(
                                    event.target
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
                        {totalPrice.toLocaleString(
                            "ru-RU"
                        )}{" "}
                        ₽
                    </strong>
                </div>

                <button
                    type="button"
                    className="primary-button modal-add-button"
                    onClick={handleAdd}
                >
                    Добавить в корзину
                </button>
            </section>
        </div>
    );
}