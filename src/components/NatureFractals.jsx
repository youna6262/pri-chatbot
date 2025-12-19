import React, { useMemo, useState, useEffect } from "react";
import "./NatureFractals.css";

export default function NatureFractals() {
  const items = useMemo(() => [
    {
      id: "tree",
      emoji: "🌳",
      title: "나무",
      congruent: "큰 나무 전체 모양이 작은 가지 하나의 모양과 비슷해요.",
      symmetry: "나뭇가지가 줄기 중심으로 양쪽으로 대칭되게 뻗어나가요. 왼쪽 가지와 오른쪽 가지가 거울처럼 닮았어요!",
    },
    {
      id: "snow",
      emoji: "❄️",
      title: "눈송이",
      congruent: "눈송이의 6개 가지가 모두 같은 모양(합동)이에요.",
      symmetry: "중심점을 기준으로 60도씩 돌리면 완전히 똑같은 모양! 이걸 회전 대칭이라고 해요. 또 각 가지는 선대칭도 갖고 있답니다.",
    },
    {
      id: "broccoli",
      emoji: "🥦",
      title: "브로콜리",
      congruent: "작은 송이 하나를 따서 보면, 그것도 또 더 작은 송이들로 이루어져 있어요. 전체 모양과 부분 모양이 비슷해요!",
      symmetry: "각 송이는 중심에서 사방으로 대칭되게 자라나요.",
    },
    {
      id: "shell",
      emoji: "🐚",
      title: "조개껍데기",
      congruent: "나선형으로 감길 때마다 같은 패턴이 반복돼요.",
      symmetry: "대부분의 조개껍데기는 나선의 중심선을 기준으로 대칭이에요.",
    },
    {
      id: "lightning",
      emoji: "⚡",
      title: "번개",
      congruent: "큰 번개 줄기에서 갈라지는 작은 번개들도 비슷한 모양으로 갈라져요.",
      symmetry: "완벽한 대칭은 아니지만, 가지가 나뉠 때 대칭적인 패턴을 보여요.",
    },
    {
      id: "mountain",
      emoji: "⛰️",
      title: "산맥",
      congruent: "멀리서 본 산맥의 울퉁불퉁한 모양이 가까이서 본 작은 바위의 울퉁불퉁함과 비슷해요.",
      symmetry: "산봉우리들이 골짜기를 중심으로 양쪽으로 비슷하게 솟아있어요.",
    },
  ], []);

  const [selectedCard, setSelectedCard] = useState(null);

  const openModal = (item) => {
    setSelectedCard(item);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setSelectedCard(null);
    document.body.style.overflow = '';
  };

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="natureFractalsPage">
      {/* 전체 섹션 제목 - 연한 배경 박스 */}
      <div className="natureFractalsHeader">
        <div className="natureFractalsTitle">
          <span className="natureFractalsIcon">🌏</span>
          자연은 프랙탈의 천국!
        </div>
        <div className="natureFractalsDesc">
          자연에는 프랙탈과 대칭이 가득해요. 작은 부분이 큰 부분과 닮는 모습을 찾아보세요!
        </div>
      </div>

      {/* 카드 그리드 */}
      <div className="natureFractalsGrid">
        {items.map((item, index) => (
          <article
            key={item.id}
            className="natureFractalCard"
            role="button"
            tabIndex={0}
            onClick={() => openModal(item)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openModal(item)}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {/* 이모지 아이콘 */}
            <div className="fractalCardIcon">{item.emoji}</div>

            {/* 제목 */}
            <h3 className="fractalCardTitle">{item.title}</h3>

            {/* 합동 설명 */}
            <div className="fractalCardSection">
              <div className="fractalCardSectionLabel">합동:</div>
              <div className="fractalCardSectionText">{item.congruent}</div>
            </div>

            {/* 대칭 설명 */}
            <div className="fractalCardSection">
              <div className="fractalCardSectionLabel">대칭:</div>
              <div className="fractalCardSectionText">{item.symmetry}</div>
            </div>
          </article>
        ))}
      </div>

      {/* 카드 뉴스 모달 */}
      {selectedCard && (
        <div className="natureFractalsModalOverlay" onClick={closeModal}>
          <article
            className="natureFractalsModal"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="natureFractalsModalClose" onClick={closeModal}>
              ✕
            </button>

            {/* 모달 헤더 */}
            <div className="natureFractalsModalHeader">
              <div className="natureFractalsModalIcon">{selectedCard.emoji}</div>
              <div className="natureFractalsModalBadge">자연 속 프랙탈</div>
            </div>

            {/* 모달 본문 */}
            <div className="natureFractalsModalBody">
              <h3 className="natureFractalsModalTitle">{selectedCard.title}</h3>

              {/* 합동 설명 */}
              <div className="natureFractalsModalSection">
                <div className="natureFractalsModalSectionHeader">
                  <span className="natureFractalsModalSectionIcon">🔍</span>
                  <span className="natureFractalsModalSectionLabel">합동</span>
                </div>
                <p className="natureFractalsModalSectionText">{selectedCard.congruent}</p>
              </div>

              {/* 대칭 설명 */}
              <div className="natureFractalsModalSection">
                <div className="natureFractalsModalSectionHeader">
                  <span className="natureFractalsModalSectionIcon">🪞</span>
                  <span className="natureFractalsModalSectionLabel">대칭</span>
                </div>
                <p className="natureFractalsModalSectionText">{selectedCard.symmetry}</p>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="natureFractalsModalFooter">
              <button className="natureFractalsModalCloseBtn" onClick={closeModal}>
                닫기
              </button>
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
