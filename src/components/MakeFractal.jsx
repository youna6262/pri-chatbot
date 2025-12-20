import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./MakeFractal.css";
import { renderFractal } from "../utils/fractalRenderer";
import { buildCredits } from "../utils/buildCredits";
import { db, auth } from "../firebase/firebaseApp";
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from "firebase/firestore";
import { makeThumbnail } from "../utils/makeThumbnail";
import { downsampleStrokes, getStrokesSize } from "../utils/downsampleStrokes";
import FractalDrawCanvas, { TOOLS, THICKNESS, DEFAULT_COLOR_BY_TOOL } from "./FractalDrawCanvas";
import { initFractalQA, initFractalQAPrompts, initFractalQAChat } from "../utils/fractalQA";

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

// 드로잉 관련 함수는 FractalDrawCanvas 컴포넌트에서 처리

export function MakeFractal({
  onMakeStageChange,
  onWorkContextChange,
  onNavigateToChat,
  onGoChat,
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
  const fractalDrawCanvasRef = useRef(null); // FractalDrawCanvas ref

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
  const [tool, setTool] = useState(TOOLS.PEN);
  const [penColor, setPenColor] = useState(DEFAULT_COLOR_BY_TOOL[TOOLS.PEN]);
  const [highlighterColor, setHighlighterColor] = useState(DEFAULT_COLOR_BY_TOOL[TOOLS.HIGHLIGHTER]);
  const [coloredPencilColor, setColoredPencilColor] = useState(DEFAULT_COLOR_BY_TOOL[TOOLS.COLORED_PENCIL]);
  const [thicknessMode, setThicknessMode] = useState(THICKNESS.NORMAL);
  const [detail, setDetail] = useState(50); // 0~100
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

  // 드로잉은 FractalDrawCanvas 컴포넌트에서 처리

  const goDraw = () => {
    const c = fractalCanvasRef.current;
    if (c) setBgSnapshot(c.toDataURL("image/png")); // ✅ 바탕 캡처
    goStage("draw");
  };

  // 드로잉은 FractalDrawCanvas 컴포넌트에서 처리

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

  // 드로잉은 FractalDrawCanvas 컴포넌트에서 처리

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

  // FractalDrawCanvas ref는 위에서 이미 선언됨

  // ===== 프랙탈 QA 컴포넌트 파라미터 동기화 =====
  useEffect(() => {
    // params가 변경될 때마다 window.fractalParams 업데이트
    window.fractalParams = {
      fractalType: params.type, // "tree" | "sierpinski" | "koch"
      angle: params.angle,
      ratio: params.ratio,
      depth: params.depth
    };
    // 이벤트 발생하여 QA 컴포넌트에 알림
    window.dispatchEvent(new Event("fractalParamsChange"));
  }, [params.angle, params.ratio, params.depth, params.type]);

  // ===== 프랙탈 QA 컴포넌트 초기화 =====
  useEffect(() => {
    if (makeStage === "draw") {
      // DOM이 준비될 때까지 약간의 지연
      const timer = setTimeout(() => {
        initFractalQAPrompts(); // 질문 버튼 패널
        initFractalQAChat(); // 채팅 패널
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [makeStage]);

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
      const bgCanvas = fractalDrawCanvasRef.current?.bgRef?.current || null;
      const drawCanvas = fractalDrawCanvasRef.current?.drawRef?.current || null;
      
      if (bgSnapshot) {
        const img = new Image();
        img.src = bgSnapshot;
        thumbnail = makeThumbnail(img, drawCanvas, 320);
      } else if (bgCanvas) {
        thumbnail = makeThumbnail(bgCanvas, drawCanvas, 320);
      } else if (drawCanvas) {
        thumbnail = makeThumbnail(null, drawCanvas, 320);
      }
    } catch (err) {
      console.warn("썸네일 생성 실패:", err);
    }

    // strokes는 FractalDrawCanvas에서 직접 가져올 수 없으므로 빈 배열로 처리
    // (향후 FractalDrawCanvas에서 strokes를 export하는 기능 추가 필요)
    let processedStrokes = [];
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
        strokes: processedStrokes, // 빈 배열 (FractalDrawCanvas는 이미지 기반)
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

    // 2) 그림은 FractalDrawCanvas에서 이미지로 처리되므로 strokes는 사용하지 않음
    // strokesRef.current = work.strokes || [];
    // redrawAll(); // FractalDrawCanvas가 자동으로 처리

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

    // strokes는 FractalDrawCanvas에서 직접 가져올 수 없으므로 빈 배열로 처리
    let processedStrokes = [];

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
    const bgCanvas = fractalDrawCanvasRef.current?.bgRef?.current || null;
    const drawCanvas = fractalDrawCanvasRef.current?.drawRef?.current || null;
    
    if (!bgCanvas && !drawCanvas && !bgSnapshot) {
      alert("내보낼 캔버스가 없습니다.");
      return;
    }

    const out = document.createElement("canvas");
    
    if (bgCanvas) {
      out.width = bgCanvas.width;
      out.height = bgCanvas.height;
    } else if (drawCanvas) {
      out.width = drawCanvas.width;
      out.height = drawCanvas.height;
    } else {
      return;
    }

    const octx = out.getContext("2d");
    
    // 배경 그리기
    if (bgCanvas) {
      octx.drawImage(bgCanvas, 0, 0);
    } else if (bgSnapshot) {
      const img = new Image();
      img.onload = () => {
        octx.drawImage(img, 0, 0, out.width, out.height);
        if (drawCanvas) octx.drawImage(drawCanvas, 0, 0);
        finishExport();
      };
      img.src = bgSnapshot;
      return;
    }
    
    // 그림 그리기
    if (drawCanvas) octx.drawImage(drawCanvas, 0, 0);

    const finishExport = () => {
      out.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(title || "fractal_art").replaceAll(" ", "_")}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    
    finishExport();
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
          {makeStage === "finish" && "④ 마무리/공유"}
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

          <button
            type="button"
            className={makeStage === "finish" ? "stage on" : "stage"}
            onClick={() => goStage("finish")}
          >
            ④ 마무리/공유
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
                  id="fractalType"
                  value={params.type}
                  onChange={(e) => {
                    setShowBgOverlay(false);
                    setParams((p) => ({ ...p, type: e.target.value }));
                    window.dispatchEvent(new Event("fractalParamsChange"));
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
                  id="depth"
                  type="range"
                  min="0"
                  max="9"
                  value={params.depth}
                  onChange={(e) => {
                    setShowBgOverlay(false);
                    setParams((p) => ({ ...p, depth: Number(e.target.value) }));
                    window.dispatchEvent(new Event("fractalParamsChange"));
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
                아래의 설정을 바꾸면 위의 바탕이 바로 바뀌어요
              </div>
              
              {/* 하단 컨트롤: 선색/배경/각도/비율/다음 버튼 */}
              <div className="controlsUnderPreview">
                {/* 선색 + 면색 */}
                <div className="color-row">
                  <div className="color-item">
                    <label>✏️ 선색</label>
                    <input
                      type="color"
                      value={params.color}
                      onChange={(e) => {
                        setShowBgOverlay(false);
                        setParams((p) => ({ ...p, color: e.target.value }));
                      }}
                    />
                  </div>
                  <div className="color-item">
                    <label>🎨 면색</label>
                    <input
                      type="color"
                      value={params.bg}
                      onChange={(e) => {
                        setShowBgOverlay(false);
                        setParams((p) => ({ ...p, bg: e.target.value }));
                      }}
                    />
                  </div>
                </div>

                {/* 슬라이더 두 개 한 줄 */}
                {params.type === "tree" && (
                  <div className="slider-row-double">
                    <div className="slider-item">
                      <label>🌿 벌어짐 각도</label>
                      <span className="value">{params.angle}°</span>
                      <input
                        id="angle"
                        type="range"
                        min="10"
                        max="45"
                        value={params.angle}
                        onChange={(e) => {
                          setShowBgOverlay(false);
                          setParams((p) => ({ ...p, angle: Number(e.target.value) }));
                          window.dispatchEvent(new Event("fractalParamsChange"));
                        }}
                      />
                    </div>

                    <div className="slider-item">
                      <label>📏 길이 비율</label>
                      <span className="value">{params.ratio.toFixed(2)}</span>
                      <input
                        id="ratio"
                        type="range"
                        min="0.55"
                        max="0.85"
                        step="0.01"
                        value={params.ratio}
                        onChange={(e) => {
                          setShowBgOverlay(false);
                          setParams((p) => ({ ...p, ratio: Number(e.target.value) }));
                          window.dispatchEvent(new Event("fractalParamsChange"));
                        }}
                      />
                    </div>
                  </div>
                )}

                <button type="button" className="primary" onClick={goDraw}>
                  다음: 그림 그리기 ▶
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ③ 그림 그리기 */}
      {makeStage === "draw" && (
        <div className="step2Grid">
          {/* 좌측: 도구/설정 패널 */}
          <aside className="tools">
            <div className="panel">
              <div className="panelTitle">도구/설정</div>

              {/* 도구 */}
              <div className="toolRow">
                <button type="button" className={`tool ${tool===TOOLS.PEN?"on":""}`} onClick={() => {
                  setTool(TOOLS.PEN);
                  setPenColor(DEFAULT_COLOR_BY_TOOL[TOOLS.PEN]);
                }}>
                  ✏️ 펜
                </button>
                <button type="button" className={`tool ${tool===TOOLS.HIGHLIGHTER?"on":""}`} onClick={() => {
                  setTool(TOOLS.HIGHLIGHTER);
                  setHighlighterColor(DEFAULT_COLOR_BY_TOOL[TOOLS.HIGHLIGHTER]);
                }}>
                  🖍️ 형광펜
                </button>
                <button type="button" className={`tool ${tool===TOOLS.COLORED_PENCIL?"on":""}`} onClick={() => {
                  setTool(TOOLS.COLORED_PENCIL);
                  setColoredPencilColor(DEFAULT_COLOR_BY_TOOL[TOOLS.COLORED_PENCIL]);
                }}>
                  ✏️ 색연필
                </button>
                <button type="button" className={`tool ${tool===TOOLS.ERASER?"on":""}`} onClick={() => setTool(TOOLS.ERASER)}>
                  🧽 지우개
                </button>

                <button type="button" className="tool undoTool" onClick={() => fractalDrawCanvasRef.current?.undo?.()}>↩ 되돌리기</button>
                <button type="button" className="tool" onClick={() => fractalDrawCanvasRef.current?.redo?.()}>↪ 다시하기</button>
                <button type="button" className="tool" onClick={() => fractalDrawCanvasRef.current?.clearAll?.()}>🗑 전체 지우기</button>

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
                  색{" "}
                  <input
                    type="color"
                    value={
                      tool === TOOLS.PEN ? penColor :
                      tool === TOOLS.HIGHLIGHTER ? highlighterColor :
                      tool === TOOLS.COLORED_PENCIL ? coloredPencilColor :
                      "#000000"
                    }
                    onChange={(e) => {
                      if (tool === TOOLS.PEN) setPenColor(e.target.value);
                      else if (tool === TOOLS.HIGHLIGHTER) setHighlighterColor(e.target.value);
                      else if (tool === TOOLS.COLORED_PENCIL) setColoredPencilColor(e.target.value);
                    }}
                  />
                </label>

                {/* 굵기 버튼 (모든 도구 공통) */}
                <button
                  type="button"
                  className={thicknessMode === THICKNESS.THIN ? "tool chip on" : "tool chip"}
                  onClick={() => setThicknessMode(THICKNESS.THIN)}
                >
                  얇게
                </button>
                <button
                  type="button"
                  className={thicknessMode === THICKNESS.NORMAL ? "tool chip on" : "tool chip"}
                  onClick={() => setThicknessMode(THICKNESS.NORMAL)}
                >
                  보통
                </button>
                <button
                  type="button"
                  className={thicknessMode === THICKNESS.THICK ? "tool chip on" : "tool chip"}
                  onClick={() => setThicknessMode(THICKNESS.THICK)}
                >
                  굵게
                </button>
                <label className="mini">
                  <span className="toolLabel">세밀</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={detail}
                    onChange={(e) => setDetail(Number(e.target.value))}
                  />
                </label>
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
            </div>
          </aside>

          {/* 중앙: 캔버스 */}
          <main className="canvas">
            <div className="canvasBox">
              <FractalDrawCanvas
                ref={fractalDrawCanvasRef}
                fractalImageUrl={bgSnapshot}
                initialTool={tool}
                penColor={penColor}
                highlighterColor={highlighterColor}
                coloredPencilColor={coloredPencilColor}
                thicknessMode={thicknessMode}
                detail={detail}
                onToolChange={setTool}
                showToolbar={false}
              />
            </div>
          </main>

          {/* 하단: 채팅 영역 */}
          <section className="chat">
            <div className="chatQuick">
              <div id="fractal-qa-prompts-root"></div>
            </div>

            <div className="chatMain">
              <div id="fractal-qa-chat-root"></div>
            </div>
          </section>
        </div>
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

      {/* ⑤ 마무리/공유(채팅 이동) */}
      {makeStage === "finish" && (
        <div className="finishWrap">
          <div className="panel">
            <div className="panelTitle">④ 마무리: 공유 & 챗봇으로 정리</div>

            {!selectedWork ? (
              <div className="empty big">
                먼저 ③에서 작품을 선택하고 제목/발표 내용을 저장해 주세요 🙂
              </div>
            ) : (
              <>
                <div className="finishGrid">
                  <div className="finishPreview">
                    <img
                      src={selectedWork.thumbnail || "/images/placeholder.png"}
                      alt=""
                      className="finishImg"
                    />
                    <div className="finishMeta">
                      <div className="finishTitle">
                        {workTitle || selectedWork.title || "제목 없음"}
                      </div>
                      <div className="finishSub">
                        {nickname || selectedWork.nickname ? `이름/별명: ${nickname || selectedWork.nickname}` : "이름/별명: (없음)"}
                      </div>
                      <div className="finishSub">
                        프랙탈: {selectedWork.fractalParams?.type} · PRI {selectedWork.fractalParams?.pri} · 단계 {selectedWork.fractalParams?.depth}
                      </div>
                    </div>
                  </div>

                  <div className="finishText">
                    <div className="label">발표 내용</div>
                    <div className="speechBox">
                      {presentationDraft?.trim()
                        ? presentationDraft
                        : "③에서 발표 내용을 작성하면 여기서 한 번 더 확인할 수 있어요."}
                    </div>

                    <div className="finishBtns">
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => goStage("card")}
                      >
                        ◀ 발표카드 수정
                      </button>

                      <button
                        type="button"
                        className="btn"
                        onClick={exportPNG}
                      >
                        PNG 저장
                      </button>

                      <button
                        type="button"
                        className="btn primary"
                        onClick={() => {
                          // ✅ 부모가 채팅에서 작품 컨텍스트를 쓰면 여기서도 한 번 더 확실히 넘겨주기
                          onWorkContextChange?.({
                            title: workTitle || selectedWork.title,
                            pri: selectedWork.fractalParams?.pri,
                            type: selectedWork.fractalParams?.type,
                            depth: selectedWork.fractalParams?.depth,
                          });
                          // ✅ 챗봇 탭으로 이동 (우선순위: onGoChat > onNavigateToChat)
                          if (onGoChat) {
                            onGoChat();
                          } else {
                            onNavigateToChat?.();
                          }
                        }}
                      >
                        ✨🤖 챗봇으로 마무리(원리+제목+AI윤리)
                      </button>
                    </div>

                    <div className="muted small" style={{ marginTop: 10 }}>
                      챗봇에서: (1) 프랙탈 원리 정리 → (2) 제목 다듬기 → (3) AI 윤리 한 줄 마무리 순서로 진행하면 좋아요.
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {makeStage !== "draw" && (
        <div className="muted small">
          ✅ 프랙탈 바탕은 자동 생성(PRI/단계), 그림은 내가 펜으로 직접 그린 창작이에요.
        </div>
      )}
    </div>
  );
}
export default MakeFractal;
