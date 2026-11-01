import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_AROMAS, changeAromas, normalizeAromas } from "./src/lib/perfumeAromas.js";
import { changePerfumeConfig, normalizePerfumeConfig } from "./src/lib/perfumeKits.js";

const example={name:"Mint Test",notes:"Мята · Бергамот",family:"Свежие",gender:"Унисекс",price:450,image:"https://example.com/mint.png",symbol:"✿",color:"#aabbcc"};
test("built-in list remains available for old database records",()=>{assert.equal(normalizeAromas(null).length,50);assert.equal(normalizePerfumeConfig({visible:true,kits:[]}).perfumes.length,50);});
test("admin can add, edit and remove a fragrance",()=>{
 const created=changeAromas(DEFAULT_AROMAS,"aromaCreate",{aroma:example},()=>"mint-id");
 assert.equal(created.length,51);
 const edited=changeAromas(created,"aromaUpdate",{id:"mint-id",aroma:{...example,price:600,image:"/mint.webp"}});
 assert.equal(edited.find(item=>item.id==="mint-id").price,600);
 assert.equal(edited.find(item=>item.id==="mint-id").image,"/mint.webp");
 const removed=changeAromas(edited,"aromaDelete",{id:"mint-id"});
 assert.equal(removed.length,50);
});
test("reject duplicate name, malformed image, invalid price",()=>{
 assert.throws(()=>changeAromas(DEFAULT_AROMAS,"aromaCreate",{aroma:{...example,name:"SAKURA"}}),/существует/);
 assert.throws(()=>changeAromas(DEFAULT_AROMAS,"aromaCreate",{aroma:{...example,image:"javascript:bad"}}),/HTTPS/);
 assert.throws(()=>changeAromas(DEFAULT_AROMAS,"aromaCreate",{aroma:{...example,price:-2}}),/стоимость/);
});
test("perfume config action preserves existing kit settings",()=>{
 const config={visible:false,kits:[{id:"clove",name:"Clove",art:"/Clove.png"}]};
 const changed=changePerfumeConfig(config,"aromaCreate",{aroma:example},()=>"mint-id");
 assert.equal(changed.visible,false);assert.equal(changed.kits.length,1);assert.equal(changed.perfumes.length,51);
});
