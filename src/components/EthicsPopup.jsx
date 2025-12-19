import React from "react";
import "./EthicsPopup.css";

export default function EthicsPopup({ onClose }) {
  return (
    <div className="ethics-popup-overlay" onClick={onClose}>
      <div className="ethics-popup" onClick={(e) => e.stopPropagation()}>
        <div className="ethics-popup-header">
          <h2>
            <span className="ethics-icon">📚</span>
            AI 저작권 윤리 교육
          </h2>
          <button className="ethics-popup-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="ethics-popup-content">
          <section className="ethics-section ethics-intro">
            <h3>
              <span className="ethics-emoji">🤔</span>
              나의 작품을 만드는데 인공지능이 도움을 주었더라면?
            </h3>
            <p className="ethics-intro-text">
              AI(인공지능)가 도와준 작품도 <strong>내가 만든 작품</strong>이에요! 
              하지만 정직하고 올바르게 사용하는 것이 중요해요.
            </p>
          </section>

          <section className="ethics-section">
            <h3>
              <span className="ethics-emoji">🎨</span>
              AI 도움을 받은 작품의 저작권
            </h3>
            <p>
              내가 직접 그린 그림이나 만든 작품에 AI가 도움을 주었다면, 
              그 작품은 여전히 <strong>나의 작품</strong>이에요!
            </p>
            <div className="ethics-tip">
              <strong>💡 예시:</strong>
              <p>
                "이 작품은 내가 직접 그렸고, AI 프리가 제목과 설명을 도와줬어요!"<br/>
                "프랙탈 바탕은 자동 생성되었지만, 그림은 내가 펜으로 직접 그렸어요!"
              </p>
            </div>
            <ul>
              <li>✨ 내가 직접 그린 부분은 <strong>나의 창작물</strong>이에요</li>
              <li>✨ AI가 도와준 부분은 솔직하게 말하기</li>
              <li>✨ AI가 제안한 내용을 그대로 베끼지 않고 내 생각을 더하기</li>
            </ul>
          </section>

          <section className="ethics-section">
            <h3>
              <span className="ethics-emoji">🤖</span>
              AI를 올바르게 사용하는 방법
            </h3>
            <p>
              AI는 도구예요. 올바르게 사용하면 창의적인 작품을 만들 수 있어요!
            </p>
            <ul>
              <li>✅ AI가 도와준 부분은 솔직하게 말하기</li>
              <li>✅ AI가 제안한 내용을 그대로 베끼지 않기</li>
              <li>✅ 내 생각과 표현을 섞어서 쓰기</li>
              <li>✅ AI의 도움을 받았어도 내 창의성이 들어가야 해요</li>
            </ul>
          </section>

          <section className="ethics-section">
            <h3>
              <span className="ethics-emoji">🤝</span>
              친구의 작품을 존중하기
            </h3>
            <p>
              친구의 작품을 보거나 공유할 때도 약속을 지켜야 해요.
            </p>
            <ul>
              <li>✨ 친구 작품을 공유할 때는 <strong>친구 이름</strong>을 함께 쓰기</li>
              <li>✨ 친구 작품을 그대로 베끼지 않기</li>
              <li>✨ 친구의 허락을 받고 공유하기</li>
              <li>✨ 친구의 작품을 칭찬하고 응원하기</li>
            </ul>
          </section>

          <section className="ethics-section ethics-pledge">
            <h3>
              <span className="ethics-emoji">✨</span>
              프리와의 약속
            </h3>
            <div className="ethics-pledge-box">
              <p>
                <strong>1. 정직</strong> - AI 도움을 솔직하게 말하기<br/>
                <strong>2. 창의성</strong> - 내 생각과 표현을 섞어 쓰기<br/>
                <strong>3. 존중</strong> - 친구 작품을 존중하고 칭찬하기<br/>
                <strong>4. 안전</strong> - 개인정보를 공유하지 않기
              </p>
            </div>
          </section>
        </div>

        <div className="ethics-popup-footer">
          <button className="ethics-popup-ok" onClick={onClose}>
            알겠어요! ✨
          </button>
        </div>
      </div>
    </div>
  );
}

