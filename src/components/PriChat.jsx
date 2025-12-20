import { useState, useRef, useEffect } from "react";
import { PRI_SYSTEM_PROMPT } from "../constants/priSystemPrompt";
import { chatPri } from "../api/chatPri";
import { auth } from "../firebase/firebaseApp";
import { onAuthStateChanged } from "firebase/auth";
import CategoryQuestionPanel from "./CategoryQuestionPanel";
import "./PriChat.css";

// ✅ workContext를 props로 받음 (없어도 동작)
function PriChat({ workContext }) {
  const [messages, setMessages] = useState([]);

  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pledges, setPledges] = useState({
    honest: false,   // 정직
    myWords: false,  // 내 말
    respect: false,  // 존중
    safe: false,     // 안전
  });
  const [keywords, setKeywords] = useState([]); // 최대 2개
  const keywordOptions = ["반복", "대칭", "부분-전체"];
  const [finalTitle, setFinalTitle] = useState(workContext?.title || "");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // 입력창 숨김 여부 (특정 화면에서는 true로 설정)
  const hideInput = true; // 해당 화면에서는 true

  // 인증 상태 확인
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      if (!user) {
        setError("로그인이 필요해요. 먼저 학급에 입장해주세요! 🔐");
      } else {
        setError("");
      }
    });
    return () => unsubscribe();
  }, []);

  const togglePledge = (key) => {
    setPledges((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleKeyword = (kw) => {
    setKeywords((prev) => {
      if (prev.includes(kw)) return prev.filter((x) => x !== kw);
      if (prev.length >= 2) return prev; // ✅ 2개 제한
      return [...prev, kw];
    });
  };

  const allPledgesChecked = Object.values(pledges).every(Boolean);
  const keywordsOk = keywords.length === 2;
  const titleOk = finalTitle.trim().length > 0;
  const canFinish = allPledgesChecked && keywordsOk && titleOk;

  const finishLesson = () => {
    if (!canFinish) return;

    const record =
      `📝 오늘의 수업 기록\n` +
      `- 작품 제목: ${finalTitle.trim()}\n` +
      `- 오늘 배운 키워드(2개): ${keywords.join(", ")}\n` +
      `- 약속: 정직/내 말/존중/안전 ✅\n` +
      `\n마무리: 다음엔 같은 PRI로 친구와 다른 그림도 그려보자!`;

    const botMessage = {
      id: Date.now() + 999,
      role: "bot",
      text: `프리: 수업 마무리 완료! 🎉\n\n${record}`,
    };

    setMessages((prev) => [...prev, botMessage]);
  };

  const handleQuestionClick = async (promptItem) => {
    const questionText = promptItem.question;
    const answerText = promptItem.answer;
    
    // 사용자 메시지 추가
    const userMessage = {
      id: Date.now(),
      role: "user",
      text: questionText,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue(""); // 입력창 초기화
    setError("");
    
    // 미리 정의된 답변이 있으면 바로 표시
    if (answerText) {
      setLoading(true);
      setTimeout(() => {
        const botMessage = {
          id: Date.now() + 1,
          role: "bot",
          text: answerText,
        };
        setMessages((prev) => [...prev, botMessage]);
        setLoading(false);
      }, 500);
    } else {
      // API 호출이 필요한 경우
      setLoading(true);
      try {
        if (!isAuthenticated || !auth.currentUser) {
          setError("로그인이 필요해요. 먼저 학급에 입장해주세요! 🔐");
          setLoading(false);
          return;
        }

        const history = messages.slice(-10).map(m => ({
          role: m.role === "bot" ? "assistant" : "user",
          content: m.text,
        }));

        const res = await chatPri({
          question: questionText,
          history,
          workContext: workContext ? {
            title: workContext.title,
            pri: workContext.pri,
            type: workContext.type,
            depth: workContext.depth,
            strokeSummary: workContext.strokeSummary,
          } : undefined,
        });

        const responseText = res.data?.shortAnswer || res.data?.raw || res.data?.text || res.data || "음... 잠깐만 생각해볼게! 🧚";
        const botMessage = {
          id: Date.now() + 1,
          role: "bot",
          text: responseText,
        };
        setMessages((prev) => [...prev, botMessage]);
      } catch (err) {
        console.error("❌ chatPri error:", err);
        const fallbackAnswer = getFallbackAnswer(questionText);
        const botMessage = {
          id: Date.now() + 1,
          role: "bot",
          text: fallbackAnswer,
        };
        setMessages((prev) => [...prev, botMessage]);
      } finally {
        setLoading(false);
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setFinalTitle(workContext?.title || "");
  }, [workContext]);

  // 폴백 답변 생성 함수 (API 연결 실패 시 사용)
  const getFallbackAnswer = (input) => {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes("반복") || lowerInput.includes("반복")) {
      return "반복은 같은 패턴이 계속 반복되는 것을 말해요! 프랙탈에서는 큰 가지가 작은 가지로 갈라지고, 그 작은 가지도 또 작은 가지로 갈라지는 것처럼 말이에요! 🌳";
    } else if (lowerInput.includes("대칭")) {
      return "대칭은 좌우나 상하가 거울처럼 닮은 모양을 말해요! 눈송이는 6방향 대칭을 가지고 있고, 나무는 중심선을 기준으로 좌우가 대칭이에요! ❄️";
    } else if (lowerInput.includes("부분") || lowerInput.includes("전체") || lowerInput.includes("닮")) {
      return "부분이 전체를 닮는다는 것은 작은 부분을 보면 큰 전체와 비슷한 모양이라는 뜻이에요. 브로콜리의 작은 송이를 보면 전체 브로콜리와 비슷한 모양이에요! 🥦";
    } else if (lowerInput.includes("제목") || lowerInput.includes("이름")) {
      return "제목은 핵심만 담아야 해요! 예를 들어 '겨울 숲의 프랙탈 나무'보다는 '겨울 숲'처럼 간단하게 쓰는 게 좋아요! 🏷️";
    } else if (lowerInput.includes("발표") || lowerInput.includes("설명")) {
      return "발표는 1) 무엇을 그렸는지, 2) 어떤 규칙을 사용했는지, 3) 왜 그렇게 그렸는지 순서로 말하면 쉬워요! 📝";
    } else if (lowerInput.includes("프랙탈")) {
      return "프랙탈은 작은 부분이 큰 전체와 닮은 특별한 도형이에요! 나무, 눈송이, 브로콜리처럼 자연에 많이 있어요! 🌍";
    } else if (lowerInput.includes("합동")) {
      return "합동은 모양과 크기가 똑같은 도형을 말해요! 프랙탈에서는 같은 패턴이 반복되면서 합동인 도형들이 만들어져요! ✨";
    } else {
      return "좋은 질문이에요! 프랙탈과 대칭에 대해 더 알아보고 싶으시군요. 위의 질문 버튼을 클릭하면 더 자세한 답변을 볼 수 있어요! 🧚✨";
    }
  };

  const handleSend = async () => {
    const userInput = inputValue.trim();
    if (userInput === "" || loading) return;

    // 인증 확인
    if (!isAuthenticated || !auth.currentUser) {
      setError("로그인이 필요해요. 먼저 학급에 입장해주세요! 🔐");
      return;
    }

    // 사용자 메시지 추가
    const userMessage = {
      id: Date.now(),
      role: "user",
      text: userInput,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setError("");
    setLoading(true);

    try {
      // 히스토리 준비 (최근 10개)
      const history = messages.slice(-10).map(m => ({
        role: m.role === "bot" ? "assistant" : "user",
        content: m.text,
      }));

      console.log("📤 chatPri 호출:", { 
        question: userInput, 
        hasHistory: history.length > 0,
        hasWorkContext: !!workContext 
      });

      // API 호출
      const res = await chatPri({
        question: userInput,
        history,
        workContext: workContext ? {
          title: workContext.title,
          pri: workContext.pri,
          type: workContext.type,
          depth: workContext.depth,
          strokeSummary: workContext.strokeSummary,
        } : undefined,
      });

      console.log("✅ chatPri 응답:", res);

      // 봇 응답 추가
      // 새로운 응답 형식 지원 (shortAnswer 우선, 없으면 raw 또는 text)
      const responseText = res.data?.shortAnswer || res.data?.raw || res.data?.text || res.data || "음... 잠깐만 생각해볼게! 🧚";
      const botMessage = {
        id: Date.now() + 1,
        role: "bot",
        text: responseText,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error("❌ chatPri error:", err);
      console.error("Error details:", {
        code: err?.code,
        message: err?.message,
        details: err?.details,
        stack: err?.stack
      });
      
      // HttpsError의 경우 상세 정보 추출
      let errorMessage = "앗! 프리가 잠시 바빠서 답변을 못했어요. 😅\n잠시 후 다시 시도해주세요!";
      let fallbackAnswer = null;
      
      if (err?.code) {
        // Firebase Functions의 HttpsError
        if (err.code === "internal" || err.code === "functions/internal") {
          errorMessage = "앗! 프리가 잠시 바빠서 답변을 못했어요. 😅\n잠시 후 다시 시도해주세요!";
          // 폴백: 간단한 키워드 기반 답변 제공
          fallbackAnswer = getFallbackAnswer(userInput);
        } else if (err.code === "unauthenticated") {
          errorMessage = "로그인이 필요해요. 먼저 학급에 입장해주세요! 🔐";
        } else if (err.code === "permission-denied") {
          errorMessage = "학급 인증이 필요해요. 다시 로그인해주세요! 🔐";
        } else if (err.code === "failed-precondition") {
          errorMessage = "OpenAI API 키가 설정되지 않았어요. 관리자에게 문의하세요! 🔑";
          // 폴백 답변 제공
          fallbackAnswer = getFallbackAnswer(userInput);
        } else if (err.code === "unavailable" || err.code === "deadline-exceeded") {
          errorMessage = "연결이 불안정해요. 잠시 후 다시 시도해주세요! 🌐";
          fallbackAnswer = getFallbackAnswer(userInput);
        } else if (err.message) {
          errorMessage = `앗! ${err.message}`;
          fallbackAnswer = getFallbackAnswer(userInput);
        }
      } else if (err?.message) {
        // 네트워크 에러나 기타 에러
        if (err.message.includes("network") || err.message.includes("fetch") || err.message.includes("Connection")) {
          errorMessage = "인터넷 연결을 확인해주세요. 🌐\n연결이 안 되면 위의 질문 버튼을 클릭해보세요!";
          fallbackAnswer = getFallbackAnswer(userInput);
        } else {
          errorMessage = `앗! ${err.message}`;
          fallbackAnswer = getFallbackAnswer(userInput);
        }
      }
      
      setError(errorMessage);
      
      // 폴백 답변이 있으면 표시
      if (fallbackAnswer) {
        const botFallbackMessage = {
          id: Date.now() + 1,
          role: "bot",
          text: `⚠️ API 연결에 문제가 있어서 간단한 답변을 드릴게요:\n\n${fallbackAnswer}\n\n더 자세한 답변을 원하시면 위의 질문 버튼을 클릭해보세요! 🧚`,
        };
        setMessages((prev) => [...prev, botFallbackMessage]);
      } else {
        // 에러 메시지도 채팅에 표시
        const botErrorMessage = {
          id: Date.now() + 1,
          role: "bot",
          text: errorMessage,
        };
        setMessages((prev) => [...prev, botErrorMessage]);
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ React에선 onKeyDown 권장
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="pri-chat-wrapper">
      {/* 채팅 */}
      <div className="pri-chat">
        <div className="chat-header">
          <h2 className="chat-title">프랙탈 요정 프리 🧚</h2>
        </div>

        {/* 공용 카테고리/질문 패널 */}
        <CategoryQuestionPanel 
          onQuestionClick={handleQuestionClick}
          initialCategory="principle"
        />

        {/* 프리 안내 문구 - 카테고리/질문 카드 아래에 1회만 표시 */}
        <div className="pri-intro-message">
          <p className="intro-text">
            안녕! 나는 프랙탈 요정 프리야 ✨<br />
            프랙탈 원리, 제목·  발표 · 공유, AI 윤리에 대해 물어보고 싶은 게 있으면 위 질문 버튼을 클릭해봐! 🧚
          </p>
        </div>

        <div className="chat-messages">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.role === "user" ? "user-message" : "bot-message"}`}
            >
              <div className="message-content">
                {message.role === "bot" && <span className="bot-icon">🧚</span>}
                <span className="message-text">{message.text}</span>
                {message.role === "user" && <span className="user-icon">👤</span>}
              </div>
            </div>
          ))}
          {loading && (
            <div className="message bot-message">
              <div className="message-content">
                <span className="bot-icon">🧚</span>
                <span className="message-text typing-indicator-text">
                  <span className="typing-dots">
                    <span></span><span></span><span></span>
                  </span>
                  프리가 생각 중이야... ✨
                </span>
              </div>
            </div>
          )}
          {error && (
            <div className="chat-error-message">
              ⚠️ {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 입력창 - 조건부 렌더링으로 숨김 */}
        {!hideInput && (
          <div className="chat-input-container">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="직접 질문하기... ✨"
              className="chat-input"
              disabled={loading}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={loading || !inputValue.trim()}
              className="chat-send-btn"
            >
              전송
            </button>
          </div>
        )}
      </div>

      {/* 약속 체크박스 + 마무리 */}
      <div className="ethics-finish">
        <div className="ethics-title">오늘의 약속 4개 ✅</div>

        <label className="ethics-item">
          <input
            type="checkbox"
            checked={pledges.honest}
            onChange={() => togglePledge("honest")}
          />
          <span><b>정직</b> : AI 도움을 받았으면 "도움 받았어요"라고 말하기</span>
        </label>

        <label className="ethics-item">
          <input
            type="checkbox"
            checked={pledges.myWords}
            onChange={() => togglePledge("myWords")}
          />
          <span><b>내 말</b> : 프리 답을 그대로 복사하지 않고 내 말로 바꾸기</span>
        </label>

        <label className="ethics-item">
          <input
            type="checkbox"
            checked={pledges.respect}
            onChange={() => togglePledge("respect")}
          />
          <span><b>존중</b> : 친구 작품은 허락받고, 출처를 말하기</span>
        </label>

        <label className="ethics-item">
          <input
            type="checkbox"
            checked={pledges.safe}
            onChange={() => togglePledge("safe")}
          />
          <span><b>안전</b> : 이름/전화번호/주소 같은 개인정보는 올리지 않기</span>
        </label>

        <button
          type="button"
          className={`finish-btn ${canFinish ? "on" : ""}`}
          disabled={!canFinish}
          onClick={finishLesson}
        >
          수업 마무리 완료 🎉
        </button>
      </div>
    </div>
  );
}

export default PriChat;
