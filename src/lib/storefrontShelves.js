export function getStorefrontShelves(products) {
    const catalog = Array.isArray(products) ? products : [];

    return {
        popular: catalog.filter((product) => product?.popular === true),
        newArrivals: catalog.filter((product) => product?.isNew === true),
    };
}
