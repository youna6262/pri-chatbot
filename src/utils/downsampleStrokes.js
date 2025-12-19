// strokes 다운샘플링: 1MiB 제한 방지
export function downsampleStrokes(strokes, maxStrokes = 500, maxPointsPerStroke = 200) {
  if (!Array.isArray(strokes)) return [];

  // 전체 stroke 수 제한
  let processed = strokes.slice(0, maxStrokes);

  // 각 stroke의 points 수 제한 및 간격 샘플링
  processed = processed.map((stroke) => {
    if (!stroke.points || !Array.isArray(stroke.points)) {
      return stroke;
    }

    let points = stroke.points;

    // points 수가 maxPointsPerStroke보다 크면 간격 샘플링
    if (points.length > maxPointsPerStroke) {
      const step = Math.ceil(points.length / maxPointsPerStroke);
      points = points.filter((_, i) => i % step === 0 || i === points.length - 1);
    }

    return {
      ...stroke,
      points,
    };
  });

  return processed;
}

// strokes JSON 크기 확인 (바이트 단위)
export function getStrokesSize(strokes) {
  try {
    return new Blob([JSON.stringify(strokes)]).size;
  } catch (e) {
    return 0;
  }
}







