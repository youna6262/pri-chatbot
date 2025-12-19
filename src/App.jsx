import { useState, useEffect } from "react";
import PriHeader from "./components/PriHeader";
import Step1Foundation from "./components/Step1Foundation";
import { MakeFractal } from "./components/MakeFractal";
import Step3Presentation from "./components/Step3Presentation";
import ClassAuthGate from "./components/ClassAuthGate";
import ChatPanel from "./components/ChatPanel";
import Footer from "./components/Footer";
import { waitForAuthReady } from "./auth/classAuth";
import "./App.css";

function App() {
  const [currentStep, setCurrentStep] = useState(1); // 1: 바탕 만들기, 2: 그림 그리기, 3: 제목·발표 카드
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
        {/* 3단계 네비게이션 버튼 */}
        <div className="main-stepper">
          <button
            type="button"
            className={`main-step-btn ${currentStep === 1 ? "active" : ""}`}
            onClick={() => setCurrentStep(1)}
          >
            <span className="step-number">①</span>
            <span className="step-label">바탕 만들기</span>
          </button>

          <button
            type="button"
            className={`main-step-btn ${currentStep === 2 ? "active" : ""}`}
            onClick={() => setCurrentStep(2)}
          >
            <span className="step-number">②</span>
            <span className="step-label">그림 그리기</span>
          </button>

          <button
            type="button"
            className={`main-step-btn ${currentStep === 3 ? "active" : ""}`}
            onClick={() => setCurrentStep(3)}
          >
            <span className="step-number">③</span>
            <span className="step-label">제목·발표 카드</span>
          </button>
        </div>

        {/* 단계별 콘텐츠 */}
        <div className="step-content">
          {currentStep === 1 && <Step1Foundation />}
          {currentStep === 2 && (
            <ClassAuthGate>
              <MakeFractal 
                onWorkContextChange={setWorkContext}
                initialStage="draw"
                hideStepper={true}
              />
            </ClassAuthGate>
          )}
          {currentStep === 3 && <Step3Presentation workContext={workContext} />}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

export default App;
