import React, { useState } from 'react';
import type { Player, Square } from '../../game/types/index';
import type { UseGameEngineReturn } from '../../game/hooks/useGameEngine';

// ─── Group colors ─────────────────────────────────────────────────────────────

const GROUP_COLORS: Record<string, string> = {
  brown:      '#8B4513',
  light_blue: '#87CEEB',
  pink:       '#FF69B4',
  orange:     '#FFA500',
  red:        '#FF0000',
  yellow:     '#FFD700',
  green:      '#008000',
  dark_blue:  '#00008B',
};

const GROUP_LABELS: Record<string, string> = {
  brown:      'Nâu',
  light_blue: 'Xanh nhạt',
  pink:       'Hồng',
  orange:     'Cam',
  red:        'Đỏ',
  yellow:     'Vàng',
  green:      'Lục',
  dark_blue:  'Xanh đậm',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  humanPlayer: Player | null;
  squares: Square[];
  engine: UseGameEngineReturn;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(amount: number): string {
  return `${amount.toLocaleString('vi-VN')} triệu`;
}

function buildingLabel(houses: number): string {
  if (houses === 0) return '—';
  if (houses === 5) return '🏨';
  return '🏠'.repeat(houses);
}

function groupOwnedProperties(
  ownedSquares: number[],
  squares: Square[],
): Map<string, Square[]> {
  const groups = new Map<string, Square[]>();
  for (const idx of ownedSquares) {
    const sq = squares[idx];
    if (!sq?.group) continue;
    const arr = groups.get(sq.group) ?? [];
    groups.set(sq.group, [...arr, sq]);
  }
  return groups;
}

function countGroupTotal(group: string, squares: Square[]): number {
  return squares.filter(sq => sq.group === group).length;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  right: 8,
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 150,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  maxHeight: '70vh',
  overflowY: 'auto',
  pointerEvents: 'auto',
};

const toggleBtnStyle: React.CSSProperties = {
  background: 'rgba(10,10,20,0.88)',
  color: 'rgba(255,255,255,0.5)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  padding: '7px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  cursor: 'pointer',
  backdropFilter: 'blur(6px)',
};

const groupCardStyle: React.CSSProperties = {
  background: 'rgba(10,10,20,0.88)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  overflow: 'hidden',
  backdropFilter: 'blur(6px)',
  minWidth: 210,
};

function groupHeaderStyle(color: string): React.CSSProperties {
  return {
    background: color,
    padding: '5px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  };
}

const groupTitleStyle: React.CSSProperties = {
  color: '#fff',
  fontWeight: 700,
  fontSize: 11,
  textShadow: '0 1px 2px rgba(0,0,0,0.6)',
  flex: 1,
};

const monopolyBadgeStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.38)',
  color: '#fff',
  fontSize: 9,
  fontWeight: 800,
  padding: '1px 5px',
  borderRadius: 3,
  letterSpacing: 0.3,
};

const groupBodyStyle: React.CSSProperties = {
  padding: '7px 9px',
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
};

const propRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
};

const propNameStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'rgba(255,255,255,0.78)',
  flex: 1,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const buildingLabelStyle: React.CSSProperties = {
  fontSize: 11,
  minWidth: 28,
  textAlign: 'right',
  color: '#4ade80',
  fontWeight: 700,
};

const btnGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: 3,
};

function iconBtnStyle(bg: string, disabled: boolean): React.CSSProperties {
  return {
    background: disabled ? 'rgba(255,255,255,0.04)' : bg,
    color: disabled ? 'rgba(255,255,255,0.22)' : '#fff',
    border: 'none',
    borderRadius: 5,
    fontSize: 11,
    fontWeight: 800,
    padding: '3px 8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    pointerEvents: disabled ? 'none' : 'auto',
    lineHeight: 1.4,
  };
}

function mortgageBtnStyle(isMortgaged: boolean): React.CSSProperties {
  return {
    background: isMortgaged ? '#1d4ed8' : 'rgba(255,255,255,0.09)',
    color: isMortgaged ? '#fff' : 'rgba(255,255,255,0.48)',
    border: 'none',
    borderRadius: 5,
    fontSize: 9,
    fontWeight: 700,
    padding: '3px 6px',
    cursor: 'pointer',
    letterSpacing: 0.2,
  };
}

const bankInfoStyle: React.CSSProperties = {
  fontSize: 10,
  color: 'rgba(255,255,255,0.27)',
  marginTop: 3,
  textAlign: 'right',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function BuildPanel({ humanPlayer, squares, engine }: Props): React.JSX.Element | null {
  const [expanded, setExpanded] = useState(true);

  const { state, isPlayerTurn } = engine;
  if (!humanPlayer || !state) return null;
  if (!isPlayerTurn) return null;
  if (humanPlayer.ownedSquares.length === 0) return null;

  const { phase } = state;
  if (
    phase !== 'player_turn_start' &&
    phase !== 'building' &&
    phase !== 'landing'
  ) {
    return null;
  }

  const grouped = groupOwnedProperties(humanPlayer.ownedSquares, squares);
  if (grouped.size === 0) return null;

  const { bankHouses, bankHotels } = state;

  return (
    <div style={containerStyle}>
      {/* Toggle header */}
      <button
        style={toggleBtnStyle}
        onClick={() => setExpanded(v => !v)}
      >
        🏗️ Bất động sản {expanded ? '▲' : '▼'}
      </button>

      {expanded && Array.from(grouped.entries()).map(([group, props]) => {
        const color = GROUP_COLORS[group] ?? '#888';
        const label = GROUP_LABELS[group] ?? group;
        const totalInGroup = countGroupTotal(group, squares);
        const ownsMonopoly = props.length === totalInGroup;

        return (
          <div key={group} style={groupCardStyle}>
            {/* Colour header */}
            <div style={groupHeaderStyle(color)}>
              <span style={groupTitleStyle}>{label}</span>
              {ownsMonopoly && (
                <span style={monopolyBadgeStyle}>ĐỘC QUYỀN</span>
              )}
            </div>

            {/* Properties */}
            <div style={groupBodyStyle}>
              {props.map(sq => {
                const isMortgaged = sq.isMortgaged;
                const houses = sq.houses;
                const cost = sq.houseCost ?? 0;
                const balance = humanPlayer.money;

                const canBuildHouse =
                  ownsMonopoly &&
                  !isMortgaged &&
                  houses < 4 &&
                  bankHouses > 0 &&
                  balance >= cost;

                const canBuildHotel =
                  ownsMonopoly &&
                  !isMortgaged &&
                  houses === 4 &&
                  bankHotels > 0 &&
                  balance >= cost;

                const canSellHouse = !isMortgaged && houses > 0 && houses < 5;
                const canSellHotel = !isMortgaged && houses === 5;

                const buildDisabled = !canBuildHouse && !canBuildHotel;
                const sellDisabled  = !canSellHouse && !canSellHotel;

                return (
                  <div key={sq.index} style={propRowStyle}>
                    <span style={propNameStyle} title={sq.name}>
                      {sq.name}
                    </span>
                    <span style={buildingLabelStyle}>
                      {isMortgaged ? '💰' : buildingLabel(houses)}
                    </span>
                    <div style={btnGroupStyle}>
                      {/* Build */}
                      <button
                        style={iconBtnStyle('#15803d', buildDisabled)}
                        disabled={buildDisabled}
                        title={
                          houses === 4
                            ? `Xây khách sạn (${formatMoney(cost)})`
                            : `Xây nhà (${formatMoney(cost)})`
                        }
                        onClick={() => {
                          if (houses === 4) engine.buildHotel(sq.index);
                          else engine.buildHouse(sq.index);
                        }}
                      >
                        +
                      </button>

                      {/* Sell */}
                      <button
                        style={iconBtnStyle('#b45309', sellDisabled)}
                        disabled={sellDisabled}
                        title="Bán nhà / khách sạn"
                        onClick={() => {
                          if (houses === 5) engine.sellHotel(sq.index);
                          else engine.sellHouse(sq.index);
                        }}
                      >
                        −
                      </button>

                      {/* Mortgage */}
                      <button
                        style={mortgageBtnStyle(isMortgaged)}
                        title={
                          isMortgaged
                            ? `Chuộc lại (${formatMoney(Math.ceil((sq.mortgageValue ?? 0) * 1.1))})`
                            : `Thế chấp (${formatMoney(sq.mortgageValue ?? 0)})`
                        }
                        onClick={() => {
                          if (isMortgaged) engine.unmortgageProperty(sq.index);
                          else engine.mortgageProperty(sq.index);
                        }}
                      >
                        {isMortgaged ? 'Chuộc' : 'TC'}
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Bank supply */}
              <div style={bankInfoStyle}>
                🏦 {bankHouses} nhà · {bankHotels} khách sạn
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
