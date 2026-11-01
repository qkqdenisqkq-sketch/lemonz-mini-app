import { useMemo, useRef, useState } from "react";
import { PERFUMES, PERFUME_PANELS, PERFUME_FAMILIES, PERFUME_GENDERS, PERFUME_MAX_ITEMS } from "../data/perfumes";
import { perfumeCount, updatePerfumeSelection, perfumeTotal, selectedPerfumes, buildPerfumeCartItem } from "../lib/perfumeBuilder";
import LemonzIcon from "../components/LemonzIcon";

export default function PerfumeBuilder({ onBack, onAddToCart }) {
 const [panelId,setPanelId]=useState("clove");
 const [selected,setSelected]=useState({});
 const [gender,setGender]=useState("Все");
 const [family,setFamily]=useState("Все");
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
 const panel=PERFUME_PANELS.find(p=>p.id===panelId) || PERFUME_PANELS[0];
 const count=perfumeCount(selected), total=perfumeTotal(selected);
 const slots=selectedPerfumes(selected).flatMap(p=>Array.from({length:p.count},()=>p)).slice(0,PERFUME_MAX_ITEMS);
 const aromas=useMemo(()=>{
  const list=PERFUMES.filter(p=>(gender==="Все"||p.gender===gender)&&(family==="Все"||p.family===family)&& (p.name+" "+p.notes).toLowerCase().includes(search.toLowerCase()));
  if(sort==="name")list.sort((a,b)=>a.name.localeCompare(b.name));
  if(sort==="price")list.sort((a,b)=>a.price-b.price);
  return list;
 },[gender,family,search,sort]);
 function add(){const item=buildPerfumeCartItem(selected,panelId);if(item)onAddToCart(item);}
 return <section className="perfume-builder">
 <div className="perfume-titlebar"><button type="button" onClick={onBack} aria-label="Назад"><LemonzIcon name="back"/></button><strong>LEMONZ</strong><span>2 мл · 5 ароматов</span></div>
 <header className="perfume-intro"><h1>Конструктор парфюма</h1><p>Собери набор до 5 ароматов</p></header>
 <div className="perfume-box-preview" style={{"--panel-accent":panel.accent,"--panel-dark":panel.dark}}>
 <div className="perfume-box-cover"><div className="perfume-box-x">✕</div><img src={panel.art} alt={panel.name}/><div className="perfume-box-caption">{panel.name.toUpperCase()}<small>LEMONZ</small></div></div>
 <div className="perfume-box-inside">{Array.from({length:5},(_,i)=><div className="perfume-vial" key={i}><span className="perfume-vial-cap"/><span className="perfume-vial-body">LEMONZ</span></div>)}</div>
 </div>
 <div className="perfume-section-row"><h2>Оформление коробки</h2><span>Сменная панель</span></div>
 <div className="perfume-panel-track">{PERFUME_PANELS.map(p=><button className={"perfume-panel-card "+(panelId===p.id?"active":"")} key={p.id} onClick={()=>setPanelId(p.id)} type="button"><div style={{"--panel-accent":p.accent,"--panel-dark":p.dark}}><img src={p.art} alt=""/><span>{p.name.toUpperCase()}</span></div><b>{p.name.toUpperCase()}</b></button>)}</div>
 <div className="perfume-filters-title"><h2>Фильтры</h2><div className="perfume-chip-track">{PERFUME_GENDERS.map(g=><button type="button" className={gender===g?"active":""} key={g} onClick={()=>setGender(g)}>{g}</button>)}</div></div>
 <div className="perfume-chip-track families">{PERFUME_FAMILIES.map(f=><button type="button" className={family===f?"active":""} key={f} onClick={()=>setFamily(f)}>{f}</button>)}</div>
 <div className="perfume-search-row"><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск аромата..."/><select value={sort} onChange={e=>setSort(e.target.value)} aria-label="Сортировка"><option value="popular">По популярности</option><option value="name">По названию</option><option value="price">По цене</option></select></div>
 <div className="perfume-aroma-grid">{aromas.map(p=><article key={p.id} className="perfume-aroma"><div className="perfume-aroma-art" style={{background:p.color}}>{p.symbol}</div><div className="perfume-aroma-info"><b>{p.name}</b><small>{p.notes}</small><strong>2 мл - {p.price} ₽</strong></div><div className="perfume-stepper"><button disabled={!selected[p.id]} onClick={()=>setSelected(s=>updatePerfumeSelection(s,p.id,-1))} aria-label={"Убрать "+p.name}>−</button><span>{selected[p.id]||0}</span><button disabled={count>=PERFUME_MAX_ITEMS} onClick={()=>setSelected(s=>updatePerfumeSelection(s,p.id,1))} aria-label={"Добавить "+p.name}>+</button></div></article>)}</div>
 {aromas.length===0&&<p className="perfume-empty">Ароматы не найдены</p>}
 <div className="perfume-cart-dock" onTouchStart={startDockSwipe} onTouchEnd={finishDockSwipe} onTouchCancel={()=>{touchStart.current=null;}}><button className="perfume-dock-heading" onClick={toggleDock} type="button" aria-expanded={expanded} aria-label={expanded?"Свернуть набор":"Развернуть набор"}><strong>Ваш набор <em>{count}/{PERFUME_MAX_ITEMS}</em></strong><b>{total.toLocaleString("ru-RU")} ₽ <span>{expanded?"⌃":"⌄"}</span></b></button>
 {expanded&&<div className="perfume-dock-slots">{Array.from({length:5},(_,i)=>slots[i] ? <div className="perfume-slot" key={i}><span>{slots[i].symbol}</span><b>{slots[i].name}</b><button type="button" onClick={()=>setSelected(s=>updatePerfumeSelection(s,slots[i].id,-1))} aria-label={"Удалить "+slots[i].name}>×</button></div>:<div className="perfume-slot placeholder" key={i}>+</div>)}<div className="perfume-slot-box"><img src={panel.art} alt=""/><small>{panel.name}</small></div></div>}
 <button className="perfume-add-cart" onClick={()=>{if(Date.now()-lastSwipeAt.current>=450)add();}} disabled={!count} type="button"><LemonzIcon name="cart" size={22}/> Добавить в корзину</button>
 </div>
 </section>;
}
