interface Point {
  label: string;
  value: number;
}

interface Props {
  points: Point[];
  threshold?: number;
  height?: number;
  legend?: { primary: string; secondary?: string };
}

export function AreaChart({ points, threshold, height = 190, legend }: Props) {
  if (points.length === 0) {
    return <div className="grid h-40 place-items-center text-sm text-slate-400">No data yet</div>;
  }

  const width = 720;
  const padX = 8;
  const padTop = 12;
  const padBottom = 26;
  const max = Math.max(...points.map((p) => p.value), threshold ?? 0) * 1.15 || 1;
  const innerWidth = width - padX * 2;
  const innerHeight = height - padTop - padBottom;
  const step = points.length > 1 ? innerWidth / (points.length - 1) : 0;

  const coords = points.map((point, index) => ({
    x: padX + index * step,
    y: padTop + innerHeight - (point.value / max) * innerHeight,
    ...point,
  }));

  const line = coords
    .map((point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      const previous = coords[index - 1];
      const cx = (previous.x + point.x) / 2;
      return `C ${cx} ${previous.y}, ${cx} ${point.y}, ${point.x} ${point.y}`;
    })
    .join(" ");

  const area = `${line} L ${coords[coords.length - 1].x} ${padTop + innerHeight} L ${coords[0].x} ${padTop + innerHeight} Z`;
  const thresholdY =
    threshold !== undefined
      ? padTop + innerHeight - (Math.min(threshold, max) / max) * innerHeight
      : null;

  return (
    <div>
      {legend ? (
        <div className="mb-3 flex items-center gap-5 text-xs text-slate-500">
          <span className="flex items-center gap-2">
            <span className="h-0.5 w-5 rounded bg-brand-500" /> {legend.primary}
          </span>
          {legend.secondary ? (
            <span className="flex items-center gap-2">
              <span className="h-0.5 w-5 border-t border-dashed border-slate-400" />{" "}
              {legend.secondary}
            </span>
          ) : null}
        </div>
      ) : null}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#14B8A6" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((fraction) => (
          <line
            key={fraction}
            x1={padX}
            x2={width - padX}
            y1={padTop + innerHeight * fraction}
            y2={padTop + innerHeight * fraction}
            stroke="#EDF1F6"
            strokeWidth="1"
          />
        ))}
        <path d={area} fill="url(#areaFill)" />
        <path d={line} fill="none" stroke="#14B8A6" strokeWidth="2.5" strokeLinecap="round" />
        {thresholdY !== null ? (
          <line
            x1={padX}
            x2={width - padX}
            y1={thresholdY}
            y2={thresholdY}
            stroke="#94A3B8"
            strokeWidth="1.5"
            strokeDasharray="5 6"
          />
        ) : null}
        {coords.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="3" fill="#fff" stroke="#14B8A6" strokeWidth="2" />
            <text
              x={point.x}
              y={height - 6}
              textAnchor="middle"
              className="fill-slate-400"
              style={{ fontSize: 10 }}
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
