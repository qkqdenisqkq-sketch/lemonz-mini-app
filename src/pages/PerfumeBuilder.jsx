import { useEffect, useMemo, useRef, useState } from "react";
import { PERFUME_FAMILIES, PERFUME_GENDERS, PERFUME_MAX_ITEMS } from "../data/perfumes";
import { perfumeCount, updatePerfumeSelection, perfumeTotal, selectedPerfumes, buildPerfumeCartItem } from "../lib/perfumeBuilder";
import LemonzIcon from "../components/LemonzIcon";

export default function PerfumeBuilder({ onBack, onAddToCart, kits = [], perfumes = [], showScrollTop = false, onScrollToTop }) {
 const [panelId,setPanelId]=useState("clove");
 const [selected,setSelected]=useState({});
 const [gender,setGender]=useState("Все");
 const [family,setFamily]=useState("Все");
 const [familyMenuOpen,setFamilyMenuOpen]=useState(false);
 const familyMenuRef=useRef(null);
 const [search,setSearch]=useState("");
 const [sort,setSort]=useState("popular");
 const [expanded,setExpanded]=useState(true);
 const touchStart=useRef(null);
 const lastSwipeAt=useRef(0);
 const startDockSwipe=(event)=>{
  const touch=event.touches[0];
  if(!touch)return;
  touchStart.current={x:touch.clientX,y:touch.clientY};
 };
 const finishDockSwipe=(event)=>{
  const start=touchStart.current;
  touchStart.current=null;
  const touch=event.changedTouches[0];
  if(!start||!touch)return;
  const dx=touch.clientX-start.x;
  const dy=touch.clientY-start.y;
  // Ignore taps, diagonal gestures and horizontal scrolling.
  if(Math.abs(dy)<45||Math.abs(dy)<Math.abs(dx)*1.25)return;
  lastSwipeAt.current=Date.now();
  setExpanded(dy<0);
 };
 const toggleDock=()=>{
  // A swipe starting on the heading can also produce a synthetic click.
  if(Date.now()-lastSwipeAt.current<450)return;
  setExpanded(value=>!value);
 };
 useEffect(()=>{
  if(!familyMenuOpen)return undefined;
  const closeOutside=(event)=>{
   if(!familyMenuRef.current?.contains(event.target))setFamilyMenuOpen(false);
  };
  const closeOnEscape=(event)=>{
   if(event.key!=="Escape")return;
   setFamilyMenuOpen(false);
   familyMenuRef.current?.querySelector(".perfume-family-toggle")?.focus();
  };
  document.addEventListener("pointerdown",closeOutside);
  document.addEventListener("keydown",closeOnEscape);
  return ()=>{
   document.removeEventListener("pointerdown",closeOutside);
   document.removeEventListener("keydown",closeOnEscape);
  };
 },[familyMenuOpen]);
 const chooseFamily=(nextFamily)=>{
  setFamily(nextFamily);
  setFamilyMenuOpen(false);
 };
 const panel=kits.find(p=>p.id===panelId) || kits[0];
 const count=perfumeCount(selected), total=perfumeTotal(selected,perfumes);
 const slots=selectedPerfumes(selected,perfumes).flatMap(p=>Array.from({length:p.count},()=>p)).slice(0,PERFUME_MAX_ITEMS);
 const aromas=useMemo(()=>{
  const list=perfumes.filter(p=>(gender==="Все"||p.gender===gender)&&(family==="Все"||p.family===family)&& (p.name+" "+p.notes).toLowerCase().includes(search.toLowerCase()));
  if(sort==="name")list.sort((a,b)=>a.name.localeCompare(b.name));
  if(sort==="price")list.sort((a,b)=>a.price-b.price);
  return list;
 },[gender,family,search,sort,perfumes]);
 function add(){const item=buildPerfumeCartItem(selected,panel.id,Date.now(),kits,perfumes);if(item)onAddToCart(item);}
 if (!panel) return <section className="perfume-builder"><h1>Нет доступных наборов</h1><button onClick={onBack}>На главную</button></section>;
 return <section className="perfume-builder">
 <div className="perfume-titlebar"><button type="button" onClick={onBack} aria-label="Назад"><LemonzIcon name="planet" size={23}/></button><strong>LEMONZ</strong><span>2 мл · 5 ароматов</span></div>
 <header className="perfume-intro"><h1>Конструктор парфюма</h1><p>Собери набор до 5 ароматов</p></header>
 <div className="perfume-box-preview" style={{"--panel-accent":panel.accent,"--panel-dark":panel.dark}}>
 {panel.previewImage ? <img className="perfume-full-kit-image" src={panel.previewImage} alt={"Набор "+panel.name} /> : <>
 <div className="perfume-box-cover"><div className="perfume-box-x">✕</div><img src={panel.art} alt={panel.name}/><div className="perfume-box-caption">{panel.name.toUpperCase()}<small>LEMONZ</small></div></div>
 <div className="perfume-box-inside">{Array.from({length:5},(_,i)=><div className="perfume-vial" key={i}><span className="perfume-vial-cap"/><span className="perfume-vial-body">LEMONZ</span></div>)}</div>
 </>}
 </div>
 <div className="perfume-section-row"><h2>Оформление коробки</h2><span>Сменная панель</span></div>
 <div className="perfume-panel-track">{kits.map(p=><button className={"perfume-panel-card "+(panel.id===p.id?"active":"")} key={p.id} onClick={()=>setPanelId(p.id)} type="button"><div style={{"--panel-accent":p.accent,"--panel-dark":p.dark}}><img src={p.art} alt=""/><span>{p.name.toUpperCase()}</span></div><b>{p.name.toUpperCase()}</b></button>)}</div>
 <div className="perfume-filters-title"><h2>Фильтры</h2><div className="perfume-chip-track">{PERFUME_GENDERS.map(g=><button type="button" className={gender===g?"active":""} key={g} onClick={()=>setGender(g)}>{g}</button>)}</div></div>
 <div className="perfume-family-filter" ref={familyMenuRef}>
  <button type="button" className={"perfume-family-toggle"+(familyMenuOpen?" is-open":"")} aria-haspopup="menu" aria-expanded={familyMenuOpen} aria-controls="perfume-family-menu" onClick={()=>setFamilyMenuOpen(open=>!open)}>
   <span>Категория ароматов</span><strong>{family}</strong><span className="perfume-family-chevron"><LemonzIcon name="planet" size={19}/></span>
  </button>
  {familyMenuOpen && <div id="perfume-family-menu" className="perfume-family-menu" role="menu" aria-label="Категории ароматов">
   {PERFUME_FAMILIES.map(f=><button type="button" key={f} role="menuitemradio" aria-checked={family===f} className={family===f?"active":""} onClick={()=>chooseFamily(f)}>
     <span>{f}</span>{family===f&&<span className="perfume-family-check" aria-hidden="true">✓</span>}
   </button>)}
  </div>}
 </div>
 <div className="perfume-search-row"><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск аромата..."/><select value={sort} onChange={e=>setSort(e.target.value)} aria-label="Сортировка"><option value="popular">По популярности</option><option value="name">По названию</option><option value="price">По цене</option></select></div>
 <div className="perfume-aroma-grid">{aromas.map(p=><article key={p.id} className="perfume-aroma"><div className="perfume-aroma-art" style={{background:p.color}}>{p.image?<img src={p.image} alt="" loading="lazy"/>:p.symbol}</div><div className="perfume-aroma-info"><b>{p.name}</b><small>{p.notes}</small><strong>2 мл - {p.price.toLocaleString("ru-RU")} ₽</strong></div><div className="perfume-stepper"><button disabled={!selected[p.id]} onClick={()=>setSelected(s=>updatePerfumeSelection(s,p.id,-1,perfumes))} aria-label={"Убрать "+p.name}>−</button><span>{selected[p.id]||0}</span><button disabled={count>=PERFUME_MAX_ITEMS} onClick={()=>setSelected(s=>updatePerfumeSelection(s,p.id,1,perfumes))} aria-label={"Добавить "+p.name}>+</button></div></article>)}</div>
 {aromas.length===0&&<p className="perfume-empty">{perfumes.length?"Ароматы не найдены":"Ароматы ещё не добавлены"}</p>}
 <div className="perfume-cart-dock" onTouchStart={startDockSwipe} onTouchEnd={finishDockSwipe} onTouchCancel={()=>{touchStart.current=null;}}>{showScrollTop && <button type="button" className="perfume-dock-scroll-top" onClick={onScrollToTop} aria-label="Наверх" title="Наверх"><LemonzIcon name="planet" size={25}/></button>}<button className="perfume-dock-heading" onClick={toggleDock} type="button" aria-expanded={expanded} aria-label={expanded?"Свернуть набор":"Развернуть набор"}><strong>Ваш набор <em>{count}/{PERFUME_MAX_ITEMS}</em></strong><b>{total.toLocaleString("ru-RU")} ₽ <span className={"perfume-toggle-emblem"+(expanded?" is-expanded":"")}><LemonzIcon name="planet" size={18}/></span></b></button>
 <div className={`perfume-dock-slots-shell ${expanded ? "is-expanded" : "is-collapsed"}`} aria-hidden={!expanded} inert={!expanded}><div className="perfume-dock-slots-inner"><div className="perfume-dock-slots">{Array.from({length:5},(_,i)=>slots[i] ? <div className="perfume-slot" key={i}><span>{slots[i].image?<img className="perfume-selected-image" src={slots[i].image} alt=""/>:slots[i].symbol}</span><b>{slots[i].name}</b><button type="button" onClick={()=>setSelected(s=>updatePerfumeSelection(s,slots[i].id,-1,perfumes))} aria-label={"Удалить "+slots[i].name}>×</button></div>:<div className="perfume-slot placeholder" key={i}>+</div>)}<div className="perfume-slot-box"><img src={panel.art} alt=""/><small>{panel.name}</small></div></div></div></div>
 <button className="perfume-add-cart" onClick={()=>{if(Date.now()-lastSwipeAt.current>=450)add();}} disabled={!count} type="button"><LemonzIcon name="cart" size={22}/> Добавить в корзину</button>
 </div>
 </section>;
}
