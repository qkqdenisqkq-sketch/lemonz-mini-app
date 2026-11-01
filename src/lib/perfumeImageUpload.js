export async function preparePerfumeImage(file) {
  if(!["image/png","image/jpeg","image/webp"].includes(file?.type))throw Error("Выбери PNG, JPEG или WebP");
  if(file.size>8*1024*1024)throw Error("Файл больше 8 МБ");
  const uri=URL.createObjectURL(file);
  try {
    const image=new Image();
    await new Promise((resolve,reject)=>{
      image.onload=resolve;image.onerror=()=>reject(Error("Не удалось прочитать фотографию"));
      image.src=uri;
    });
    const ratio=Math.min(1,800/Math.max(image.width,image.height));
    const canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.round(image.width*ratio));
    canvas.height=Math.max(1,Math.round(image.height*ratio));
    const context=canvas.getContext("2d");
    if(!context)throw Error("Обработка фотографий не поддерживается");
    context.drawImage(image,0,0,canvas.width,canvas.height);
    const result=canvas.toDataURL("image/webp",0.72);
    if(result.length>500000)throw Error("Изображение слишком большое после обработки. Выбери фото меньшего размера.");
    return result;
  }finally{URL.revokeObjectURL(uri);}
}

export async function storePerfumeImage(file,mode){
 const dataUrl=await preparePerfumeImage(file);
 if(mode==="demo")return dataUrl;
 if(mode!=="live")throw Error("Для загрузки нужен подключённый сервер");
 const response=await fetch("/api/admin-perfume-image",{
  method:"POST",
  headers:{"Content-Type":"application/json","x-telegram-init-data":window.Telegram?.WebApp?.initData||""},
  body:JSON.stringify({mime:"image/webp",base64:dataUrl.split(",")[1]}),
 });
 const result=await response.json().catch(()=>({}));
 if(!response.ok||!result.ok)throw Error(result.error||"Не удалось загрузить изображение");
 return result.url;
}
