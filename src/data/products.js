export const DEFAULT_CATEGORIES = [
    "Valorant",
    "Dota 2",
    "League of Legends",
];

export const DEFAULT_PRODUCTS = [
    {
        id: 1,
        name: "Clove",
        category: "Valorant",
        price: 7000,
        image: "/Clove.png",
        popular: true,
    },
    {
        id: 2,
        name: "Chamber",
        category: "Valorant",
        price: 7000,
        image: "/Chamber.png",
        popular: true,
    },
    {
        id: 3,
        name: "Jett",
        category: "Valorant",
        price: 7000,
        image: "/Jett.png",
        popular: true,
    },
    {
        id: 4,
        name: "Killjoy",
        category: "Valorant",
        price: 7000,
        image: "/Killjoy.png",
        popular: false,
    },
    {
        id: 5,
        name: "Axe",
        category: "Dota 2",
        price: 7000,
        image: "/Axe.png",
        popular: true,
    },
    {
        id: 6,
        name: "Pudge",
        category: "Dota 2",
        price: 7000,
        image: "/Pudge.png",
        popular: false,
    },
    {
        id: 7,
        name: "Crystal Maiden",
        category: "Dota 2",
        price: 7500,
        image: "/CrystalMaiden.png",
        popular: false,
    },
    {
        id: 8,
        name: "Jinx",
        category: "League of Legends",
        price: 7000,
        image: "/Jinx.png",
        popular: true,
    },
    {
        id: 9,
        name: "Ahri",
        category: "League of Legends",
        price: 7000,
        image: "/Ahri.png",
        popular: false,
    },
    {
        id: 10,
        name: "Teemo",
        category: "League of Legends",
        price: 6500,
        image: "/Teemo.png",
        popular: false,
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

export const PRICE_FILTERS = [
    {
        id: "all",
        title: "Любая цена",
        min: 0,
        max: Number.POSITIVE_INFINITY,
    },
    {
        id: "under7000",
        title: "До 7 000 ₽",
        min: 0,
        max: 7000,
    },
    {
        id: "7000to8000",
        title: "7 000 - 8 000 ₽",
        min: 7000,
        max: 8000,
    },
    {
        id: "over8000",
        title: "От 8 000 ₽",
        min: 8000,
        max: Number.POSITIVE_INFINITY,
    },
];