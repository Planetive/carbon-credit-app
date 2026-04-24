export type TrendHoverPoint = {
  x: number;
  y: number;
  sector: string;
  value: number;
  label: string;
  color: string;
};

export const DEFAULT_TREND_CHART = {
  viewWidth: 980,
  viewHeight: 360,
  xMin: 52,
  xMax: 960,
  yMin: 28,
  yMax: 300,
  xLabelY: 332,
} as const;

export const pickNearestHoverPoint = (
  points: TrendHoverPoint[],
  x: number,
  y: number,
  hoverRadius: number,
): TrendHoverPoint | null => {
  if (!points.length) return null;

  let nearest = points[0];
  let minDistSq = Number.POSITIVE_INFINITY;

  for (const point of points) {
    const dx = point.x - x;
    const dy = point.y - y;
    const distSq = dx * dx + dy * dy;
    if (distSq < minDistSq) {
      minDistSq = distSq;
      nearest = point;
    }
  }

  return minDistSq <= hoverRadius * hoverRadius ? nearest : null;
};
