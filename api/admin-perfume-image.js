import crypto from "node:crypto";
import { adminOnly, errorResponse, HttpError, requireConfigured, supabaseHeaders, telegramUser } from "./_shared.js";

export default async function handler(request,response){
 response.setHeader("Cache-Control","no-store");
 try {
  if(request.method!=="POST") throw new HttpError(405,"Метод не поддерживается");
  requireConfigured();
  const user=telegramUser(request);
  adminOnly(user);
  const {base64,mime}=request.body||{};
  const types={"image/webp":"webp","image/png":"png","image/jpeg":"jpg"};
  if(!types[mime]||typeof base64!=="string"||base64.length>4.2*1024*1024||!/^[A-Za-z0-9+/]+={0,2}$/.test(base64))throw new HttpError(400,"Нужны PNG, JPEG или WebP до 3 МБ");
  const buffer=Buffer.from(base64,"base64");
  if(!buffer.length||buffer.length>3*1024*1024)throw new HttpError(400,"Фотография слишком большая");
  const png=buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpeg=buffer[0]===255&&buffer[1]===216&&buffer[2]===255;
  const webp=buffer.subarray(0,4).toString()==="RIFF"&&buffer.subarray(8,12).toString()==="WEBP";
  if(!({"image/webp":webp,"image/png":png,"image/jpeg":jpeg}[mime]))throw new HttpError(400,"Формат фотографии не совпадает с файлом");
  const objectPath=`perfume-admin/${user.id}/${crypto.randomUUID()}.${types[mime]}`;
  const root=process.env.SUPABASE_URL.replace(/\/$/,"");
  const uploaded=await fetch(`${root}/storage/v1/object/lemonz-media/${objectPath}`,{
    method:"POST",
    headers:{...supabaseHeaders(),"Content-Type":mime,"x-upsert":"false"},
    body:buffer,
  });
  if(!uploaded.ok)throw new HttpError(500,"Не удалось сохранить фото в хранилище lemonz-media");
  return response.status(200).json({ok:true,url:`${root}/storage/v1/object/public/lemonz-media/${objectPath}`});
 }catch(error){return errorResponse(response,error);}
}
