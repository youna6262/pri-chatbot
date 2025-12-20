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

// 도구 상수
export const TOOLS = {
  PEN: "pen",
  HIGHLIGHTER: "highlighter",
  COLORED_PENCIL: "colored_pencil",
  ERASER: "eraser",
};

// 굵기 모드 상수
export const THICKNESS = {
  THIN: "thin",
  NORMAL: "normal",
  THICK: "thick",
};

// 도구별 기본색
export const DEFAULT_COLOR_BY_TOOL = {
  [TOOLS.PEN]: "#1E40FF",
  [TOOLS.HIGHLIGHTER]: "#FFE866",
  [TOOLS.COLORED_PENCIL]: "#D9480F",
  [TOOLS.ERASER]: "#000000",
};

const FractalDrawCanvas = React.forwardRef(function FractalDrawCanvas({
  fractalImageUrl, // 프랙탈을 이미지로 받은 경우(권장). 없으면 아래 drawFractal로 처리
  drawFractal,     // (선택) (ctx, w, h) => void 로 프랙탈 직접 그릴 때
  initialTool = TOOLS.PEN,
  penColor = DEFAULT_COLOR_BY_TOOL[TOOLS.PEN],
  highlighterColor = DEFAULT_COLOR_BY_TOOL[TOOLS.HIGHLIGHTER],
  coloredPencilColor = DEFAULT_COLOR_BY_TOOL[TOOLS.COLORED_PENCIL],
  thicknessMode = THICKNESS.NORMAL, // "thin" | "normal" | "thick"
  detail = 50, // 0~100 (세밀 슬라이더)
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
    // ⭐ ctx 설정은 applyBrush에서만 관리하므로 여기서는 제거
    // if (drawCtx) {
    //   drawCtx.lineCap = "round";
    //   drawCtx.lineJoin = "round";
    // }

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

  // 굵기/세밀을 실제 lineWidth로 변환 (기존 로직 유지하되 사용하지 않음)
  // const computeBaseWidth = (thicknessMode, detail) => {
  //   // thicknessMode에 따라 기본값을 확 벌려서 "차이"가 나게 함
  //   const modeBase =
  //     thicknessMode === THICKNESS.THIN ? 2 :
  //     thicknessMode === THICKNESS.NORMAL ? 5 :
  //     10; // THICK
  //   // detail 슬라이더(0~100)를 0.6~1.8로 매핑 (세밀: 얇아지고/조절 가능)
  //   const detailScale = 0.6 + (detail / 100) * 1.2;
  //   // 최종 baseWidth
  //   return modeBase * detailScale;
  // };

  // 도구별 브러시 프리셋 (고정값 - 요구사항 반영)
  const BRUSH_PRESETS = {
    [TOOLS.PEN]: {
      color: "#2F5BFF",     // 파란색
      width: 3,             // 얇게
      alpha: 1.0,
      lineCap: "round",
      lineJoin: "round",
      compositeOperation: "source-over",
    },
    [TOOLS.HIGHLIGHTER]: {
      color: "#FFD400",     // 노란색
      width: 18,            // 굵게
      alpha: 0.35,          // 형광 느낌(투명)
      lineCap: "round",
      lineJoin: "round",
      compositeOperation: "multiply", // 겹치면 진해지는 느낌
    },
    [TOOLS.COLORED_PENCIL]: {
      color: "#E53935",     // 빨간색
      width: 6,             // 중간
      alpha: 0.75,          // 색연필 느낌(약간 투명)
      lineCap: "round",
      lineJoin: "round",
      compositeOperation: "source-over",
    },
    [TOOLS.ERASER]: {
      color: "#000000",     // 지우개는 색상 무의미
      width: 20,
      alpha: 1.0,
      lineCap: "round",
      lineJoin: "round",
      compositeOperation: "destination-out",
    },
  };

  /**
   * ctx 스타일 적용은 여기서만!
   * 기존 코드의 ctx.strokeStyle/lineWidth/globalAlpha/lineCap 중복 설정은 삭제/주석 처리하고
   * draw 시작할 때마다 applyBrush(ctx)만 호출하도록 통일.
   */
  const applyBrush = (ctx) => {
    if (!ctx) return;
    
    const preset = BRUSH_PRESETS[tool] || BRUSH_PRESETS[TOOLS.PEN];
    
    // 모든 ctx 설정을 한 곳에서만 관리
    ctx.strokeStyle = preset.color;
    ctx.lineWidth = preset.width;
    ctx.globalAlpha = preset.alpha;
    ctx.lineCap = preset.lineCap;
    ctx.lineJoin = preset.lineJoin;
    ctx.globalCompositeOperation = preset.compositeOperation;
    
    // shadow는 형광펜에만 적용
    if (tool === TOOLS.HIGHLIGHTER) {
      ctx.shadowBlur = 10;
      ctx.shadowColor = preset.color;
    } else {
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
    }
  };

  // 노이즈(지터) 함수
  const jitter = (p, amount) => {
    return {
      x: p.x + (Math.random() - 0.5) * amount,
      y: p.y + (Math.random() - 0.5) * amount,
    };
  };

  // 실제 선 그리기: 펜/형광펜은 1번, 색연필은 오버드로우로 질감
  const strokeSegment = (ctx, tool, from, to) => {
    if (tool !== TOOLS.COLORED_PENCIL) {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      return;
    }

    // 색연필: 같은 구간을 살짝씩 흔들어 여러 번 그려서 "종이결" 느낌
    const passes = 3;
    const amt = Math.max(0.6, ctx.lineWidth * 0.12);

    for (let i = 0; i < passes; i++) {
      const f = jitter(from, amt);
      const t = jitter(to, amt);

      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.lineTo(t.x, t.y);
      ctx.stroke();
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

  // 포인터 move에서 스타일 적용 + 그리기
  const onPointerMoveDraw = (ctx, prevPoint, nextPoint) => {
    // ⭐ draw마다 반드시 스타일 적용 (단일 함수로 통일)
    applyBrush(ctx);

    // 실제 stroke
    strokeSegment(ctx, tool, prevPoint, nextPoint);
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
    const { x, y } = getPoint(e);
    last.current = { x, y };
    setIsDrawing(true);

    // ⭐ draw 시작 시점에 applyBrush 호출
    applyBrush(ctx);
  };

  const onPointerMove = (e) => {
    if (!isDrawing) return;
    const c = drawRef.current;
    if (!c) return;

    e.preventDefault();

    const ctx = c.getContext("2d");
    const next = getPoint(e);
    const prev = last.current;

    if (!prev || (prev.x === next.x && prev.y === next.y)) {
      last.current = next;
      return;
    }

    // ⭐ 스타일 적용 + 그리기 (단일 함수로 통일, 색상/thicknessMode/detail props 제거)
    onPointerMoveDraw(ctx, prev, next);

    last.current = next;
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // globalAlpha를 원복 (다른 렌더에 영향 방지)
    const c = drawRef.current;
    if (c) {
      const ctx = c.getContext("2d");
      ctx.globalAlpha = 1.0;
    }
    
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

  // 도구 선택 시 기본색도 변경
  const selectTool = (nextTool) => {
    setTool(nextTool);
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
          <button className={`fd-btn ${tool === TOOLS.PEN ? "active" : ""}`} onClick={() => selectTool(TOOLS.PEN)}>✏️ 펜</button>
          <button className={`fd-btn ${tool === TOOLS.HIGHLIGHTER ? "active" : ""}`} onClick={() => selectTool(TOOLS.HIGHLIGHTER)}>🖍️ 형광펜</button>
          <button className={`fd-btn ${tool === TOOLS.COLORED_PENCIL ? "active" : ""}`} onClick={() => selectTool(TOOLS.COLORED_PENCIL)}>✏️ 색연필</button>
          <button className={`fd-btn ${tool === TOOLS.ERASER ? "active" : ""}`} onClick={() => selectTool(TOOLS.ERASER)}>🧽 지우개</button>
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
