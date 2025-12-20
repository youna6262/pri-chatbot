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
 *
 * ✅ 이번 수정(요청 반영)
 * - 도구 바꿀 때 색/굵기 즉시 반영 안 되는 문제 해결:
 *   toolRef로 최신 tool 참조 + tool 변경 useEffect에서 ctx에 applyBrush 즉시 적용
 * - getImageData 경고 완화:
 *   drawCanvas는 getContext("2d", { willReadFrequently: true }) 사용
 * - 형광펜 불투명(요구사항): alpha 1.0 + source-over
 * - 색연필 질감: 다중 스트로크 + 지터 + 알파/굵기 변주 + 약간의 곡선
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

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const detail01 = (detail) => clamp(detail / 100, 0, 1);

const FractalDrawCanvas = React.forwardRef(function FractalDrawCanvas(
  {
    fractalImageUrl, // 프랙탈을 이미지로 받은 경우(권장). 없으면 아래 drawFractal로 처리
    drawFractal, // (선택) (ctx, w, h) => void 로 프랙탈 직접 그릴 때
    initialTool = TOOLS.PEN,
    penColor = DEFAULT_COLOR_BY_TOOL[TOOLS.PEN],
    highlighterColor = DEFAULT_COLOR_BY_TOOL[TOOLS.HIGHLIGHTER],
    coloredPencilColor = DEFAULT_COLOR_BY_TOOL[TOOLS.COLORED_PENCIL],
    thicknessMode = THICKNESS.NORMAL, // "thin" | "normal" | "thick" (현재 프리셋 고정이라 참고용)
    detail = 50, // 0~100 (세밀 슬라이더)
    onToolChange, // (선택) tool 변경 시 호출
    showToolbar = true, // (선택) 툴바 표시 여부
  },
  ref
) {
  const wrapRef = useRef(null);
  const bgRef = useRef(null);
  const drawRef = useRef(null);

  const [size, setSize] = useState({ w: 0, h: 0 });
  const [tool, setTool] = useState(initialTool);
  const toolRef = useRef(tool); // ✅ 최신 tool 보장
  const [isDrawing, setIsDrawing] = useState(false);
  const last = useRef({ x: 0, y: 0 });

  // Undo stack (이미지 데이터 스냅샷)
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // toolRef 최신화
  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  // tool 변경 시 부모에게 알림
  useEffect(() => {
    if (onToolChange) onToolChange(tool);
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

  // 도구별 브러시 프리셋 (요구사항 반영: 고정)
  // props 색상(penColor 등)은 유지하되 기본값으로만 사용(원하면 여기서 적용 가능)
  const BRUSH_PRESETS = {
    [TOOLS.PEN]: {
      color: "#2F5BFF",
      width: 3,
      alpha: 1.0,
      lineCap: "round",
      lineJoin: "round",
      compositeOperation: "source-over",
    },
    [TOOLS.HIGHLIGHTER]: {
      color: "#FFD400",
      width: 18,
      alpha: 1.0, // ✅ 불투명
      lineCap: "round",
      lineJoin: "round",
      compositeOperation: "source-over", // ✅ multiply 제거(원하면 다시 적용 가능)
    },
    [TOOLS.COLORED_PENCIL]: {
      color: "#E53935",
      width: 6,
      alpha: 1.0, // 패스별로 알파 변주할 거라 기본은 1
      lineCap: "round",
      lineJoin: "round",
      compositeOperation: "source-over",
    },
    [TOOLS.ERASER]: {
      color: "#000000",
      width: 20,
      alpha: 1.0,
      lineCap: "round",
      lineJoin: "round",
      compositeOperation: "destination-out",
    },
  };

  /**
   * ctx 스타일 적용은 여기서만!
   * ✅ tool을 인자로 받거나, 기본값으로 toolRef.current 사용 (클로저 문제 방지)
   */
  const applyBrush = (ctx, t = toolRef.current) => {
    if (!ctx) return;

    const preset = BRUSH_PRESETS[t] || BRUSH_PRESETS[TOOLS.PEN];

    ctx.strokeStyle = preset.color;
    ctx.lineWidth = preset.width;
    ctx.globalAlpha = preset.alpha;
    ctx.lineCap = preset.lineCap;
    ctx.lineJoin = preset.lineJoin;
    ctx.globalCompositeOperation = preset.compositeOperation;

    // shadow는 요구사항상 불필요 -> 항상 OFF
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
  };

  // ✅ 도구 바뀌는 즉시 ctx에 적용 (체감 개선 + "안 바뀜" 방지)
  useEffect(() => {
    const c = drawRef.current;
    if (!c) return;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    applyBrush(ctx, tool);
  }, [tool]); // eslint-disable-line react-hooks/exhaustive-deps

  // DPR 세팅 + 프랙탈(배경) 다시 그리기
  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;

    const setupCanvas = (canvas, willRead = false) => {
      if (!canvas || !size.w || !size.h) return null;
      canvas.width = Math.floor(size.w * dpr);
      canvas.height = Math.floor(size.h * dpr);
      canvas.style.width = `${size.w}px`;
      canvas.style.height = `${size.h}px`;

      const ctx = canvas.getContext(
        "2d",
        willRead ? { willReadFrequently: true } : undefined
      );
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return ctx;
    };

    const bgCtx = setupCanvas(bgRef.current, false);
    setupCanvas(drawRef.current, true); // draw는 undo 때문에 read 많음

    if (!bgCtx) return;
    bgCtx.clearRect(0, 0, size.w, size.h);

    // 1) 이미지로 프랙탈 깔기
    if (fractalImageUrl) {
      const img = new Image();
      img.onload = () => {
        bgCtx.clearRect(0, 0, size.w, size.h);
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

  // 지터(노이즈)
  const jitter = (p, amount) => ({
    x: p.x + (Math.random() - 0.5) * amount,
    y: p.y + (Math.random() - 0.5) * amount,
  });

  // detail이 높을수록(정교) 거칠기 감소
  const computeJitterAmount = (detailValue, baseWidth) => {
    const d = detail01(detailValue); // 0..1
    const rough = 1 - d;
    return clamp(baseWidth * (0.18 * rough + 0.02), 0.6, 3.5);
  };

  const computePencilPasses = (detailValue) => {
    const d = detail01(detailValue);
    return Math.round(2 + (1 - d) * 3); // 2~5
  };

  // 실제 선 그리기: 펜/형광펜/지우개 1번, 색연필은 질감
  const strokeSegment = (ctx, t, from, to) => {
    if (t !== TOOLS.COLORED_PENCIL) {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      return;
    }

    // 색연필 질감
    const preset = BRUSH_PRESETS[TOOLS.COLORED_PENCIL];
    const passes = computePencilPasses(detail);
    const amt = computeJitterAmount(detail, preset.width);

    const d = detail01(detail);
    const rough = 1 - d;

    for (let i = 0; i < passes; i++) {
      const f = jitter(from, amt);
      const t2 = jitter(to, amt);

      // 패스마다 알파/굵기 변주
      const alpha = clamp(0.35 + Math.random() * (0.25 + 0.25 * rough), 0.25, 0.75);
      const width = clamp(
        preset.width * (0.55 + Math.random() * (0.35 + 0.25 * rough)),
        2,
        preset.width
      );

      // 곡선으로 조금 더 자연스럽게
      const mx = (f.x + t2.x) / 2 + (Math.random() - 0.5) * amt * 1.5;
      const my = (f.y + t2.y) / 2 + (Math.random() - 0.5) * amt * 1.5;

      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = preset.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.quadraticCurveTo(mx, my, t2.x, t2.y);
      ctx.stroke();
      ctx.restore();
    }
  };

  // 좌표를 반드시 drawCanvas 기준으로 계산
  const getPoint = (e) => {
    const canvas = drawRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const pushHistory = () => {
    const c = drawRef.current;
    if (!c) return;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    const snapshot = ctx.getImageData(0, 0, c.width, c.height);
    setHistory((prev) => [...prev, snapshot]);
    setRedoStack([]);
  };

  const restoreSnapshot = (snapshot) => {
    const c = drawRef.current;
    if (!c || !snapshot) return;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.putImageData(snapshot, 0, 0);
  };

  // 포인터 move에서 스타일 적용 + 그리기
  const onPointerMoveDraw = (ctx, prevPoint, nextPoint) => {
    const t = toolRef.current; // ✅ 항상 최신 tool
    applyBrush(ctx, t);
    strokeSegment(ctx, t, prevPoint, nextPoint);
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    const c = drawRef.current;
    if (!c) return;

    pushHistory();

    try {
      c.setPointerCapture?.(e.pointerId);
    } catch {}

    const ctx = c.getContext("2d", { willReadFrequently: true });
    const { x, y } = getPoint(e);
    last.current = { x, y };
    setIsDrawing(true);

    applyBrush(ctx, toolRef.current);
  };

  const onPointerMove = (e) => {
    if (!isDrawing) return;
    const c = drawRef.current;
    if (!c) return;

    e.preventDefault();

    const ctx = c.getContext("2d", { willReadFrequently: true });
    const next = getPoint(e);
    const prev = last.current;

    if (!prev || (prev.x === next.x && prev.y === next.y)) {
      last.current = next;
      return;
    }

    onPointerMoveDraw(ctx, prev, next);
    last.current = next;
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const c = drawRef.current;
    if (c) {
      const ctx = c.getContext("2d", { willReadFrequently: true });
      // 상태 원복(다음 도구/렌더 꼬임 방지)
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = "source-over";
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
    }

    try {
      drawRef.current?.releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  // 버튼들
  const undo = () => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const lastSnap = prev[prev.length - 1];

      // 현재 상태를 redo에 넣기
      const c = drawRef.current;
      if (c) {
        const ctx = c.getContext("2d", { willReadFrequently: true });
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
        const ctx = c.getContext("2d", { willReadFrequently: true });
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
    const ctx = c.getContext("2d", { willReadFrequently: true });
    pushHistory();
    ctx.clearRect(0, 0, c.width, c.height);
  };

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
      {showToolbar && (
        <div className="fd-toolbar">
          <button
            className={`fd-btn ${tool === TOOLS.PEN ? "active" : ""}`}
            onClick={() => selectTool(TOOLS.PEN)}
          >
            ✏️ 펜
          </button>
          <button
            className={`fd-btn ${tool === TOOLS.HIGHLIGHTER ? "active" : ""}`}
            onClick={() => selectTool(TOOLS.HIGHLIGHTER)}
          >
            🖍️ 형광펜
          </button>
          <button
            className={`fd-btn ${tool === TOOLS.COLORED_PENCIL ? "active" : ""}`}
            onClick={() => selectTool(TOOLS.COLORED_PENCIL)}
          >
            🖍 색연필
          </button>
          <button
            className={`fd-btn ${tool === TOOLS.ERASER ? "active" : ""}`}
            onClick={() => selectTool(TOOLS.ERASER)}
          >
            🧽 지우개
          </button>
          <span className="fd-spacer" />
          <button className="fd-btn" onClick={undo}>
            ↩️ 되돌리기
          </button>
          <button className="fd-btn" onClick={redo}>
            ↪️ 다시하기
          </button>
          <button className="fd-btn danger" onClick={clearAll}>
            🗑 전체 지우기
          </button>
        </div>
      )}

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
