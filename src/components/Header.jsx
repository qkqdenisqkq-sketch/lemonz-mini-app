import LemonzIcon from "./LemonzIcon";

export default function Header({ user, cartCount = 0, theme = "light", onToggleTheme, onHome, onSearch, onFavorites, onCart, onProfile }) {
    return <header className="header storefront-header">
        <button type="button" className="logo-button storefront-brand" onClick={onHome} aria-label="LEMONZ - главная">
            <span className="storefront-brand-icon"><LemonzIcon name="planet" size={34} /></span>
            <span className="logo-text">LEMONZ</span>
        </button>
        <div className="storefront-header-actions">
            <button type="button" className="storefront-header-icon" onClick={onSearch} aria-label="Поиск"><LemonzIcon name="search" size={24} /></button>
            <button type="button" className="storefront-header-icon storefront-theme-button" onClick={onToggleTheme} aria-label={theme === "light" ? "Включить тёмную тему" : "Включить светлую тему"} title={theme === "light" ? "Тёмная тема" : "Светлая тема"} aria-pressed={theme === "dark"}><LemonzIcon name={theme === "light" ? "moon" : "sun"} size={22} /></button>
            <button type="button" className="storefront-header-icon" onClick={onFavorites} aria-label="Избранное"><LemonzIcon name="heart" size={24} /></button>
            <button type="button" className="storefront-header-icon" onClick={onCart} aria-label="Корзина"><LemonzIcon name="cart" size={26} />{cartCount > 0 && <span className="storefront-cart-badge">{cartCount}</span>}</button>
            <button type="button" className="storefront-header-profile" onClick={onProfile} aria-label="Профиль">{user?.first_name?.[0] || "С"}</button>
        </div>
    </header>;
}
