import React from 'react';
import type { Player, Square, PropertyGroup } from '../../game/types/index';

// ─── Group colour map ─────────────────────────────────────────────────────────

const GROUP_COLORS: Record<PropertyGroup, string> = {
  brown:      '#8B4513',
  light_blue: '#87CEEB',
  pink:       '#FF69B4',
  orange:     '#FF8C00',
  red:        '#DC143C',
  yellow:     '#FFD700',
  green:      '#228B22',
  dark_blue:  '#00008B',
};

const GROUP_LABELS: Record<PropertyGroup, string> = {
  brown:      'Nâu',
  light_blue: 'Xanh nhạt',
  pink:       'Hồng',
  orange:     'Cam',
  red:        'Đỏ',
  yellow:     'Vàng',
  green:      'Lục',
  dark_blue:  'Xanh đậm',
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: 16,
  left: 16,
  width: 210,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  zIndex: 300,
  pointerEvents: 'none',
};

const cardBase: React.CSSProperties = {
  backgroundColor: 'rgba(10, 10, 20, 0.85)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 10,
  padding: '8px 10px',
  backdropFilter: 'blur(6px)',
  transition: 'border-color 0.2s',
  position: 'relative',
};

const topRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  marginBottom: 4,
};

const tokenCircleStyle = (color: string): React.CSSProperties => ({
  width: 22,
  height: 22,
  borderRadius: '50%',
  backgroundColor: color,
  border: '2px solid rgba(255,255,255,0.4)',
  flexShrink: 0,
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

const moneyStyle: React.CSSProperties = {
  color: '#4ade80',
  fontSize: 12,
  fontWeight: 700,
  marginBottom: 5,
};

const groupRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 3,
};

const groupChipStyle = (color: string): React.CSSProperties => ({
  width: 13,
  height: 13,
  borderRadius: 3,
  backgroundColor: color,
  border: '1px solid rgba(255,255,255,0.3)',
  flexShrink: 0,
});

const bankruptOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  borderRadius: 10,
  backgroundColor: 'rgba(0,0,0,0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(amount: number): string {
  return `${amount.toLocaleString('vi-VN')} triệu`;
}

function getOwnedGroupsSummary(
  ownedSquares: number[],
  squares: Square[],
): Map<PropertyGroup, number> {
  const map = new Map<PropertyGroup, number>();
  for (const idx of ownedSquares) {
    const sq = squares[idx];
    if (sq?.group) {
      map.set(sq.group, (map.get(sq.group) ?? 0) + 1);
    }
  }
  return map;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  players: Player[];
  currentPlayerIndex: number;
  squares: Square[];
}

export function PlayerPanel({ players, currentPlayerIndex, squares }: Props): React.JSX.Element {
  return (
    <div style={panelStyle}>
      {players.map((player, idx) => {
        const isActive     = idx === currentPlayerIndex && !player.isBankrupt;
        const groupSummary = getOwnedGroupsSummary(player.ownedSquares, squares);

        const cardStyle: React.CSSProperties = {
          ...cardBase,
          opacity: player.isBankrupt ? 0.55 : 1,
          border: isActive
            ? '2px solid rgba(255, 215, 0, 0.75)'
            : '1px solid rgba(255,255,255,0.12)',
          boxShadow: isActive ? '0 0 12px rgba(255, 215, 0, 0.3)' : undefined,
        };

        return (
          <div key={player.id} style={cardStyle}>
            {/* Top row: token + name + badges */}
            <div style={topRowStyle}>
              <div style={tokenCircleStyle(player.tokenColor)} />
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
            <div style={moneyStyle}>{formatMoney(player.money)}</div>

            {/* Owned group chips (coloured squares) */}
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

            {/* Bankrupt dim overlay */}
            {player.isBankrupt && (
              <div style={bankruptOverlayStyle}>
                <span style={{ color: '#f87171', fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>
                  PHÁ SẢN
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
