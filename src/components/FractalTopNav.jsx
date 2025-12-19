import React from "react";
import "./FractalTopNav.css";

/**
 * FractalTopNav (Fairybook ver.)
 * - 5개 메뉴 고정
 * - 숫자 배지 제거 → "별 스티커"로 대체
 * - 활성 탭: ✨ 반짝 미세 애니메이션
 * - 레일 배경: 아주 연한 구름/별 패턴 (CSS)
 */
export default function FractalTopNav({ activeKey, onSelect, className = "" }) {
  const items = [
    { key: "what", label: "프랙탈이 뭐야?", icon: "🔎" },
    { key: "nature", label: "자연 속 프랙탈", icon: "🌿" },
    { key: "make", label: "프랙탈 직접 만들기", icon: "✨" },
    { key: "ask", label: "프리에게 질문하기", icon: "🧚" },
    { key: "quiz", label: "퀴즈로 마무리", icon: "🎯" },
  ];

  return (
    <nav className={`fractal-nav fairybook ${className}`} aria-label="상단 메뉴">
      <div className="fractal-nav__rail" role="tablist" aria-orientation="horizontal">
        {items.map((item) => {
          const isActive = item.key === activeKey;
          return (
            <button
              key={item.key}
              type="button"
              className={`fractal-nav__pill ${isActive ? "is-active" : ""}`}
              onClick={() => onSelect?.(item.key)}
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
            >
              {/* 숫자 대신 별 스티커 */}
              <span className="fractal-nav__sticker" aria-hidden="true">
                ★
              </span>

              <span className="fractal-nav__icon" aria-hidden="true">
                {item.icon}
              </span>

              <span className="fractal-nav__label">{item.label}</span>

              {/* 활성 탭에서만 반짝 */}
              {isActive && <span className="fractal-nav__sparkles" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

