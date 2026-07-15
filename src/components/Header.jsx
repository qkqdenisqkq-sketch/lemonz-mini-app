export default function Header({
    user,
    onHome,
    onProfile,
}) {
    return (
        <header className="header">
            <button
                type="button"
                className="logo-button"
                onClick={onHome}
            >
                <span className="logo-icon">
                    L
                </span>

                <span className="logo-text">
                    Lemonz
                </span>
            </button>

            <button
                type="button"
                className="profile-button"
                onClick={onProfile}
                aria-label="Открыть профиль"
            >
                {user?.first_name?.[0] ?? "С"}
            </button>
        </header>
    );
}