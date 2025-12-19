import { useState } from 'react';
import './PriHeader.css'
import EthicsPopup from './EthicsPopup';

export default function PriHeader({ onOpenChat }) {
  const [showEthicsPopup, setShowEthicsPopup] = useState(false);
  return (
    <div className="pri-header-wrapper">
      <div className="pri-header-container">
        <div className="pri-header-banner">
          {/* 왼쪽 캐릭터 */}
          <div className="pri-header-character">
            <img
              src="/images/pri-fairy.png"
              alt="프리"
              className="pri-header-img"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
            <span className="pri-header-emoji">✨</span>
          </div>

          {/* 가운데 텍스트 */}
          <div className="pri-header-text">
            <h1 className="pri-header-title">
              프랙탈 요정 프리와 떠나는 <span className="nowrap">패턴탐험</span>
            </h1>
            <p className="pri-header-subtitle">
              Pattern, Repeat, Idea의 줄임말
            </p>
            <p className="pri-header-description">
              나는 패턴과 반복을 사랑하는 프랙탈 요정 프리야. 네가 만든 도형 속에서
              합동과 대칭, 그리고 프랙탈 패턴을 같이 찾아볼게!
            </p>
          </div>

          {/* 오른쪽 버튼 */}
          <div className="pri-header-button-wrapper">
            <button type="button" className="pri-header-button pri-header-button-chat" onClick={onOpenChat}>
              🧚 프리에게 질문하기
            </button>
            <button 
              type="button" 
              className="pri-header-button"
              onClick={() => setShowEthicsPopup(true)}
            >
              {/* 작은 컬러 아이콘 */}
              <span className="pri-header-icon-group">
                <span className="pri-header-icon pri-header-icon-green" />
                <span className="pri-header-icon pri-header-icon-pink" />
                <span className="pri-header-icon pri-header-icon-blue" />
                <span className="pri-header-icon pri-header-icon-orange" />
              </span>
              AI 저작권 윤리 교육
            </button>
          </div>
        </div>
      </div>
      {showEthicsPopup && (
        <EthicsPopup onClose={() => setShowEthicsPopup(false)} />
      )}
    </div>
  );
}

