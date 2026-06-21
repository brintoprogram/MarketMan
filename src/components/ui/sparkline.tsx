import { Skeleton } from '@/components/ui/skeleton';

interface SparklineProps {
  points: number[];
  positive?: boolean;
  height?: number;
  width?: number;
  className?: string;
}

export function Sparkline({
  points,
  positive = true,
  height = 44,
  width = 116,
  className
}: SparklineProps) {
  // Brief: empty = não renderiza linha; mostra barra shimmer.
  if (!points || points.length < 2) {
    return (
      <Skeleton
        style={{ height: 28, width }}
        className={className}
      />
    );
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = i * step;
    const y = height - ((p - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });

  const linePath = coords
    .map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`))
    .join(' ');
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  // Cor por direção (semântica)
  const stroke = positive ? 'var(--up)' : 'var(--down)';
  // Gradient mesma cor, opacity 0.18 → 0
  const fillTop = positive
    ? 'rgba(5, 150, 105, 0.18)'
    : 'rgba(225, 29, 72, 0.18)';
  const fillBottom = positive
    ? 'rgba(5, 150, 105, 0)'
    : 'rgba(225, 29, 72, 0)';
  const gradId = `spark-${positive ? 'up' : 'down'}-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillTop} />
          <stop offset="100%" stopColor={fillBottom} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
