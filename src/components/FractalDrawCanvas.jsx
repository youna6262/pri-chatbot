import React, { useEffect, useRef, useState } from "react";
import "./FractalDrawCanvas.css";

/**
 * FractalDrawCanvas
 * - bgCanvas: 프랙탈 배경(이미지)
 * - drawCanvas: 투명 레이어(그림)
 *
 * ✅ 핵심 수정
 * 1) 부모 initialTool 변경 시 내부 tool도 즉시 동기화 (useEffect)
 * 2) 이벤트 핸들러는 항상 toolRef.current로 최신 도구 사용(클로저 문제 해결)
 * 3) willReadFrequently 적용(undo getImageData 경고 완화)
 * 4) 요구사항 고정 브러시:
 *    - 펜: 파란색 얇게
 *    - 형광펜: 노란색 불투명(알파 1.0)
 *    - 색연필: 빨간색 + 질감(지터/다중패스)
 */

export const TOOLS = {
  PEN: "pen",
  HIGHLIGHTER: "highlighter",
  COLORED_PENCIL: "colored_pencil",
  ERASER: "eraser",
};

export const THICKNESS = {
  THIN: "thin",
  NORMAL: "normal",
  THICK: "thick",
};

export const DEFAULT_COLOR_BY_TOOL = {
  [TOOLS.PEN]: "#1E40FF",
  [TOOLS.HIGHLIGHTER]: "#FFE866",
  [TOOLS.COLORED_PENCIL]: "#D9480F",
  [TOOLS.ERASER]: "#000000",
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// ✅ 캔버스 리사이즈 함수 (DPR 고려)
function resizeCanvasToDisplaySize(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  const displayWidth = Math.round(rect.width * dpr);
  const displayHeight = Math.round(rect.height * dpr);

  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // 좌표계를 CSS 픽셀 기준으로 맞춤
    return true; // 크기 바뀜
  }
  return false;
}

const FractalDrawCanvas = React.forwardRef(function FractalDrawCanvas(
  {
    fractalImageUrl,
    drawFractal,
    initialTool = TOOLS.PEN,
    penColor,
    highlighterColor,
    coloredPencilColor,
    thicknessMode = THICKNESS.NORMAL,
    detail = 50,
    onToolChange,
    showToolbar = true,
  },
  ref
) {
  const wrapRef = useRef(null);
  const bgRef = useRef(null);
  const drawRef = useRef(null);

  const [size, setSize] = useState({ w: 0, h: 0 });

  const [tool, setTool] = useState(initialTool);
  const toolRef = useRef(tool);

  const thicknessRef = useRef(thicknessMode);
  const colorRef = useRef({ penColor, highlighterColor, coloredPencilColor });
  const detailRef = useRef(detail);

  const [isDrawing, setIsDrawing] = useState(false);
  const last = useRef({ x: 0, y: 0 });

  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // ✅ 부모(initialTool) 바뀌면 내부 tool도 즉시 반영 (핵심!)
  useEffect(() => {
    setTool(initialTool);
  }, [initialTool]);

  // toolRef 최신화
  useEffect(() => {
    toolRef.current = tool;
    onToolChange?.(tool);
  }, [tool, onToolChange]);

  useEffect(() => { thicknessRef.current = thicknessMode; }, [thicknessMode]);
  useEffect(() => { detailRef.current = detail; }, [detail]);
  useEffect(() => {
    colorRef.current = { penColor, highlighterColor, coloredPencilColor };
  }, [penColor, highlighterColor, coloredPencilColor]);

  // ResizeObserver로 캔버스 크기 맞춤
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

  // ✅ 레이아웃 변경 시 캔버스 리사이즈 (DPR 고려)
  // 주의: size.w, size.h가 변경되면 위의 useEffect에서 자동으로 처리되므로,
  // 여기서는 윈도우 리사이즈나 다른 레이아웃 변경 시에만 추가로 처리
  useEffect(() => {
    const onLayoutChange = () => {
      requestAnimationFrame(() => {
        // wrapRef의 크기가 변경되면 ResizeObserver가 size를 업데이트하고,
        // 그에 따라 위의 useEffect가 캔버스를 리사이즈함
        // 여기서는 단순히 강제로 리사이즈만 수행
        const bgCanvas = bgRef.current;
        const drawCanvas = drawRef.current;
        
        if (bgCanvas) {
          resizeCanvasToDisplaySize(bgCanvas);
          // 배경 이미지가 있으면 다시 그리기 (위의 useEffect에서 처리되지만, 확실히 하기 위해)
          if (fractalImageUrl) {
            const ctx = bgCanvas.getContext("2d");
            const dpr = window.devicePixelRatio || 1;
            const rect = bgCanvas.getBoundingClientRect();
            const displayW = rect.width;
            const displayH = rect.height;
            
            ctx.clearRect(0, 0, displayW, displayH);
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, 0, 0, displayW, displayH);
            };
            img.src = fractalImageUrl;
          }
        }
        
        if (drawCanvas) {
          resizeCanvasToDisplaySize(drawCanvas);
          // TODO: 기존 그림을 유지해야 한다면 redraw 호출
          // 현재는 history가 있으면 복원할 수 있지만, 여기서는 단순히 리사이즈만 처리
        }
      });
    };

    // 윈도우 리사이즈 이벤트
    window.addEventListener("resize", onLayoutChange);

    return () => {
      window.removeEventListener("resize", onLayoutChange);
    };
  }, [fractalImageUrl]);

  // ✅ 고정 브러시 프리셋(요구사항 그대로)
  const BRUSH_PRESETS = {
    [TOOLS.PEN]: {
      color: "#2F5BFF",
      width: 3,
      alpha: 1.0,
      op: "source-over",
    },
    [TOOLS.HIGHLIGHTER]: {
      color: "#FFD400",
      width: 18,
      alpha: 1.0, // ✅ 불투명
      op: "source-over",
    },
    [TOOLS.COLORED_PENCIL]: {
      color: "#E53935",
      width: 6,
      alpha: 1.0,
      op: "source-over",
    },
    [TOOLS.ERASER]: {
      color: "#000000",
      width: 20,
      alpha: 1.0,
      op: "destination-out",
    },
  };

  const THICKNESS_SCALE = {
    [THICKNESS.THIN]: 0.65,
    [THICKNESS.NORMAL]: 1.0,
    [THICKNESS.THICK]: 1.8,
  };

  const getScaledWidth = (toolKey) => {
    const base = (BRUSH_PRESETS[toolKey] || BRUSH_PRESETS[TOOLS.PEN]).width;
    const scale = THICKNESS_SCALE[thicknessRef.current] ?? 1.0;
    return base * scale;
  };

  const getDrawCtx = () => {
    const c = drawRef.current;
    if (!c) return null;
    return c.getContext("2d", { willReadFrequently: true });
  };

  const applyBrush = (ctx, t = toolRef.current) => {
    if (!ctx) return;
    const p = BRUSH_PRESETS[t] || BRUSH_PRESETS[TOOLS.PEN];

    const colors = colorRef.current;
    const strokeColor =
      t === TOOLS.PEN ? (colors.penColor || p.color) :
      t === TOOLS.HIGHLIGHTER ? (colors.highlighterColor || p.color) :
      t === TOOLS.COLORED_PENCIL ? (colors.coloredPencilColor || p.color) :
      p.color;

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = getScaledWidth(t);

    ctx.globalAlpha = p.alpha;
    ctx.globalCompositeOperation = p.op;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
  };

  // DPR 세팅 + 배경 그리기 (resizeCanvasToDisplaySize 사용)
  useEffect(() => {
    const bgCanvas = bgRef.current;
    const drawCanvas = drawRef.current;
    
    if (!bgCanvas || !size.w || !size.h) return;

    // ✅ resizeCanvasToDisplaySize 사용
    const bgChanged = resizeCanvasToDisplaySize(bgCanvas);
    if (drawCanvas) {
      resizeCanvasToDisplaySize(drawCanvas);
    }

    const bgCtx = bgCanvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const displayW = size.w;
    const displayH = size.h;

    bgCtx.clearRect(0, 0, displayW, displayH);

    if (fractalImageUrl) {
      const img = new Image();
      img.onload = () => {
        bgCtx.clearRect(0, 0, displayW, displayH);
        bgCtx.drawImage(img, 0, 0, displayW, displayH);
      };
      img.src = fractalImageUrl;
      return;
    }

    if (typeof drawFractal === "function") {
      drawFractal(bgCtx, displayW, displayH);
    }
  }, [size.w, size.h, fractalImageUrl, drawFractal]);

  // tool 바뀌는 즉시 ctx에도 적용(체감 개선)
  useEffect(() => {
    const ctx = getDrawCtx();
    if (!ctx) return;
    applyBrush(ctx, tool);
  }, [tool]); // eslint-disable-line react-hooks/exhaustive-deps

  const getPoint = (e) => {
    const canvas = drawRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const jitter = (p, amt) => ({
    x: p.x + (Math.random() - 0.5) * amt,
    y: p.y + (Math.random() - 0.5) * amt,
  });

  const strokeSegment = (ctx, t, from, to) => {
    if (t !== TOOLS.COLORED_PENCIL) {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      return;
    }

    // ✅ 색연필 질감(다중패스 + 흔들림 + 알파/굵기 변주 + 약간 곡선)
    const preset = BRUSH_PRESETS[TOOLS.COLORED_PENCIL];
    const scaledBase = getScaledWidth(TOOLS.COLORED_PENCIL);
    const passes = 4;
    const amt = clamp(scaledBase * 0.18, 0.8, 3.0);

    for (let i = 0; i < passes; i++) {
      const f = jitter(from, amt);
      const tt = jitter(to, amt);

      const alpha = clamp(0.35 + Math.random() * 0.35, 0.25, 0.75);
      const width = clamp(scaledBase * (0.6 + Math.random() * 0.35), 2, scaledBase);

      const mx = (f.x + tt.x) / 2 + (Math.random() - 0.5) * amt * 1.4;
      const my = (f.y + tt.y) / 2 + (Math.random() - 0.5) * amt * 1.4;

      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = (colorRef.current.coloredPencilColor || preset.color);
      ctx.globalAlpha = alpha;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.quadraticCurveTo(mx, my, tt.x, tt.y);
      ctx.stroke();
      ctx.restore();
    }
  };

  const pushHistory = () => {
    const c = drawRef.current;
    const ctx = getDrawCtx();
    if (!c || !ctx) return;
    const snap = ctx.getImageData(0, 0, c.width, c.height);
    setHistory((prev) => [...prev, snap]);
    setRedoStack([]);
  };

  const restoreSnapshot = (snap) => {
    const ctx = getDrawCtx();
    if (!ctx || !snap) return;
    ctx.putImageData(snap, 0, 0);
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    const c = drawRef.current;
    const ctx = getDrawCtx();
    if (!c || !ctx) return;

    pushHistory();

    try {
      c.setPointerCapture?.(e.pointerId);
    } catch {}

    const p = getPoint(e);
    last.current = p;
    setIsDrawing(true);

    applyBrush(ctx, toolRef.current);
  };

  const onPointerMove = (e) => {
    if (!isDrawing) return;
    e.preventDefault();

    const ctx = getDrawCtx();
    if (!ctx) return;

    const next = getPoint(e);
    const prev = last.current;

    if (prev.x === next.x && prev.y === next.y) return;

    const t = toolRef.current; // ✅ 최신 도구
    applyBrush(ctx, t);
    strokeSegment(ctx, t, prev, next);

    last.current = next;
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const ctx = getDrawCtx();
    if (ctx) {
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = "source-over";
    }

    try {
      drawRef.current?.releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  const undo = () => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const lastSnap = prev[prev.length - 1];

      const c = drawRef.current;
      const ctx = getDrawCtx();
      if (c && ctx) {
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

      const c = drawRef.current;
      const ctx = getDrawCtx();
      if (c && ctx) {
        const cur = ctx.getImageData(0, 0, c.width, c.height);
        setHistory((h) => [...h, cur]);
      }

      restoreSnapshot(snap);
      return prev.slice(0, -1);
    });
  };

  const clearAll = () => {
    const c = drawRef.current;
    const ctx = getDrawCtx();
    if (!c || !ctx) return;
    pushHistory();
    ctx.clearRect(0, 0, c.width, c.height);
  };

  React.useImperativeHandle(ref, () => ({
    undo,
    redo,
    clearAll,
    bgRef,
    drawRef,
  }));

  const selectTool = (nextTool) => {
    setTool(nextTool);
  };

  return (
    <div className="fd-root">
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
