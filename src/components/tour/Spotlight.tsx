import type { Rect } from "./Tour";

const T = "transition-all duration-300 ease-out";

export function Spotlight({ rect, dim = 0.62 }: { rect: Rect | null; dim?: number }) {
  const bg = { background: `rgb(0 0 0 / ${dim})` };
  if (!rect) return <div className="fixed inset-0" style={bg} />;
  const { top, left, width, height } = rect;
  return (
    <>
      <div className={`pointer-events-auto fixed inset-x-0 top-0 ${T}`} style={{ ...bg, height: Math.max(0, top) }} />
      <div className={`pointer-events-auto fixed inset-x-0 bottom-0 ${T}`} style={{ ...bg, top: top + height }} />
      <div className={`pointer-events-auto fixed left-0 ${T}`} style={{ ...bg, top, height, width: Math.max(0, left) }} />
      <div className={`pointer-events-auto fixed right-0 ${T}`} style={{ ...bg, top, height, left: left + width }} />
      <div className={`pointer-events-none fixed rounded-2xl ring-2 ring-accent ${T}`} style={{ top, left, width, height }} />
    </>
  );
}
