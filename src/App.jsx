import { useState, useEffect } from "react";
import PriHeader from "./components/PriHeader";
import FractalIntro from "./components/FractalIntro";
import NatureFractals from "./components/NatureFractals";
import { MakeFractal } from "./components/MakeFractal";
import PriQuiz from "./components/PriQuiz";
import PriChat from "./components/PriChat";
import ClassAuthGate from "./components/ClassAuthGate";
import ChatPanel from "./components/ChatPanel";
import Footer from "./components/Footer";
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
        {/* 5개 메뉴 탭 - 단계형 UI 스타일 */}
        <div className="main-stepper">
          <button
            type="button"
            className={`main-step-btn ${activeTab === "intro" ? "active" : ""}`}
            onClick={() => setActiveTab("intro")}
          >
            <span className="step-icon">🔍</span>
            <span className="step-label">프랙탈이 뭐야?</span>
            <span className="step-badge">1</span>
          </button>

          <button
            type="button"
            className={`main-step-btn ${activeTab === "nature" ? "active" : ""}`}
            onClick={() => setActiveTab("nature")}
          >
            <span className="step-icon">🌿</span>
            <span className="step-label">자연 속 프랙탈</span>
            <span className="step-badge">2</span>
          </button>

          <button
            type="button"
            className={`main-step-btn ${activeTab === "make" ? "active" : ""}`}
            onClick={() => setActiveTab("make")}
          >
            <span className="step-icon">✨</span>
            <span className="step-label">프랙탈 직접 만들기</span>
            <span className="step-badge">3</span>
          </button>

          <button
            type="button"
            className={`main-step-btn ${activeTab === "chat" ? "active" : ""}`}
            onClick={() => setActiveTab("chat")}
          >
            <span className="step-icon">🧚</span>
            <span className="step-label">프리에게 질문하기</span>
            <span className="step-badge">4</span>
          </button>

          <button
            type="button"
            className={`main-step-btn ${activeTab === "quiz" ? "active" : ""}`}
            onClick={() => setActiveTab("quiz")}
          >
            <span className="step-icon">🎯</span>
            <span className="step-label">퀴즈로 마무리</span>
            <span className="step-badge">5</span>
          </button>
        </div>

        {/* 탭별 콘텐츠 */}
        <div className="tab-content">
          {activeTab === "intro" && <FractalIntro />}
          {activeTab === "nature" && <NatureFractals />}
          {activeTab === "make" && (
            <ClassAuthGate>
              <MakeFractal onWorkContextChange={setWorkContext} />
            </ClassAuthGate>
          )}
          {activeTab === "chat" && <PriChat workContext={workContext} />}
          {activeTab === "quiz" && <PriQuiz />}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

export default App;
