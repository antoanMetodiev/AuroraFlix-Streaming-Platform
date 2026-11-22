/**
 * The five networks "Моята седмица" shares to, as app-icon style tiles: the
 * brand's own colour (Instagram's gradient), a white glyph, a soft glow of
 * the same colour. Drawn inline — no icon font or image to load.
 */
export type ShareNetwork = "instagram" | "facebook" | "whatsapp" | "telegram" | "reddit";

export const NETWORK_LABEL: Record<ShareNetwork, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  reddit: "Reddit",
};

const BACKGROUND: Record<ShareNetwork, string> = {
  instagram: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)",
  facebook: "linear-gradient(160deg, #2d8cff 0%, #1667e0 100%)",
  whatsapp: "linear-gradient(160deg, #3be27a 0%, #1ebe5b 100%)",
  telegram: "linear-gradient(160deg, #3bb4f2 0%, #1e93d6 100%)",
  reddit: "linear-gradient(160deg, #ff6a2b 0%, #ff4500 100%)",
};

const GLOW: Record<ShareNetwork, string> = {
  instagram: "rgba(214,36,159,0.55)",
  facebook: "rgba(24,119,242,0.55)",
  whatsapp: "rgba(37,211,102,0.5)",
  telegram: "rgba(41,169,235,0.55)",
  reddit: "rgba(255,69,0,0.55)",
};

function Glyph({ network }: { network: ShareNetwork }) {
  switch (network) {
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" className="h-7 w-7">
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.2" cy="6.8" r="1.1" fill="#fff" stroke="none" />
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" fill="#fff" className="h-7 w-7">
          <path d="M13.6 21v-7.4h2.5l.4-2.9h-2.9V8.9c0-.84.24-1.42 1.45-1.42h1.55V4.9c-.27-.04-1.19-.12-2.26-.12-2.24 0-3.77 1.37-3.77 3.88v2.04H8v2.9h2.57V21h3.03z" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
          <path
            d="M12 3.5a8.5 8.5 0 0 0-7.3 12.85L3.5 20.5l4.27-1.12A8.5 8.5 0 1 0 12 3.5z"
            stroke="#fff"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <path
            d="M9.1 7.9c-.2-.45-.4-.46-.6-.47h-.5a1 1 0 0 0-.72.34c-.25.27-.95.93-.95 2.27s.97 2.63 1.1 2.81c.14.18 1.88 3 4.64 4.08 2.3.9 2.77.72 3.26.68.5-.05 1.6-.65 1.83-1.29.22-.63.22-1.17.16-1.29-.07-.11-.25-.18-.52-.31-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.15-.42-2.18-1.35-.8-.72-1.35-1.6-1.5-1.87-.16-.27-.02-.42.12-.55.12-.12.27-.32.4-.48.14-.16.18-.27.27-.45.1-.18.05-.34-.02-.48-.07-.13-.6-1.48-.84-2.02z"
            fill="#fff"
          />
        </svg>
      );
    case "telegram":
      return (
        <svg viewBox="0 0 24 24" fill="#fff" className="h-7 w-7">
          <path d="M20.66 4.3 2.93 11.14c-1.21.49-1.2 1.16-.22 1.46l4.55 1.42 1.74 5.35c.21.59.11.82.73.82.48 0 .69-.22.96-.48l2.3-2.24 4.79 3.54c.88.49 1.52.24 1.74-.82l3.15-14.85c.32-1.29-.5-1.88-2.01-1.04zM8.97 13.7l9.73-6.14c.48-.29.92-.13.56.19l-8.33 7.52-.32 3.46-1.64-5.03z" />
        </svg>
      );
    case "reddit":
      return (
        <svg viewBox="0 0 24 24" className="h-7 w-7">
          <ellipse cx="12" cy="14.2" rx="7.2" ry="5.2" fill="#fff" />
          <circle cx="5.6" cy="11.2" r="1.7" fill="#fff" />
          <circle cx="18.4" cy="11.2" r="1.7" fill="#fff" />
          <circle cx="17.3" cy="4.6" r="1.4" fill="#fff" />
          <path d="M12 9 13.1 4.2l4.2.9" fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="9.4" cy="13.6" r="1.15" fill="#ff4500" />
          <circle cx="14.6" cy="13.6" r="1.15" fill="#ff4500" />
          <path d="M9.4 16.4c1.5 1 3.7 1 5.2 0" fill="none" stroke="#ff4500" strokeWidth="1" strokeLinecap="round" />
        </svg>
      );
  }
}

export function NetworkTile({ network, size = 56 }: { network: ShareNetwork; size?: number }) {
  return (
    <span
      className="relative flex items-center justify-center overflow-hidden rounded-[1.1rem] ring-1 ring-white/20 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-105 group-active:scale-95"
      style={{ width: size, height: size, background: BACKGROUND[network], boxShadow: `0 10px 28px -8px ${GLOW[network]}` }}
    >
      {/* A soft top light, like an app icon. */}
      <span aria-hidden className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
      <span className="relative">
        <Glyph network={network} />
      </span>
    </span>
  );
}
