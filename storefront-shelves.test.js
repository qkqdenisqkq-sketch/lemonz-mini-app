import test from "node:test";
import assert from "node:assert/strict";
import { getStorefrontShelves } from "./src/lib/storefrontShelves.js";

test("на главной показываются только фигурки из каталога с нужными отметками", () => {
    const catalog = [
        { id: 1, name: "Clove", popular: true, isNew: false },
        { id: 2, name: "Chamber", popular: false, isNew: true },
        { id: 3, name: "Jinx", popular: false, isNew: false },
        { id: 4, name: "Iso", popular: true, isNew: true },
    ];

    const shelves = getStorefrontShelves(catalog);
    assert.deepEqual(shelves.popular.map((product) => product.id), [1, 4]);
    assert.deepEqual(shelves.newArrivals.map((product) => product.id), [2, 4]);
    assert.ok(!shelves.popular.some((product) => product.name === "Jinx"));
});

test("переключение отметок в админке меняет подборки", () => {
    const catalog = [{ id: 1, name: "Clove", popular: true, isNew: false }];
    const edited = catalog.map((product) => ({ ...product, popular: false, isNew: true }));

    assert.equal(getStorefrontShelves(edited).popular.length, 0);
    assert.deepEqual(getStorefrontShelves(edited).newArrivals.map((product) => product.id), [1]);
});

test("пустой каталог не создаёт вымышленных товаров", () => {
    assert.deepEqual(getStorefrontShelves([]), { popular: [], newArrivals: [] });
    assert.deepEqual(getStorefrontShelves(undefined), { popular: [], newArrivals: [] });
});
