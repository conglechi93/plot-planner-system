import { useEffect, useRef, useState } from 'react';
import { getCachedThumbnail, getThumbnail } from '../utils/thumbnailCache';

interface Props {
  path:         string;
  fallbackIcon: string;
}

type ThumbState = 'loading' | 'ready' | 'error';

export function ModelCardThumb({ path, fallbackIcon }: Props) {
  const initialSrc = getCachedThumbnail(path);
  const [src,   setSrc]   = useState<string | null>(initialSrc);
  const [state, setState] = useState<ThumbState>(initialSrc ? 'ready' : 'loading');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const cached = getCachedThumbnail(path);
    if (cached) {
      setSrc(cached);
      setState('ready');
      return;
    }

    setSrc(null);
    setState('loading');

    getThumbnail(path)
      .then((dataUrl) => {
        if (!mounted.current) return;
        setSrc(dataUrl);
        setState('ready');
      })
      .catch(() => {
        if (mounted.current) setState('error');
      });
  }, [path]);

  if (state === 'ready' && src) {
    return <img src={src} className="mp-card-thumb-img" alt="" draggable={false} />;
  }

  if (state === 'loading') {
    return <div className="mp-card-thumb-skeleton" />;
  }

  // error — fall back to category icon
  return <span className="mp-card-thumb-icon">{fallbackIcon}</span>;
}
