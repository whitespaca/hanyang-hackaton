"use client";

import type { HealthResponse } from "@bunrishot/shared";
import { useEffect, useState } from "react";

import { apiClient } from "@/lib/api";

const EVALUATED_MODEL_VERSION = "gcv2-mobilenetv3s-20260718-1529";

export default function ModelPage() {
  const [health, setHealth] = useState<HealthResponse>();

  useEffect(() => {
    apiClient.health().then(setHealth).catch(() => setHealth(undefined));
  }, []);

  return (
    <section className="section container" style={{ maxWidth: 900 }}>
      <p className="eyebrow">Model & responsibility</p>
      <h1 style={{ fontSize: "clamp(2rem,5vw,3.5rem)", margin: "8px 0" }}>
        AI는 결정을 돕고, 대신하지 않습니다
      </h1>
      <div
        className="card"
        style={{
          padding: 26,
          margin: "26px 0",
          background: health?.inferenceMode === "model" ? "var(--accent)" : "var(--warning-bg)",
        }}
      >
        <strong>
          현재 상태: {health
            ? health.inferenceMode === "model"
              ? `실제 모델 모드 · ${health.modelVersion}`
              : "데모(mock) 모드"
            : "API 상태를 확인할 수 없음"}
        </strong>
        {health?.fallbackReason && <p>모델 fallback 사유: {health.fallbackReason}</p>}
      </div>
      <div className="grid-cards">
        <article className="card" style={{ padding: 24 }}>
          <h2>데이터셋</h2>
          <p className="muted">
            Kaggle Garbage Classification V2의 로컬 12,259장 스냅샷을 seed 42로
            80/10/10 분할해 학습·검증했습니다.
          </p>
        </article>
        <article className="card" style={{ padding: 24 }}>
          <h2>구조</h2>
          <p className="muted">
            MobileNetV3 Small transfer learning을 사용하며 metadata의 클래스 순서와 정규화를
            추론의 source of truth로 사용합니다.
          </p>
        </article>
        <article className="card" style={{ padding: 24 }}>
          <h2>실제 테스트셋 결과</h2>
          <p className="muted">
            1,227장 기준 Accuracy 90.87%, Macro F1 90.37%, Top-3 Accuracy 98.21%입니다.
          </p>
          <small className="muted">모델 버전: {EVALUATED_MODEL_VERSION}</small>
        </article>
        <article className="card" style={{ padding: 24 }}>
          <h2>개인정보</h2>
          <p className="muted">
            업로드 원본은 추론 후 폐기하며 DB나 디스크에 저장하지 않습니다. 익명 분류 요약과
            명시적 피드백만 집계합니다.
          </p>
        </article>
      </div>
      <section className="card" style={{ padding: 26, marginTop: 24 }}>
        <h2>알려진 한계</h2>
        <ul style={{ lineHeight: 1.9 }}>
          <li>한 이미지에서 대표 물체 하나만 분류합니다.</li>
          <li>오염도·복합재질·지자체별 기준을 자동으로 확정하지 못합니다.</li>
          <li>학습 사진과 실제 촬영 환경 차이로 결과가 달라질 수 있습니다.</li>
          <li>따라서 Top 3와 신뢰도를 공개하고 사용자 수정 단계를 유지합니다.</li>
        </ul>
      </section>
    </section>
  );
}
