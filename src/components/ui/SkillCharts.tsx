import { SKILL_CATEGORIES } from '../../data/curriculum';
import type { SkillAssessmentRecord, SkillCategoryId } from '../../types/skillpath';

export function SkillRadarChart({
  studentScores,
  targetScores,
}: {
  studentScores: Record<SkillCategoryId, number>;
  targetScores: Record<SkillCategoryId, number>;
}) {
  const width = 400;
  const height = 330;
  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = 96;
  const labelRadius = 116;
  const levels = [25, 50, 75, 100];

  const getPoint = (index: number, value: number, radiusScale = maxRadius) => {
    const angle = (Math.PI * 2 * index) / SKILL_CATEGORIES.length - Math.PI / 2;
    const r = (Math.max(0, Math.min(100, value)) / 100) * radiusScale;
    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    };
  };

  const toPolygon = (values: number[]) =>
    values
      .map((v, idx) => {
        const pt = getPoint(idx, v);
        return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      })
      .join(' ');

  const studentPoly = toPolygon(SKILL_CATEGORIES.map((c) => studentScores[c.id] ?? 0));
  const targetPoly = toPolygon(SKILL_CATEGORIES.map((c) => targetScores[c.id] ?? 75));

  const getLabelAnchor = (idx: number): 'middle' | 'start' | 'end' => {
    if (idx === 0 || idx === 3) return 'middle';
    if (idx === 1 || idx === 2) return 'start';
    return 'end';
  };

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-[380px] select-none"
        role="img"
        aria-label="Six-pillar competency radar chart comparing current student proficiency against target career benchmark"
      >
        {levels.map((lvl) => (
          <polygon
            key={lvl}
            points={toPolygon(SKILL_CATEGORIES.map(() => lvl))}
            fill="none"
            stroke="rgba(212,175,112,0.14)"
            strokeWidth="1"
          />
        ))}

        {SKILL_CATEGORIES.map((cat, idx) => {
          const outer = getPoint(idx, 100);
          const labelPt = getPoint(idx, 100, labelRadius);
          const dyOffset = idx === 0 ? -4 : idx === 3 ? 8 : 0;
          return (
            <g key={cat.id}>
              <line
                x1={cx}
                y1={cy}
                x2={outer.x}
                y2={outer.y}
                stroke="rgba(212,175,112,0.14)"
                strokeWidth="1"
              />
              <text
                x={labelPt.x}
                y={labelPt.y + dyOffset}
                textAnchor={getLabelAnchor(idx)}
                dominantBaseline="middle"
                fill="#AAA6A0"
                fontSize="11"
                fontFamily="DM Sans, sans-serif"
              >
                {cat.shortLabel}
              </text>
            </g>
          );
        })}

        <polygon
          points={targetPoly}
          fill="rgba(168,138,89,0.08)"
          stroke="#A88A59"
          strokeDasharray="4 3"
          strokeWidth="1.5"
        />

        <polygon
          points={studentPoly}
          fill="rgba(212,175,112,0.22)"
          stroke="#F5D78E"
          strokeWidth="2"
        />

        {SKILL_CATEGORIES.map((cat, idx) => {
          const pt = getPoint(idx, studentScores[cat.id] ?? 0);
          return (
            <circle
              key={cat.id}
              cx={pt.x}
              cy={pt.y}
              r="3.5"
              fill="#F5D78E"
              stroke="#090A0F"
              strokeWidth="1.5"
            />
          );
        })}
      </svg>

      <div className="mt-2 flex items-center gap-6 text-xs text-[#AAA6A0]">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#F5D78E]" />
          Current Proficiency
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-4 border-t border-dashed border-[#A88A59]" />
          Target Role Benchmark
        </span>
      </div>
    </div>
  );
}

export function AssessmentTrendChart({ records }: { records: SkillAssessmentRecord[] }) {
  if (records.length === 0) {
    return (
      <div className="flex h-44 items-center justify-center rounded-lg border border-[rgba(212,175,112,0.12)] bg-[#11121A] px-4 text-center text-sm text-[#AAA6A0]">
        No historical diagnostic snapshots recorded yet. Run your first skill re-evaluation to plot trajectory over time.
      </div>
    );
  }

  const width = 480;
  const height = 190;
  const padX = 50;
  const padY = 26;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;

  const points = records.map((rec, idx) => {
    const x =
      records.length === 1
        ? padX + plotW / 2
        : padX + (idx / (records.length - 1)) * plotW;
    const y = padY + plotH - (Math.max(0, Math.min(100, rec.overallScore)) / 100) * plotH;
    return { x, y, rec, idx };
  });

  const polyline = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath =
    points.length > 1
      ? `M ${points[0].x},${padY + plotH} L ${points
          .map((p) => `${p.x},${p.y}`)
          .join(' L ')} L ${points[points.length - 1].x},${padY + plotH} Z`
      : '';

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full select-none"
      role="img"
      aria-label="Historical assessment progression line chart"
    >
      <defs>
        <linearGradient id="goldAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(212,175,112,0.28)" />
          <stop offset="100%" stopColor="rgba(212,175,112,0.0)" />
        </linearGradient>
      </defs>

      {[25, 50, 75, 100].map((tick) => {
        const y = padY + plotH - (tick / 100) * plotH;
        return (
          <g key={tick}>
            <line
              x1={padX}
              y1={y}
              x2={width - padX}
              y2={y}
              stroke="rgba(212,175,112,0.1)"
              strokeWidth="1"
            />
            <text
              x={padX - 10}
              y={y}
              textAnchor="end"
              dominantBaseline="middle"
              fill="#7D7973"
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
            >
              {tick}
            </text>
          </g>
        );
      })}

      {areaPath && <path d={areaPath} fill="url(#goldAreaGrad)" />}
      {points.length > 1 && (
        <polyline
          fill="none"
          stroke="#D4AF70"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polyline}
        />
      )}

      {points.map((pt) => {
        const anchor =
          points.length > 1 && pt.idx === 0
            ? 'start'
            : points.length > 1 && pt.idx === points.length - 1
            ? 'end'
            : 'middle';
        return (
          <g key={pt.rec.id}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r="4.5"
              fill="#F5D78E"
              stroke="#090A0F"
              strokeWidth="2"
            />
            <text
              x={pt.x}
              y={pt.y - 12}
              textAnchor={anchor}
              fill="#F7F3EA"
              fontSize="10.5"
              fontFamily="JetBrains Mono, monospace"
            >
              {pt.rec.overallScore}%
            </text>
            <text
              x={pt.x}
              y={height - 6}
              textAnchor={anchor}
              fill="#AAA6A0"
              fontSize="10"
              fontFamily="DM Sans, sans-serif"
            >
              {pt.rec.createdAtLabel}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
