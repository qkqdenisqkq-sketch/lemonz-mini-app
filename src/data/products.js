export const DEFAULT_CATEGORIES = [
    "Valorant",
    "Dota 2",
    "League of Legends",
    "Anime",
    "Аксессуары",
    "CS2",
];

export const CATEGORY_LOGOS = {
    Valorant: "V",
    "Dota 2": "D2",
    "League of Legends": "L",
    Anime: "A",
    "Аксессуары": "+",
    CS2: "CS",
};

export const DEFAULT_PRODUCTS = [
    {
        id: 1,
        name: "Clove",
        category: "Valorant",
        price: 7000,
        image: "/Clove.png",
        popular: true,
        isNew: true,
    },
    {
        id: 2,
        name: "Chamber",
        category: "Valorant",
        price: 7000,
        image: "/Chamber.png",
        popular: true,
        isNew: false,
    },
    {
        id: 3,
        name: "Jett",
        category: "Valorant",
        price: 7000,
        image: "/Jett.png",
        popular: true,
        isNew: true,
    },
    {
        id: 4,
        name: "Killjoy",
        category: "Valorant",
        price: 7000,
        image: "/Killjoy.png",
        popular: false,
        isNew: false,
    },
    {
        id: 5,
        name: "Axe",
        category: "Dota 2",
        price: 7000,
        image: "/Axe.png",
        popular: true,
        isNew: false,
    },
    {
        id: 6,
        name: "Pudge",
        category: "Dota 2",
        price: 7000,
        image: "/Pudge.png",
        popular: false,
        isNew: false,
    },
    {
        id: 7,
        name: "Crystal Maiden",
        category: "Dota 2",
        price: 7500,
        image: "/CrystalMaiden.png",
        popular: false,
        isNew: true,
    },
    {
        id: 8,
        name: "Jinx",
        category: "League of Legends",
        price: 7000,
        image: "/Jinx.png",
        popular: true,
        isNew: false,
    },
    {
        id: 9,
        name: "Ahri",
        category: "League of Legends",
        price: 7000,
        image: "/Ahri.png",
        popular: false,
        isNew: true,
    },
    {
        id: 10,
        name: "Teemo",
        category: "League of Legends",
        price: 6500,
        image: "/Teemo.png",
        popular: false,
        isNew: false,
    },
];

export const CUSTOM_OPTIONS = [
    {
        id: "nickname",
        title: "Добавить свой ник",
        description: "Надпись на подиуме или табличке",
        price: 500,
    },
    {
        id: "pose",
        title: "Изменить позу",
        description: "Индивидуальная поза фигурки",
        price: 1000,
    },
    {
        id: "weapon",
        title: "Поменять или добавить оружие",
        description: "Другое оружие или дополнительный предмет",
        price: 1000,
    },
];

export const CATALOG_FILTERS = [
    {
        id: "priceAsc",
        title: "Цена: по возрастанию",
    },
    {
        id: "priceDesc",
        title: "Цена: по убыванию",
    },
    {
        id: "popular",
        title: "Популярные",
    },
    {
        id: "new",
        title: "Новые",
    },
];
