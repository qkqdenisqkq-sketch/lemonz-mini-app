export default function ScrollTop({
    visible,
    onClick,
}) {
    if (!visible) {
        return null;
    }

    return (
        <button
            type="button"
            className="scroll-top-button"
            onClick={onClick}
            aria-label="Наверх"
            title="Наверх"
        >
            ↑
        </button>
    );
}