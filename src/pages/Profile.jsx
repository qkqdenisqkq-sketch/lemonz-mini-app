export default function Profile({
    user,
    isAdmin,
    onOpenAdmin,
}) {
    return (
        <section className="profile-page">
            <div className="profile-avatar">
                {user?.first_name?.[0] ??
                    "С"}
            </div>

            <p className="section-label">
                ПРОФИЛЬ
            </p>

            <h1>
                {user?.first_name ??
                    "Пользователь"}
            </h1>

            {user?.id && (
                <p className="profile-id">
                    Telegram ID:{" "}
                    {user.id}
                </p>
            )}

            <p className="profile-description">
                Здесь появятся история
                заказов, адрес доставки и
                избранные фигурки.
            </p>

            {!user && (
                <div className="profile-notice">
                    Данные пользователя
                    появятся после запуска
                    приложения через Telegram.
                </div>
            )}

            {isAdmin && (
                <button
                    type="button"
                    className="secondary-button profile-admin-button"
                    onClick={onOpenAdmin}
                >
                    Открыть админ-панель
                </button>
            )}
        </section>
    );
}