import React, { useState, useEffect, useRef, useMemo } from "react";
import { chatPri } from "../api/chatPri";
import "./ChatPanel.css";

// AI 윤리 마무리 질문 세트 (3번째 메뉴)
const ethicsPrompts = [
  { 
    question: "AI 도움을 정직하게 말하는 방법은?",
    answer: "'프리에게 질문해서 도움을 받았어요' 또는 'AI의 도움을 받아서 더 좋은 작품을 만들었어요'처럼 솔직하게 말하면 돼요! 정직하게 말하는 것이 가장 중요해요! ✅"
  },
  { 
    question: "친구 작품을 공유할 때 지켜야 할 약속은?",
    answer: "1) 친구에게 먼저 허락을 받기, 2) 출처를 명확히 밝히기 (예: '이 작품은 친구 ○○이가 그렸어요') 이 두 가지를 지키면 돼요! 존중하는 마음이 중요해요! 🤝"
  },
  { 
    question: "AI가 말한 설명을 그대로 쓰면 왜 안 좋을까요?",
    answer: "AI의 설명을 그대로 쓰면 내 생각이 아닌 기계의 생각이 되어버려요. 예를 들어 '프랙탈은 반복되는 패턴이다'라는 설명을 '내 작품에는 가지가 계속 갈라지는 반복이 있어요'처럼 내 말로 바꿔야 해요! ✍️"
  },
];

export default function ChatPanel({ workContext, strokeSummary, onClose }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "안녕! 나는 프랙탈 요정 프리야 ✨\nAI 윤리에 대해 물어보고 싶은 게 있으면 아래 질문 버튼을 클릭해봐! 🧚" },
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

  const handlePromptClick = (promptItem) => {
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

      {/* AI 윤리 마무리 질문 버튼들 */}
      <div className="chatPromptsSection">
        <div className="chatPromptsTitle">🤝 AI 윤리 마무리</div>
        <div className="chatPromptsContainer">
          {ethicsPrompts.map((prompt, index) => (
            <button
              key={index}
              type="button"
              className="chatPromptButton"
              onClick={() => handlePromptClick(prompt)}
            >
              {prompt.question}
            </button>
          ))}
        </div>
      </div>

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

