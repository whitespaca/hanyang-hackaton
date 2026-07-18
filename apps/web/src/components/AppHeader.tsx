import Link from "next/link";

const links = [
  ["/classify", "AI 분류"],
  ["/guides", "가이드"],
  ["/dashboard", "통계"],
  ["/model", "모델"],
] as const;

export function AppHeader() {
  return (
    <header style={{ background: "rgb(255 255 255 / 92%)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 20, backdropFilter: "blur(12px)" }}>
      <div className="container" style={{ minHeight: 68, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <Link href="/" style={{ fontSize: 22, fontWeight: 900, color: "var(--primary-dark)" }}>분리샷</Link>
        <nav aria-label="주 메뉴" style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: "8px 18px", fontSize: 14, fontWeight: 700 }}>
          {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
      </div>
    </header>
  );
}
