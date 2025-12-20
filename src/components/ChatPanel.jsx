import React, { useState, useEffect, useRef, useMemo } from "react";
import { chatPri } from "../api/chatPri";
import CategoryQuestionPanel from "./CategoryQuestionPanel";
import "./ChatPanel.css";

export default function ChatPanel({ workContext, strokeSummary, onClose }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "안녕! 나는 프랙탈 요정 프리야 ✨\n프랙탈 원리, 제목·  발표 · 공유, AI 윤리에 대해 물어보고 싶은 게 있으면 위 질문 버튼을 클릭해봐! 🧚" },
  ]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);

  const history = useMemo(
    () => messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
    [messages]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(content) {
    // 자유 입력 기능 완전 비활성화 - 정해진 질문 버튼만 사용 가능
    console.log("자유 입력은 비활성화되어 있습니다. 정해진 질문 버튼을 사용해주세요.");
    return;
    const userMsg = content.trim();
    if (!userMsg || loading) return;

    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setText("");
    setError("");
    setLoading(true);

    try {
      console.log("📤 ChatPanel chatPri 호출:", { 
        question: userMsg, 
        hasHistory: history.length > 0,
        hasWorkContext: !!workContext 
      });

      const res = await chatPri({
        question: userMsg,
        history,
        workContext: {
          title: workContext?.title,
          pri: workContext?.pri,
          type: workContext?.type,
          depth: workContext?.depth,
          strokeSummary,
        },
      });

      console.log("✅ ChatPanel chatPri 응답:", res);

      // 새로운 응답 형식 지원 (shortAnswer 우선, 없으면 raw 또는 text)
      const responseText = res.data?.shortAnswer || res.data?.raw || res.data?.text || res.data || "음... 잠깐만 생각해볼게! 🧚";
      setMessages(prev => [...prev, { role: "assistant", content: responseText }]);
    } catch (e) {
      console.error("❌ ChatPanel chatPri error:", e);
      console.error("Error details:", {
        code: e?.code,
        message: e?.message,
        details: e?.details,
        stack: e?.stack
      });
      
      // HttpsError의 경우 상세 정보 추출
      let errorMessage = "앗! 프리가 잠시 바빠서 답변을 못했어요. 😅\n잠시 후 다시 시도해주세요!";
      
      if (e?.code) {
        // Firebase Functions의 HttpsError
        if (e.code === "internal" || e.code === "functions/internal") {
          errorMessage = "앗! 프리가 잠시 바빠서 답변을 못했어요. 😅\n잠시 후 다시 시도해주세요!";
        } else if (e.code === "unauthenticated") {
          errorMessage = "로그인이 필요해요. 먼저 학급에 입장해주세요! 🔐";
        } else if (e.code === "permission-denied") {
          errorMessage = "학급 인증이 필요해요. 다시 로그인해주세요! 🔐";
        } else if (e.code === "failed-precondition") {
          errorMessage = "OpenAI API 키가 설정되지 않았어요. 관리자에게 문의하세요! 🔑";
        } else if (e.message) {
          errorMessage = `앗! ${e.message}`;
        }
      } else if (e?.message) {
        errorMessage = `앗! ${e.message}`;
      }
      
      setError(errorMessage);
      
      // 에러 메시지도 채팅에 표시
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: errorMessage 
      }]);
    } finally {
      setLoading(false);
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(text);
    }
  };

  const handleQuestionClick = (promptItem) => {
    const questionText = promptItem.question;
    const answerText = promptItem.answer;
    
    // 사용자 메시지 추가
    const userMessage = {
      role: "user",
      content: questionText,
    };
    setMessages(prev => [...prev, userMessage]);
    
    // 봇 답변 추가
    setTimeout(() => {
      const botMessage = {
        role: "assistant",
        content: answerText,
      };
      setMessages(prev => [...prev, botMessage]);
    }, 500);
  };

  return (
    <div className="chatDrawer">
      <div className="chatHeader">
        <h3>🧚 프리에게 질문하기</h3>
        <button onClick={onClose} className="closeBtn">✕</button>
      </div>

      {/* 공용 카테고리/질문 패널 */}
      <CategoryQuestionPanel 
        onQuestionClick={handleQuestionClick}
        initialCategory="ethics"
      />

      <div className="chatMsgs">
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="bubble assistant">
            <span className="typing-indicator">
              <span></span><span></span><span></span>
            </span>
            프리가 생각 중이야... ✨
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && <div className="chatError">{error}</div>}

      <div className="chatInputRow" style={{ display: 'none' }}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="프리에게 질문하기... ✨"
          disabled={true}
        />
        <button onClick={() => send(text)} disabled={true}>
          전송
        </button>
      </div>
    </div>
  );
}

