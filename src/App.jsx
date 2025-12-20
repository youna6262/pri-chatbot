import { useState, useEffect, useMemo } from "react";
import PriHeader from "./components/PriHeader";
import FractalIntro from "./components/FractalIntro";
import NatureFractals from "./components/NatureFractals";
import MakeFractal from "./components/MakeFractal";
import PriQuiz from "./components/PriQuiz";
import PriChat from "./components/PriChat";
import ClassAuthGate from "./components/ClassAuthGate";
import ChatPanel from "./components/ChatPanel";
import Footer from "./components/Footer";
import FractalTopNav from "./components/FractalTopNav";
import { waitForAuthReady } from "./auth/classAuth";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState("intro");
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [workContext, setWorkContext] = useState({});
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    waitForAuthReady().then(() => setAuthReady(true));
  }, []);

  // ✅ "학습 흐름" 단계 정의 (네 로드맵 그대로)
  const steps = useMemo(
    () => [
      { id: "intro", label: "1 알아보기", help: "프랙탈이 뭔지 느낌을 잡아봐요." },
      { id: "nature", label: "2 자연 속 프랙탈", help: "자연에서 반복 패턴을 찾아봐요." },
      { id: "make", label: "3 바탕 만들기/그리기", help: "프랙탈 바탕을 만들고 펜으로 꾸며요." },
      { id: "chat", label: "4 챗봇 정리", help: "원리 + 제목 + AI윤리로 마무리!" },
      { id: "quiz", label: "5 퀴즈", help: "마지막으로 퀴즈로 확인!" },
    ],
    []
  );

  const stepIndex = useMemo(() => {
    const idx = steps.findIndex((s) => s.id === activeTab);
    return idx >= 0 ? idx : 0;
  }, [activeTab, steps]);

  function goStep(index) {
    const next = steps[Math.max(0, Math.min(steps.length - 1, index))];
    if (!next) return;
    setActiveTab(next.id);
    // 채팅패널 열려있으면 닫아도 되고(선택)
    // setShowChatPanel(false);
  }

  // ✅ FractalTopNav와 activeTab 매핑은 그대로 유지하되 함수로 정리
  function topNavKeyFromTab(tab) {
    if (tab === "intro") return "what";
    if (tab === "nature") return "nature";
    if (tab === "make") return "make";
    if (tab === "chat") return "ask";
    if (tab === "quiz") return "quiz";
    return "what";
  }

  function tabFromTopNavKey(key) {
    if (key === "what") return "intro";
    if (key === "nature") return "nature";
    if (key === "make") return "make";
    if (key === "ask") return "chat";
    if (key === "quiz") return "quiz";
    return "intro";
  }

  return (
    <div className="app">
      <PriHeader onOpenChat={() => setShowChatPanel(true)} />

      {showChatPanel && (
        <ChatPanel
          workContext={workContext}
          strokeSummary={workContext.strokeSummary || ""}
          onClose={() => setShowChatPanel(false)}
        />
      )}

      <main className="app-main">
        {/* 기존 상단 탭 */}
        <FractalTopNav
          activeKey={topNavKeyFromTab(activeTab)}
          onSelect={(key) => setActiveTab(tabFromTopNavKey(key))}
        />

        {/* ✅ 진행 단계 스텝퍼 */}
        <div className="flow-stepper" aria-label="활동 진행 단계">
          {steps.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`flow-stepper-item ${i === stepIndex ? "active" : ""}`}
              onClick={() => goStep(i)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* ✅ 2열 레이아웃: 왼쪽=콘텐츠 / 오른쪽=미리보기&힌트 */}
        <div className="tab-layout">
          <section className="tab-left">
            <div className="tab-content">
              {activeTab === "intro" && <FractalIntro />}
              {activeTab === "nature" && <NatureFractals />}

              {activeTab === "make" && (
                <ClassAuthGate>
                  {/* authReady를 Gate에 쓰고 싶으면 MakeFractal에 prop 전달도 가능 */}
                  <MakeFractal onWorkContextChange={setWorkContext} />
                </ClassAuthGate>
              )}

              {activeTab === "chat" && <PriChat workContext={workContext} />}
              {activeTab === "quiz" && <PriQuiz />}
            </div>

            {/* ✅ 하단 다음/이전 네비 버튼 */}
            <div className="flow-nav">
              <button
                type="button"
                className="flow-nav-btn"
                onClick={() => goStep(stepIndex - 1)}
                disabled={stepIndex === 0}
              >
                이전
              </button>

              <div className="flow-nav-hint" aria-live="polite">
                <span className="flow-nav-title">{steps[stepIndex]?.label}</span>
                <span className="flow-nav-help">{steps[stepIndex]?.help}</span>
              </div>

              <button
                type="button"
                className="flow-nav-btn"
                onClick={() => goStep(stepIndex + 1)}
                disabled={stepIndex === steps.length - 1}
              >
                다음
              </button>
            </div>
          </section>

          <aside className="tab-right" aria-label="미리보기/힌트 패널">
            <div className="preview-panel">
              <h3 className="preview-title">프리의 힌트</h3>

              {/* workContext 기반 미리보기(있으면 보여주고, 없으면 안내) */}
              {workContext?.previewImageUrl ? (
                <img
                  src={workContext.previewImageUrl}
                  alt="프랙탈 미리보기"
                  className="preview-image"
                />
              ) : (
                <div className="preview-empty">
                  <p className="preview-empty-main">아직 미리보기 데이터가 없어요.</p>
                  <p className="preview-empty-sub">
                    '바탕 만들기/그리기'에서 프랙탈을 만들면 여기에 미리보기가 떠요!
                  </p>
                </div>
              )}

              {!!workContext?.strokeSummary && (
                <div className="preview-box">
                  <div className="preview-box-title">내 그림 특징(요약)</div>
                  <div className="preview-box-body">{workContext.strokeSummary}</div>
                </div>
              )}

              <div className="preview-box">
                <div className="preview-box-title">추천 진행</div>
                <ol className="preview-ol">
                  <li>자연 속 프랙탈을 보고 패턴을 떠올려요.</li>
                  <li>바탕을 만든 뒤, 펜으로 반복 느낌을 더해요.</li>
                  <li>챗봇으로 원리/제목/AI윤리까지 마무리!</li>
                </ol>
              </div>

              {/* 학생용 "바로가기" 버튼 */}
              <div className="preview-actions">
                <button type="button" className="preview-btn" onClick={() => setActiveTab("make")}>
                  프랙탈 만들기
                </button>
                <button type="button" className="preview-btn" onClick={() => setActiveTab("chat")}>
                  챗봇으로 정리
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App;
