import { GARBAGE_CLASSES, GARBAGE_LABELS } from "@bunrishot/shared";
import Link from "next/link";

const steps = [
  ["01", "사진 촬영·업로드", "물건 하나가 잘 보이는 사진으로 시작합니다."],
  ["02", "AI 분석 + 직접 확인", "Top 3와 신뢰도를 보고 결과를 확정하거나 수정합니다."],
  ["03", "행동 체크리스트", "선택한 세부 품목에 맞춰 지금 할 일을 확인합니다."],
] as const;

export default function HomePage() {
  return <>
    <section className="section" style={{ paddingTop: 88, background: "linear-gradient(145deg,#f5f7f5 35%,#dff5e9)" }}><div className="container" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 44, alignItems: "center" }}><div><p className="eyebrow">AI 기반 분리배출 도우미</p><h1 style={{ fontSize: "clamp(2.6rem,7vw,5.3rem)", lineHeight: .98, letterSpacing: "-.07em", margin: "16px 0 24px" }}>사진 한 장으로 시작하는 올바른 분리배출</h1><p className="muted" style={{ fontSize: 19, lineHeight: 1.7, maxWidth: 650 }}>AI가 쓰레기 종류를 분석하고, 사용자가 직접 확인한 뒤 실제 행동 방법을 안내합니다.</p><div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 30 }}><Link className="button button-primary" href="/classify">웹에서 체험하기</Link><Link className="button button-secondary" href="/model">AI 원칙 알아보기</Link></div></div><div className="card" style={{ padding: 28 }}><p className="eyebrow">사람이 마지막 결정을 합니다</p><div style={{ fontSize: 66, margin: "26px 0" }} aria-hidden>▧ → 3 → ✓</div><p style={{ lineHeight: 1.7 }}>분리샷은 AI 결과를 정답처럼 단정하지 않습니다. 낮은 신뢰도에서는 직접 선택을 먼저 안내하고, 모든 결과에서 수정할 수 있습니다.</p></div></div></section>
    <section className="section container"><p className="eyebrow">How it works</p><h2>세 단계면 충분합니다</h2><div className="grid-cards">{steps.map(([number,title,body]) => <article key={number} className="card" style={{ padding: 24 }}><span className="eyebrow">{number}</span><h3>{title}</h3><p className="muted" style={{ lineHeight: 1.6 }}>{body}</p></article>)}</div></section>
    <section className="section" style={{ background: "white" }}><div className="container"><p className="eyebrow">10 categories</p><h2>일상 쓰레기 10개 대분류</h2><div className="grid-cards">{GARBAGE_CLASSES.map((item) => <div key={item} style={{ padding: 16, borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}><strong>{GARBAGE_LABELS[item]}</strong><span className="muted">{item}</span></div>)}</div></div></section>
    <section className="section container" style={{ textAlign: "center" }}><h2>AI가 헷갈려도 흐름은 멈추지 않습니다</h2><p className="muted">모델이 준비되지 않은 환경에서도 명시적인 데모 모드로 전체 흐름을 시연할 수 있습니다.</p><Link className="button button-primary" href="/classify">사진으로 시작하기</Link></section>
  </>;
}
