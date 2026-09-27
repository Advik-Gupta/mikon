import type { ReactNode, SVGProps } from "react";

export interface FigureShape {
  shoulder: number;
  waist: number;
  hip: number;
  limb: number;
}

export const DEFAULT_SHAPE: FigureShape = { shoulder: 42, waist: 26, hip: 30, limb: 8.5 };

type Pt = [number, number];

function smoothClosed(pts: Pt[]) {
  const n = pts.length;
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + " Z";
}

function torsoPath({ shoulder: S, waist: W, hip: H }: FigureShape) {
  const left: Pt[] = [
    [92, 70],
    [100 - S * 0.6, 84],
    [100 - S, 100],
    [100 - S + 7, 130],
    [100 - (W + (S - W) * 0.35), 148],
    [100 - W, 170],
    [100 - H, 198],
    [100 - H * 0.55, 218],
  ];
  const right = left.map(([x, y]) => [200 - x, y] as Pt).reverse();
  return smoothClosed([...left, [100, 214], ...right]);
}

interface FigureProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  shape?: FigureShape;
  view?: "front" | "back";
  fill?: string;
  stroke?: string;
  detail?: boolean;
  children?: ReactNode;
}

export function Figure({
  shape = DEFAULT_SHAPE,
  view = "front",
  fill = "#242a32",
  stroke = "#3a424d",
  detail = true,
  children,
  ...rest
}: FigureProps) {
  const { shoulder: S, hip: H, limb: L } = shape;
  const limbs = (side: 1 | -1, color: string, extra: number) => {
    const sx = (x: number) => 100 + side * (x - 100);
    const shoulderX = sx(100 - S + 6);
    const elbowX = sx(100 - S - 8);
    const wristX = sx(100 - S - 16);
    const hipX = sx(100 - H * 0.52);
    return (
      <g stroke={color} fill={color}>
        <line x1={shoulderX} y1={104} x2={elbowX} y2={160} strokeWidth={L * 2.3 + extra} />
        <line x1={elbowX} y1={160} x2={wristX} y2={210} strokeWidth={L * 1.8 + extra} />
        <circle cx={wristX} cy={220} r={L * 1.05 + extra / 2} stroke="none" />
        <line x1={hipX} y1={200} x2={sx(84)} y2={290} strokeWidth={L * 3.1 + extra} />
        <line x1={sx(84)} y1={290} x2={sx(86)} y2={368} strokeWidth={L * 2.2 + extra} />
        <ellipse cx={sx(86) - side * 5} cy={382} rx={L * 1.5 + extra / 2} ry={L * 0.8 + extra / 2} stroke="none" />
      </g>
    );
  };

  return (
    <svg viewBox="0 0 200 400" fill="none" {...rest}>
      <g strokeLinecap="round">
        {limbs(1, stroke, 2)}
        {limbs(-1, stroke, 2)}
        {limbs(1, fill, 0)}
        {limbs(-1, fill, 0)}
      </g>
      <rect x={91} y={56} width={18} height={24} rx={6} fill={fill} />
      <path d={torsoPath(shape)} fill={fill} stroke={stroke} strokeWidth={1} />
      <circle cx={100} cy={40} r={21} fill={fill} stroke={stroke} strokeWidth={1} />
      {detail && (
        <g stroke={stroke} strokeWidth={1} strokeLinecap="round" opacity={0.9}>
          {view === "front" ? (
            <>
              <path d={`M ${100 - S * 0.62} 132 Q 100 142 ${100 + S * 0.62} 132`} />
              <line x1={100} y1={112} x2={100} y2={196} />
              <line x1={90} y1={158} x2={110} y2={158} opacity={0.5} />
              <line x1={91} y1={176} x2={109} y2={176} opacity={0.5} />
            </>
          ) : (
            <>
              <line x1={100} y1={82} x2={100} y2={200} strokeDasharray="2 4" />
              <path d={`M ${100 - S * 0.45} 100 L 100 128 L ${100 + S * 0.45} 100`} opacity={0.6} />
              <path d={`M ${100 - H * 0.7} 208 Q 100 202 ${100 + H * 0.7} 208`} opacity={0.6} />
            </>
          )}
        </g>
      )}
      {children}
    </svg>
  );
}
