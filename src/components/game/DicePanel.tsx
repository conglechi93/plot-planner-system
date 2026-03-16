import React, { useEffect, useState } from 'react';
import type { UseGameEngineReturn } from '../../game/hooks/useGameEngine';

// ─── DieFace SVG ──────────────────────────────────────────────────────────────

const PIP_XY: Record<number, [number, number][]> = {
  1: [[26, 26]],
  2: [[39, 13], [13, 39]],
  3: [[39, 13], [26, 26], [13, 39]],
  4: [[13, 13], [39, 13], [13, 39], [39, 39]],
  5: [[13, 13], [39, 13], [26, 26], [13, 39], [39, 39]],
  6: [[13, 13], [39, 13], [13, 26], [39, 26], [13, 39], [39, 39]],
};

interface DieFaceProps {
  value?: number;
  spinning?: boolean;
  style?: React.CSSProperties;
}

function DieFace({ value, spinning, style }: DieFaceProps): React.JSX.Element {
  const pips = value != null && value >= 1 && value <= 6 ? PIP_XY[value] : null;

  return (
    <svg
      width="52" height="52"
      viewBox="0 0 52 52"
      style={{
        display: 'inline-block',
        filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.7))',
        animation: spinning ? 'diceSpin 0.35s linear infinite' : 'none',
        ...style,
      }}
    >
      <rect x="1.5" y="1.5" width="49" height="49" rx="9" ry="9"
        fill={spinning ? '#e8dcc8' : '#f5efe0'}
        stroke="rgba(0,0,0,0.18)"
        strokeWidth="1.5"
      />
      {pips
        ? pips.map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="4.5" fill="#1c1c2e" />
          ))
        : (
          <text x="26" y="32" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#9ca3af">
            ?
          </text>
        )
      }
    </svg>
  );
}

// ─── Rolling face cycler ──────────────────────────────────────────────────────

function useRollingFace(active: boolean): number {
  const [face, setFace] = useState<number>(1);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setFace(Math.ceil(Math.random() * 6)), 80);
    return () => clearInterval(id);
  }, [active]);
  return face;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 16,
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'rgba(8,8,18,0.92)',
  color: 'white',
  borderRadius: 16,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 0,
  zIndex: 300,
  width: 340,
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.12)',
  boxShadow: '0 8px 40px rgba(0,0,0,0.65)',
  pointerEvents: 'auto',
  overflow: 'hidden',
};

// Phần trên: xúc xắc
const diceZoneStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
  padding: '14px 20px 12px',
  borderBottom: '1px solid rgba(255,255,255,0.07)',
};

const diceRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 14,
  alignItems: 'center',
};

const totalBadgeStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'rgba(255,255,255,0.5)',
  fontWeight: 600,
  letterSpacing: 0.3,
};

const doublesBadgeStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#facc15',
  fontWeight: 700,
  backgroundColor: 'rgba(250,204,21,0.12)',
  border: '1px solid rgba(250,204,21,0.3)',
  borderRadius: 20,
  padding: '3px 12px',
};

// Phần dưới: trạng thái + nút
const actionZoneStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

// Label trạng thái lượt
const turnLabelStyle = (isHuman: boolean): React.CSSProperties => ({
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.8,
  textAlign: 'center' as const,
  color: isHuman ? '#86efac' : 'rgba(255,255,255,0.35)',
  textTransform: 'uppercase' as const,
  paddingBottom: 2,
});

const jailInfoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  color: '#f87171',
  fontSize: 11,
  fontWeight: 700,
  background: 'rgba(239,68,68,0.1)',
  border: '1px solid rgba(239,68,68,0.2)',
  borderRadius: 8,
  padding: '6px 12px',
};

const btnRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  flexWrap: 'wrap',
  justifyContent: 'center',
};

const jailBtnRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
};

// Nút chính
function primaryBtnStyle(
  disabled: boolean,
  variant: 'green' | 'blue' | 'red' | 'amber' | 'teal',
): React.CSSProperties {
  const gradients: Record<string, string> = {
    green: 'linear-gradient(135deg, #16a34a, #15803d)',
    blue:  'linear-gradient(135deg, #2563eb, #1d4ed8)',
    red:   'linear-gradient(135deg, #dc2626, #b91c1c)',
    amber: 'linear-gradient(135deg, #d97706, #b45309)',
    teal:  'linear-gradient(135deg, #0f766e, #0d9488)',
  };
  const shadows: Record<string, string> = {
    green: '0 3px 12px rgba(22,163,74,0.45)',
    blue:  '0 3px 12px rgba(37,99,235,0.45)',
    red:   '0 3px 12px rgba(220,38,38,0.45)',
    amber: '0 3px 12px rgba(217,119,6,0.45)',
    teal:  '0 3px 12px rgba(15,118,110,0.45)',
  };
  return {
    flex: 1,
    padding: '10px 12px',
    borderRadius: 10,
    border: 'none',
    background: disabled ? 'rgba(255,255,255,0.07)' : gradients[variant],
    color: disabled ? 'rgba(255,255,255,0.25)' : '#fff',
    fontWeight: 800,
    fontSize: 12,
    cursor: disabled ? 'not-allowed' : 'pointer',
    letterSpacing: 0.4,
    boxShadow: disabled ? 'none' : shadows[variant],
    transition: 'opacity 0.15s, transform 0.1s',
    whiteSpace: 'nowrap' as const,
    opacity: disabled ? 0.5 : 1,
  };
}

function ghostBtnStyle(): React.CSSProperties {
  return {
    flex: 1,
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.18)',
    fontWeight: 700,
    fontSize: 12,
    cursor: 'not-allowed',
    letterSpacing: 0.4,
    whiteSpace: 'nowrap' as const,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  engine: UseGameEngineReturn;
}

export function DicePanel({ engine }: Props): React.JSX.Element {
  const { state, isHumanTurn, currentPlayer, isDiceAnimating, pendingDiceValues } = engine;

  const rollingFace1 = useRollingFace(isDiceAnimating);
  const rollingFace2 = useRollingFace(isDiceAnimating);

  if (!state) {
    return (
      <div style={containerStyle}>
        <div style={{ ...diceZoneStyle, borderBottom: 'none' }}>
          <div style={totalBadgeStyle}>Chờ bắt đầu game…</div>
        </div>
      </div>
    );
  }

  const { phase, diceValues, pendingAction } = state;

  const displayDice = pendingDiceValues ?? diceValues;
  const diceTotal   = displayDice != null ? displayDice[0] + displayDice[1] : null;
  const showDoubles = displayDice != null && displayDice[0] === displayDice[1];
  const inJailPhase = (currentPlayer?.inJail ?? false) && isHumanTurn;
  const canRoll     = isHumanTurn && phase === 'player_turn_start' && !inJailPhase && !isDiceAnimating;
  const canEndTurn  = isHumanTurn && pendingAction === null &&
                      (phase === 'landing' || phase === 'building') && !isDiceAnimating;
  const canRollJail = isHumanTurn && inJailPhase && !isDiceAnimating;
  const hasJailCard = (currentPlayer?.jailFreeCards ?? 0) > 0;

  // Label mô tả trạng thái hiện tại
  let turnLabel = '';
  if (!isHumanTurn) {
    turnLabel = isDiceAnimating
      ? `${currentPlayer?.name ?? 'AI'} đang tung xúc xắc…`
      : `${currentPlayer?.name ?? 'AI'} đang suy nghĩ…`;
  } else if (isDiceAnimating) {
    turnLabel = 'Đang tung xúc xắc…';
  } else if (inJailPhase) {
    turnLabel = `Trong tù — lượt ${(currentPlayer?.jailTurns ?? 0) + 1} / 3`;
  } else if (phase === 'player_turn_start') {
    turnLabel = 'Lượt của bạn — hãy tung xúc xắc';
  } else if (canEndTurn) {
    turnLabel = 'Xong — kết thúc lượt hoặc xây dựng';
  } else {
    turnLabel = 'Đang xử lý…';
  }

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes diceSpin {
          from { transform: rotate(0deg) scale(1.06); }
          to   { transform: rotate(360deg) scale(1.06); }
        }
      `}</style>

      {/* ══ Khu xúc xắc ══ */}
      <div style={diceZoneStyle}>
        <div style={diceRowStyle}>
          {isDiceAnimating ? (
            <>
              <DieFace value={rollingFace1} spinning />
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 20, fontWeight: 200 }}>+</span>
              <DieFace value={rollingFace2} spinning style={{ animationDelay: '0.17s' }} />
            </>
          ) : displayDice != null ? (
            <>
              <DieFace value={displayDice[0]} />
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 20, fontWeight: 200 }}>+</span>
              <DieFace value={displayDice[1]} />
            </>
          ) : (
            <>
              <DieFace />
              <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 20, fontWeight: 200 }}>+</span>
              <DieFace />
            </>
          )}
        </div>

        {/* Tổng + doubles */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 22 }}>
          {!isDiceAnimating && diceTotal !== null && (
            <div style={totalBadgeStyle}>
              Tổng: <strong style={{ color: '#fff' }}>{diceTotal}</strong>
            </div>
          )}
          {!isDiceAnimating && showDoubles && (
            <div style={doublesBadgeStyle}>🎲 Tung đôi! +1 lượt</div>
          )}
        </div>
      </div>

      {/* ══ Khu hành động ══ */}
      <div style={actionZoneStyle}>

        {/* Trạng thái lượt */}
        <div style={turnLabelStyle(isHumanTurn)}>{turnLabel}</div>

        {/* Cảnh báo tù */}
        {inJailPhase && (
          <div style={jailInfoStyle}>
            🔒 Đang trong tù — lượt {(currentPlayer?.jailTurns ?? 0) + 1} / 3
          </div>
        )}

        {/* ── Lượt bình thường ── */}
        {isHumanTurn && !inJailPhase && (
          <div style={btnRowStyle}>
            <button
              style={primaryBtnStyle(!canRoll, 'green')}
              disabled={!canRoll}
              onClick={() => engine.rollDice()}
            >
              🎲 Tung xúc xắc
            </button>

            {pendingAction?.type === 'pay_rent' && !isDiceAnimating && (
              <button
                style={primaryBtnStyle(false, 'red')}
                onClick={() => engine.dispatch({ type: 'PAY_RENT' })}
              >
                💸 Trả thuê {(pendingAction as { type: 'pay_rent'; amount: number }).amount} tr
              </button>
            )}

            {pendingAction?.type === 'pay_tax' && !isDiceAnimating && (
              <button
                style={primaryBtnStyle(false, 'red')}
                onClick={() => engine.dispatch({ type: 'PAY_RENT' })}
              >
                💸 Nộp thuế {(pendingAction as { type: 'pay_tax'; amount: number }).amount} tr
              </button>
            )}

            {canEndTurn && (
              <button
                style={primaryBtnStyle(false, 'blue')}
                onClick={() => engine.dispatch({ type: 'END_TURN' })}
              >
                ✅ Kết thúc lượt
              </button>
            )}
          </div>
        )}

        {/* ── Trong tù ── */}
        {inJailPhase && (
          <div style={jailBtnRowStyle}>
            <div style={btnRowStyle}>
              <button
                style={primaryBtnStyle(!canRollJail, 'red')}
                disabled={!canRollJail}
                onClick={() => engine.rollForJail()}
              >
                🎲 Tung thoát tù
              </button>
              <button
                style={primaryBtnStyle(!canRollJail, 'amber')}
                disabled={!canRollJail}
                onClick={() => engine.dispatch({ type: 'PAY_JAIL_BAIL' })}
              >
                💰 Bảo lãnh 50 tr
              </button>
            </div>
            {hasJailCard && (
              <button
                style={{ ...primaryBtnStyle(!canRollJail, 'teal'), flex: 'unset', width: '100%' }}
                disabled={!canRollJail}
                onClick={() => engine.dispatch({ type: 'USE_JAIL_FREE_CARD' })}
              >
                🃏 Dùng thẻ ra tù miễn phí
              </button>
            )}
          </div>
        )}

        {/* ── Không phải lượt người ── ghost buttons mờ ── */}
        {!isHumanTurn && (
          <div style={btnRowStyle}>
            <button style={ghostBtnStyle()} disabled>🎲 Tung xúc xắc</button>
            <button style={ghostBtnStyle()} disabled>✅ Kết thúc lượt</button>
          </div>
        )}

      </div>
    </div>
  );
}
