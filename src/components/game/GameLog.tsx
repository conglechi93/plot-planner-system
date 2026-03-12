import React, { useEffect, useRef } from 'react';
import type { GameLogEntry, Player } from '../../game/types/index';

// ─── Styles ───────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 16,
  right: 16,
  width: 360,
  maxHeight: 140,
  backgroundColor: 'rgba(10, 10, 20, 0.88)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 10,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  padding: '8px 0',
  zIndex: 300,
  pointerEvents: 'auto',
  backdropFilter: 'blur(6px)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
};

const headerStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.5)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  padding: '0 10px 6px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  marginBottom: 4,
  userSelect: 'none',
};

const entryStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  padding: '4px 10px',
  gap: 1,
};

const turnLabelStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.3)',
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: 0.5,
};

const messageRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 5,
};

const dotStyle = (color: string): React.CSSProperties => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: color,
  flexShrink: 0,
  marginTop: 3,
});

const nameStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.75)',
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: 'nowrap',
};

const msgStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.6)',
  fontSize: 11,
  lineHeight: 1.4,
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  backgroundColor: 'rgba(255,255,255,0.05)',
  margin: '2px 10px',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPlayerById(players: Player[], id: string): Player | undefined {
  return players.find(p => p.id === id);
}

function relativeTime(timestamp: number): string {
  const delta = Math.floor((Date.now() - timestamp) / 1000);
  if (delta < 5) return 'vừa xong';
  if (delta < 60) return `${delta}s trước`;
  const mins = Math.floor(delta / 60);
  return `${mins}m trước`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  log: GameLogEntry[];
  players: Player[];
}

export function GameLog({ log, players }: Props): React.JSX.Element {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the newest entry whenever the log grows
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log.length]);

  const visible = log.slice(-15);

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>Nhật ký trận đấu</div>

      {visible.length === 0 && (
        <div style={{ ...msgStyle, padding: '6px 10px', opacity: 0.4 }}>
          Chưa có sự kiện nào…
        </div>
      )}

      {visible.map((entry, i) => {
        const player = getPlayerById(players, entry.playerId);
        const color  = player?.tokenColor ?? '#888';
        const name   = player?.name ?? entry.playerId;
        const isLast = i === visible.length - 1;

        return (
          <React.Fragment key={`${entry.timestamp}-${i}`}>
            <div style={entryStyle}>
              <div style={turnLabelStyle}>
                Lượt {entry.turn} · {relativeTime(entry.timestamp)}
              </div>
              <div style={messageRowStyle}>
                <div style={dotStyle(color)} />
                <div>
                  <span style={{ ...nameStyle, color }}>{name} </span>
                  <span style={msgStyle}>{entry.message}</span>
                </div>
              </div>
            </div>
            {!isLast && <div style={dividerStyle} />}
          </React.Fragment>
        );
      })}

      {/* Invisible anchor used for auto-scroll */}
      <div ref={bottomRef} />
    </div>
  );
}
