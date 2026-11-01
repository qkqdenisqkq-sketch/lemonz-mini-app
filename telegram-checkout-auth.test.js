import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { telegramUser } from "./api/_shared.js";

function signedData(token, id, date=Math.floor(Date.now()/1000)) {
  const p = new URLSearchParams({
    auth_date: String(date),
    user: JSON.stringify({ id, username:"lemonz_test" }),
  });
  const check = [...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>key+"="+value).join("\n");
  const secret=crypto.createHmac("sha256","WebAppData").update(token).digest();
  p.set("hash", crypto.createHmac("sha256",secret).update(check).digest("hex"));
  return p.toString();
}

test("valid signed Telegram identity is accepted",()=>{
 const original=process.env.TELEGRAM_BOT_TOKEN;
 process.env.TELEGRAM_BOT_TOKEN="lemonz_test_bot_token";
 try {
  const initData=signedData(process.env.TELEGRAM_BOT_TOKEN,123456789);
  assert.equal(telegramUser({headers:{"x-telegram-init-data":initData}}).id,123456789);
 } finally {
  if(original===undefined)delete process.env.TELEGRAM_BOT_TOKEN;
  else process.env.TELEGRAM_BOT_TOKEN=original;
 }
});
test("tampered Telegram identity is rejected",()=>{
 const original=process.env.TELEGRAM_BOT_TOKEN;
 process.env.TELEGRAM_BOT_TOKEN="lemonz_test_bot_token";
 try {
  const initData=signedData(process.env.TELEGRAM_BOT_TOKEN,123456789).replace("123456789","123456780");
  assert.throws(()=>telegramUser({headers:{"x-telegram-init-data":initData}}),/Telegram-авторизация/);
 } finally {
  if(original===undefined)delete process.env.TELEGRAM_BOT_TOKEN;
  else process.env.TELEGRAM_BOT_TOKEN=original;
 }
});
test("missing Telegram signature is rejected",()=>{
 assert.throws(()=>telegramUser({headers:{}}),/Войдите через Telegram/);
});
