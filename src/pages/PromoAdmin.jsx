import { useEffect, useState } from "react";

const CODE_PATTERN = /^[A-Z0-9_-]{4,32}$/;

export default function PromoAdmin({ demoPromos, setDemoPromos, onPromosChanged }) {
    const [mode, setMode] = useState("loading");
    const [promos, setPromos] = useState([]);
    const [rewards, setRewards] = useState([]);
    const [code, setCode] = useState("");
    const [percent, setPercent] = useState("10");
    const [editingCode, setEditingCode] = useState(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        let mounted = true;
        const fetchPromos = async () => {
            try {
                // `npm run dev` serves Vite pages, not Vercel API functions.
                // In a browser without signed Telegram data, use local preview
                // immediately instead of asking an unavailable API for codes.
                if (import.meta.env.DEV && !window.Telegram?.WebApp?.initData) {
                    if (mounted) setMode("demo");
                    return;
                }
                const response = await fetch("/api/admin-promos", {
                    headers: { "x-telegram-init-data": window.Telegram?.WebApp?.initData || "" },
                });
                if (import.meta.env.DEV && response.headers.get("content-type")?.includes("text/html")) {
                    if (mounted) setMode("demo");
                    return;
                }
                const data = await response.json().catch(() => null);
                if (!response.ok || !data?.ok) {
                    if (import.meta.env.DEV && data?.configured === false) {
                        if (mounted) setMode("demo");
                        return;
                    }
                    throw new Error(data?.error || "Не удалось загрузить промокоды");
                }
                if (mounted) {
                    setPromos(data.promos || []);
                    setRewards(data.rewards || []);
                    setMode("live");
                }
            } catch (caught) {
                if (mounted) {
                    if (import.meta.env.DEV && !window.Telegram?.WebApp?.initData) {
                        setMode("demo");
                    } else {
                        setError(caught?.message || "Не удалось загрузить промокоды");
                        setMode("error");
                    }
                }
            }
        };
        fetchPromos();
        return () => { mounted = false; };
    }, []);

    const items = mode === "demo" ? demoPromos.map((item) => ({ ...item, source: "demo" })) : promos;
    const active = items.filter((item) => item.active);
    const inactive = items.filter((item) => !item.active);

    const reset = () => { setEditingCode(null); setCode(""); setPercent("10"); setError(""); };
    const edit = (item) => {
        setEditingCode(item.code);
        setCode(item.code);
        setPercent(String(item.percent));
        setMessage("");
        setError("");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const mutate = async (action, values) => {
        setError("");
        setMessage("");
        setBusy(true);
        try {
            if (mode === "demo") {
                if (action === "create") {
                    if (demoPromos.some((item) => item.code === values.code)) throw new Error("Такой промокод уже существует");
                    setDemoPromos((current) => [...current, { code: values.code, percent: values.percent, active: true }]);
                } else if (action === "update") {
                    if (demoPromos.some((item) => item.code === values.code && item.code !== values.oldCode)) throw new Error("Такой промокод уже существует");
                    setDemoPromos((current) => current.map((item) => item.code === values.oldCode ? { ...item, code: values.code, percent: values.percent } : item));
                } else {
                    setDemoPromos((current) => current.map((item) => item.code === values.oldCode ? { ...item, active: action === "enable" } : item));
                }
            } else {
                const response = await fetch("/api/admin-promos", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-telegram-init-data": window.Telegram?.WebApp?.initData || "",
                    },
                    body: JSON.stringify({ action, ...values }),
                });
                const result = await response.json().catch(() => null);
                if (!response.ok || !result?.ok) throw new Error(result?.error || "Не удалось сохранить промокод");
                setPromos(result.promos || []);
                setRewards(result.rewards || []);
            }
            if (action === "update" || action === "create") reset();
            onPromosChanged?.();
            setMessage(action === "create" ? "Промокод создан" : action === "update" ? "Промокод обновлён" : action === "disable" ? "Промокод отключён" : "Промокод снова активен");
        } catch (caught) {
            setError(caught?.message || "Не удалось выполнить действие");
        } finally {
            setBusy(false);
        }
    };

    const save = (event) => {
        event.preventDefault();
        const preparedCode = code.trim().toUpperCase();
        const preparedPercent = Number(percent);
        if (!CODE_PATTERN.test(preparedCode)) { setError("Код должен состоять из 4–32 латинских букв, цифр, _ или -"); return; }
        if (!Number.isInteger(preparedPercent) || preparedPercent < 1 || preparedPercent > 90) { setError("Укажи скидку от 1% до 90%"); return; }
        mutate(editingCode ? "update" : "create", { oldCode: editingCode, code: preparedCode, percent: preparedPercent });
    };

    const changeStatus = (item) => {
        if (item.active && !window.confirm(`Отключить промокод ${item.code}? После этого он перестанет применяться в корзине.`)) return;
        mutate(item.active ? "disable" : "enable", { oldCode: item.code });
    };

    const renderRows = (rows) => rows.map((item) => <article className="promo-admin-row" key={item.code}>
        <div className="promo-admin-row-copy">
            <strong>{item.code}</strong>
            <span>Скидка {item.percent}% на заказ · {item.source === "environment" ? "Из настроек сервера" : item.source === "demo" ? "Пробный" : "Из админ-панели"}</span>
        </div>
        <div className="promo-admin-row-actions">
            <button type="button" onClick={() => edit(item)} disabled={busy}>Изменить</button>
            <button type="button" className={item.active ? "danger" : "restore"} onClick={() => changeStatus(item)} disabled={busy}>{item.active ? "Удалить" : "Вернуть"}</button>
        </div>
    </article>);

    if (mode === "loading") return <p className="promo-admin-loading">Загружаем промокоды...</p>;
    if (mode === "error") return <div className="promo-admin-warning" role="alert">{error}<p>Проверь Telegram-авторизацию администратора и примени миграцию <code>supabase/migrations/20261024_promo_management.sql</code> в Supabase.</p></div>;

    return <div className="promo-admin-page">
        <div className="promo-admin-intro">
            <span>СКИДКИ LEMONZ</span>
            <h2>Управление промокодами</h2>
            <p>Создавай промокоды, меняй название и размер скидки. Удалённые коды перестают работать, но их можно восстановить.</p>
        </div>
        {mode === "demo" && <div className="promo-admin-warning">Демо-режим: изменения промокодов работают только на этом устройстве. Для общих промокодов нужна серверная база.</div>}
        <div className="promo-admin-stats">
            <div><small>Действуют</small><strong>{active.length + rewards.filter((item) => item.active).length}</strong></div>
            <div><small>Отключены</small><strong>{inactive.length + rewards.filter((item) => !item.active).length}</strong></div>
        </div>

        <form className="promo-admin-form" onSubmit={save}>
            <div className="promo-admin-section-heading"><h3>{editingCode ? `Редактировать ${editingCode}` : "Добавить промокод"}</h3></div>
            <div className="promo-admin-fields">
                <label>Промокод<input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} maxLength={32} placeholder="НАПРИМЕР LEMONZ10" disabled={busy} autoComplete="off" spellCheck={false} required /></label>
                <label>Скидка, %<input type="number" value={percent} onChange={(event) => setPercent(event.target.value)} min="1" max="90" step="1" disabled={busy} required /></label>
            </div>
            <div className="promo-admin-form-buttons">
                <button type="submit" disabled={busy}>{busy ? "Сохраняем..." : editingCode ? "Сохранить изменения" : "+ Создать промокод"}</button>
                {editingCode && <button type="button" className="secondary" onClick={reset} disabled={busy}>Отмена</button>}
            </div>
        </form>

        {message && <p className="promo-admin-success" role="status">✓ {message}</p>}
        {error && <p className="promo-admin-error" role="alert">{error}</p>}

        <section className="promo-admin-list"><div className="promo-admin-section-heading"><h3>Активные промокоды</h3><span>{active.length}</span></div>
            {active.length ? renderRows(active) : <p className="promo-admin-empty">Пока нет действующих общих промокодов</p>}
        </section>
        <section className="promo-admin-list"><div className="promo-admin-section-heading"><h3>Отключённые</h3><span>{inactive.length}</span></div>
            {inactive.length ? renderRows(inactive) : <p className="promo-admin-empty">Здесь появятся удалённые промокоды</p>}
        </section>
        <section className="promo-admin-list promo-admin-rewards"><div className="promo-admin-section-heading"><h3>Награды голосования</h3><span>{rewards.length}</span></div>
            <p className="promo-admin-note">Персональные одноразовые коды закреплены за победителями и всегда дают 50% на одну фигурку. Погасить их можно во вкладке «Голосование» после оплаты.</p>
            {rewards.length ? rewards.map((item) => <div className="promo-admin-reward" key={item.code}><strong>{item.code}</strong><span>−50% · {item.name} · @{item.author_username || item.author_id}</span><small>{item.active ? "Активен" : "Использован"}</small></div>) : <p className="promo-admin-empty">Победителей с личными промокодами пока нет</p>}
        </section>
    </div>;
}
