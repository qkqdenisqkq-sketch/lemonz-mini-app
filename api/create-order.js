function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function formatPrice(value) {
    return Number(
        value || 0
    ).toLocaleString("ru-RU");
}

function createOrderMessage(order) {
    const customer =
        order.customer ?? {};

    const items =
        Array.isArray(order.items)
            ? order.items
            : [];

    const comment = String(order.comment ?? "").trim();

    const itemsText = items
        .map((item, index) => {
            const options =
                Array.isArray(
                    item.options
                )
                    ? item.options
                    : [];

            const optionsText =
                options.length > 0
                    ? options
                          .map(
                              (
                                  option
                              ) =>
                                  `• ${escapeHtml(
                                      option.title
                                  )}`
                          )
                          .join("\n")
                    : "Без дополнительных опций";

            const nicknameText =
                item.nickname
                    ? `Ник: <b>${escapeHtml(
                          item.nickname
                      )}</b>`
                    : "";

            return [
                `<b>${index + 1}. ${escapeHtml(
                    item.name
                )} × ${Number(
                    item.quantity ||
                        1
                )}</b>`,
                `Категория: ${escapeHtml(
                    item.category
                )}`,
                `Цена за штуку: ${formatPrice(
                    item.unitPrice
                )} ₽`,
                "Опции:",
                optionsText,
                nicknameText,
            ]
                .filter(Boolean)
                .join("\n");
        })
        .join("\n\n");

    const username =
        customer.username
            ? `@${escapeHtml(
                  customer.username
              )}`
            : "не указан";

    const comment =
        String(
            order.comment ?? ""
        ).trim();

    return [
        "🛒 <b>Новый заказ Lemonz</b>",
        "",
        `Номер: <code>${escapeHtml(
            order.orderNumber
        )}</code>`,
        "",
        "<b>Клиент</b>",
        `Имя: ${escapeHtml(
            customer.firstName ||
                "Не указано"
        )}`,
        `Username: ${username}`,
        `Telegram ID: <code>${escapeHtml(
            customer.telegramId ||
                "не получен"
        )}</code>`,
        "",
        "<b>Состав заказа</b>",
        itemsText,
        "",
        "<b>Комментарий</b>",
        comment
            ? escapeHtml(comment)
            : "Без комментария",
        "",
        "<b>Комментаррий</b>",
        comment ? escapeHtml(comment) : "Без комментария",
        "",
        `<b>Итого: ${formatPrice(
            order.total
        )} ₽</b>`,
    ].join("\n");
}

export default async function handler(
    request,
    response
) {
    if (
        request.method !== "POST"
    ) {
        return response
            .status(405)
            .json({
                ok: false,
                error:
                    "Method not allowed",
            });
    }

    const botToken =
        process.env
            .TELEGRAM_BOT_TOKEN;

    const ordersChatId =
        process.env
            .TELEGRAM_ORDERS_CHAT_ID;

    if (
        !botToken ||
        !ordersChatId
    ) {
        console.error(
            "Telegram environment variables are missing"
        );

        return response
            .status(500)
            .json({
                ok: false,
                error:
                    "Server is not configured",
            });
    }

    try {
        const order =
            request.body;

        if (
            !order ||
            !Array.isArray(
                order.items
            ) ||
            order.items.length ===
                0
        ) {
            return response
                .status(400)
                .json({
                    ok: false,
                    error:
                        "Order is empty",
                });
        }

        const telegramResponse =
            await fetch(
                `https://api.telegram.org/bot${botToken}/sendMessage`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body:
                        JSON.stringify(
                            {
                                chat_id:
                                    ordersChatId,
                                text:
                                    createOrderMessage(
                                        order
                                    ),
                                parse_mode:
                                    "HTML",
                                disable_web_page_preview:
                                    true,
                            }
                        ),
                }
            );

        const telegramResult =
            await telegramResponse.json();

        if (
            !telegramResponse.ok ||
            !telegramResult.ok
        ) {
            console.error(
                "Telegram API error:",
                telegramResult
            );

            return response
                .status(502)
                .json({
                    ok: false,
                    error:
                        telegramResult.description ||
                        "Telegram rejected the message",
                });
        }

        return response
            .status(200)
            .json({
                ok: true,
                orderNumber:
                    order.orderNumber,
            });
    } catch (error) {
        console.error(
            "Order error:",
            error
        );

        return response
            .status(500)
            .json({
                ok: false,
                error:
                    "Could not send order",
            });
    }
}
