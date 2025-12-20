import React, { useState } from "react";
import PriChat from "./PriChat";
import PriQuiz from "./PriQuiz";
import "./Step3Presentation.css";

export default function Step3Presentation({ workContext }) {
  const [activeSection, setActiveSection] = useState("chat"); // "chat" or "quiz"

  return (
    <div className="step3-presentation">
      <div className="step3-tabs">
        <button
          type="button"
          className={`step3-tab ${activeSection === "chat" ? "active" : ""}`}
          onClick={() => setActiveSection("chat")}
        >
          <span className="tab-icon">🧚</span>
          <span className="tab-text">프리에게 질문하기</span>
        </button>
        <button
          type="button"
          className={`step3-tab ${activeSection === "quiz" ? "active" : ""}`}
          onClick={() => setActiveSection("quiz")}
        >
          <span className="tab-icon">🎯</span>
          <span className="tab-text">퀴즈로 마무리</span>
        </button>
      </div>

      <div className="step3-content">
        {activeSection === "chat" && <PriChat workContext={workContext} />}
        {activeSection === "quiz" && <PriQuiz />}
      </div>
    </div>
  );
}







