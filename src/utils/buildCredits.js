export function buildCredits({ title, params, studentName = "" }) {
  const safeTitle = (title || "").trim() || "이름 없는 작품";
  const who = (studentName || "").trim() || "익명";

  return {
    title: safeTitle,
    author: who,
    pri: String(params.pri ?? ""),
    fractalType: params.type,
    depth: params.depth,
    noteMine: "펜으로 그린 그림(선/색/아이디어) + 작품 제목",
    noteTool: "앱이 프랙탈 바탕을 자동 생성(PRI 레시피) / 프리가 생각 정리 질문을 도와줌",
    shareOk: true,

    // ✅ 발표 템플릿(학생이 채우는 데이터)
    presentation: {
      mode: "choice", // "choice" | "fill"
      rulePick: "",   // 반복 | 대칭 | 부분-전체 닮음
      myPartPick: "", // 선택형: "펜으로 그린 그림" 등
      myPartText: "", // 빈칸형
      favorite: "",
      oneSentence: "",
      toolLine: "프랙탈 바탕은 앱이 만들었고, 그림과 제목은 내가 만들었어요.",
    },
  };
}
