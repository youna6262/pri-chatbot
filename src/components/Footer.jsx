import React from "react";
import "./Footer.css";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3 className="footer-title">프랙탈 요정 프리 (PRI)</h3>
          <p className="footer-description">
            패턴과 반복을 사랑하는 프랙탈 요정 프리와 함께<br/>
            합동, 대칭, 프랙탈의 아름다움을 탐구해요!
          </p>
        </div>
        
        <div className="footer-section">
          <h4 className="footer-subtitle">© {currentYear} 프랙탈 요정 프리</h4>
          <p className="footer-copyright">
            본 프로그램은 교육 목적으로 제작되었습니다.<br/>
            모든 저작권은 제작자에게 있습니다.
          </p>
        </div>
        
        <div className="footer-section">
          <h4 className="footer-subtitle">제작 정보</h4>
          <p className="footer-credits">
            개발: 서울신대림초등학교<br/>
            프랙탈 렌더링: React + Canvas API<br/>
            AI 챗봇: OpenAI GPT + Firebase Functions
          </p>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p className="footer-note">
          ✨ 이 프로그램은 초등학생을 위한 프랙탈 학습 도구입니다.
        </p>
      </div>
    </footer>
  );
}






