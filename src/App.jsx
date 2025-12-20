import { useState, useEffect } from "react";
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
        {/* 5개 메뉴 탭 - 동화책 파스텔 스티커 스타일 */}
        <FractalTopNav
          activeKey={activeTab === "intro" ? "what" : 
                    activeTab === "nature" ? "nature" :
                    activeTab === "make" ? "make" :
                    activeTab === "chat" ? "ask" :
                    activeTab === "quiz" ? "quiz" : "what"}
          onSelect={(key) => {
            if (key === "what") setActiveTab("intro");
            else if (key === "nature") setActiveTab("nature");
            else if (key === "make") setActiveTab("make");
            else if (key === "ask") setActiveTab("chat");
            else if (key === "quiz") setActiveTab("quiz");
          }}
        />

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
