import { useState, useEffect } from "react";
import PriHeader from "./components/PriHeader";
import FractalIntro from "./components/FractalIntro";
import NatureFractals from "./components/NatureFractals";
import MakeFractal from "./components/MakeFractal";


import PriQuiz from "./components/PriQuiz";
import PriChat from "./components/PriChat";
import ClassAuthGate from "./components/ClassAuthGate";
import ChatPanel from "./components/ChatPanel";
import TeacherDashboard from "./components/TeacherDashboard";
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
        <div className="tabs">
          <button
            type="button"
            className={`tab-button ${activeTab === "intro" ? "active" : ""}`}
            onClick={() => setActiveTab("intro")}
          >
            프랙탈이 뭐야?
          </button>

          <button
            type="button"
            className={`tab-button ${activeTab === "nature" ? "active" : ""}`}
            onClick={() => setActiveTab("nature")}
          >
            자연 속 프랙탈
          </button>

            <button
              type="button"
              className={`tab-button ${activeTab === "make" ? "active" : ""}`}
              onClick={() => setActiveTab("make")}
            >
              프랙탈 직접 만들기
            </button>

            <button
              type="button"
              className={`tab-button ${activeTab === "chat" ? "active" : ""}`}
              onClick={() => setActiveTab("chat")}
            >
              프리에게 질문하기
            </button>

            <button
              type="button"
              className={`tab-button ${activeTab === "quiz" ? "active" : ""}`}
              onClick={() => setActiveTab("quiz")}
            >
              퀴즈로 마무리
            </button>
        </div>

          <div className="tab-content">
            {activeTab === "intro" && <FractalIntro />}
            {activeTab === "nature" && <NatureFractals />}
            {activeTab === "make" && (
              <ClassAuthGate>
                <MakeFractal onWorkContextChange={setWorkContext} />
              </ClassAuthGate>
            )}
            {activeTab === "quiz" && <PriQuiz />}
            {activeTab === "chat" && <PriChat />}
          </div>
      </main>
      
      <Footer />
    </div>
  );
}

export default App;
