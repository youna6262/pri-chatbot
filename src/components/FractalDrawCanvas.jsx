import React, { useEffect, useRef, useState } from "react";
import "./FractalDrawCanvas.css";

/**
 * FractalDrawCanvas
 * - bgCanvas: 프랙탈을 그리는(또는 이미지로 깔리는) 배경 캔버스
 * - drawCanvas: 투명 레이어(위)에서만 그리기
 *
 * ✅ 해결 포인트
 * 1) 두 캔버스를 같은 컨테이너 안에서 absolute로 완전 겹침
 * 2) 좌표는 drawCanvas.getBoundingClientRect() 기준으로 계산
 * 3) touch-action: none + pointer capture 로 드래그 튐 방지
 * 4) 기존 잘못된 이벤트 리스너는 이 컴포넌트로 통일 (중복 제거)
 */
const FractalDrawCanvas = React.forwardRef(function FractalDrawCanvas({
  fractalImageUrl, // 프랙탈을 이미지로 받은 경우(권장). 없으면 아래 drawFractal로 처리
  drawFractal,     // (선택) (ctx, w, h) => void 로 프랙탈 직접 그릴 때
  initialTool = "pen", // "pen" | "highlighter" | "eraser"
  penColor = "#111827",
  highlighterColor = "rgba(255, 200, 0, 0.35)",
  penWidth = 3,
  highlighterWidth = 14,
  eraserWidth = 20,
  onToolChange,    // (선택) tool 변경 시 호출
  showToolbar = true, // (선택) 툴바 표시 여부
}, ref) {
  const wrapRef = useRef(null);
  const bgRef = useRef(null);
  const drawRef = useRef(null);

  const [size, setSize] = useState({ w: 0, h: 0 });
  const [tool, setTool] = useState(initialTool);
  const [isDrawing, setIsDrawing] = useState(false);
  const last = useRef({ x: 0, y: 0 });

  // Undo stack (이미지 데이터 스냅샷)
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // tool 변경 시 부모에게 알림
  useEffect(() => {
    if (onToolChange) {
      onToolChange(tool);
    }
  }, [tool, onToolChange]);

  // 컨테이너 리사이즈에 맞춰 캔버스 크기 동기화
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.floor(r.width), h: Math.floor(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // DPR 세팅 + 프랙탈(배경) 다시 그리기
  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;

    const setupCanvas = (canvas) => {
      if (!canvas || !size.w || !size.h) return null;
      canvas.width = Math.floor(size.w * dpr);
      canvas.height = Math.floor(size.h * dpr);
      canvas.style.width = `${size.w}px`;
      canvas.style.height = `${size.h}px`;
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return ctx;
    };

    const bgCtx = setupCanvas(bgRef.current);
    const drawCtx = setupCanvas(drawRef.current);

    // 드로잉 레이어는 "투명" 유지(배경 안 덮기)
    if (drawCtx) {
      drawCtx.lineCap = "round";
      drawCtx.lineJoin = "round";
    }

    if (!bgCtx) return;
    bgCtx.clearRect(0, 0, size.w, size.h);

    // 1) 이미지로 프랙탈 깔기
    if (fractalImageUrl) {
      const img = new Image();
      img.onload = () => {
        bgCtx.clearRect(0, 0, size.w, size.h);
        // cover처럼 꽉 채우기(원하면 contain으로 바꿔도 됨)
        bgCtx.drawImage(img, 0, 0, size.w, size.h);
      };
      img.src = fractalImageUrl;
      return;
    }

    // 2) 직접 그리는 함수 제공 시
    if (typeof drawFractal === "function") {
      drawFractal(bgCtx, size.w, size.h);
    }
  }, [size.w, size.h, fractalImageUrl, drawFractal]);

  // 현재 툴 스타일 적용
  const applyToolStyle = (ctx) => {
    if (!ctx) return;
    if (tool === "pen") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penWidth;
      ctx.globalAlpha = 1;
    } else if (tool === "highlighter") {
      ctx.globalCompositeOperation = "multiply";
      ctx.strokeStyle = highlighterColor;
      ctx.lineWidth = highlighterWidth;
      ctx.globalAlpha = 0.4;
    } else if (tool === "eraser") {
      // 지우개: 투명으로 파내기
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = eraserWidth;
      ctx.globalAlpha = 1;
    }
  };

  // 좌표를 반드시 drawCanvas 기준으로 계산 (튐 방지 핵심)
  const getPoint = (e) => {
    const canvas = drawRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const pushHistory = () => {
    const c = drawRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const snapshot = ctx.getImageData(0, 0, c.width, c.height);
    setHistory((prev) => [...prev, snapshot]);
    setRedoStack([]); // 새로 그리면 redo 초기화
  };

  const restoreSnapshot = (snapshot) => {
    const c = drawRef.current;
    if (!c || !snapshot) return;
    const ctx = c.getContext("2d");
    ctx.putImageData(snapshot, 0, 0);
  };

  const onPointerDown = (e) => {
    // 스크롤/드래그 방지
    e.preventDefault();

    const c = drawRef.current;
    if (!c) return;

    // 그리기 시작 전에 히스토리 저장(undo용)
    pushHistory();

    try {
      c.setPointerCapture?.(e.pointerId);
    } catch (err) {
      // 무시
    }

    const ctx = c.getContext("2d");
    applyToolStyle(ctx);

    const { x, y } = getPoint(e);
    last.current = { x, y };

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const onPointerMove = (e) => {
    if (!isDrawing) return;
    const c = drawRef.current;
    if (!c) return;

    e.preventDefault();

    const ctx = c.getContext("2d");
    applyToolStyle(ctx);

    const { x, y } = getPoint(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    last.current = { x, y };
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    try {
      drawRef.current?.releasePointerCapture?.(e.pointerId);
    } catch (err) {
      // 무시
    }
  };

  // 버튼들(원하면 밖에서 제어해도 됨)
  const undo = () => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const lastSnap = prev[prev.length - 1];

      // 현재 상태를 redo에 넣기
      const c = drawRef.current;
      if (c) {
        const ctx = c.getContext("2d");
        const cur = ctx.getImageData(0, 0, c.width, c.height);
        setRedoStack((r) => [...r, cur]);
      }

      restoreSnapshot(lastSnap);
      return prev.slice(0, -1);
    });
  };

  const redo = () => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const snap = prev[prev.length - 1];

      // 현재를 history에 넣기
      const c = drawRef.current;
      if (c) {
        const ctx = c.getContext("2d");
        const cur = ctx.getImageData(0, 0, c.width, c.height);
        setHistory((h) => [...h, cur]);
      }

      restoreSnapshot(snap);
      return prev.slice(0, -1);
    });
  };

  const clearAll = () => {
    const c = drawRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    pushHistory();
    ctx.clearRect(0, 0, c.width, c.height);
  };

  // 외부에서 undo/redo/clear 및 canvas ref 호출 가능하도록 ref 노출
  React.useImperativeHandle(ref, () => ({
    undo,
    redo,
    clearAll,
    bgRef,
    drawRef,
  }));

  return (
    <div className="fd-root">
      {/* (선택) 상단 툴바: 기존 UI에 연결해도 됨 */}
      {showToolbar && (
        <div className="fd-toolbar">
          <button className={`fd-btn ${tool === "pen" ? "active" : ""}`} onClick={() => setTool("pen")}>✏️ 펜</button>
          <button className={`fd-btn ${tool === "highlighter" ? "active" : ""}`} onClick={() => setTool("highlighter")}>🖍️ 형광펜</button>
          <button className={`fd-btn ${tool === "eraser" ? "active" : ""}`} onClick={() => setTool("eraser")}>🧽 지우개</button>
          <span className="fd-spacer" />
          <button className="fd-btn" onClick={undo}>↩️ 되돌리기</button>
          <button className="fd-btn" onClick={redo}>↪️ 다시하기</button>
          <button className="fd-btn danger" onClick={clearAll}>🗑 전체 지우기</button>
        </div>
      )}

      {/* ✅ 핵심: 같은 컨테이너 안에 두 캔버스를 완전 겹치기 */}
      <div className="fd-wrap" ref={wrapRef}>
        <canvas className="fd-layer fd-bg" ref={bgRef} />
        <canvas
          className="fd-layer fd-draw"
          ref={drawRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
        />
      </div>
    </div>
  );
});

export default FractalDrawCanvas;
