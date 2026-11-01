import { useRef, useState } from "react";
import PerfumeAromasAdmin from "./PerfumeAromasAdmin";
import LemonzIcon from "../components/LemonzIcon";

const EMPTY = { name: "", art: "", previewImage: "", accent: "#b678e7", dark: "#241328" };

async function optimizeImage(file) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file?.type)) throw Error("Нужны PNG, JPEG или WEBP");
  if (file.size > 8 * 1024 * 1024) throw Error("Исходный файл должен быть до 8 МБ");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(Error("Не удалось открыть изображение"));
      image.src = url;
    });
    const scale = Math.min(1, 900 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw Error("Браузер не поддерживает обработку изображений");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/webp", 0.76);
    if (dataUrl.length > 500_000) throw Error("Не удалось уменьшить фотографию. Выбери изображение меньшего размера.");
    return dataUrl;
  } finally { URL.revokeObjectURL(url); }
}

export default function PerfumeKitsAdmin({ config, mode, onAction }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const artInput = useRef(null);
  const previewInput = useRef(null);
  const canEdit = mode === "demo" || mode === "live";
  const kits = config?.kits || [];

  const edit = (kit) => {
    setEditingId(kit.id);
    setDraft({ ...EMPTY, ...kit });
    setError("");
    setMessage("");
  };
  const reset = () => {
    setEditingId(null);
    setDraft({ ...EMPTY });
    setError("");
  };
  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  const apply = async (action, payload, success) => {
    setBusy(true); setError(""); setMessage("");
    try {
      await onAction(action, payload);
      setMessage(success);
      return true;
    } catch (caught) {
      setError(caught?.message || "Не удалось сохранить изменения");
      return false;
    } finally { setBusy(false); }
  };

  const setVisibility = async (visible) => {
    await apply("visibility", { visible }, visible ? "Конструктор включён" : "Конструктор скрыт");
  };
  const save = async (event) => {
    event.preventDefault();
    const action = editingId ? "update" : "create";
    const payload = editingId ? { id: editingId, kit: draft } : { kit: draft };
    if (await apply(action, payload, editingId ? "Оформление обновлено" : "Новое оформление добавлено")) reset();
  };
  const remove = async (kit) => {
    if (!window.confirm(`Удалить оформление «${kit.name}» из конструктора?`)) return;
    if (await apply("delete", { id: kit.id }, "Оформление удалено") && editingId === kit.id) reset();
  };

  const upload = async (field, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    setUploading(field); setError(""); setMessage("");
    try {
      const dataUrl = await optimizeImage(file);
      if (mode === "demo") { update(field, dataUrl); return; }
      if (mode !== "live") throw Error("Для загрузки на сервер нужно подключить Supabase");
      const base64 = dataUrl.split(",")[1];
      const res = await fetch("/api/media", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-init-data": window.Telegram?.WebApp?.initData || "",
        },
        body: JSON.stringify({ mime: "image/webp", base64 }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.ok) throw Error(result.error || "Не удалось загрузить фото в Supabase");
      update(field, result.url);
      setMessage("Фотография загружена. Нажми «Сохранить», чтобы применить.");
    } catch (caught) { setError(caught?.message || "Ошибка загрузки"); }
    finally { setUploading(""); }
  };

  return <div className="perfume-admin">
    <div className="perfume-admin-settings">
      <h2>Конструктор парфюма</h2>
      <p>Управление доступностью конструктора и оформлениями наборов.</p>
      <label className="perfume-admin-toggle">
        <input type="checkbox" checked={Boolean(config?.visible)} disabled={!canEdit || busy} onChange={(e) => setVisibility(e.target.checked)} />
        <span>{config?.visible ? "Показывать в приложении" : "Конструктор скрыт"}</span>
      </label>
      {mode === "demo" && <p className="perfume-admin-note">Пробный режим. Изменения и загруженные изображения видны только в этом браузере.</p>}
      {mode === "loading" && <p className="perfume-admin-note">Загружаю настройки…</p>}
      {mode === "error" && <p className="perfume-admin-note">Сервер недоступен или SQL-миграция не выполнена. Для общего управления нужны Supabase и переменные окружения.</p>}
      {mode === "live" && <p className="perfume-admin-note">Изменения сохраняются в общей базе и появятся у всех посетителей после обновления страницы.</p>}
    </div>


    <div className="perfume-admin-settings">
      <div className="perfume-admin-list-head"><h2>Оформления коробок</h2><strong>{kits.length}</strong></div>
      <label className="perfume-admin-panel-select-label">Выбор панели
       <span className="perfume-admin-panel-select-wrap">
        <select value={editingId || ""} disabled={!canEdit || busy} onChange={(event) => {
          const kit = kits.find(item => item.id === event.target.value);
          if (kit) edit(kit); else reset();
        }}>
          <option value="">✦ Добавить новую панель</option>
          {kits.map(kit => <option key={kit.id} value={kit.id}>{kit.name}</option>)}
        </select>
        <LemonzIcon name="planet" size={19}/>
       </span>
      </label>
      {editingId && <div className="perfume-admin-current-panel">
         <img src={draft.art} alt={"Панель "+draft.name}/>
         <div><strong>{draft.name}</strong><small>{draft.previewImage ? "Есть фото набора" : "Стандартный вид набора"}</small></div>
         <button type="button" className="danger" disabled={!canEdit || busy || kits.length<=1} onClick={() => {
           const kit=kits.find(item=>item.id===editingId);
           if(kit)remove(kit);
         }}>Удалить</button>
      </div>}
    </div>

    <form className="perfume-admin-settings perfume-admin-form" onSubmit={save}>
      <div className="perfume-admin-list-head"><h2>{editingId ? "Редактировать набор" : "Добавить оформление"}</h2>{editingId && <button type="button" onClick={reset}>Отмена</button>}</div>
      <label>Название оформления<input required maxLength={60} value={draft.name} disabled={!canEdit || busy} onChange={e => update("name", e.target.value)} placeholder="Например, Clove" /></label>
      <div className="perfume-admin-image-fields">
        <div className="perfume-admin-image-field">
          <strong>Изображение лицевой панели *</strong>
          {draft.art ? <img className="perfume-admin-image-preview" src={draft.art} alt="Превью лицевой панели" /> : <div className="perfume-admin-image-empty">Фото не выбрано</div>}
          <input ref={artInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={event => upload("art", event)} />
          <button type="button" disabled={!canEdit || busy || !!uploading} onClick={() => artInput.current?.click()}>{uploading === "art" ? "Загрузка…" : "Загрузить фото с устройства"}</button>
          <input type="text" value={draft.art} maxLength={1000} disabled={!canEdit || busy || !!uploading} onChange={e=>update("art",e.target.value)} placeholder="Или HTTPS-ссылка / путь" />
        </div>
        <div className="perfume-admin-image-field">
          <strong>Фото набора целиком (необязательно)</strong>
          {draft.previewImage ? <img className="perfume-admin-image-preview" src={draft.previewImage} alt="Превью набора" /> : <div className="perfume-admin-image-empty">Будет показан стандартный 3D-макет коробки</div>}
          <input ref={previewInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={event => upload("previewImage", event)} />
          <button type="button" disabled={!canEdit || busy || !!uploading} onClick={() => previewInput.current?.click()}>{uploading === "previewImage" ? "Загрузка…" : "Загрузить фото с устройства"}</button>
          <input type="text" value={draft.previewImage} maxLength={1000} disabled={!canEdit || busy || !!uploading} onChange={e=>update("previewImage",e.target.value)} placeholder="Или HTTPS-ссылка / путь" />
          {draft.previewImage && <button type="button" onClick={() => update("previewImage", "")}>Убрать фото комплекта</button>}
        </div>
      </div>
      <div className="perfume-admin-colors">
        <label>Акцент оформления<input type="color" value={draft.accent} onChange={e => update("accent", e.target.value)} disabled={!canEdit || busy} /></label>
        <label>Цвет фона<input type="color" value={draft.dark} onChange={e => update("dark", e.target.value)} disabled={!canEdit || busy} /></label>
      </div>
      <button className="perfume-admin-save" type="submit" disabled={!canEdit || busy || !!uploading || !draft.name.trim() || !draft.art.trim()}>{busy ? "Сохранение…" : editingId ? "Сохранить изменения" : "Добавить набор"}</button>
      {error && <p className="perfume-admin-error" role="alert">{error}</p>}
      {message && <p className="perfume-admin-success" role="status">{message}</p>}
    </form>
    <PerfumeAromasAdmin config={config} mode={mode} onAction={onAction} />
  </div>;
}
