import test from "node:test";
import assert from "node:assert/strict";
import { PERFUMES } from "./src/data/perfumes.js";
import { perfumeCount, updatePerfumeSelection, perfumeTotal, buildPerfumeCartItem } from "./src/lib/perfumeBuilder.js";
test("50 unique scents", () => { assert.equal(PERFUMES.length, 50); assert.equal(new Set(PERFUMES.map(p=>p.id)).size, 50); });
test("max 5 and duplicates supported", () => { let s={};for(let i=0;i<6;i++)s=updatePerfumeSelection(s,"sakura",1);assert.equal(perfumeCount(s),5);s=updatePerfumeSelection(s,"sakura",-2);assert.equal(perfumeCount(s),3);s=updatePerfumeSelection(s,"citrus",1);assert.equal(perfumeCount(s),4);});
test("calculate order from selected quantities",()=>{const p=buildPerfumeCartItem({sakura:2,citrus:1},"clove",42);assert.equal(p.unitPrice,1170); assert.equal(p.cartId,"perfume-42");assert.equal(p.options.length,3);assert.equal(perfumeTotal({sakura:2,citrus:1}),1170);});
test("no empty set, unknown scent ignored",()=>{assert.equal(buildPerfumeCartItem({},"clove"),null);assert.equal(perfumeCount(updatePerfumeSelection({},"unknown",1)),0);});
