import { useState, useEffect } from 'react';
import { getCachedThumbnail, getThumbnail } from '../utils/thumbnailCache';

interface Props {
  path:       string;
  name:       string;
  anchorRect: DOMRect;
}

const W   = 210;   // tooltip width  (px)
const H   = 250;   // tooltip height (px)
const GAP = 14;    // gap from card edge

export function ModelCardTooltip({ path, name, anchorRect }: Props) {
  const [src, setSrc] = useState<string | null>(() => getCachedThumbnail(path));

  useEffect(() => {
    if (src) return;
    let cancelled = false;
    getThumbnail(path)
      .then((url) => { if (!cancelled) setSrc(url); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [path, src]);

  // Prefer right side; flip to left when near viewport edge
  let left = anchorRect.right + GAP;
  if (left + W > window.innerWidth - 8) {
    left = anchorRect.left - W - GAP;
  }

  // Align to top of card; clamp so tooltip stays inside viewport
  let top = anchorRect.top;
  top = Math.min(Math.max(top, 8), window.innerHeight - H - 8);

  return (
    <div
      className="mp-tooltip"
      style={{ left, top, width: W }}
    >
      <div className="mp-tooltip-thumb">
        {src
          ? <img src={src} className="mp-tooltip-img" alt="" draggable={false} />
          : <div className="mp-tooltip-skeleton" />
        }
      </div>
      <div className="mp-tooltip-name">{name}</div>
    </div>
  );
}
