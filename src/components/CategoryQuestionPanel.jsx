import { useState } from "react";
import "./CategoryQuestionPanel.css";

// 질문 세트 데이터
const promptSets = {
  principle: [
    { 
      question: "프랙탈에서 '반복'은 어디에서 보이나요?",
      answer: "프랙탈에서 반복은 같은 패턴이 계속 반복되는 것을 말해요. 예를 들어 나무의 큰 가지가 작은 가지로 갈라지고, 그 작은 가지도 또 작은 가지로 갈라지는 것처럼 말이에요! 🌳"
    },
    { 
      question: "'부분이 전체를 닮는' 모습은 무엇인가요?",
      answer: "부분이 전체를 닮는다는 것은 작은 부분을 보면 큰 전체와 비슷한 모양이라는 뜻이에요. 브로콜리의 작은 송이를 보면 전체 브로콜리와 비슷한 모양이에요! 🥦"
    },
    { 
      question: "단계를 올리면 왜 더 복잡해지나요?",
      answer: "단계를 올리면 같은 패턴이 더 많이 반복되기 때문이에요! 단계 1에서는 가지가 2개였다면, 단계 2에서는 각 가지마다 또 2개씩 생겨서 총 4개가 되고, 단계 3에서는 8개가 되는 식으로 복잡해져요! ✨"
    },
  ],
  title: [
    { 
      question: "작품 제목을 짧게 만드는 방법은?",
      answer: "제목은 핵심만 담아야 해요! 예를 들어 '겨울 숲의 프랙탈 나무'보다는 '겨울 숲'이나 '프랙탈 나무'처럼 간단하게 쓰는 게 좋아요. 핵심 키워드만 남기면 돼요! 🏷️"
    },
    { 
      question: "작품 설명을 쉽게 말하는 순서는?",
      answer: "1) 무엇을 그렸는지 (예: 프랙탈 나무), 2) 어떤 규칙을 사용했는지 (예: 반복), 3) 왜 그렇게 그렸는지 (예: 가지가 계속 갈라지는 모습이 좋아서) 순서로 말하면 쉬워요! 📝"
    },
    { 
      question: "규칙(반복/대칭/부분-전체 닮음) 중 어떤 걸 먼저 말하면 좋을까요?",
      answer: "가장 눈에 띄는 것부터 말하면 좋아요! 예를 들어 대칭이 뚜렷하면 대칭부터, 반복이 명확하면 반복부터 말하면 돼요. 가장 자신 있는 것부터 시작하세요! 💪"
    },
  ],
  ethics: [
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
  ],
};

/**
 * 공용 카테고리/질문 패널 컴포넌트
 * @param {Function} onQuestionClick - 질문 버튼 클릭 시 호출되는 콜백 (question, answer) => void
 * @param {string} initialCategory - 초기 선택 카테고리 ('principle' | 'title' | 'ethics')
 */
export default function CategoryQuestionPanel({ onQuestionClick, initialCategory = "principle" }) {
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  const handleQuestionClick = (promptItem) => {
    if (onQuestionClick) {
      onQuestionClick(promptItem);
    }
  };

  return (
    <div className="category-question-panel">
      {/* 카테고리 선택 UI */}
      <div className="category-tabs-container">
        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === "principle"}
          className={`category-tab ${selectedCategory === "principle" ? "active" : ""}`}
          onClick={() => setSelectedCategory("principle")}
        >
          <span className="category-icon">🔍</span>
          <span className="category-text">프랙탈 원리</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === "title"}
          className={`category-tab ${selectedCategory === "title" ? "active" : ""}`}
          onClick={() => setSelectedCategory("title")}
        >
          <span className="category-icon">🏷</span>
          <span className="category-text">제목·발표·공유</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === "ethics"}
          className={`category-tab ${selectedCategory === "ethics" ? "active" : ""}`}
          onClick={() => setSelectedCategory("ethics")}
        >
          <span className="category-icon">🤖</span>
          <span className="category-text">AI 윤리 마무리</span>
        </button>
      </div>

      {/* 선택된 카테고리의 질문 예시 */}
      <div className="question-list-section">
        <div className="question-chips">
          {promptSets[selectedCategory].map((prompt, index) => (
            <button
              key={index}
              type="button"
              className="question-chip"
              onClick={() => handleQuestionClick(prompt)}
            >
              {prompt.question}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}







