import { useState } from "react";
import "./PriQuiz.css";

const quizData = [
  {
    id: 1,
    category: "프랙탈 원리",
    question: "프랙탈의 가장 중요한 특징은 무엇일까요?",
    options: [
      "크기가 매우 작다",
      "부분이 전체와 비슷한 모양이다 (자기유사성)",
      "항상 대칭이다",
      "색깔이 화려하다"
    ],
    correct: 1,
    explanation: "프랙탈의 핵심은 자기유사성이에요! 부분을 확대하면 전체와 비슷한 패턴이 반복돼요. 🌿"
  },
  {
    id: 2,
    category: "프랙탈 원리",
    question: "자연에서 프랙탈을 찾을 수 있는 곳은?",
    options: [
      "나뭇가지",
      "눈송이",
      "해안선",
      "모두 맞아요!"
    ],
    correct: 3,
    explanation: "자연 속 곳곳에서 프랙탈을 발견할 수 있어요! 나뭇가지, 눈송이, 해안선 모두 프랙탈 구조랍니다. 🌲❄️🌊"
  },
  {
    id: 3,
    category: "AI 윤리",
    question: "AI가 만든 그림의 저작권은 누구에게 있을까요?",
    options: [
      "AI 자체에게",
      "AI를 만든 회사에게",
      "아직 명확하지 않아요",
      "누구나 자유롭게 사용 가능"
    ],
    correct: 2,
    explanation: "AI 저작권은 아직 법적으로 논란 중이에요. 나라마다 다르고, 계속 변화하고 있답니다. 🤔⚖️"
  },
  {
    id: 4,
    category: "AI 윤리",
    question: "AI를 사용할 때 가장 중요한 태도는?",
    options: [
      "무조건 AI만 믿기",
      "AI를 절대 사용하지 않기",
      "AI의 답을 비판적으로 생각하고 확인하기",
      "AI를 친구처럼 대하기"
    ],
    correct: 2,
    explanation: "AI는 훌륭한 도구지만 실수할 수도 있어요. 항상 비판적으로 생각하고 확인하는 자세가 중요해요! 💡"
  },
  {
    id: 5,
    category: "프랙탈 원리",
    question: "프랙탈을 만들 때 '깊이(단계)'를 높이면 어떻게 될까요?",
    options: [
      "더 단순해진다",
      "더 복잡하고 세밀해진다",
      "색깔이 바뀐다",
      "크기가 커진다"
    ],
    correct: 1,
    explanation: "깊이를 높일수록 패턴이 더 많이 반복되어 복잡하고 세밀한 모양이 만들어져요! 🌸"
  },
  {
    id: 6,
    category: "AI 윤리",
    question: "다른 사람의 작품을 AI에 학습시켜 비슷한 그림을 만드는 것, 어떻게 생각하나요?",
    options: [
      "아무 문제 없다",
      "원작자의 허락이 필요하다",
      "절대 하면 안 된다",
      "돈을 주면 괜찮다"
    ],
    correct: 1,
    explanation: "다른 사람의 창작물을 존중하는 것이 중요해요. 원작자의 동의와 출처 표기가 필요하답니다! 🎨✨"
  }
];

function PriQuiz() {
  const [currentQuiz, setCurrentQuiz] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  const quiz = quizData[currentQuiz];

  const handleAnswer = (index) => {
    if (showExplanation) return; // 이미 답변한 경우
    
    setSelectedAnswer(index);
    setShowExplanation(true);
    
    if (index === quiz.correct) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentQuiz < quizData.length - 1) {
      setCurrentQuiz(currentQuiz + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setCompleted(true);
    }
  };

  const handleRestart = () => {
    setCurrentQuiz(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setCompleted(false);
  };

  if (completed) {
    const percentage = Math.round((score / quizData.length) * 100);
    let message = "";
    let emoji = "";
    
    if (percentage >= 80) {
      message = "완벽해요! 🎉";
      emoji = "🌟";
    } else if (percentage >= 60) {
      message = "잘했어요! 👏";
      emoji = "✨";
    } else {
      message = "조금 더 공부해볼까요? 💪";
      emoji = "🌱";
    }

    return (
      <div className="pri-quiz">
        <div className="quiz-complete">
          <div className="complete-emoji">{emoji}</div>
          <h2 className="complete-title">{message}</h2>
          <div className="complete-score">
            <span className="score-number">{score}</span>
            <span className="score-total"> / {quizData.length}</span>
          </div>
          <p className="complete-percentage">{percentage}% 정답률</p>
          
          <div className="complete-message">
            <p>프랙탈과 AI 윤리에 대해 배웠어요!</p>
            <p>이제 프리와 함께 더 깊이 탐험해볼까요? 🧚‍♀️</p>
          </div>
          
          <div className="complete-buttons">
            <button className="btn-restart" onClick={handleRestart}>
              🔄 다시 도전하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pri-quiz">
      <div className="quiz-header">
        <div className="quiz-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${((currentQuiz + 1) / quizData.length) * 100}%` }}
            />
          </div>
          <span className="progress-text">
            {currentQuiz + 1} / {quizData.length}
          </span>
        </div>
        
        <div className="quiz-category">
          <span className="category-badge">{quiz.category}</span>
        </div>
      </div>

      <div className="quiz-content">
        <div className="quiz-mascot">🧚‍♀️</div>
        
        <h2 className="quiz-question">{quiz.question}</h2>
        
        <div className="quiz-options">
          {quiz.options.map((option, index) => {
            let className = "option-card";
            
            if (showExplanation) {
              if (index === quiz.correct) {
                className += " correct";
              } else if (index === selectedAnswer && index !== quiz.correct) {
                className += " incorrect";
              } else {
                className += " disabled";
              }
            } else if (selectedAnswer === index) {
              className += " selected";
            }
            
            return (
              <button
                key={index}
                className={className}
                onClick={() => handleAnswer(index)}
                disabled={showExplanation}
              >
                <span className="option-number">{index + 1}</span>
                <span className="option-text">{option}</span>
                {showExplanation && index === quiz.correct && (
                  <span className="option-icon">✅</span>
                )}
                {showExplanation && index === selectedAnswer && index !== quiz.correct && (
                  <span className="option-icon">❌</span>
                )}
              </button>
            );
          })}
        </div>
        
        {showExplanation && (
          <div className="quiz-explanation">
            <div className="explanation-content">
              <span className="explanation-icon">💡</span>
              <p>{quiz.explanation}</p>
            </div>
            
            <button className="btn-next" onClick={handleNext}>
              {currentQuiz < quizData.length - 1 ? "다음 문제 →" : "결과 보기 🎯"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PriQuiz;






