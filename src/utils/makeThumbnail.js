// src/utils/makeThumbnail.js
// 바탕 캔버스(bg) + 그림 캔버스(draw)를 합쳐서 썸네일 생성

export function makeThumbnail(bgSource, drawCanvas, maxWidth = 320) {
  if (!bgSource && !drawCanvas) return "";

  const thumb = document.createElement("canvas");
  
  // 원본 크기 계산 (Image 또는 Canvas 모두 지원)
  const bgWidth = bgSource?.width || bgSource?.naturalWidth || drawCanvas?.width || 800;
  const bgHeight = bgSource?.height || bgSource?.naturalHeight || drawCanvas?.height || 600;
  const aspectRatio = bgWidth / bgHeight;
  
  // 썸네일 크기 계산 (maxWidth 기준)
  thumb.width = maxWidth;
  thumb.height = Math.round(maxWidth / aspectRatio);
  
  const tctx = thumb.getContext("2d");
  
  // 배경색 (흰색)
  tctx.fillStyle = "#ffffff";
  tctx.fillRect(0, 0, thumb.width, thumb.height);
  
  // 바탕 프랙탈 그리기 (Image 또는 Canvas 모두 지원)
  if (bgSource) {
    tctx.drawImage(bgSource, 0, 0, thumb.width, thumb.height);
  }
  
  // 그림 레이어 그리기
  if (drawCanvas) {
    tctx.drawImage(drawCanvas, 0, 0, thumb.width, thumb.height);
  }
  
  return thumb.toDataURL("image/png", 0.8); // 품질 80%
}

