import React, { useEffect, useMemo, useRef, useState } from "react";
import "./DrawStage.css";

/**
 * DrawStage
 * - 2개 레이어 캔버스 구조 (프랙탈 배경 + 그림 오버레이)
 * - ResizeObserver로 자동 리사이즈
 * - DPR 고려한 픽셀 정확도
 * - pointer-events로 레이어 분리
 */
export default function DrawStage({ 
  fractalDataUrl, 
  fractalCanvasRef,
  drawCanvasRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  className = "",
}) {
  const wrapRef = useRef(null);
  const bgRef = useRef(null);     // 프랙탈(배경) 캔버스
  const drawRef = useRef(null);   // 그림(오버레이) 캔버스

  const [size, setSize] = useState({ w: 0, h: 0 });

  // 외부 ref와 내부 ref 동기화
  useEffect(() => {
    if (fractalCanvasRef) {
      fractalCanvasRef.current = bgRef.current;
    }
  }, [fractalCanvasRef]);

  useEffect(() => {
    if (drawCanvasRef) {
      drawCanvasRef.current = drawRef.current;
    }
  }, [drawCanvasRef]);

  // 컨테이너 크기 따라 캔버스 리사이즈
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setSize({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 캔버스 실제 픽셀(dpr) 맞추기
  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;

    const setup = (c) => {
      if (!c || !size.w || !size.h) return;
      c.width = Math.floor(size.w * dpr);
      c.height = Math.floor(size.h * dpr);
      c.style.width = `${size.w}px`;
      c.style.height = `${size.h}px`;
      const ctx = c.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return ctx;
    };

    const bgCtx = setup(bgRef.current);
    const drawCtx = setup(drawRef.current);

    // (선택) 드로잉 기본 세팅
    if (drawCtx) {
      drawCtx.lineCap = "round";
      drawCtx.lineJoin = "round";
      drawCtx.lineWidth = 3;
    }

    // 배경 프랙탈 그리기: dataUrl(이미지)로 예시
    if (bgCtx && fractalDataUrl) {
      bgCtx.clearRect(0, 0, size.w, size.h);
      const img = new Image();
      img.onload = () => {
        // 가운데 맞추기(필요 시 contain/cover로 조정)
        bgCtx.clearRect(0, 0, size.w, size.h);
        bgCtx.drawImage(img, 0, 0, size.w, size.h);
      };
      img.src = fractalDataUrl;
    }
  }, [size.w, size.h, fractalDataUrl]);

  // 포인터 이벤트 핸들러 래핑 (내부 ref 사용)
  const handlePointerDown = (e) => {
    if (onPointerDown) {
      // 이벤트 객체를 그대로 전달 (drawRef.current는 이미 설정됨)
      onPointerDown(e);
    }
  };

  const handlePointerMove = (e) => {
    if (onPointerMove) {
      onPointerMove(e);
    }
  };

  const handlePointerUp = (e) => {
    if (onPointerUp) {
      onPointerUp(e);
    }
  };

  const handlePointerCancel = (e) => {
    if (onPointerCancel) {
      onPointerCancel(e);
    } else if (onPointerUp) {
      onPointerUp(e);
    }
  };

  return (
    <div className={`draw-wrap ${className}`} ref={wrapRef}>
      {/* 프랙탈 = 아래 레이어 */}
      <canvas className="layer layer-bg" ref={bgRef} />

      {/* 그림 = 위 레이어(이 캔버스가 모든 포인터 이벤트를 받음) */}
      <canvas
        className="layer layer-draw"
        ref={drawRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      />
    </div>
  );
}

