import test from "node:test";
import assert from "node:assert/strict";
import { filterCatalogProducts, getProductSubcategory, sortCatalogProducts } from "./src/lib/catalog.js";

const products = [
    { id: 1, name: "Clove", category: "Valorant", price: 7000, popular: true },
    { id: 2, name: "Clove брелок", category: "Valorant", subcategory: "Брелки", price: 2000, isNew: true },
    { id: 3, name: "Neon лампа", category: "Valorant", subcategory: "Лампы", price: 4800 },
    { id: 4, name: "Jinx", category: "League of Legends", subcategory: "Фигурки", price: 7500 },
];

test("старые товары без подкатегории остаются в «Фигурки»", () => {
    assert.equal(getProductSubcategory(products[0]), "Фигурки");
    assert.equal(getProductSubcategory({ subcategory: "Лампа" }), "Лампы");
    assert.deepEqual(filterCatalogProducts(products, { category: "Valorant", subcategory: "Фигурки" }).map((item) => item.id), [1]);
});

test("подкатегории каждой вселенной независимы", () => {
    assert.deepEqual(filterCatalogProducts(products, { category: "Valorant", subcategory: "Брелки" }).map((item) => item.id), [2]);
    assert.deepEqual(filterCatalogProducts(products, { category: "Valorant", subcategory: "Лампы" }).map((item) => item.id), [3]);
    assert.deepEqual(filterCatalogProducts(products, { category: "League of Legends", subcategory: "Фигурки" }).map((item) => item.id), [4]);
    assert.equal(filterCatalogProducts(products, { category: "Valorant", subcategory: "Декор" }).length, 0);
});

test("поиск и сортировка работают внутри подкатегории", () => {
    assert.deepEqual(filterCatalogProducts(products, { category: "Valorant", subcategory: "Брелки", query: "CLOVE" }).map((item) => item.id), [2]);
    assert.deepEqual(sortCatalogProducts(products, "priceAsc").map((item) => item.id), [2, 3, 1, 4]);
    assert.deepEqual(sortCatalogProducts(products, "popular").map((item) => item.id)[0], 1);
});
