export function cartPricing(items, promo = null) {
    const subtotal = items.reduce((sum, item) =>
        sum + Number(item.unitPrice || 0) * Number(item.quantity || 0), 0);

    let discount = 0;
    if (promo) {
        const percent = Number(promo.percent || 0);
        if (promo.scope === "order") {
            discount = Math.round(subtotal * percent / 100);
        } else if (promo.scope === "figure") {
            const eligible = items.find((item) =>
                String(item.cartId) === String(promo.eligibleCartId));
            // A personal winner's coupon applies to one figure, not every copy.
            if (eligible) discount = Math.round(Number(eligible.unitPrice || 0) * percent / 100);
        }
    }

    return {
        subtotal,
        discount: Math.min(subtotal, discount),
        total: Math.max(0, subtotal - discount),
    };
}
