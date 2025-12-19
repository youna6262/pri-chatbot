import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./MakeFractal.css";
import { renderFractal } from "../utils/fractalRenderer";
import { buildCredits } from "../utils/buildCredits";
import { db, auth } from "../firebase/firebaseApp";
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from "firebase/firestore";
import { makeThumbnail } from "../utils/makeThumbnail";
import { downsampleStrokes, getStrokesSize } from "../utils/downsampleStrokes";

const STORAGE_KEY = "pri_artworks_v1";

function loadWorks() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function saveWorks(works) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(works));
}

function resizeCanvasToStage(canvas, stageEl) {
  const dpr = window.devicePixelRatio || 1;
  const rect = stageEl.getBoundingClientRect();
  const w = Math.round(rect.width * dpr);
  const h = Math.round(rect.height * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // CSS px 기준
  return { width: rect.width, height: rect.height };
}

function resizeCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.round(rect.width * dpr);
  const h = Math.round(rect.height * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width: rect.width, height: rect.height };
}

function drawStroke(ctx, stroke) {
  ctx.save();
  if (stroke.tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
  } else if (stroke.tool === "highlighter" || stroke.mode === "highlighter") {
    ctx.globalCompositeOperation = "multiply";
    // 형광펜: 색상에 투명도 적용
    const color = stroke.color || "#FFFF00";
    const hex = color.replace("#", "");
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.4)`;
    } else {
      ctx.strokeStyle = `rgba(255, 255, 0, 0.4)`;
    }
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = stroke.color || "#111827";
  }
  ctx.lineWidth = stroke.size || 8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const pts = stroke.points || [];
  if (pts.length < 2) {
    ctx.restore();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
  ctx.restore();
}

// stroke는 resize에도 유지되게 좌표를 0~1로 저장
function drawStrokes(ctx, strokes, width, height) {
  ctx.clearRect(0, 0, width, height);

  strokes.forEach(st => {
    // 정규화된 좌표(0~1)를 픽셀 좌표로 변환
    const pixelPoints = (st.points || []).map(p => ({
      x: p.x * width,
      y: p.y * height
    }));
    
    drawStroke(ctx, {
      ...st,
      points: pixelPoints
    });
  });
}

export function MakeFractal({
  onMakeStageChange,
  onWorkContextChange,
  onNavigateToChat,
  initialStage = "bg",
  hideStepper = false,
}) {
  // stage 상태 (bg | draw | card)
  const [makeStage, setMakeStage] = useState(initialStage);

  // ✅ 내부 state도 바꾸고, (있으면) 부모 콜백도 같이 호출
  const goStage = (stage) => {
    setMakeStage(stage);
    onMakeStageChange?.(stage);
  };

  const stageRef = useRef(null);
  const fractalRef = useRef(null);
  const fractalCanvasRef = useRef(null); // 미리보기용
  const drawRef = useRef(null);
  const drawCanvasRef = useRef(null); // 그림 그리기용

  const [params, setParams] = useState({
    type: "tree",
    depth: 7,
    pri: "1234",
    color: "#4f46e5",
    bg: "#ffffff",
    angle: 25,
    ratio: 0.72,
  });

  const [title, setTitle] = useState("");
  const [studentName, setStudentName] = useState("");
  const [tool, setTool] = useState("pen"); // 'pen' | 'highlighter' | 'eraser'
  const [penColor, setPenColor] = useState("#111111");
  const [penSize, setPenSize] = useState(8);
  const [highlighterSize, setHighlighterSize] = useState(20);
  const [eraserSize, setEraserSize] = useState(16);
  const [drawLock, setDrawLock] = useState(true);   // 🔒 그리기 모드(스크롤/줌 잠금)
  const [allowMouse, setAllowMouse] = useState(true); // ✅ 기본 true(개발 편함)
  const [penOnly, setPenOnly] = useState(true);     // true면 펜만, false면 마우스도 허용

  const [works, setWorks] = useState(() => loadWorks());
  const [selectedWork, setSelectedWork] = useState(null);
  const [selectedWorkId, setSelectedWorkId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortMode, setSortMode] = useState("recent"); // 'recent' | 'title'
  const [galleryQuery, setGalleryQuery] = useState("");
  const [gallerySort, setGallerySort] = useState("recent");
  const [workTitle, setWorkTitle] = useState("");
  const [nickname, setNickname] = useState("");
  const [presentationDraft, setPresentationDraft] = useState(null);
  const [showBgOverlay, setShowBgOverlay] = useState(true);
  const [bgSnapshot, setBgSnapshot] = useState(null);
  const [galleryWorks, setGalleryWorks] = useState([]);
  const [galleryError, setGalleryError] = useState("");

  // 우리반 코드 (localStorage에서 가져오기)
  const [classId, setClassId] = useState(() => {
    return localStorage.getItem("pri_classId") || "";
  });

  // classId가 없으면 입력받기
  useEffect(() => {
    if (!classId) {
      const input = prompt("우리반 코드를 입력해주세요:");
      if (input && input.trim()) {
        const code = input.trim();
        setClassId(code);
        localStorage.setItem("pri_classId", code);
      }
    }
  }, [classId]);

  // Firestore에 작품 저장하는 헬퍼 함수
  async function saveWorkToFirestore(workData) {
    // workData: { title, nickname, fractalParams, strokes, thumbnail ... }
    if (!auth.currentUser) {
      throw new Error("로그인이 필요합니다.");
    }

    if (!classId) {
      throw new Error("우리반 코드가 설정되지 않았습니다.");
    }

    const payload = {
      ...workData,
      ownerUid: auth.currentUser.uid,
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, "classes", classId, "works"), payload);
  }

  const visibleWorks = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const filtered = q
      ? works.filter(w => (w.title || "").toLowerCase().includes(q))
      : works;

    const sorted = [...filtered].sort((a, b) => {
      if (sortMode === "title") return (a.title || "").localeCompare(b.title || "");
      // recent
      const at = new Date(a.createdAt || 0).getTime();
      const bt = new Date(b.createdAt || 0).getTime();
      return bt - at;
    });

    return sorted;
  }, [works, searchTerm, sortMode]);

  const filteredGalleryWorks = useMemo(() => {
    const q = galleryQuery.trim().toLowerCase();
    const filtered = q
      ? galleryWorks.filter(w => (w.title || "").toLowerCase().includes(q))
      : galleryWorks;

    const sorted = [...filtered].sort((a, b) => {
      if (gallerySort === "title") return (a.title || "").localeCompare(b.title || "");
      // recent
      const createdAtA = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
      const createdAtB = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
      const at = createdAtA instanceof Date ? createdAtA.getTime() : new Date(createdAtA).getTime();
      const bt = createdAtB instanceof Date ? createdAtB.getTime() : new Date(createdAtB).getTime();
      return bt - at;
    });

    return sorted;
  }, [galleryWorks, galleryQuery, gallerySort]);

  const strokesRef = useRef([]);     // 전체 스트로크 기록
  const currentStrokeRef = useRef(null);
  const activePenRef = useRef(false); // 손바닥 터치 무시용
  // ✅ 드로잉 상태는 ref로 (stale 방지)
  const isDrawingRef = useRef(false);
  const activePointerIdRef = useRef(null);
  const activePointerTypeRef = useRef(null);
  const redoRef = useRef([]); // ✅ redo 스택

  const sizeRef = useRef({ width: 0, height: 0 });

  const goDraw = () => {
    const c = fractalCanvasRef.current;
    if (c) setBgSnapshot(c.toDataURL("image/png")); // ✅ 바탕 캡처
    goStage("draw");
  };

  // 캔버스 리사이즈 + 프랙탈 렌더 + 스트로크 다시그리기
  const redrawAll = () => {
    const stage = stageRef.current;
    if (!stage) return;

    // 프랙탈 바탕 렌더링 (그림 그리기 단계에서 bgSnapshot이 없을 때)
    if (makeStage === "draw" && !bgSnapshot) {
      const f = fractalRef.current;
      if (f) {
        const s1 = resizeCanvasToStage(f, stage);
        const fctx = f.getContext("2d");
        renderFractal(fctx, s1.width, s1.height, params);
      }
    }

    // 그림 그리기 캔버스 렌더링
    const d = drawCanvasRef.current || drawRef.current;
    if (!d) return;

    const s2 = resizeCanvasToStage(d, stage);
    sizeRef.current = { width: s2.width, height: s2.height };

    // 그림(스트로크) - 투명하게 지우고 다시 그리기
    const dctx = d.getContext("2d");
    dctx.clearRect(0, 0, s2.width, s2.height);
    
    // 완료된 strokes 그리기
    strokesRef.current.forEach(st => {
      const pixelPoints = (st.points || []).map(p => ({
        x: p.x * s2.width,
        y: p.y * s2.height
      }));
      drawStroke(dctx, { ...st, points: pixelPoints });
    });

    // 현재 그리는 stroke도 그리기
    if (currentStrokeRef.current) {
      const st = currentStrokeRef.current;
      const pixelPoints = (st.points || []).map(p => ({
        x: p.x * s2.width,
        y: p.y * s2.height
      }));
      drawStroke(dctx, { ...st, points: pixelPoints });
    }
  };

  // 그림 캔버스만 다시 그리기 (바탕은 그대로) - 실시간 드로잉용
  function redrawDrawCanvas() {
    const stage = stageRef.current;
    if (!stage) return;
    
    const c = drawCanvasRef.current || drawRef.current;
    if (!c) return;
    
    const s2 = resizeCanvasToStage(c, stage);
    sizeRef.current = { width: s2.width, height: s2.height };
    
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, s2.width, s2.height);

    // 완료된 strokes 그리기
    strokesRef.current.forEach(st => {
      const pixelPoints = (st.points || []).map(p => ({
        x: p.x * s2.width,
        y: p.y * s2.height
      }));
      drawStroke(ctx, { ...st, points: pixelPoints });
    });

    // 현재 그리는 stroke도 그리기
    if (currentStrokeRef.current) {
      const st = currentStrokeRef.current;
      const pixelPoints = (st.points || []).map(p => ({
        x: p.x * s2.width,
        y: p.y * s2.height
      }));
      drawStroke(ctx, { ...st, points: pixelPoints });
    }
  }

  const renderBg = useCallback(() => {
    const c = fractalCanvasRef.current;
    if (!c) return;
    if (makeStage !== "bg") return; // ✅ 바탕 만들기 단계에서만 렌더링

    const { width, height } = resizeCanvas(c);
    const ctx = c.getContext("2d");
    renderFractal(ctx, width, height, params);
  }, [params, makeStage]);

  useEffect(() => {
    if (makeStage === "bg") {
      // ✅ 바탕 만들기 단계일 때만 렌더링
      // 캔버스가 DOM에 마운트될 때까지 약간의 지연
      const timer = setTimeout(() => {
        requestAnimationFrame(() => {
          const c = fractalCanvasRef.current;
          if (c) {
            const { width, height } = resizeCanvas(c);
            const ctx = c.getContext("2d");
            renderFractal(ctx, width, height, params);
          }
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [makeStage, params]);

  useEffect(() => {
    if (makeStage !== "bg") return;
    const onResize = () => {
      requestAnimationFrame(() => {
        const c = fractalCanvasRef.current;
        if (c) {
          const { width, height } = resizeCanvas(c);
          const ctx = c.getContext("2d");
          renderFractal(ctx, width, height, params);
        }
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [makeStage, params]);

  // 그림 그리기 단계에서 프랙탈 바탕과 그림 렌더링
  useEffect(() => { 
    if (makeStage === "draw") {
      redrawAll(); 
    }
  }, [params, makeStage]);
  
  useEffect(() => {
    if (makeStage === "draw") {
      const onResize = () => redrawAll();
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }
  }, [makeStage]);

  // ===== Firestore 갤러리 작품 목록 불러오기 =====
  useEffect(() => {
    if (!classId) return;

    const q = query(
      collection(db, "classes", classId, "works"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setGalleryWorks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setGalleryError("");
      },
      (err) => {
        console.error(err);
        setGalleryError(err.message);
      }
    );

    return () => unsub();
  }, [classId]);

  // ===== 드로잉 이벤트 =====
  const getPointFromEvent = (e) => {
    const c = drawCanvasRef.current;
    if (!c) {
      return { x: 0, y: 0 };
    }
    const rect = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // 실제 픽셀 좌표 계산 (DPR 고려)
    const x = (e.clientX - rect.left) * dpr;
    const y = (e.clientY - rect.top) * dpr;
    
    // 캔버스 크기로 정규화 (0~1)
    const relativeX = Math.max(0, Math.min(1, x / (rect.width * dpr)));
    const relativeY = Math.max(0, Math.min(1, y / (rect.height * dpr)));
    
    return { x: relativeX, y: relativeY };
  };

  const startStroke = (pt) => {
    const stroke = {
      id: crypto.randomUUID(),
      mode: tool === "eraser" ? "erase" : tool === "highlighter" ? "highlighter" : "pen",
      tool,
      color: tool === "pen" ? penColor : tool === "highlighter" ? penColor : "#000000",
      size: tool === "pen" ? penSize : tool === "highlighter" ? highlighterSize : eraserSize,
      points: [pt],
    };
    currentStrokeRef.current = stroke;
    redoRef.current = [];
  };

  const addPoint = (pt) => {
    if (!currentStrokeRef.current) return;
    currentStrokeRef.current.points.push(pt);
  };

  const endStroke = () => {
    if (!currentStrokeRef.current) return;
    strokesRef.current.push(currentStrokeRef.current);
    currentStrokeRef.current = null;
    redrawDrawCanvas(); // stroke 확정 후 화면 다시 그리기
  };


  const canDraw = (e) => {
    if (e.pointerType === "touch") return false;
    if (e.pointerType === "pen") return true;
    if (e.pointerType === "mouse") return !!allowMouse;
    return !!allowMouse;
  };

  const onPointerDown = (e) => {
    if (makeStage !== "draw") return;
    if (!canDraw(e)) return;
    if (!drawCanvasRef.current) return;

    e.preventDefault();
    e.stopPropagation();
    
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch (err) {
      // 무시
    }

    activePointerIdRef.current = e.pointerId;
    activePointerTypeRef.current = e.pointerType;
    isDrawingRef.current = true;

    const pt = getPointFromEvent(e);
    startStroke(pt);
    redrawDrawCanvas();
  };

  const onPointerMove = (e) => {
    if (!isDrawingRef.current) return;
    if (activePointerIdRef.current !== null && activePointerIdRef.current !== e.pointerId) {
      return;
    }

    if (activePointerTypeRef.current === "mouse" && e.buttons === 0) {
      onPointerUp(e);
      return;
    }

    if (!canDraw(e)) return;
    if (!drawCanvasRef.current) return;

    e.preventDefault();
    e.stopPropagation();
    
    const pt = getPointFromEvent(e);
    addPoint(pt);
    redrawDrawCanvas();
  };

  const onPointerUp = (e) => {
    if (!isDrawingRef.current) return;
    
    isDrawingRef.current = false;
    activePointerIdRef.current = null;
    activePointerTypeRef.current = null;

    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch (err) {
      // 무시
    }
    
    endStroke();
    redrawDrawCanvas();
  };

  const undo = () => {
    if (strokesRef.current.length === 0) return;
    const last = strokesRef.current.pop();
    redoRef.current.push(last);
    const { width, height } = sizeRef.current;
    drawStrokes(drawRef.current.getContext("2d"), strokesRef.current, width, height);
  };

  const redo = () => {
    if (redoRef.current.length === 0) return;
    const next = redoRef.current.pop();
    strokesRef.current.push(next);
    const { width, height } = sizeRef.current;
    drawStrokes(drawRef.current.getContext("2d"), strokesRef.current, width, height);
  };

  const clearAll = () => {
    strokesRef.current = [];
    redoRef.current = [];
    const { width, height } = sizeRef.current;
    drawStrokes(drawRef.current.getContext("2d"), strokesRef.current, width, height);
  };

  // ===== 썸네일 생성 =====
  const makeThumbnailDataURL = (fractalCanvas, drawCanvas) => {
    if (!fractalCanvas && !drawCanvas) return "";
    
    // bgSnapshot이 있으면 이미지로 사용
    if (bgSnapshot) {
      const img = new Image();
      img.src = bgSnapshot;
      return makeThumbnail(img, drawCanvas, 320);
    }
    
    return makeThumbnail(fractalCanvas, drawCanvas, 320);
  };

  // ===== 저장/불러오기/내보내기 =====
  const saveWork = async () => {
    const t = (title || "").trim() || "이름 없는 작품";
    const nickname = (studentName || "").trim() || "";

    const credits = buildCredits({ title: t, params, studentName });
    
    // ✅ 사용자가 작성 중인 draft가 있으면 덮어쓰기
    if (presentationDraft) {
      // presentationDraft가 문자열이면 oneSentence에 저장
      if (typeof credits.presentation === 'object') {
        credits.presentation.oneSentence = presentationDraft;
      } else {
        credits.presentation = presentationDraft;
      }
    }

    // 썸네일 생성
    let thumbnail = "";
    try {
      thumbnail = makeThumbnailDataURL(
        bgSnapshot ? null : fractalRef.current,
        drawCanvasRef.current || drawRef.current
      );
    } catch (err) {
      console.warn("썸네일 생성 실패:", err);
    }

    // strokes 다운샘플링 및 크기 확인
    let processedStrokes = downsampleStrokes(strokesRef.current);
    const strokesSize = getStrokesSize(processedStrokes);

    // 1MiB (1048576 bytes) 제한 경고
    if (strokesSize > 800000) { // 약 800KB
      console.warn("⚠️ 스트로크 데이터가 큽니다:", strokesSize, "bytes (1MiB 제한: 1048576 bytes)");
      if (strokesSize > 1048576) {
        alert("⚠️ 경고: 스트로크 데이터가 너무 큽니다. 일부 점이 제거되었습니다.");
      }
    }

    // stroke/points 상한 확인
    if (processedStrokes.length > 500) {
      console.warn("⚠️ 스트로크 수가 많습니다:", processedStrokes.length, "(최대 500개)");
    }
    const totalPoints = processedStrokes.reduce((sum, s) => sum + (s.points?.length || 0), 0);
    if (totalPoints > 100000) {
      console.warn("⚠️ 전체 점 수가 많습니다:", totalPoints, "(권장: 100,000개 이하)");
    }

    try {
      await saveWorkToFirestore({
        title: t,
        nickname: nickname || "",
        fractalParams: params,
        strokes: processedStrokes,
        thumbnail: thumbnail || "", // 있으면
        credits: credits, // credits도 함께 저장
      });

      // 로컬 저장도 유지 (기존 기능)
      const work = {
        id: crypto.randomUUID(), // 임시 ID (로컬 저장용)
        createdAt: new Date().toISOString(),
        title: t,
        fractalParams: params,
        strokes: processedStrokes,
        credits,
        thumbnail,
      };

      const next = [work, ...works];
      setWorks(next);
      saveWorks(next);
      
      // ✅ workContext 업데이트
      if (onWorkContextChange) {
        onWorkContextChange({
          title: t,
          pri: params.pri,
          type: params.type,
          depth: params.depth,
        });
      }
      
      setGalleryError("");
      alert("✅ 갤러리에 저장 완료!");
      goStage("card");  // ✅ 저장→발표카드 흐름
    } catch (e) {
      console.error(e);
      setGalleryError(e?.message || "작품 저장에 실패했습니다.");
      alert("❌ Firestore 저장 실패: " + (e?.message ?? e));
    }
  };

  const loadWork = (work) => {
    // 1) 바탕 파라미터 세팅 → 프랙탈 캔버스가 다시 그려짐
    setParams(work.fractalParams);

    // 2) 그림 스트로크 세팅 → draw 캔버스 리드로우
    strokesRef.current = work.strokes || [];
    redrawAll(); // 너가 이미 가진 함수(투명 clearRect 기반)

    // 3) 제목/별명 UI도 채우고 싶으면
    setTitle(work.title || "");
    setStudentName(work.nickname || "");
    setWorkTitle(work.title || "");
    setNickname(work.nickname || "");

    // 4) 발표 내용 불러오기
    if (work.credits?.presentation) {
      // presentation이 객체면 oneSentence나 문자열로 변환, 문자열이면 그대로
      if (typeof work.credits.presentation === 'string') {
        setPresentationDraft(work.credits.presentation);
      } else if (work.credits.presentation.oneSentence) {
        setPresentationDraft(work.credits.presentation.oneSentence);
      } else {
        setPresentationDraft("");
      }
    } else {
      setPresentationDraft("");
    }

    // 5) 선택된 작품 설정
    setSelectedWork(work);
    setSelectedWorkId(work.id);
  };

  const updateSelectedWork = async () => {
    if (!selectedWork) return;
    
    const t = (workTitle || "").trim() || "이름 없는 작품";
    const n = (nickname || "").trim() || "";

    // strokes 다운샘플링
    let processedStrokes = downsampleStrokes(strokesRef.current);
    const strokesSize = getStrokesSize(processedStrokes);
    
    if (strokesSize > 800000) {
      console.warn("⚠️ 스트로크 데이터가 큽니다:", strokesSize, "bytes");
    }

    // credits 생성 (발표 내용 포함)
    const credits = buildCredits({ title: t, params: selectedWork.fractalParams || params, studentName: n });
    if (presentationDraft) {
      // presentationDraft가 문자열이면 oneSentence에 저장
      if (typeof credits.presentation === 'object') {
        credits.presentation.oneSentence = presentationDraft;
      } else {
        credits.presentation = presentationDraft;
      }
    }

    try {
      await saveWorkToFirestore({
        title: t,
        nickname: n,
        fractalParams: selectedWork.fractalParams || params,
        strokes: processedStrokes,
        thumbnail: selectedWork.thumbnail || "",
        credits: credits, // credits도 함께 저장
      });

      // 로컬 저장도 업데이트
      const updatedWork = {
        ...selectedWork,
        title: t,
        nickname: n,
        credits: credits,
      };
      const updatedWorks = works.map(w => w.id === selectedWork.id ? updatedWork : w);
      setWorks(updatedWorks);
      saveWorks(updatedWorks);
      setSelectedWork(updatedWork);

      setGalleryError("");
      alert("✅ 작품이 업데이트되었습니다!");
    } catch (e) {
      console.error(e);
      setGalleryError(e?.message || "작품 업데이트에 실패했습니다.");
      alert("❌ 업데이트 실패: " + (e?.message ?? e));
    }
  };

  // ✅ 작품 선택 시 자동으로 '그림 그리기' 단계로 이동
  const handleSelectWork = (w) => {
    loadWork(w);                 // ✅ 기존 불러오기 함수
    setSelectedWorkId(w.id);    // ✅ 선택된 작품 ID 저장
    goStage("draw"); // ✅ 바로 '그림 그리기'로 이동(보이게)
    setShowBgOverlay(false);     // ✅ 오버레이 숨김
  };

  const exportPNG = async () => {
    const f = fractalRef.current;
    const d = drawRef.current;
    const out = document.createElement("canvas");
    out.width = f.width;
    out.height = f.height;

    const octx = out.getContext("2d");
    octx.drawImage(f, 0, 0);
    octx.drawImage(d, 0, 0);

    const blob = await new Promise((r) => out.toBlob(r, "image/png"));
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "fractal_art").replaceAll(" ", "_")}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = (w) => {
    const blob = new Blob([JSON.stringify(w, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(w.title || "work").replaceAll(" ", "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = async (file) => {
    const text = await file.text();
    const w = JSON.parse(text);
    if (!w?.fractalParams) return alert("작품 JSON 형식이 아니에요.");
    const fixed = {
      id: w.id || crypto.randomUUID(),
      createdAt: w.createdAt || new Date().toISOString(),
      title: w.title || "가져온 작품",
      fractalParams: w.fractalParams,
      strokes: w.strokes || [],
    };
    const next = [fixed, ...works];
    setWorks(next);
    saveWorks(next);
    if (next[0]) handleSelectWork(next[0]); // ✅ 가져오자마자 첫 작품을 캔버스에 표시
    alert("가져오기 완료!");
  };

  return (
    <div className="makePage">
      <div className="makeHeader">
        <h2>
          {makeStage === "bg" && "① 바탕 만들기"}
          {makeStage === "draw" && "② 그림 그리기"}
          {makeStage === "card" && "③ 제목/발표 카드"}
        </h2>
        <div className="makeHeaderRight">
          <label className="importBtn">
            JSON 가져오기
            <input
              type="file"
              accept="application/json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importJSON(f);
                e.target.value = "";
              }}
            />
          </label>
          {makeStage === "draw" && (
            <button type="button" className="ghost" onClick={exportPNG}>PNG 저장</button>
          )}
        </div>
      </div>

      {/* 단계 간 이동 스테퍼 - hideStepper가 true면 숨김 */}
      {!hideStepper && (
        <div className="makeStepper">
          <button type="button" className={makeStage === "bg" ? "stage on" : "stage"} onClick={() => goStage("bg")}>
            ① 바탕 만들기
          </button>

          <button type="button" className={makeStage === "draw" ? "stage on" : "stage"} onClick={() => goStage("draw")}>
            ② 그림 그리기
          </button>

          <button type="button" className={makeStage === "card" ? "stage on" : "stage"} onClick={() => goStage("card")}>
            ③ 제목/발표 카드
          </button>
        </div>
      )}

      {/* ② 바탕 만들기 */}
      {makeStage === "bg" && (
        <div className="makeTwoCol">
          {/* 왼쪽: 설정 패널 */}
          <div className="makeLeft">
            <div className="panel">
              <div className="panelTitle">프랙탈 바탕(자동 생성)</div>

              <label className="control">
                프랙탈 종류
                <select
                  value={params.type}
                  onChange={(e) => {
                    setShowBgOverlay(false);
                    setParams((p) => ({ ...p, type: e.target.value }));
                  }}
                >
                  <option value="tree">나무(프랙탈 나무)</option>
                  <option value="sierpinski">삼각형(시어핀스키 삼각형)</option>
                  <option value="koch">눈송이(코흐 눈송이)</option>
                </select>
              </label>

              <label className="control">
                단계(깊이): <b>{params.depth}</b>
                <input
                  type="range"
                  min="0"
                  max="9"
                  value={params.depth}
                  onChange={(e) => {
                    setShowBgOverlay(false);
                    setParams((p) => ({ ...p, depth: Number(e.target.value) }));
                  }}
                />
              </label>

              <label className="control">
                프리(PRI) 번호
                <div className="row">
                  <input
                    value={params.pri}
                    onChange={(e) => {
                      setShowBgOverlay(false);
                      setParams((p) => ({ ...p, pri: e.target.value }));
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowBgOverlay(false);
                      setParams((p) => ({ ...p, pri: String(Math.floor(Math.random() * 9000 + 1000)) }));
                    }}
                  >
                    🎲
                  </button>
                </div>
                <div className="priHelp">
                  <b>PRI</b>는 "패턴 레시피 번호"예요. 같은 PRI면 같은 바탕이 다시 나와요!
                </div>
              </label>

              <label className="control row">
                선 색
                <input
                  type="color"
                  value={params.color}
                  onChange={(e) => {
                    setShowBgOverlay(false);
                    setParams((p) => ({ ...p, color: e.target.value }));
                  }}
                />
                배경
                <input
                  type="color"
                  value={params.bg}
                  onChange={(e) => {
                    setShowBgOverlay(false);
                    setParams((p) => ({ ...p, bg: e.target.value }));
                  }}
                />
              </label>

              {params.type === "tree" && (
                <>
                  <label className="control">
                    가지 벌어짐: <b>{params.angle}°</b>
                    <input
                      type="range"
                      min="10"
                      max="45"
                      value={params.angle}
                      onChange={(e) => {
                        setShowBgOverlay(false);
                        setParams((p) => ({ ...p, angle: Number(e.target.value) }));
                      }}
                    />
                  </label>

                  <label className="control">
                    가지 길이 비율: <b>{params.ratio.toFixed(2)}</b>
                    <input
                      type="range"
                      min="0.55"
                      max="0.85"
                      step="0.01"
                      value={params.ratio}
                      onChange={(e) => {
                        setShowBgOverlay(false);
                        setParams((p) => ({ ...p, ratio: Number(e.target.value) }));
                      }}
                    />
                  </label>
                </>
              )}

              <button type="button" className="primary" onClick={goDraw}>
                다음: 그림 그리기 ▶
              </button>
            </div>
          </div>

          {/* 오른쪽: 캔버스 미리보기 */}
          <div className="makeRight">
            <div className="panel">
              <div className="panelTitle">미리보기(바탕)</div>
              <div className="canvasBox big">
                <canvas ref={fractalCanvasRef} className="fractalCanvas" />
              </div>
              <div className="hintSmall">
                왼쪽 설정을 바꾸면 오른쪽 바탕이 바로 바뀌어요!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ③ 그림 그리기 */}
      {makeStage === "draw" && (
        <>
          {/* 캔버스 스테이지(2겹) */}
          <div className="stage drawStage" ref={stageRef}>
            {/* 프랙탈 바탕 레이어 (뒤) */}
            {bgSnapshot ? (
              <img src={bgSnapshot} className="bgImg bgLayer" alt="" />
            ) : (
              <canvas
                ref={fractalRef}
                className="bgLayer"
              />
            )}
            {/* 그림 그리기 레이어 (앞) */}
            <canvas
              ref={drawCanvasRef}
              className={`drawLayer ${makeStage === "draw" ? "drawing" : "view"}`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
          </div>

          {/* 도구 */}
          <div className="toolRow">
            <button type="button" className={`tool ${tool==="pen"?"on":""}`} onClick={() => setTool("pen")}>
              ✏️ 펜
            </button>
            <button type="button" className={`tool ${tool==="highlighter"?"on":""}`} onClick={() => setTool("highlighter")}>
              🖍️ 형광펜
            </button>
            <button type="button" className={`tool ${tool==="eraser"?"on":""}`} onClick={() => setTool("eraser")}>
              🧽 지우개
            </button>

            <button type="button" className="tool undoTool" onClick={undo}>↩ 되돌리기</button>
            <button type="button" className="tool" onClick={redo}>↪ 다시하기</button>
            <button type="button" className="tool" onClick={clearAll}>🗑 전체 지우기</button>

            <button
              type="button"
              className={`tool ${drawLock ? "on" : ""}`}
              onClick={() => setDrawLock(v => !v)}
              title="그릴 때는 잠금(🔒), 보기모드는 잠금 해제(🔓)"
            >
              {drawLock ? "🔒 그리기" : "🔓 보기"}
            </button>

            <button
              type="button"
              className={allowMouse ? "tool on" : "tool"}
              onClick={() => setAllowMouse(v => !v)}
            >
              🖱️ 마우스도
            </button>
          </div>

          {/* 색상 및 굵기 조절 */}
          <div className="row">
            <label className="mini">
              색 <input type="color" value={penColor} onChange={(e) => setPenColor(e.target.value)} />
            </label>

            {tool === "pen" ? (
              <>
                <button
                  type="button"
                  className={penSize <= 4 ? "tool chip on" : "tool chip"}
                  onClick={() => setPenSize(4)}
                >
                  얇게
                </button>
                <button
                  type="button"
                  className={penSize > 4 && penSize <= 10 ? "tool chip on" : "tool chip"}
                  onClick={() => setPenSize(8)}
                >
                  보통
                </button>
                <button
                  type="button"
                  className={penSize > 10 ? "tool chip on" : "tool chip"}
                  onClick={() => setPenSize(14)}
                >
                  굵게
                </button>
                <label className="mini">
                  <span className="toolLabel">세밀</span>
                  <input
                    type="range"
                    min="2"
                    max="18"
                    value={penSize}
                    onChange={(e) => setPenSize(Number(e.target.value))}
                  />
                </label>
              </>
            ) : tool === "highlighter" ? (
              <>
                <button
                  type="button"
                  className={highlighterSize <= 16 ? "tool chip on" : "tool chip"}
                  onClick={() => setHighlighterSize(16)}
                >
                  얇게
                </button>
                <button
                  type="button"
                  className={highlighterSize > 16 && highlighterSize <= 24 ? "tool chip on" : "tool chip"}
                  onClick={() => setHighlighterSize(20)}
                >
                  보통
                </button>
                <button
                  type="button"
                  className={highlighterSize > 24 ? "tool chip on" : "tool chip"}
                  onClick={() => setHighlighterSize(32)}
                >
                  굵게
                </button>
                <label className="mini">
                  <span className="toolLabel">세밀</span>
                  <input
                    type="range"
                    min="12"
                    max="40"
                    value={highlighterSize}
                    onChange={(e) => setHighlighterSize(Number(e.target.value))}
                  />
                </label>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={eraserSize <= 12 ? "tool chip on" : "tool chip"}
                  onClick={() => setEraserSize(12)}
                >
                  작게
                </button>
                <button
                  type="button"
                  className={eraserSize > 12 && eraserSize <= 20 ? "tool chip on" : "tool chip"}
                  onClick={() => setEraserSize(16)}
                >
                  보통
                </button>
                <button
                  type="button"
                  className={eraserSize > 20 ? "tool chip on" : "tool chip"}
                  onClick={() => setEraserSize(24)}
                >
                  크게
                </button>
                <label className="mini">
                  <span className="toolLabel">세밀</span>
                  <input
                    type="range"
                    min="8"
                    max="32"
                    value={eraserSize}
                    onChange={(e) => setEraserSize(Number(e.target.value))}
                  />
                </label>
              </>
            )}
          </div>

          {/* 작품 이름 + 저장 */}
          <div className="nameRow">
            <input
              className="titleInput"
              placeholder="작품 이름 (예: 겨울 숲)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              className="titleInput"
              placeholder="이름/별명(선택)"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
            />
            <button type="button" className="primary" onClick={saveWork}>작품 저장</button>
          </div>

          <button type="button" className="ghost" onClick={() => goStage("card")}>
            다음: 제목/발표 카드 ▶
          </button>
        </>
      )}

      {/* ④ 제목/발표 카드 */}
      {makeStage === "card" && (
        <div className="galleryTwoPane">
          {/* LEFT */}
          <section className="pane left">
            <div className="paneHeader">
              <div>
                <h3>우리반 갤러리</h3>
                <p className="muted">작품을 눌러서 불러오세요</p>
              </div>
              <input
                className="search"
                placeholder="제목 검색"
                value={galleryQuery}
                onChange={(e) => setGalleryQuery(e.target.value)}
              />
            </div>

            <div className="list">
              {filteredGalleryWorks.length === 0 ? (
                <div className="empty">아직 작품이 없어요 🙂</div>
              ) : (
                filteredGalleryWorks.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    className={`item ${selectedWork?.id === w.id ? "selected" : ""}`}
                    onClick={() => loadWork(w)}
                  >
                    <img className="thumb" src={w.thumbnail || "/images/placeholder.png"} alt="" />
                    <div className="info">
                      <div className="title">{w.title || "제목 없음"}</div>
                      <div className="meta">PRI {w.fractalParams?.pri} · 단계 {w.fractalParams?.depth}</div>
                    </div>
                    <div className="badge">{selectedWork?.id === w.id ? "선택" : ""}</div>
                  </button>
                ))
              )}
            </div>
          </section>

          {/* RIGHT */}
          <section className="pane right">
            <div className="paneHeader">
              <div>
                <h3>나의 작품</h3>
                <p className="muted">제목을 정하고 발표카드를 만들어요</p>
              </div>
            </div>

            {!selectedWork ? (
              <div className="empty big">왼쪽에서 작품을 선택해 주세요 👈</div>
            ) : (
              <>
                <div className="previewCard">
                  <img src={selectedWork.thumbnail || "/images/placeholder.png"} alt="" />
                </div>

                <div className="form">
                  <label>
                    작품 제목
                    <input 
                      value={workTitle} 
                      onChange={(e) => setWorkTitle(e.target.value)}
                      placeholder="작품 제목을 입력하세요"
                    />
                  </label>
                  <label>
                    이름/별명(선택)
                    <input 
                      value={nickname} 
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="이름 또는 별명을 입력하세요"
                    />
                  </label>
                  <label>
                    발표 내용
                    <textarea
                      className="presentationTextarea"
                      value={presentationDraft || ""}
                      onChange={(e) => setPresentationDraft(e.target.value)}
                      placeholder="작품에 대한 발표 내용을 작성하세요. 예: 내 작품은 프랙탈 나무를 바탕으로 그렸어요. 반복되는 가지 패턴이 특징이에요."
                      rows={6}
                    />
                  </label>
                </div>

                <div className="ctaRow">
                  <button className="btn ghost" onClick={() => goStage("draw")}>
                    ◀ 그림 수정
                  </button>
                  <button className="btn primary" onClick={updateSelectedWork}>
                    저장/업데이트
                  </button>
                  <button className="btn primary" onClick={() => goStage("finish")}>
                    다음 ▶
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      <div className="muted small">
        ✅ 프랙탈 바탕은 자동 생성(PRI/단계), 그림은 내가 펜으로 직접 그린 창작이에요.
      </div>
    </div>
  );
}
export default MakeFractal;

