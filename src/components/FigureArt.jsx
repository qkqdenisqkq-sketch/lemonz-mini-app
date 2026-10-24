export default function FigureArt({ src, name, className = "" }) {
    return <div className={`figure-art ${className}`}>
        <div className="figure-placeholder" aria-hidden="true"><span className="placeholder-hair">✦</span><span className="placeholder-eyes">⊗ &nbsp; ⊗</span><span className="placeholder-name">{name}</span></div>
        {src && <img src={src} alt={name} loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} />}
    </div>;
}
