import React, { useRef, useState } from 'react';
import type { Player, Square, PropertyGroup } from '../../game/types/index';
import type { UseGameEngineReturn } from '../../game/hooks/useGameEngine';
import { GROUP_COLORS, GROUP_LABELS } from '../../game/constants/groupColors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  humanPlayer: Player | null;
  squares: Square[];
  engine: UseGameEngineReturn;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Rung nút khi không đủ tiền */
function triggerShake(el: HTMLElement | null): void {
  if (!el) return;
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = 'shake 0.4s ease';
}

function formatMoney(amount: number): string {
  return `${amount.toLocaleString('vi-VN')} tr`;
}

function groupOwnedProperties(
  ownedSquares: number[],
  squares: Square[],
): Map<PropertyGroup, Square[]> {
  const groups = new Map<PropertyGroup, Square[]>();
  for (const idx of ownedSquares) {
    const sq = squares[idx];
    if (!sq?.group) continue;
    const arr = groups.get(sq.group) ?? [];
    groups.set(sq.group, [...arr, sq]);
  }
  return groups;
}

function countGroupTotal(group: PropertyGroup, squares: Square[]): number {
  return squares.filter(sq => sq.group === group).length;
}

// ─── Building progress dots ───────────────────────────────────────────────────
// 5 slots: slots 0–3 = nhà, slot 4 = khách sạn

interface DotsProps {
  houses: number;   // 0–4 nhà, 5 = hotel
  color: string;    // group accent color
  isMortgaged: boolean;
}

function BuildingDots({ houses, color, isMortgaged }: DotsProps): React.JSX.Element {
  if (isMortgaged) {
    return (
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
        color: '#60a5fa', background: 'rgba(96,165,250,0.12)',
        border: '1px solid rgba(96,165,250,0.25)', borderRadius: 4,
        padding: '1px 5px',
      }}>
        THẾ CHẤP
      </span>
    );
  }

  if (houses === 5) {
    // Hotel — hiện icon khách sạn + màu vàng
    return (
      <span style={{
        fontSize: 14, lineHeight: 1,
        filter: 'drop-shadow(0 1px 4px rgba(251,191,36,0.6))',
      }}>🏨</span>
    );
  }

  // 4 ô vuông nhỏ, tô màu theo số nhà đã xây
  return (
    <span style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 8, height: 8, borderRadius: 2,
            background: i < houses ? color : 'rgba(255,255,255,0.1)',
            border: `1px solid ${i < houses ? color : 'rgba(255,255,255,0.15)'}`,
            boxShadow: i < houses ? `0 0 4px ${color}88` : 'none',
            transition: 'background 0.2s',
          }}
        />
      ))}
    </span>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  right: 10,
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 150,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  maxHeight: '75vh',
  overflowY: 'auto',
  overflowX: 'visible',
  pointerEvents: 'auto',
  scrollbarWidth: 'none',
};

const toggleBtnStyle: React.CSSProperties = {
  background: 'rgba(10,10,20,0.90)',
  color: 'rgba(255,255,255,0.75)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: 'uppercase',
  padding: '8px 14px',
  borderRadius: 9,
  border: '1px solid rgba(255,255,255,0.14)',
  cursor: 'pointer',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  width: '100%',
  boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
};

const groupCardStyle: React.CSSProperties = {
  background: 'rgba(10,10,20,0.90)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 11,
  overflow: 'hidden',
  backdropFilter: 'blur(8px)',
  width: 230,
  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
};

function groupHeaderStyle(color: string, ownsMonopoly: boolean): React.CSSProperties {
  return {
    background: ownsMonopoly
      ? `linear-gradient(90deg, ${color} 0%, ${color}bb 100%)`
      : `linear-gradient(90deg, ${color}99 0%, ${color}55 100%)`,
    padding: '6px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  };
}

const groupTitleStyle: React.CSSProperties = {
  color: '#fff',
  fontWeight: 800,
  fontSize: 11,
  textShadow: '0 1px 3px rgba(0,0,0,0.5)',
  flex: 1,
  letterSpacing: 0.3,
};

const monopolyBadgeStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.22)',
  backdropFilter: 'blur(4px)',
  color: '#fff',
  fontSize: 8,
  fontWeight: 900,
  padding: '2px 6px',
  borderRadius: 4,
  letterSpacing: 1,
};

const groupBodyStyle: React.CSSProperties = {
  padding: '7px 8px 8px',
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
};

// Mỗi property: 2 dòng — dòng 1: tên, dòng 2: dots + buttons
const propCardStyle = (isMortgaged: boolean): React.CSSProperties => ({
  background: isMortgaged ? 'rgba(96,165,250,0.05)' : 'rgba(255,255,255,0.03)',
  border: `1px solid ${isMortgaged ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.06)'}`,
  borderRadius: 7,
  padding: '6px 8px',
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
});

const propNameStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.85)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  lineHeight: 1.2,
};

const propBottomRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const btnGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  marginLeft: 'auto',
};

function actionBtnStyle(
  bg: string,
  color: string,
  disabled: boolean,
): React.CSSProperties {
  return {
    background: disabled ? 'rgba(255,255,255,0.05)' : bg,
    color: disabled ? 'rgba(255,255,255,0.2)' : color,
    border: `1px solid ${disabled ? 'rgba(255,255,255,0.07)' : bg}`,
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 800,
    padding: '4px 7px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    letterSpacing: 0.3,
    lineHeight: 1.3,
    whiteSpace: 'nowrap' as const,
    transition: 'background 0.15s, opacity 0.15s',
    opacity: disabled ? 0.5 : 1,
  };
}

function mortgageBtnStyle(isMortgaged: boolean): React.CSSProperties {
  return {
    background: isMortgaged ? 'rgba(96,165,250,0.2)' : 'rgba(255,255,255,0.07)',
    color: isMortgaged ? '#93c5fd' : 'rgba(255,255,255,0.45)',
    border: `1px solid ${isMortgaged ? 'rgba(96,165,250,0.35)' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: 6,
    fontSize: 9,
    fontWeight: 700,
    padding: '4px 6px',
    cursor: 'pointer',
    letterSpacing: 0.3,
    whiteSpace: 'nowrap' as const,
    transition: 'background 0.15s',
  };
}

const bankBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  marginTop: 2,
  padding: '4px 8px',
  background: 'rgba(255,255,255,0.04)',
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.06)',
};

const bankItemStyle = (low: boolean): React.CSSProperties => ({
  fontSize: 10,
  fontWeight: 600,
  color: low ? '#f87171' : 'rgba(255,255,255,0.35)',
  display: 'flex',
  alignItems: 'center',
  gap: 3,
});

const bankDividerStyle: React.CSSProperties = {
  width: 1,
  height: 10,
  background: 'rgba(255,255,255,0.12)',
};

// ─── PropRow (isolated so it can own a ref for shake animation) ──────────────

interface PropRowProps {
  sq: Square;
  ownsMonopoly: boolean;
  bankHouses: number;
  bankHotels: number;
  balance: number;
  color: string;
  engine: UseGameEngineReturn;
}

function PropRow({ sq, ownsMonopoly, bankHouses, bankHotels, balance, color, engine }: PropRowProps): React.JSX.Element {
  const buildBtnRef = useRef<HTMLButtonElement>(null);
  const { isMortgaged, houses } = sq;
  const cost = sq.houseCost ?? 0;

  const canBuildHouse = ownsMonopoly && !isMortgaged && houses < 4 && bankHouses > 0 && balance >= cost;
  const canBuildHotel = ownsMonopoly && !isMortgaged && houses === 4 && bankHotels > 0 && balance >= cost;
  const canSellHouse  = !isMortgaged && houses > 0 && houses < 5;
  const canSellHotel  = !isMortgaged && houses === 5;

  // Disabled nhưng có thể build nếu có đủ monopoly/bank (chỉ thiếu tiền)
  const wouldBuildIfAfford =
    ownsMonopoly && !isMortgaged &&
    (houses < 4 ? bankHouses > 0 : houses === 4 && bankHotels > 0);
  const buildDisabled = !canBuildHouse && !canBuildHotel;
  const sellDisabled  = !canSellHouse && !canSellHotel;

  const buildLabel = houses === 4 ? '🏨 Xây KS' : '🏠 Xây';
  const sellLabel  = houses === 5 ? '🏨 Bán'    : '🏠 Bán';
  const buildTitle = houses === 4
    ? `Xây khách sạn — ${formatMoney(cost)}`
    : `Xây nhà — ${formatMoney(cost)}`;

  function handleBuildClick() {
    if (buildDisabled) {
      // Nếu lý do duy nhất là thiếu tiền → shake
      if (wouldBuildIfAfford && balance < cost) triggerShake(buildBtnRef.current);
      return;
    }
    if (houses === 4) engine.buildHotel(sq.index);
    else engine.buildHouse(sq.index);
  }

  return (
    <div style={propCardStyle(isMortgaged)}>

      {/* Keyframes — injected once via first PropRow */}
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          15%      { transform: translateX(-6px); }
          30%      { transform: translateX(6px); }
          45%      { transform: translateX(-4px); }
          60%      { transform: translateX(4px); }
          80%      { transform: translateX(-2px); }
        }
      `}</style>

      {/* Dòng 1: Tên BĐS */}
      <div style={propNameStyle} title={sq.name}>{sq.name}</div>

      {/* Dòng 2: Progress dots + nút hành động */}
      <div style={propBottomRowStyle}>

        <BuildingDots houses={houses} color={color} isMortgaged={isMortgaged} />

        <div style={btnGroupStyle}>
          {/* Build */}
          <button
            ref={buildBtnRef}
            style={actionBtnStyle('rgba(21,128,61,0.85)', '#86efac', buildDisabled)}
            title={buildTitle}
            onClick={handleBuildClick}
          >
            {buildLabel}
          </button>

          {/* Sell */}
          <button
            style={actionBtnStyle('rgba(180,83,9,0.85)', '#fcd34d', sellDisabled)}
            disabled={sellDisabled}
            title="Bán nhà / khách sạn (thu 50% giá)"
            onClick={() => houses === 5 ? engine.sellHotel(sq.index) : engine.sellHouse(sq.index)}
          >
            {sellLabel}
          </button>

          {/* Mortgage */}
          <button
            style={mortgageBtnStyle(isMortgaged)}
            title={
              isMortgaged
                ? `Chuộc lại — ${formatMoney(Math.ceil((sq.mortgageValue ?? 0) * 1.1))}`
                : `Thế chấp — nhận ${formatMoney(sq.mortgageValue ?? 0)}`
            }
            onClick={() =>
              isMortgaged ? engine.unmortgageProperty(sq.index) : engine.mortgageProperty(sq.index)
            }
          >
            {isMortgaged ? '↩ Chuộc' : '⇒ TC'}
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const lowHouses = bankHouses <= 4;
  const lowHotels = bankHotels <= 2;

  return (
    <div style={containerStyle}>

      {/* ── Toggle header ── */}
      <button style={toggleBtnStyle} onClick={() => setExpanded(v => !v)}>
        <span>🏗️ Bất động sản</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && Array.from(grouped.entries()).map(([group, props]) => {
        const color        = GROUP_COLORS[group];
        const label        = GROUP_LABELS[group];
        const totalInGroup = countGroupTotal(group, squares);
        const ownsMonopoly = props.length === totalInGroup;

        return (
          <div key={group} style={groupCardStyle}>

            {/* ── Group colour header ── */}
            <div style={groupHeaderStyle(color, ownsMonopoly)}>
              <span style={groupTitleStyle}>{label}</span>
              {ownsMonopoly && (
                <span style={monopolyBadgeStyle}>★ ĐỘC QUYỀN</span>
              )}
            </div>

            {/* ── Properties ── */}
            <div style={groupBodyStyle}>
              {props.map(sq => (
                <PropRow
                  key={sq.index}
                  sq={sq}
                  ownsMonopoly={ownsMonopoly}
                  bankHouses={bankHouses}
                  bankHotels={bankHotels}
                  balance={humanPlayer.money}
                  color={color}
                  engine={engine}
                />
              ))}

              {/* ── Bank supply bar ── */}
              <div style={bankBarStyle}>
                <div style={bankItemStyle(lowHouses)}>
                  🏠 <span>{bankHouses}</span>
                  {lowHouses && <span style={{ fontSize: 9 }}>!</span>}
                </div>
                <div style={bankDividerStyle} />
                <div style={bankItemStyle(lowHotels)}>
                  🏨 <span>{bankHotels}</span>
                  {lowHotels && <span style={{ fontSize: 9 }}>!</span>}
                </div>
                <div style={bankDividerStyle} />
                <div style={{ ...bankItemStyle(false), color: 'rgba(255,255,255,0.25)', fontSize: 9 }}>
                  NGÂN HÀNG
                </div>
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
}
