interface SparklineProps {
  points: number[];
  positive?: boolean;
  height?: number;
  width?: number;
  className?: string;
}

export function Sparkline({ points, positive = true, height = 36, width = 120, className }: SparklineProps) {
  if (!points || points.length < 2) {
    return <div style={{ height, width }} className={className} />;
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

  const linePath = coords.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(' ');
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  const stroke = positive ? '#059669' : '#e11d48';
  const fillStart = positive ? 'rgba(16,185,129,0.20)' : 'rgba(244,63,94,0.20)';
  const fillEnd = positive ? 'rgba(16,185,129,0.00)' : 'rgba(244,63,94,0.00)';
  const gradId = `spark-${positive ? 'pos' : 'neg'}-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillStart} />
          <stop offset="100%" stopColor={fillEnd} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
