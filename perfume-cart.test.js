import test from "node:test";
import assert from "node:assert/strict";
import { checkPerfumeItems } from "./api/_perfumeOrders.js";
import { buildPerfumeCartItem } from "./src/lib/perfumeBuilder.js";
import { DEFAULT_AROMAS } from "./src/lib/perfumeAromas.js";
import { DEFAULT_PERFUME_KITS } from "./src/lib/perfumeKits.js";

const config={kits:DEFAULT_PERFUME_KITS,perfumes:DEFAULT_AROMAS};
test("new set carries IDs for server pricing",()=>{
 const item=buildPerfumeCartItem({sakura:2,citrus:1},"clove",123,config.kits,config.perfumes);
 assert.equal(item.unitPrice,1170);assert.equal(item.perfumePanelId,"clove");assert.equal(item.perfumeSelection.sakura,2);
 assert.doesNotThrow(()=>checkPerfumeItems([item],config));
});
test("server rejects stale scent price",()=>{
 const item=buildPerfumeCartItem({sakura:1},"clove",123,config.kits,config.perfumes);
 assert.throws(()=>checkPerfumeItems([item],{...config,perfumes:config.perfumes.map(p=>p.id==="sakura"?{...p,price:990}:p)}),/Цена аромата/);
});
test("server rejects deleted scent, unknown panel and invalid quantities",()=>{
 const item=buildPerfumeCartItem({sakura:1},"clove",123,config.kits,config.perfumes);
 assert.throws(()=>checkPerfumeItems([{...item,perfumeSelection:{sakura:6}}],config),/ароматов/);
 assert.throws(()=>checkPerfumeItems([item],{...config,perfumes:config.perfumes.filter(p=>p.id!=="sakura")}),/недоступен/);
 assert.throws(()=>checkPerfumeItems([{...item,perfumePanelId:"removed"}],config),/Оформление/);
});
