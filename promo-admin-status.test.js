import test from "node:test";
import assert from "node:assert/strict";
import { diagnosePromoAdmin } from "./src/lib/promoAdminStatus.js";

test("clearly identifies missing server environment, not a local development error", () => {
  const status = diagnosePromoAdmin(503, { ok:false, configured:false, error:"Сервер не настроен" });
  assert.equal(status.kind, "setup");
  assert.match(status.details, /Vercel/);
});
test("separates authentication, permissions and missing migration", () => {
  assert.equal(diagnosePromoAdmin(401, {error:"Telegram"}).kind, "auth");
  assert.equal(diagnosePromoAdmin(403, {error:"Только для администратора"}).kind, "permission");
  assert.equal(diagnosePromoAdmin(400, {error:"Could not find the table 'promo_codes'"}).kind, "migration");
});
test("shows instructions when API route is missing",()=>{
  assert.equal(diagnosePromoAdmin(404, null).kind, "route");
});
