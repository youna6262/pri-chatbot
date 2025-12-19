import React from "react";
import "./FractalTopNav.css";

/**
 * FractalTopNav
 * - 메뉴 텍스트/순서 고정
 * - activeKey로 활성 탭 표시
 * - onSelect(key)로 기존 라우팅/상태 로직 연결
 */
export default function FractalTopNav({
  activeKey,
  onSelect,
  className = "",
}) {
  const items = [
    { key: "what", label: "프랙탈이 뭐야?", icon: "🔍" },
    { key: "nature", label: "자연 속 프랙탈", icon: "🌿" },
    { key: "make", label: "프랙탈 직접 만들기", icon: "✨" },
    { key: "ask", label: "프리에게 질문하기", icon: "🧚" },
    { key: "quiz", label: "퀴즈로 마무리", icon: "🎯" },
  ];

  return (
    <nav className={`fractal-nav ${className}`} aria-label="상단 메뉴">
      <div className="fractal-nav__rail" role="tablist" aria-orientation="horizontal">
        {items.map((item, idx) => {
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
              <span className="fractal-nav__badge" aria-hidden="true">
                {idx + 1}
              </span>
              <span className="fractal-nav__icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="fractal-nav__label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

