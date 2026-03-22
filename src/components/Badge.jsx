export function Badge({ children, color = "#475569", bg }) {
  return (
    <span className="badge" style={{ background: bg || color }}>
      {children}
    </span>
  )
}

export function SystemBadge({ sys }) {
  return sys === "base"
    ? <Badge bg="#475569">BASE</Badge>
    : <Badge bg="#b91c1c">PREMIUM</Badge>
}
