import React, { useEffect, useRef, useState } from 'react';
import type { Player, Square, PropertyGroup } from '../../game/types/index';
import { GROUP_COLORS, GROUP_LABELS } from '../../game/constants/groupColors';
import { calcNetWorth } from '../../game/utils/netWorth';

// ─── Floating money popup ─────────────────────────────────────────────────────

interface Popup { id: number; delta: number }

/** Hook: phát hiện thay đổi money và tạo popup delta */
function useMoneyPopups(money: number): Popup[] {
  const prevRef = useRef(money);
  const idRef   = useRef(0);
  const [popups, setPopups] = useState<Popup[]>([]);

  useEffect(() => {
    if (prevRef.current === money) return;
    const delta = money - prevRef.current;
    prevRef.current = money;
    const id = ++idRef.current;
    setPopups(p => [...p, { id, delta }]);
    const timer = setTimeout(() => {
      setPopups(p => p.filter(x => x.id !== id));
    }, 1800);
    return () => clearTimeout(timer);
  }, [money]);

  return popups;
}

/** Animated floating number +X / -X */
function FloatingPopup({ delta }: { delta: number }): React.JSX.Element {
  const positive = delta >= 0;
  return (
    <span style={{
      position: 'absolute',
      right: 8,
      top: 6,
      fontSize: 12,
      fontWeight: 900,
      color: positive ? '#4ade80' : '#f87171',
      pointerEvents: 'none',
      animation: 'moneyFloat 1.8s ease-out forwards',
      whiteSpace: 'nowrap',
      textShadow: positive
        ? '0 0 8px rgba(74,222,128,0.6)'
        : '0 0 8px rgba(248,113,113,0.6)',
      zIndex: 10,
    }}>
      {positive ? '+' : ''}{delta.toLocaleString('vi-VN')} tr
    </span>
  );
}

// ─── Net worth bar ────────────────────────────────────────────────────────────

interface NetWorthBarProps {
  player: Player;
  squares: Square[];
  maxNetWorth: number;
}

function NetWorthBar({ player, squares, maxNetWorth }: NetWorthBarProps): React.JSX.Element {
  const nw  = calcNetWorth(player, squares);
  const pct = maxNetWorth > 0 ? Math.max(4, (nw / maxNetWorth) * 100) : 4;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
      {/* Bar track */}
      <div style={{
        flex: 1, height: 4, borderRadius: 2,
        background: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: 2,
          background: player.isBankrupt
            ? '#ef4444'
            : `linear-gradient(90deg, ${player.tokenColor}cc, ${player.tokenColor})`,
          transition: 'width 0.5s ease',
          boxShadow: player.isBankrupt ? 'none' : `0 0 6px ${player.tokenColor}88`,
        }} />
      </div>
      {/* Net worth label */}
      <span style={{
        fontSize: 9, fontWeight: 700,
        color: 'rgba(255,255,255,0.35)',
        whiteSpace: 'nowrap',
        minWidth: 50,
        textAlign: 'right',
      }}>
        {calcNetWorth(player, squares).toLocaleString('vi-VN')} tr
      </span>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(amount: number): string {
  return `${amount.toLocaleString('vi-VN')} tr`;
}

function getOwnedGroupsSummary(
  ownedSquares: number[],
  squares: Square[],
): Map<PropertyGroup, number> {
  const map = new Map<PropertyGroup, number>();
  for (const idx of ownedSquares) {
    const sq = squares[idx];
    if (sq?.group) map.set(sq.group, (map.get(sq.group) ?? 0) + 1);
  }
  return map;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: 16,
  left: 16,
  width: 220,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  zIndex: 300,
  pointerEvents: 'none',
};

const cardBase: React.CSSProperties = {
  backgroundColor: 'rgba(10, 10, 20, 0.88)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 11,
  padding: '8px 10px',
  backdropFilter: 'blur(8px)',
  transition: 'border-color 0.25s, box-shadow 0.25s',
  position: 'relative',
  overflow: 'hidden',
};

const topRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  marginBottom: 3,
};

const tokenCircleStyle = (color: string, active: boolean): React.CSSProperties => ({
  width: 22,
  height: 22,
  borderRadius: '50%',
  backgroundColor: color,
  border: active
    ? '2px solid rgba(255,255,255,0.9)'
    : '2px solid rgba(255,255,255,0.3)',
  flexShrink: 0,
  boxShadow: active ? `0 0 8px ${color}` : 'none',
  transition: 'box-shadow 0.25s',
});

const nameStyle: React.CSSProperties = {
  color: '#fff',
  fontSize: 13,
  fontWeight: 700,
  flex: 1,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const badgeStyle = (bg: string): React.CSSProperties => ({
  backgroundColor: bg,
  color: '#fff',
  fontSize: 9,
  fontWeight: 800,
  padding: '1px 5px',
  borderRadius: 4,
  letterSpacing: 0.5,
  flexShrink: 0,
});

const moneyRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  marginBottom: 5,
};

const moneyStyle: React.CSSProperties = {
  color: '#4ade80',
  fontSize: 13,
  fontWeight: 800,
  transition: 'color 0.3s',
};

const moneyLabelStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.28)',
  fontSize: 10,
  fontWeight: 600,
};

const groupRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 3,
};

const groupChipStyle = (color: string): React.CSSProperties => ({
  width: 12,
  height: 12,
  borderRadius: 3,
  backgroundColor: color,
  border: '1px solid rgba(255,255,255,0.25)',
  flexShrink: 0,
});

const bankruptOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  borderRadius: 11,
  backgroundColor: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
};

// ─── Per-player card (isolated so each can track its own popups) ──────────────

interface CardProps {
  player: Player;
  isActive: boolean;
  squares: Square[];
  maxNetWorth: number;
}

function PlayerCard({ player, isActive, squares, maxNetWorth }: CardProps): React.JSX.Element {
  const popups       = useMoneyPopups(player.money);
  const groupSummary = getOwnedGroupsSummary(player.ownedSquares, squares);

  const cardStyle: React.CSSProperties = {
    ...cardBase,
    opacity: player.isBankrupt ? 0.55 : 1,
    border: isActive
      ? `2px solid rgba(255, 215, 0, 0.75)`
      : '1px solid rgba(255,255,255,0.1)',
    boxShadow: isActive
      ? `0 0 16px rgba(255,215,0,0.25), inset 0 0 0 1px rgba(255,215,0,0.08)`
      : undefined,
  };

  return (
    <div style={cardStyle}>
      {/* Floating money popups */}
      {popups.map(p => <FloatingPopup key={p.id} delta={p.delta} />)}

      {/* Top row: token + name + badges */}
      <div style={topRowStyle}>
        <div style={tokenCircleStyle(player.tokenColor, isActive)} />
        <span style={nameStyle}>{player.name}</span>
        {player.inJail && !player.isBankrupt && (
          <span style={badgeStyle('#b45309')}>TÙ</span>
        )}
        {player.isBankrupt && (
          <span style={badgeStyle('#7f1d1d')}>PHÁ SẢN</span>
        )}
        {player.isAI && !player.isBankrupt && (
          <span style={badgeStyle('#1d4ed8')}>AI</span>
        )}
      </div>

      {/* Money */}
      <div style={moneyRowStyle}>
        <span style={moneyLabelStyle}>💰</span>
        <span style={moneyStyle}>{formatMoney(player.money)}</span>
      </div>

      {/* Net worth bar */}
      <NetWorthBar
        player={player}
        squares={squares}
        maxNetWorth={maxNetWorth}
      />

      {/* Owned group chips */}
      {groupSummary.size > 0 && (
        <div style={groupRowStyle}>
          {Array.from(groupSummary.entries()).map(([group, count]) =>
            Array.from({ length: count }).map((_, ci) => (
              <div
                key={`${group}-${ci}`}
                style={groupChipStyle(GROUP_COLORS[group])}
                title={GROUP_LABELS[group]}
              />
            )),
          )}
        </div>
      )}

      {/* Bankrupt overlay */}
      {player.isBankrupt && (
        <div style={bankruptOverlayStyle}>
          <span style={{ color: '#f87171', fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>
            PHÁ SẢN
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  players: Player[];
  currentPlayerIndex: number;
  squares: Square[];
}

export function PlayerPanel({ players, currentPlayerIndex, squares }: Props): React.JSX.Element {
  const maxNetWorth = Math.max(
    1,
    ...players.map(p => calcNetWorth(p, squares)),
  );

  return (
    <>
      {/* Keyframes injected once */}
      <style>{`
        @keyframes moneyFloat {
          0%   { opacity: 1;   transform: translateY(0)   scale(1); }
          20%  { opacity: 1;   transform: translateY(-6px) scale(1.08); }
          100% { opacity: 0;   transform: translateY(-28px) scale(0.9); }
        }
      `}</style>

      <div style={panelStyle}>
        {players.map((player, idx) => (
          <PlayerCard
            key={player.id}
            player={player}
            isActive={idx === currentPlayerIndex && !player.isBankrupt}
            squares={squares}
            maxNetWorth={maxNetWorth}
          />
        ))}
      </div>
    </>
  );
}
