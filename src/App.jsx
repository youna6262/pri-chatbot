import { useState, useEffect } from "react";
import PriHeader from "./components/PriHeader";
import FractalIntro from "./components/FractalIntro";
import NatureFractals from "./components/NatureFractals";
import { MakeFractal } from "./components/MakeFractal";

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

  // ?????쒖옉 ???몄쬆 ?湲?  useEffect(() => {
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
            ?꾨옓?덉씠??
          </button>

          <button
            type="button"
            className={`tab-button ${activeTab === "nature" ? "active" : ""}`}
            onClick={() => setActiveTab("nature")}
          >
            ?먯뿰 ???꾨옓??          </button>

            <button
              type="button"
              className={`tab-button ${activeTab === "make" ? "active" : ""}`}
              onClick={() => setActiveTab("make")}
            >
              吏곸젒 留뚮뱾湲?            </button>

            <button
              type="button"
              className={`tab-button ${activeTab === "chat" ? "active" : ""}`}
              onClick={() => setActiveTab("chat")}
            >
              ?꾨━?먭쾶 吏덈Ц?섍린
            </button>

            <button
              type="button"
              className={`tab-button ${activeTab === "quiz" ? "active" : ""}`}
              onClick={() => setActiveTab("quiz")}
            >
              ?쭦?띯?截??꾨━ ?댁쫰
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
