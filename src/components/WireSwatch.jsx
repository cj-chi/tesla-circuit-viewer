import { WIRE_COLORS } from '../data/constants'

export function WireSwatch({ code }) {
  const parts = code.split("/")
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {parts.map((c, i) => (
        <span
          key={i}
          className="wire-swatch"
          style={{ background: WIRE_COLORS[c]?.hex || "#999" }}
          title={WIRE_COLORS[c]?.name || c}
        />
      ))}
      <span style={{ fontSize: 11, opacity: 0.7 }}>{code}</span>
    </span>
  )
}
