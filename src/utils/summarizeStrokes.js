// src/utils/summarizeStrokes.js
export function summarizeStrokes(strokes) {
  const s = Array.isArray(strokes) ? strokes : [];
  const numStrokes = s.length;
  const totalPoints = s.reduce((sum, st) => sum + (st.points?.length || 0), 0);

  // pen/eraser 비율
  const penCount = s.filter(st => st.tool === "pen").length;
  const eraserCount = s.filter(st => st.tool === "eraser").length;

  // points는 0~1 정규화 기준
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const st of s) {
    for (const p of (st.points || [])) {
      const x = Number(p.x ?? 0), y = Number(p.y ?? 0);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  const boxW = Math.max(0, maxX - minX);
  const boxH = Math.max(0, maxY - minY);

  return `strokes=${numStrokes}, points=${totalPoints}, pen=${penCount}, eraser=${eraserCount}, 범위 가로${boxW.toFixed(2)}×세로${boxH.toFixed(2)}(0~1)`;
}

