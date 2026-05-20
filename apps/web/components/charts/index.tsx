'use client';

/**
 * Gráficos reusables en SVG puro — sin librerías externas.
 *
 * El criterio de diseño:
 *   - Inline SVG con viewBox 100×60 (ratio 5:3) que se escala a la
 *     anchura del contenedor.
 *   - Colores en Tailwind palette para mantener coherencia visual.
 *   - Tooltips nativos (atributo `title`) para no añadir dependencias.
 *   - Aceptan datasets pequeños/medianos (≤200 puntos); para volúmenes
 *     mayores conviene paginar antes en el server action.
 *
 * Cuatro tipos: BarChart, DonutChart, LineChart, ScatterChart.
 */

import { useMemo } from 'react';

const DEFAULT_PALETTE = [
    '#16a34a', // emerald
    '#0ea5e9', // sky
    '#f59e0b', // amber
    '#dc2626', // red
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#0d9488', // teal
    '#475569', // slate
];

// ─── BAR CHART ─────────────────────────────────────────────────────────────────

export interface BarSeries {
    label: string;
    color?: string;
    values: number[];
}

export function BarChart({
    categories,
    series,
    height = 220,
    yLabel,
    formatValue = (v) => v.toLocaleString(),
}: {
    categories: string[];
    series: BarSeries[];
    height?: number;
    yLabel?: string;
    formatValue?: (v: number) => string;
}) {
    const W = 100;
    const H = 60;
    const padLeft = 8;
    const padRight = 2;
    const padTop = 4;
    const padBottom = 8;
    const plotW = W - padLeft - padRight;
    const plotH = H - padTop - padBottom;

    const maxValue = useMemo(() => {
        const max = Math.max(...series.flatMap((s) => s.values), 0);
        return max > 0 ? max : 1;
    }, [series]);

    const groupWidth = plotW / Math.max(1, categories.length);
    const barWidth = (groupWidth * 0.7) / series.length;

    const yTicks = [0, maxValue / 2, maxValue];

    return (
        <div className="w-full">
            <svg viewBox={`0 0 ${W} ${H}`} style={{ height, width: '100%' }} role="img">
                {/* Eje Y */}
                {yTicks.map((t, i) => {
                    const y = padTop + plotH - (t / maxValue) * plotH;
                    return (
                        <g key={i}>
                            <line
                                x1={padLeft}
                                x2={W - padRight}
                                y1={y}
                                y2={y}
                                stroke="#e5e7eb"
                                strokeWidth={0.2}
                            />
                            <text x={2} y={y + 1} fontSize={2.4} fill="#6b7280">
                                {formatValue(t)}
                            </text>
                        </g>
                    );
                })}

                {/* Barras */}
                {categories.map((cat, i) => {
                    const groupX = padLeft + i * groupWidth;
                    return (
                        <g key={cat}>
                            {series.map((s, si) => {
                                const v = s.values[i] ?? 0;
                                const h = (Math.max(0, v) / maxValue) * plotH;
                                const x =
                                    groupX +
                                    groupWidth * 0.15 +
                                    si * barWidth;
                                const y = padTop + plotH - h;
                                return (
                                    <rect
                                        key={s.label}
                                        x={x}
                                        y={y}
                                        width={barWidth - 0.3}
                                        height={h}
                                        fill={s.color ?? DEFAULT_PALETTE[si % DEFAULT_PALETTE.length]}
                                        rx={0.4}
                                    >
                                        <title>{`${cat} · ${s.label}: ${formatValue(v)}`}</title>
                                    </rect>
                                );
                            })}
                            <text
                                x={groupX + groupWidth / 2}
                                y={H - 1.5}
                                fontSize={2.4}
                                textAnchor="middle"
                                fill="#6b7280"
                            >
                                {cat}
                            </text>
                        </g>
                    );
                })}

                {yLabel && (
                    <text x={2} y={3} fontSize={2.2} fill="#6b7280">
                        {yLabel}
                    </text>
                )}
            </svg>
            <Legend series={series} />
        </div>
    );
}

// ─── DONUT CHART ───────────────────────────────────────────────────────────────

export interface DonutSlice {
    label: string;
    value: number;
    color?: string;
}

export function DonutChart({
    slices,
    height = 220,
    centerLabel,
    formatValue = (v) => v.toLocaleString(),
}: {
    slices: DonutSlice[];
    height?: number;
    centerLabel?: string;
    formatValue?: (v: number) => string;
}) {
    const total = slices.reduce((a, b) => a + b.value, 0);
    const cx = 50;
    const cy = 50;
    const rOuter = 38;
    const rInner = 22;

    let acc = 0;
    const colored = slices.map((s, i) => ({
        ...s,
        color: s.color ?? DEFAULT_PALETTE[i % DEFAULT_PALETTE.length],
    }));

    return (
        <div className="w-full flex flex-col md:flex-row items-center gap-4">
            <svg
                viewBox="0 0 100 100"
                style={{ height, width: 'auto', maxWidth: height }}
                role="img"
            >
                {total === 0 ? (
                    <circle
                        cx={cx}
                        cy={cy}
                        r={rOuter}
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth={rOuter - rInner}
                    />
                ) : (
                    colored.map((s) => {
                        const angle = (s.value / total) * Math.PI * 2;
                        const startAngle = acc;
                        const endAngle = acc + angle;
                        acc = endAngle;
                        return (
                            <path
                                key={s.label}
                                d={arcPath(cx, cy, rOuter, rInner, startAngle, endAngle)}
                                fill={s.color}
                            >
                                <title>{`${s.label}: ${formatValue(s.value)} (${((s.value / total) * 100).toFixed(0)} %)`}</title>
                            </path>
                        );
                    })
                )}
                {centerLabel && (
                    <text
                        x={cx}
                        y={cy + 2}
                        fontSize={6}
                        textAnchor="middle"
                        fontWeight="bold"
                        fill="#111827"
                    >
                        {centerLabel}
                    </text>
                )}
            </svg>
            <div className="flex-1 min-w-0 space-y-1 text-xs">
                {colored.map((s) => (
                    <div key={s.label} className="flex items-center gap-2">
                        <span
                            className="inline-block w-3 h-3 rounded-sm shrink-0"
                            style={{ backgroundColor: s.color }}
                        />
                        <span className="text-gray-700 truncate flex-1">{s.label}</span>
                        <span className="text-gray-500 tabular-nums">{formatValue(s.value)}</span>
                        {total > 0 && (
                            <span className="text-gray-400 tabular-nums">
                                ({((s.value / total) * 100).toFixed(0)} %)
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function arcPath(
    cx: number,
    cy: number,
    rOuter: number,
    rInner: number,
    startAngle: number,
    endAngle: number,
): string {
    // angles in radians, 0 = top, clockwise
    const start = polar(cx, cy, rOuter, startAngle - Math.PI / 2);
    const end = polar(cx, cy, rOuter, endAngle - Math.PI / 2);
    const startInner = polar(cx, cy, rInner, endAngle - Math.PI / 2);
    const endInner = polar(cx, cy, rInner, startAngle - Math.PI / 2);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    return [
        `M ${start.x} ${start.y}`,
        `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${end.x} ${end.y}`,
        `L ${startInner.x} ${startInner.y}`,
        `A ${rInner} ${rInner} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
        'Z',
    ].join(' ');
}

function polar(cx: number, cy: number, r: number, angle: number) {
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

// ─── LINE CHART ────────────────────────────────────────────────────────────────

export interface LineSeries {
    label: string;
    color?: string;
    points: Array<{ x: string; y: number }>;
}

export function LineChart({
    series,
    height = 220,
    yLabel,
    formatValue = (v) => v.toLocaleString(),
}: {
    series: LineSeries[];
    height?: number;
    yLabel?: string;
    formatValue?: (v: number) => string;
}) {
    const W = 100;
    const H = 60;
    const padLeft = 8;
    const padRight = 2;
    const padTop = 4;
    const padBottom = 8;
    const plotW = W - padLeft - padRight;
    const plotH = H - padTop - padBottom;

    const xLabels = useMemo(() => series[0]?.points.map((p) => p.x) ?? [], [series]);
    const maxY = useMemo(() => {
        const max = Math.max(...series.flatMap((s) => s.points.map((p) => p.y)), 0);
        return max > 0 ? max : 1;
    }, [series]);

    const xPos = (i: number) =>
        padLeft + (i / Math.max(1, xLabels.length - 1)) * plotW;
    const yPos = (v: number) => padTop + plotH - (v / maxY) * plotH;

    return (
        <div className="w-full">
            <svg viewBox={`0 0 ${W} ${H}`} style={{ height, width: '100%' }} role="img">
                {[0, maxY / 2, maxY].map((t, i) => {
                    const y = yPos(t);
                    return (
                        <g key={i}>
                            <line
                                x1={padLeft}
                                x2={W - padRight}
                                y1={y}
                                y2={y}
                                stroke="#e5e7eb"
                                strokeWidth={0.2}
                            />
                            <text x={2} y={y + 1} fontSize={2.4} fill="#6b7280">
                                {formatValue(t)}
                            </text>
                        </g>
                    );
                })}

                {series.map((s, si) => {
                    const color = s.color ?? DEFAULT_PALETTE[si % DEFAULT_PALETTE.length];
                    const path = s.points
                        .map(
                            (p, i) =>
                                `${i === 0 ? 'M' : 'L'} ${xPos(i)} ${yPos(p.y)}`,
                        )
                        .join(' ');
                    return (
                        <g key={s.label}>
                            <path d={path} fill="none" stroke={color} strokeWidth={0.6} />
                            {s.points.map((p, i) => (
                                <circle
                                    key={i}
                                    cx={xPos(i)}
                                    cy={yPos(p.y)}
                                    r={0.8}
                                    fill={color}
                                >
                                    <title>{`${p.x} · ${s.label}: ${formatValue(p.y)}`}</title>
                                </circle>
                            ))}
                        </g>
                    );
                })}

                {xLabels.map((label, i) => (
                    <text
                        key={i}
                        x={xPos(i)}
                        y={H - 1.5}
                        fontSize={2.4}
                        textAnchor="middle"
                        fill="#6b7280"
                    >
                        {label}
                    </text>
                ))}

                {yLabel && (
                    <text x={2} y={3} fontSize={2.2} fill="#6b7280">
                        {yLabel}
                    </text>
                )}
            </svg>
            <Legend
                series={series.map((s) => ({
                    label: s.label,
                    color: s.color,
                    values: [],
                }))}
            />
        </div>
    );
}

// ─── SCATTER CHART ─────────────────────────────────────────────────────────────

export interface ScatterPoint {
    x: number;
    y: number;
    label?: string;
    color?: string;
}

export function ScatterChart({
    points,
    xLabel,
    yLabel,
    height = 240,
    formatX = (v) => v.toFixed(2),
    formatY = (v) => v.toFixed(2),
}: {
    points: ScatterPoint[];
    xLabel?: string;
    yLabel?: string;
    height?: number;
    formatX?: (v: number) => string;
    formatY?: (v: number) => string;
}) {
    const W = 100;
    const H = 60;
    const padLeft = 8;
    const padRight = 2;
    const padTop = 4;
    const padBottom = 9;
    const plotW = W - padLeft - padRight;
    const plotH = H - padTop - padBottom;

    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs, 0);
    const maxX = Math.max(...xs, 1);
    const minY = Math.min(...ys, 0);
    const maxY = Math.max(...ys, 1);

    const xPos = (v: number) =>
        padLeft + ((v - minX) / Math.max(0.0001, maxX - minX)) * plotW;
    const yPos = (v: number) =>
        padTop + plotH - ((v - minY) / Math.max(0.0001, maxY - minY)) * plotH;

    return (
        <div className="w-full">
            <svg viewBox={`0 0 ${W} ${H}`} style={{ height, width: '100%' }} role="img">
                {/* ejes mín/medio/máx */}
                {[0, 0.5, 1].map((f, i) => {
                    const yVal = minY + f * (maxY - minY);
                    const y = yPos(yVal);
                    return (
                        <g key={i}>
                            <line
                                x1={padLeft}
                                x2={W - padRight}
                                y1={y}
                                y2={y}
                                stroke="#e5e7eb"
                                strokeWidth={0.2}
                            />
                            <text x={2} y={y + 1} fontSize={2.4} fill="#6b7280">
                                {formatY(yVal)}
                            </text>
                        </g>
                    );
                })}

                {points.map((p, i) => (
                    <circle
                        key={i}
                        cx={xPos(p.x)}
                        cy={yPos(p.y)}
                        r={1}
                        fill={p.color ?? '#16a34a'}
                        opacity={0.7}
                    >
                        <title>
                            {`${p.label ? p.label + ' · ' : ''}${xLabel ?? 'X'}: ${formatX(p.x)} · ${yLabel ?? 'Y'}: ${formatY(p.y)}`}
                        </title>
                    </circle>
                ))}

                {[0, 0.5, 1].map((f, i) => {
                    const xVal = minX + f * (maxX - minX);
                    const x = xPos(xVal);
                    return (
                        <text
                            key={i}
                            x={x}
                            y={H - 1.5}
                            fontSize={2.4}
                            textAnchor="middle"
                            fill="#6b7280"
                        >
                            {formatX(xVal)}
                        </text>
                    );
                })}

                {xLabel && (
                    <text
                        x={W / 2}
                        y={H + 5}
                        fontSize={2.4}
                        textAnchor="middle"
                        fill="#6b7280"
                    >
                        {xLabel}
                    </text>
                )}
                {yLabel && (
                    <text x={2} y={3} fontSize={2.2} fill="#6b7280">
                        {yLabel}
                    </text>
                )}
            </svg>
        </div>
    );
}

// ─── LEGEND ────────────────────────────────────────────────────────────────────

function Legend({ series }: { series: Array<{ label: string; color?: string }> }) {
    if (series.length <= 1) return null;
    return (
        <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-gray-600">
            {series.map((s, i) => (
                <span key={s.label} className="inline-flex items-center gap-1">
                    <span
                        className="inline-block w-2.5 h-2.5 rounded-sm"
                        style={{
                            backgroundColor:
                                s.color ?? DEFAULT_PALETTE[i % DEFAULT_PALETTE.length],
                        }}
                    />
                    {s.label}
                </span>
            ))}
        </div>
    );
}
