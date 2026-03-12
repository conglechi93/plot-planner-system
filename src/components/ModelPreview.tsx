import { useEffect, useRef, useState } from 'react';
import { getThumbnail, getCachedThumbnail } from '../utils/thumbnailCache';

interface Props {
  path: string | null;
}

export function ModelPreview({ path }: Props) {
  const [thumbnail, setThumbnail] = useState<string | null>(
    path ? getCachedThumbnail(path) : null,
  );
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(false);

  // Track latest path to discard stale responses
  const currentPath = useRef(path);

  useEffect(() => {
    currentPath.current = path;

    if (!path) {
      setThumbnail(null);
      setLoading(false);
      setError(false);
      return;
    }

    // Hit the cache instantly – no loading state needed
    const cached = getCachedThumbnail(path);
    if (cached) {
      setThumbnail(cached);
      setLoading(false);
      setError(false);
      return;
    }

    // Not cached yet – generate thumbnail
    setThumbnail(null);
    setLoading(true);
    setError(false);

    getThumbnail(path)
      .then((dataUrl) => {
        if (currentPath.current !== path) return; // stale
        setThumbnail(dataUrl);
        setLoading(false);
      })
      .catch(() => {
        if (currentPath.current !== path) return;
        setError(true);
        setLoading(false);
      });
  }, [path]);

  return (
    <div className="mp-preview-pane">
      {thumbnail && (
        <img
          src={thumbnail}
          className="mp-preview-img"
          alt="Model preview"
        />
      )}

      {loading && (
        <div className="mp-preview-overlay">
          <span className="mp-preview-spinner">⏳ Loading…</span>
        </div>
      )}

      {!path && !loading && (
        <div className="mp-preview-overlay">
          <span className="mp-preview-hint">Hover a card<br />to preview</span>
        </div>
      )}

      {error && !loading && (
        <div className="mp-preview-overlay">
          <span className="mp-preview-hint">⚠️ Preview<br />unavailable</span>
        </div>
      )}
    </div>
  );
}
