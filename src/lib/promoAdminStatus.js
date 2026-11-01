// Human-readable diagnostics for the administrator, without exposing secrets.
export function diagnosePromoAdmin(status, payload, fallback = "") {
  const raw = String(payload?.error || fallback || "Не удалось получить промокоды");
  const lower = raw.toLowerCase();
  if (payload?.configured === false || payload?.code === "SERVER_NOT_CONFIGURED" || (status === 503 && lower.includes("сервер не настроен"))) {
    return {
      kind: "setup",
      title: "Не подключён сервер промокодов",
      details: "Приложение опубликовано, но для работы общих промокодов нужны серверные настройки Vercel и база Supabase.",
      technical: "",
    };
  }
  if (status === 401) return {
    kind: "auth",
    title: "Telegram-авторизация не прошла",
    details: "Закрой Mini App полностью и открой его заново через Telegram-бота. Сервер проверяет подпись и срок действия входа.",
    technical: "",
  };
  if (status === 403) return {
    kind: "permission",
    title: "У аккаунта нет прав администратора",
    details: "Проверь Telegram ID в списке серверных администраторов. Наличие вкладки само по себе не даёт доступ к базе.",
    technical: "",
  };
  if (/promo_codes|manage_promo_code|relation .*does not exist|could not find|schema cache|season_winners|42p01|42883/i.test(raw)) return {
    kind: "migration",
    title: "В базе не хватает таблиц или функций",
    details: "В Supabase SQL Editor необходимо выполнить схему проекта и миграцию управления промокодами.",
    technical: raw.slice(0, 180),
  };
  if (status === 404 || status === 405) return {
    kind: "route",
    title: "Серверный API недоступен",
    details: "Проверь, что Vercel развернул проект вместе с папкой api и что Mini App открывается с актуального адреса.",
    technical: "",
  };
  return {
    kind: "other",
    title: "Не удалось загрузить промокоды",
    details: "Попробуй обновить подключение. Если ошибка повторится, проверь Vercel Function Logs и состояние Supabase.",
    technical: raw.slice(0, 180),
  };
}
