// src/utils/fractalRenderer.js

export function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawTree(ctx, x, y, len, angleDeg, depth, params, rand) {
  if (depth <= 0) return;

  const angle = (angleDeg * Math.PI) / 180;
  const x2 = x + Math.cos(angle) * len;
  const y2 = y + Math.sin(angle) * len;

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  const jitter = (rand() - 0.5) * 6;
  const a = (params.angle ?? 25) + jitter;
  const ratio = params.ratio ?? 0.72;

  drawTree(ctx, x2, y2, len * ratio, angleDeg - a, depth - 1, params, rand);
  drawTree(ctx, x2, y2, len * ratio, angleDeg + a, depth - 1, params, rand);
}

function drawSierpinski(ctx, x, y, size, depth) {
  if (depth === 0) {
    ctx.beginPath();
    ctx.moveTo(x + size / 2, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x + size, y + size);
    ctx.closePath();
    ctx.fill();
    return;
  }
  const half = size / 2;
  drawSierpinski(ctx, x + half / 2, y, half, depth - 1);
  drawSierpinski(ctx, x, y + half, half, depth - 1);
  drawSierpinski(ctx, x + half, y + half, half, depth - 1);
}

function kochLine(ctx, x1, y1, x2, y2, depth) {
  if (depth === 0) {
    ctx.lineTo(x2, y2);
    return;
  }
  const dx = x2 - x1;
  const dy = y2 - y1;

  const xA = x1 + dx / 3;
  const yA = y1 + dy / 3;

  const xB = x1 + (dx * 2) / 3;
  const yB = y1 + (dy * 2) / 3;

  const angle = Math.PI / 3;
  const xC = xA + (dx / 3) * Math.cos(angle) - (dy / 3) * Math.sin(angle);
  const yC = yA + (dx / 3) * Math.sin(angle) + (dy / 3) * Math.cos(angle);

  kochLine(ctx, x1, y1, xA, yA, depth - 1);
  kochLine(ctx, xA, yA, xC, yC, depth - 1);
  kochLine(ctx, xC, yC, xB, yB, depth - 1);
  kochLine(ctx, xB, yB, x2, y2, depth - 1);
}

// tree 그릴 때: ratio/깊이 변화에도 전체 높이가 일정하게 보이도록 baseLen 보정
function calcBaseLen(targetHeight, depth, ratio) {
  const r = Math.max(0.01, Math.min(0.95, ratio)); // 안전범위
  if (Math.abs(r - 1) < 1e-6) return targetHeight / (depth + 1);
  const denom = 1 - Math.pow(r, depth + 1);
  return targetHeight * (1 - r) / denom;
}

// ✅ B) 바운딩 박스 자동 맞춤: 트리를 가상 좌표계로 생성
function buildTreeSegments({ depth, angleDeg, ratio }) {
  const segs = [];

  const r = Math.max(0.01, Math.min(0.99, ratio));
  const a = (angleDeg * Math.PI) / 180;

  function rec(x1, y1, x2, y2, len, theta, d) {
    // 선분 기록
    segs.push([x1, y1, x2, y2]);

    if (d <= 0) return;

    const nx = x2;
    const ny = y2;
    const childLen = len * r;

    // 좌/우 가지
    const t1 = theta - a;
    const t2 = theta + a;

    const x3 = nx + Math.cos(t1) * childLen;
    const y3 = ny + Math.sin(t1) * childLen;
    const x4 = nx + Math.cos(t2) * childLen;
    const y4 = ny + Math.sin(t2) * childLen;

    rec(nx, ny, x3, y3, childLen, t1, d - 1);
    rec(nx, ny, x4, y4, childLen, t2, d - 1);
  }

  // 시작: (0,0)에서 위로 1만큼 (좌표계는 나중에 fit)
  rec(0, 0, 0, -1, 1, -Math.PI / 2, depth);

  return segs;
}

// ✅ 트리를 캔버스에 자동으로 꽉 맞춰서 그리기
function drawTreeAutoFit(ctx, w, h, params) {
  const segs = buildTreeSegments({
    depth: params.depth,
    angleDeg: params.angle ?? 25,
    ratio: params.ratio ?? 0.72,
  });

  // 1) bbox
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x1, y1, x2, y2] of segs) {
    minX = Math.min(minX, x1, x2);
    minY = Math.min(minY, y1, y2);
    maxX = Math.max(maxX, x1, x2);
    maxY = Math.max(maxY, y1, y2);
  }

  const bw = Math.max(1e-6, maxX - minX);
  const bh = Math.max(1e-6, maxY - minY);

  // 2) fit scale (padding 10%)
  const pad = 0.10;
  const sx = (w * (1 - pad * 2)) / bw;
  const sy = (h * (1 - pad * 2)) / bh;
  const s = Math.min(sx, sy);

  // 3) center translate
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // 배경
  ctx.fillStyle = params.bg || "#fff";
  ctx.fillRect(0, 0, w, h);

  // fit transform
  ctx.translate(w / 2, h / 2);
  ctx.scale(s, s);
  ctx.translate(-cx, -cy);

  // 선 스타일
  ctx.strokeStyle = params.color || "#4f46e5";
  ctx.lineWidth = 2 / s; // ✅ 확대/축소해도 두께 유지 느낌
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // draw
  ctx.beginPath();
  for (const [x1, y1, x2, y2] of segs) {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * 캔버스에 "이미 그려진" 콘텐츠를 bbox 기준으로 중앙 정렬한다.
 * - 기존 draw 로직 수정 없이, draw 이후에 호출하면 됨
 * - 투명 배경 기준(알파>0 픽셀)을 스캔하여 bbox 계산
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement} canvas
 * @param {{ step?: number, alphaThreshold?: number, padding?: number }} options
 */
function centerCanvasContent(ctx, canvas, options = {}) {
  const w = canvas.width;
  const h = canvas.height;

  const step = Math.max(1, options.step ?? 2); // 성능용: 1이면 정밀, 2~4면 빠름
  const alphaThreshold = options.alphaThreshold ?? 1; // 0~255
  const padding = options.padding ?? 0; // bbox에 여백 추가(픽셀)

  // 현재 캔버스 픽셀 읽기
  let imageData;
  try {
    imageData = ctx.getImageData(0, 0, w, h);
  } catch (e) {
    // CORS 등으로 getImageData가 막히는 환경이면 작동 불가
    return;
  }

  const data = imageData.data;

  let minX = w, minY = h, maxX = -1, maxY = -1;

  // 알파 채널 스캔(다운샘플링 step)
  for (let y = 0; y < h; y += step) {
    const row = y * w * 4;
    for (let x = 0; x < w; x += step) {
      const idx = row + x * 4;
      const a = data[idx + 3];
      if (a >= alphaThreshold) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  // 그림이 전혀 없으면 종료
  if (maxX < 0 || maxY < 0) return;

  // padding 적용 + 클램프
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(w - 1, maxX + padding);
  maxY = Math.min(h - 1, maxY + padding);

  // bbox 중심
  const boxCx = (minX + maxX) / 2;
  const boxCy = (minY + maxY) / 2;

  // 캔버스 중심
  const targetCx = w / 2;
  const targetCy = h / 2;

  // 이동량(정수 반올림)
  const dx = Math.round(targetCx - boxCx);
  const dy = Math.round(targetCy - boxCy);

  // 이미 거의 중앙이면 스킵(미세 이동 방지)
  if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) return;

  // 임시 캔버스에 현재 내용 복사 후, 원본에 이동하여 다시 그리기
  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  const tctx = tmp.getContext("2d");

  // 원본 내용을 통째로 복사
  tctx.putImageData(imageData, 0, 0);

  // 원본 비우고 이동해서 다시 그리기
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(tmp, dx, dy);
}

export function renderFractal(ctx, w, h, params) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = params.bg || "#ffffff";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = params.color || "#4f46e5";
  ctx.fillStyle = params.color || "#4f46e5";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const rand = mulberry32(hashSeed(String(params.pri ?? "1234")));

  if (params.type === "tree") {
    drawTreeAutoFit(ctx, w, h, params);
  } else if (params.type === "sierpinski") {
    const size = Math.min(w, h) * 0.75;
    const x = (w - size) / 2;
    const y = h * 0.12;
    drawSierpinski(ctx, x, y, size, params.depth);
  } else if (params.type === "koch") {
    const margin = w * 0.12;
    const y = h * 0.55;
    ctx.beginPath();
    ctx.moveTo(margin, y);
    kochLine(ctx, margin, y, w - margin, y, params.depth);
    ctx.stroke();
  }

  // 프랙탈 그리기 완료 후 중앙 정렬
  if (ctx.canvas) {
    centerCanvasContent(ctx, ctx.canvas, { step: 2, padding: 4 });
  }
}
