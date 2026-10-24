export default function LemonzIcon({ name, size = 24, strokeWidth = 1.9 }) {
    const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
    switch (name) {
        case "planet": return <svg {...common}><circle cx="12" cy="12" r="7" fill="currentColor" opacity=".94"/><ellipse cx="12" cy="12" rx="11.2" ry="4.3" transform="rotate(-35 12 12)"/><path d="M9 6.1c1.4-.8 3-1 4.6-.7" stroke="white" opacity=".5"/></svg>;
        case "search": return <svg {...common}><circle cx="10.8" cy="10.8" r="7"/><path d="m16 16 5.1 5.1"/></svg>;
        case "moon": return <svg {...common}><path d="M20.5 13a8.6 8.6 0 0 1-9.5-9.5A8.7 8.7 0 1 0 20.5 13Z"/></svg>;
        case "sun": return <svg {...common}><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.5 1.5m11.2 11.2 1.5 1.5M2 12h2m16 0h2M4.9 19.1l1.5-1.5M17.6 6.4l1.5-1.5"/></svg>;
        case "heart": return <svg {...common}><path d="M20.8 8.5c0 4.9-8.8 10.8-8.8 10.8S3.2 13.4 3.2 8.5a4.7 4.7 0 0 1 8.8-2.1 4.7 4.7 0 0 1 8.8 2.1Z"/></svg>;
        case "cart": return <svg {...common}><path d="M2.2 3h2.4l2 12.4h12l2-9.4H5.2"/><circle cx="8.3" cy="20.2" r="1" fill="currentColor"/><circle cx="18" cy="20.2" r="1" fill="currentColor"/></svg>;
        case "home": return <svg {...common}><path d="m3 10 9-7 9 7v10H3V10Z"/><path d="M9.2 20v-7h5.6v7"/></svg>;
        case "grid": return <svg {...common}><rect x="3" y="3" width="7.1" height="7.1" rx="1.4"/><rect x="13.9" y="3" width="7.1" height="7.1" rx="1.4"/><rect x="3" y="13.9" width="7.1" height="7.1" rx="1.4"/><rect x="13.9" y="13.9" width="7.1" height="7.1" rx="1.4"/></svg>;
        case "user": return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4.5 21c0-4.1 3-7 7.5-7s7.5 2.9 7.5 7"/><circle cx="12" cy="12" r="10"/></svg>;
        case "trophy": return <svg {...common}><path d="M7 3h10v8a5 5 0 0 1-10 0V3ZM7 5H3v3a4 4 0 0 0 4 4M17 5h4v3a4 4 0 0 1-4 4M12 16v4M8 21h8"/></svg>;
        case "gavel": return <svg {...common}><path d="m7 3 6 6M5 5l5 5m5-2 4 4M12 11l6 6M13 9 9 13M4 20h16"/></svg>;
        case "arrow": return <svg {...common}><path d="M4 12h16m-7-7 7 7-7 7"/></svg>;
        case "arrow-up": return <svg {...common}><path d="M5 19 19 5M9 5h10v10"/></svg>;
        case "bag": return <svg {...common}><path d="M4 8h16l-1 13H5L4 8Z"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/></svg>;
        case "settings": return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="m12 2 1.2 2.7 2.7.5 2.2-1.4 2.1 2.1-1.4 2.2.5 2.7L22 12l-2.7 1.2-.5 2.7 1.4 2.2-2.1 2.1-2.2-1.4-2.7.5L12 22l-1.2-2.7-2.7-.5-2.2 1.4-2.1-2.1 1.4-2.2-.5-2.7L2 12l2.7-1.2.5-2.7-1.4-2.2 2.1-2.1 2.2 1.4 2.7-.5L12 2Z"/></svg>;
        case "bookmark": return <svg {...common}><path d="M5.5 3.5h13v17l-6.5-5-6.5 5v-17Z"/></svg>;
        case "back": return <svg {...common}><path d="m13 4-8 8 8 8M5 12h16"/></svg>;
        case "chevron-left": return <svg {...common}><path d="m15 5-7 7 7 7"/></svg>;
        case "chevron-right": return <svg {...common}><path d="m9 5 7 7-7 7"/></svg>;
        case "chevron-down": return <svg {...common}><path d="m5 9 7 7 7-7"/></svg>;
        case "diamond": return <svg {...common}><path d="M4 4h16l3 6-11 11L1 10l3-6ZM1 10h22M8 4l4 17 4-17"/></svg>;
        case "clock": return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg>;
        case "trending-up": return <svg {...common}><path d="m3 18 7-7 4 4 7-8M15 7h6v6"/></svg>;
        case "flame": return <svg {...common}><path d="M12 22c4.5 0 7-3 7-7 0-3-1.5-5.5-5-8 .3 2-1.5 3.5-1.5 3.5C13 7 11.2 5 9 3c.5 4.5-4 6.5-4 12 0 4 2.8 7 7 7Z"/></svg>;
        case "package": return <svg {...common}><path d="m12 2 9 5-9 5-9-5 9-5ZM3 7v10l9 5 9-5V7M12 12v10M7.5 4.5l9 5"/></svg>;
        case "badge-check": return <svg {...common}><path d="m12 2 3 2 3.5.5.5 3.5 2 4-2 3.5-.5 3.5-3.5.5-3 2-3-2-3.5-.5-.5-3.5-2-3.5 2-4 .5-3.5L9 4l3-2Z" fill="currentColor"/><path d="m8.5 12 2.3 2.3 4.8-5" stroke="#fff" strokeWidth="2"/></svg>;
        case "x": return <svg {...common}><path d="M5 5l14 14M19 5 5 19"/></svg>;
        default: return null;
    }
}
