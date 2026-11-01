import test from "node:test";
import assert from "node:assert/strict";
import { changePerfumeConfig, normalizePerfumeConfig } from "./src/lib/perfumeKits.js";

const current = normalizePerfumeConfig({
  visible: true,
  kits: [{ id:"first", name:"Clove", art:"/Clove.png", previewImage:"", accent:"#aabbcc", dark:"#110022" }]
});
test("visibility hides perfume builder",()=>{
  assert.equal(changePerfumeConfig(current,"visibility",{visible:false}).visible,false);
  assert.equal(current.visible,true);
});
test("create and edit kit, including product photo",()=>{
  const added = changePerfumeConfig(current,"create",{kit:{name:"NEON",art:"https://test.example/photo.jpg",previewImage:"https://test.example/kit.png",accent:"#123456",dark:"#111111"}} , ()=>"kit-2");
  assert.equal(added.kits.length,2);
  assert.equal(added.kits[1].previewImage,"https://test.example/kit.png");
  const edited=changePerfumeConfig(added,"update",{id:"kit-2",kit:{...added.kits[1],name:"Neon"}});
  assert.equal(edited.kits[1].name,"Neon");
  assert.equal(edited.kits[0].name,"Clove");
});
test("delete and protect last kit",()=>{
 const added=changePerfumeConfig(current,"create",{kit:{name:"A",art:"/Jett.png"}},()=>"kit-2");
 const removed=changePerfumeConfig(added,"delete",{id:"kit-2"});
 assert.equal(removed.kits.length,1);
 assert.throws(()=>changePerfumeConfig(current,"delete",{id:"first"}),/последнее/);
});
test("duplicate, bad media and invalid colors rejected",()=>{
 assert.throws(()=>changePerfumeConfig(current,"create",{kit:{name:"clove",art:"/Jett.png"}}),/название/);
 assert.throws(()=>changePerfumeConfig(current,"create",{kit:{name:"bad",art:"javascript:alert(1)"}}),/HTTPS/);
 assert.throws(()=>changePerfumeConfig(current,"create",{kit:{name:"bad",art:"/Jett.png",accent:"red"}}),/цвета/);
});
