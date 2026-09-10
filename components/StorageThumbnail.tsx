import type { AssetStatus } from "@/lib/types";

/**
 * Stylized SVG illustration of a battery storage container.
 * Stands in for real product photos without loading external assets. The
 * state of charge (soc) is visualized as a fill bar inside the container.
 */
export default function StorageThumbnail({
  soc,
  status,
  className = "",
}: {
  soc: number;
  status: AssetStatus;
  className?: string;
}) {
  const active = status === "aktiv";
  const fill = active ? "#39d353" : "#f5484a";
  const bodyTop = "#2b7aa6";
  const bodyBottom = "#114a6a";
  const fillHeight = Math.max(2, Math.round((soc / 100) * 40));

  return (
    <svg
      viewBox="0 0 120 96"
      className={className}
      role="img"
      aria-label={`Batteriespeicher, Ladestand ${soc}%`}
    >
      <defs>
        <linearGradient id={`body-${active}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={bodyTop} />
          <stop offset="1" stopColor={bodyBottom} />
        </linearGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="60" cy="88" rx="46" ry="5" fill="#04161f" opacity="0.35" />

      {/* Container body */}
      <rect
        x="16"
        y="24"
        width="88"
        height="56"
        rx="6"
        fill={`url(#body-${active})`}
        stroke="#114a6a"
        strokeWidth="1.5"
      />

      {/* Ventilation ribs */}
      {[24, 34, 44, 54, 64, 74, 84, 94].map((x) => (
        <line
          key={x}
          x1={x}
          y1="30"
          x2={x}
          y2="74"
          stroke="#04161f"
          strokeWidth="1.5"
          opacity="0.25"
        />
      ))}

      {/* State-of-charge gauge (viewing window) */}
      <rect x="70" y="32" width="26" height="40" rx="3" fill="#04161f" opacity="0.55" />
      <rect
        x="70"
        y={32 + (40 - fillHeight)}
        width="26"
        height={fillHeight}
        rx="3"
        fill={fill}
        opacity="0.9"
      />

      {/* enorin accent stripe */}
      <rect x="16" y="66" width="48" height="6" fill="#cdf23f" opacity="0.9" />

      {/* Lightning-bolt symbol */}
      <path
        d="M40 34 L30 52 h8 l-3 12 12-18 h-8 l3-12 z"
        fill={active ? "#cdf23f" : "#5c7383"}
      />

      {/* Status dot */}
      <circle cx="98" cy="28" r="4.5" fill={fill} stroke="#04161f" strokeWidth="1" />
    </svg>
  );
}
