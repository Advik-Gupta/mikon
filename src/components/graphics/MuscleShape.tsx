import type { SVGProps } from "react";
import type { Shape } from "@/lib/explorer";

export function MuscleShape({ shape, clipKey, ...props }: { shape: Shape; clipKey: string } & Omit<SVGProps<SVGPathElement>, "d">) {
  if (!shape.c) return <path d={shape.d} {...props} />;
  const [x0, y0, x1, y1] = shape.c;
  const clip = `${clipKey}-c`;
  const outline = `${clipKey}-o`;
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} />
        </clipPath>
        <clipPath id={outline}>
          <path d={shape.d} />
        </clipPath>
      </defs>
      <path d={shape.d} clipPath={`url(#${clip})`} {...props} />
      {shape.k != null && (
        <line
          x1={shape.k}
          y1={y0}
          x2={shape.k}
          y2={y1}
          clipPath={`url(#${outline})`}
          stroke={props.stroke}
          strokeOpacity={props.strokeOpacity}
          strokeWidth={props.strokeWidth}
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      )}
    </g>
  );
}
