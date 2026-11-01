import { useRef, useState } from "react";
import { PERFUME_FAMILIES, PERFUME_GENDERS } from "../data/perfumes";
import { storePerfumeImage } from "../lib/perfumeImageUpload";
import { normalizeAromas } from "../lib/perfumeAromas";
import LemonzIcon from "../components/LemonzIcon";

const DEFAULT={name:"",notes:"",price:390,family:"Свежие",gender:"Унисекс",symbol:"✿",color:"#e4caf3",image:""};

export default function PerfumeAromasAdmin({config,mode,onAction}){
 const [editingId,setEditingId]=useState(null);
 const [form,setForm]=useState({...DEFAULT});
 const [query,setQuery]=useState("");
 const [loading,setLoading]=useState(false);
 const [uploading,setUploading]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const fileRef=useRef(null);
 const aromas=normalizeAromas(config?.perfumes);
 const canEdit=mode==="demo"||mode==="live";
 const available=aromas.filter(p=>(p.name+" "+p.notes).toLocaleLowerCase("ru").includes(query.trim().toLocaleLowerCase("ru")));
 const update=(name,value)=>setForm(current=>({...current,[name]:value}));
 const startNew=()=>{setForm({...DEFAULT});setEditingId(null);setError("");setMessage("");};
 const edit=(item)=>{
  setEditingId(item.id);setForm({...DEFAULT,...item});setError("");setMessage("");
  document.getElementById("perfume-aroma-editor")?.scrollIntoView({behavior:"smooth",block:"start"});
 };
 const save=async(event)=>{
  event.preventDefault();
  setLoading(true);setError("");setMessage("");
  try{
   const action=editingId?"aromaUpdate":"aromaCreate";
   await onAction(action,editingId?{id:editingId,aroma:form}:{aroma:form});
   setMessage(editingId?"Аромат обновлён":"Новый аромат добавлен");
   setEditingId(null);setForm({...DEFAULT});
  }catch(err){setError(err?.message||"Не удалось сохранить аромат");}
  finally{setLoading(false);}
 };
 const remove=async(item)=>{
  if(!window.confirm(`Удалить аромат «${item.name}» из конструктора?`))return;
  setLoading(true);setError("");setMessage("");
  try{
   await onAction("aromaDelete",{id:item.id});
   if(item.id===editingId){setEditingId(null);setForm({...DEFAULT});}
   setMessage("Аромат удалён");
  }catch(err){setError(err?.message||"Не удалось удалить аромат");}
  finally{setLoading(false);}
 };
 const upload=async(event)=>{
  const file=event.target.files?.[0];
  event.target.value="";
  if(!file)return;
  setUploading(true);setError("");setMessage("");
  try{
   const url=await storePerfumeImage(file,mode);
   update("image",url);
   setMessage(mode==="demo"?"Фото готово для локального сохранения":"Фото загружено. Сохрани изменения аромата.");
  }catch(err){setError(err?.message||"Ошибка загрузки изображения");}
  finally{setUploading(false);}
 };
 return <section className="perfume-admin-settings perfume-aroma-editor" id="perfume-aroma-editor">
  <div className="perfume-admin-list-head"><h2>Ароматы</h2><strong>{aromas.length}</strong></div>
  <p>Добавляй ароматы, меняй цену за 2 мл, описание и фотографии. Изменения применяются в конструкторе.</p>
  <label className="perfume-aroma-search-label">Найти аромат<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="По названию или нотам" /></label>
  <div className="perfume-aroma-admin-list" role="list">
   {available.map(item=><div className="perfume-aroma-admin-row" role="listitem" key={item.id}>
    <span className="perfume-aroma-admin-picture" style={{background:item.color}}>{item.image?<img src={item.image} alt="" />:item.symbol}</span>
    <div><strong>{item.name}</strong><small>{item.family} · {item.gender}</small><b>{item.price.toLocaleString("ru-RU")} ₽ / 2 мл</b></div>
    <div className="perfume-aroma-admin-actions">
     <button type="button" disabled={!canEdit||loading} onClick={()=>edit(item)}>Изменить</button>
     <button type="button" className="danger" disabled={!canEdit||loading} onClick={()=>remove(item)}>Удалить</button>
    </div>
   </div>)}
  </div>
  <form className="perfume-aroma-form" onSubmit={save}>
   <div className="perfume-admin-list-head">
    <h3>{editingId?"Редактирование аромата":"Новый аромат"}</h3>
    {editingId&&<button type="button" onClick={startNew}>Новый аромат</button>}
   </div>
   <label>Название<input type="text" maxLength={55} required value={form.name} onChange={e=>update("name",e.target.value)} placeholder="Например, SAKURA"/></label>
   <label>Ноты и описание<input type="text" maxLength={200} required value={form.notes} onChange={e=>update("notes",e.target.value)} placeholder="Сакура · Личи · Белый чай"/></label>
   <div className="perfume-aroma-form-two">
    <label>Цена за 2 мл, ₽<input required type="number" min="1" max="100000" step="1" value={form.price} onChange={e=>update("price",e.target.value)}/></label>
    <label>Символ, если нет фото<input type="text" maxLength={8} value={form.symbol} onChange={e=>update("symbol",e.target.value)}/></label>
   </div>
   <div className="perfume-aroma-form-two">
    <label>Категория<select value={form.family} onChange={e=>update("family",e.target.value)}>{PERFUME_FAMILIES.filter(item=>item!=="Все").map(item=><option key={item}>{item}</option>)}</select></label>
    <label>Тип<select value={form.gender} onChange={e=>update("gender",e.target.value)}>{PERFUME_GENDERS.filter(item=>item!=="Все").map(item=><option key={item}>{item}</option>)}</select></label>
   </div>
   <div className="perfume-aroma-form-photo">
    <strong>Фотография аромата</strong>
    <div className="perfume-aroma-preview" style={{background:form.color}}>{form.image?<img src={form.image} alt="Фото аромата"/>:<span>{form.symbol||"✿"}</span>}</div>
    <input type="file" ref={fileRef} hidden accept="image/png,image/jpeg,image/webp" onChange={upload}/>
    <button type="button" onClick={()=>fileRef.current?.click()} disabled={!canEdit||uploading||loading}>{uploading?"Загрузка…":"Загрузить изображение с устройства"}</button>
    <label>Ссылка на фото<input type="text" value={form.image} onChange={e=>update("image",e.target.value)} placeholder="HTTPS-ссылка или путь /photo.png"/></label>
    {form.image&&<button type="button" onClick={()=>update("image","")}>Убрать фото</button>}
    <label className="perfume-color-label">Цвет карточки <input type="color" value={form.color} onChange={e=>update("color",e.target.value)}/></label>
   </div>
   <button className="perfume-admin-save" type="submit" disabled={!canEdit||loading||uploading||!form.name.trim()||!form.notes.trim()}><LemonzIcon name="planet" size={18}/>{loading?"Сохранение…":editingId?"Сохранить аромат":"Добавить аромат"}</button>
  </form>
  {error&&<p className="perfume-admin-error" role="alert">{error}</p>}
  {message&&<p className="perfume-admin-success" role="status">{message}</p>}
 </section>;
}
