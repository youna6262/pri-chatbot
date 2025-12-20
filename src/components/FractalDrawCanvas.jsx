import React, { useEffect, useRef, useState } from "react";
import "./FractalDrawCanvas.css";

// 도구 상수
export const TOOLS = {
  PEN: "pen",
  HIGHLIGHTER: "highlighter",
  COLORED_PENCIL: "colored_pencil",
  ERASER: "eraser",
};

// 굵기 모드 상수 (현재는 고정 프리셋을 쓰므로 UI로 확장 가능)
export const THICKNESS = {
  THIN: "thin",
  NORMAL: "normal",
  THICK: "thick",
};

// 도구별 기본색(참고용)
export const DEFAULT_COLOR_BY_TOOL = {
  [TOOLS.PEN]: "#1E40FF",
  [TOOLS.HIGHLIGHTER]: "#FFE866",
  [TOOLS.COLORED_PENCIL]: "#D9480F",
  [TOOLS.ERASER]: "#000000",
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// detail(0~100) -> 0~1
const detail01 = (detail) => clamp(detail / 100, 0, 1);

// detail이 높을수록(정교) 지터는 줄어들게
const computeJitterAmount = (detail, lineWidth) => {
  const d = detail01(detail);            // 0..1
  const rough = 1 - d;                   // 1..0
  // lineWidth 기반으로 적당히: 거칠수록 더 흔들림
  return clamp(lineWidth * (0.18 * rough + 0.02), 0.6, 3.5);
};

// detail이 낮을수록(거칠) 패스 수 증가 → 색연필 느낌 강화
const computePencilPasses = (detail) => {
  const d = detail01(detail);
  // detail 0이면 5패스, detail 100이면 2패스
  return Math.round(2 + (1 - d) * 3);
};

const FractalDrawCanvas = React.forwardRef(function FractalDrawCanvas({
  fractalImageUrl,
  drawFractal,
  initialTool = TOOLS.PEN,

  // 아래 props는 유지하되, "도구 고정색" 요구사항이므로 현재 프리셋이 우선 적용됨
  penColor = DEFAULT_COLOR_BY_TOOL[TOOLS.PEN],
  highlighterColor = DEFAULT_COLOR_BY_TOOL[TOOLS.HIGHLIGHTER],
  coloredPencilColor = DEFAULT_COLOR_BY_TOOL[TOOLS.COLORED_PENCIL],

  thicknessMode = THICKNESS.NORMAL,
  detail = 50,

  onToolChange,
  showToolbar = true,
}, ref) {
  const wrapRef = useRef(null);
  const bgRef = useRef(null);
  const drawRef = useRef(null);

  const [size, setSize] = useState({ w: 0, h: 0 });
  const [tool, setTool] = useState(initialTool);
  const [isDrawing, setIsDrawing] = useState(false);
  const last = useRef({ x: 0, y: 0 });

  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  useEffect(() => {
    onToolChange?.(tool);
  }, [tool, onToolChange]);

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

  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;

    const setupCanvas = (canvas, willRead = false) => {
      if (!canvas || !size.w || !size.h) return null;
      canvas.width = Math.floor(size.w * dpr);
      canvas.height = Math.floor(size.h * dpr);
      canvas.style.width = `${size.w}px`;
      canvas.style.height = `${size.h}px`;
      const ctx = canvas.getContext("2d", willRead ? { willReadFrequently: true } : undefined);
      // 좌표를 CSS px 기준으로 쓰기 위해 transform 고정
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return ctx;
    };

    const bgCtx = setupCanvas(bgRef.current, false);     // 배경: 읽기 거의 없음
    setupCanvas(drawRef.current, true); // 드로잉: undo 때문에 read 많음

    if (!bgCtx) return;
    bgCtx.clearRect(0, 0, size.w, size.h);

    if (fractalImageUrl) {
      const img = new Image();
      img.onload = () => {
        bgCtx.clearRect(0, 0, size.w, size.h);
        bgCtx.drawImage(img, 0, 0, size.w, size.h);
      };
      img.src = fractalImageUrl;
      return;
    }

    if (typeof drawFractal === "function") {
      drawFractal(bgCtx, size.w, size.h);
    }
  }, [size.w, size.h, fractalImageUrl, drawFractal]);

  // ✅ 도구별 브러시 프리셋 (요구사항 반영: 고정)
  const BRUSH_PRESETS = {
    [TOOLS.PEN]: {
      color: "#2F5BFF",
      width: 3,
      alpha: 1.0,
      lineCap: "round",
      lineJoin: "round",
      compositeOperation: "source-over",
      shadow: false,
    },
    [TOOLS.HIGHLIGHTER]: {
      color: "#FFD400",
      width: 18,
      alpha: 1.0, // ✅ 불투명 요구사항
      lineCap: "round",
      lineJoin: "round",
      compositeOperation: "source-over", // ✅ multiply 제거(원하면 다시 넣어도 됨)
      shadow: false,
    },
    [TOOLS.COLORED_PENCIL]: {
      color: "#E53935",
      width: 6,
      alpha: 1.0, // 패스별로 알파를 변주하므로 기본은 1로 둠
      lineCap: "round",
      lineJoin: "round",
      compositeOperation: "source-over",
      shadow: false,
    },
    [TOOLS.ERASER]: {
      color: "#000000",
      width: 20,
      alpha: 1.0,
      lineCap: "round",
      lineJoin: "round",
      compositeOperation: "destination-out",
      shadow: false,
    },
  };

  // ✅ ctx 스타일 적용은 여기서만!
  const applyBrush = (ctx) => {
    if (!ctx) return;

    const preset = BRUSH_PRESETS[tool] || BRUSH_PRESETS[TOOLS.PEN];

    ctx.strokeStyle = preset.color;
    ctx.lineWidth = preset.width;
    ctx.globalAlpha = preset.alpha;
    ctx.lineCap = preset.lineCap;
    ctx.lineJoin = preset.lineJoin;
    ctx.globalCompositeOperation = preset.compositeOperation;

    // shadow는 현재 요구사항엔 불필요 → 항상 OFF (원하면 도구별로 켜도 됨)
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
  };

  // 지터
  const jitter = (p, amount) => ({
    x: p.x + (Math.random() - 0.5) * amount,
    y: p.y + (Math.random() - 0.5) * amount,
  });

  /**
   * 실제 선 그리기
   * - 펜/형광펜/지우개: 일반 stroke
   * - 색연필: "여러 번의 얇은 스트로크 + 알파/굵기 변주 + 지터 + 약간의 곡선"으로 질감
   */
  const strokeSegment = (ctx, currentTool, from, to) => {
    if (currentTool !== TOOLS.COLORED_PENCIL) {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      return;
    }

    const preset = BRUSH_PRESETS[TOOLS.COLORED_PENCIL];
    const passes = computePencilPasses(detail);
    const amt = computeJitterAmount(detail, preset.width);

    // 색연필 질감: 패스마다 두께/알파 랜덤 + 약간의 곡선(종이결 느낌)
    for (let i = 0; i < passes; i++) {
      const f = jitter(from, amt);
      const t = jitter(to, amt);

      // detail이 낮을수록 더 거칠고 옅은 느낌(변동폭 증가)
      const d = detail01(detail);
      const rough = 1 - d;

      const alpha = clamp(0.35 + Math.random() * (0.25 + 0.25 * rough), 0.25, 0.75);
      const width = clamp(preset.width * (0.55 + Math.random() * (0.35 + 0.25 * rough)), 2, preset.width);

      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = preset.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // 약간의 곡선(직선보다 색연필 느낌)
      const mx = (f.x + t.x) / 2 + (Math.random() - 0.5) * amt * 1.5;
      const my = (f.y + t.y) / 2 + (Math.random() - 0.5) * amt * 1.5;

      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.quadraticCurveTo(mx, my, t.x, t.y);
      ctx.stroke();
      ctx.restore();
    }
  };

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
    setRedoStack([]);
  };

  const restoreSnapshot = (snapshot) => {
    const c = drawRef.current;
    if (!c || !snapshot) return;
    const ctx = c.getContext("2d");
    ctx.putImageData(snapshot, 0, 0);
  };

  const onPointerMoveDraw = (ctx, prevPoint, nextPoint) => {
    applyBrush(ctx);
    strokeSegment(ctx, tool, prevPoint, nextPoint);
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    const c = drawRef.current;
    if (!c) return;

    pushHistory();

    try {
      c.setPointerCapture?.(e.pointerId);
    } catch {}

    const ctx = c.getContext("2d");
    const { x, y } = getPoint(e);
    last.current = { x, y };
    setIsDrawing(true);

    // 시작 시점에도 확실히 적용
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

    onPointerMoveDraw(ctx, prev, next);
    last.current = next;
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const c = drawRef.current;
    if (c) {
      const ctx = c.getContext("2d");
      // ✅ 상태 안전 원복 (다음 도구로 넘어갈 때 꼬임 방지)
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = "source-over";
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
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

  const selectTool = (nextTool) => setTool(nextTool);

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
          <button className={`fd-btn ${tool === TOOLS.PEN ? "active" : ""}`} onClick={() => selectTool(TOOLS.PEN)}>✏️ 펜</button>
          <button className={`fd-btn ${tool === TOOLS.HIGHLIGHTER ? "active" : ""}`} onClick={() => selectTool(TOOLS.HIGHLIGHTER)}>🖍️ 형광펜</button>
          <button className={`fd-btn ${tool === TOOLS.COLORED_PENCIL ? "active" : ""}`} onClick={() => selectTool(TOOLS.COLORED_PENCIL)}>🖍 색연필</button>
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
