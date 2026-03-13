import React, { useEffect, useState } from 'react';
import type { UseGameEngineReturn } from '../../game/hooks/useGameEngine';

// ─── DieFace SVG component ────────────────────────────────────────────────────
//
// Renders a proper die face with pip dots, matching the face layout of dice.glb.
// Standard pip positions (cx, cy) in a 52×52 viewBox:
//
//   TL(13,13)  TR(39,13)
//   ML(13,26)  MR(39,26)   C(26,26)
//   BL(13,39)  BR(39,39)
//
// Face pip map (mirrors the physical die standard):
//   1 → [C]
//   2 → [TR, BL]
//   3 → [TR, C, BL]
//   4 → [TL, TR, BL, BR]
//   5 → [TL, TR, C, BL, BR]
//   6 → [TL, TR, ML, MR, BL, BR]

const PIP_XY: Record<number, [number, number][]> = {
  1: [[26, 26]],
  2: [[39, 13], [13, 39]],
  3: [[39, 13], [26, 26], [13, 39]],
  4: [[13, 13], [39, 13], [13, 39], [39, 39]],
  5: [[13, 13], [39, 13], [26, 26], [13, 39], [39, 39]],
  6: [[13, 13], [39, 13], [13, 26], [39, 26], [13, 39], [39, 39]],
};

interface DieFaceProps {
  /** 1–6: show that face.  0 or undefined: show a "?" (placeholder). */
  value?: number;
  /** When true, apply a spin animation to simulate tumbling in the air. */
  spinning?: boolean;
  /** Extra inline styles (e.g. animationDelay). */
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
        filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.65))',
        animation: spinning ? 'diceSpin 0.35s linear infinite' : 'none',
        ...style,
      }}
    >
      {/* ── Die body ── */}
      <rect x="1.5" y="1.5" width="49" height="49" rx="9" ry="9"
        fill="#f5efe0"
        stroke="rgba(0,0,0,0.20)"
        strokeWidth="1.5"
      />
      {/* ── Pips or question mark ── */}
      {pips
        ? pips.map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="4.5" fill="#1c1c2e" />
          ))
        : (
          <text
            x="26" y="32"
            textAnchor="middle"
            fontSize="22"
            fontWeight="bold"
            fill="#9ca3af"
          >?</text>
        )
      }
    </svg>
  );
}

// ─── Rolling face cycler ──────────────────────────────────────────────────────
//
// While the 3-D dice are in the air, randomly cycle the visible face value so
// the 2-D die "tumbles" visually (same idea as the 3-D rotation).

function useRollingFace(active: boolean): number {
  const [face, setFace] = useState<number>(1);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setFace(Math.ceil(Math.random() * 6));
    }, 80);
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
  background: 'rgba(10,10,20,0.90)',
  color: 'white',
  padding: '14px 18px',
  borderRadius: 14,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 10,
  zIndex: 300,
  width: 320,
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.15)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  pointerEvents: 'auto',
};

const diceRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 16,
  alignItems: 'center',
};

const totalStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'rgba(255,255,255,0.65)',
  fontWeight: 600,
};

const doublesStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#facc15',
  fontWeight: 700,
  backgroundColor: 'rgba(250, 204, 21, 0.12)',
  border: '1px solid rgba(250, 204, 21, 0.35)',
  borderRadius: 6,
  padding: '3px 10px',
};

const jailInfoStyle: React.CSSProperties = {
  color: '#f87171',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.3,
};

const buttonRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  justifyContent: 'center',
};

function btnStyle(
  disabled: boolean,
  variant: 'green' | 'red' | 'blue' | 'teal' | 'gray' = 'green',
): React.CSSProperties {
  const bg: Record<string, string> = {
    green: disabled ? '#374151' : '#16a34a',
    red:   disabled ? '#374151' : '#b91c1c',
    blue:  disabled ? '#374151' : '#2563eb',
    teal:  disabled ? '#374151' : '#0f766e',
    gray:  disabled ? '#374151' : '#4b5563',
  };
  return {
    padding: '9px 15px',
    borderRadius: 8,
    border: 'none',
    background: bg[variant],
    color: disabled ? 'rgba(255,255,255,0.35)' : 'white',
    fontWeight: 700,
    fontSize: 12,
    cursor: disabled ? 'not-allowed' : 'pointer',
    letterSpacing: 0.3,
    transition: 'background 0.15s',
    whiteSpace: 'nowrap',
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  engine: UseGameEngineReturn;
}

export function DicePanel({ engine }: Props): React.JSX.Element {
  const { state, isHumanTurn, currentPlayer, isDiceAnimating, pendingDiceValues } = engine;

  // Cycle random faces on both dice while the 3-D animation plays.
  const rollingFace1 = useRollingFace(isDiceAnimating);
  const rollingFace2 = useRollingFace(isDiceAnimating);

  if (!state) {
    return (
      <div style={containerStyle}>
        <div style={totalStyle}>Chờ bắt đầu game…</div>
      </div>
    );
  }

  const { phase, diceValues, pendingAction } = state;

  // Prefer pendingDiceValues (set right after animation ends, before dispatch)
  // so we never flash blank placeholder boxes during the 600 ms result window.
  const displayDice   = pendingDiceValues ?? diceValues;
  const diceTotal     = displayDice != null ? displayDice[0] + displayDice[1] : null;
  // Compute doubles from displayDice so the badge shows immediately after the
  // 3-D animation lands, even before the reducer dispatch updates isDoubles.
  const showDoubles   = displayDice != null && displayDice[0] === displayDice[1];

  // Detect jail state from the player object (not from phase —
  // a jailed player's phase is still 'player_turn_start' at the start of their turn).
  const inJailPhase   = (currentPlayer?.inJail ?? false) && isHumanTurn;
  // Disable rolling while the 3-D animation is playing.
  const canRoll       = isHumanTurn && phase === 'player_turn_start' && !inJailPhase && !isDiceAnimating;
  const canEndTurn    = isHumanTurn && pendingAction === null &&
                        (phase === 'landing' || phase === 'building') && !isDiceAnimating;
  const canRollJail   = isHumanTurn && inJailPhase && !isDiceAnimating;
  const hasJailCard   = (currentPlayer?.jailFreeCards ?? 0) > 0;

  // Spinning animation CSS for the dice during roll.
  const spinStyle: React.CSSProperties = isDiceAnimating
    ? { animation: 'diceSpin 0.35s linear infinite' }
    : {};

  return (
    <div style={containerStyle}>
      {/* ── Inline keyframes (injected once via a style tag) ── */}
      <style>{`
        @keyframes diceSpin {
          from { transform: rotate(0deg) scale(1.05); }
          to   { transform: rotate(360deg) scale(1.05); }
        }
      `}</style>

      {/* ── Dice faces ── */}
      <div style={diceRowStyle}>
        {isDiceAnimating ? (
          /* Spin both dice with a cycling random face while 3-D dice are in the air */
          <>
            <DieFace value={rollingFace1} spinning style={spinStyle} />
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 22 }}>+</span>
            <DieFace value={rollingFace2} spinning style={{ ...spinStyle, animationDelay: '0.17s' }} />
          </>
        ) : displayDice != null ? (
          /* Show the exact face that landed — same pip layout as the 3-D die */
          <>
            <DieFace value={displayDice[0]} />
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 22 }}>+</span>
            <DieFace value={displayDice[1]} />
          </>
        ) : (
          /* No roll yet — empty placeholder */
          <>
            <DieFace />
            <DieFace />
          </>
        )}
      </div>

      {/* ── Animating label ── */}
      {isDiceAnimating && (
        <div style={totalStyle}>Đang tung xúc xắc…</div>
      )}

      {/* ── Total (shown after dice settle) ── */}
      {!isDiceAnimating && diceTotal !== null && (
        <div style={totalStyle}>Tổng: {diceTotal}</div>
      )}

      {/* ── Doubles ── */}
      {!isDiceAnimating && showDoubles && (
        <div style={doublesStyle}>🎲 Tung đôi! Đi thêm lượt</div>
      )}

      {/* ── Jail info ── */}
      {inJailPhase && (
        <div style={jailInfoStyle}>
          🔒 Đang trong tù — lượt {(currentPlayer?.jailTurns ?? 0) + 1}/3
        </div>
      )}

      {/* ── Buttons ── */}
      <div style={buttonRowStyle}>
        {/* Normal roll */}
        {!inJailPhase && (
          <button
            style={btnStyle(!canRoll, 'green')}
            disabled={!canRoll}
            onClick={() => engine.rollDice()}
          >
            🎲 TUNG XÚC XẮC
          </button>
        )}

        {/* Pay rent (mandatory – shown when human lands on AI-owned property) */}
        {isHumanTurn && pendingAction?.type === 'pay_rent' && !isDiceAnimating && (
          <button
            style={btnStyle(false, 'red')}
            onClick={() => engine.dispatch({ type: 'PAY_RENT' })}
          >
            💸 TRẢ TIỀN THUÊ{' '}
            {(pendingAction as { type: 'pay_rent'; amount: number }).amount} tr
          </button>
        )}

        {/* Pay tax (mandatory – shown when human lands on a tax square) */}
        {isHumanTurn && pendingAction?.type === 'pay_tax' && !isDiceAnimating && (
          <button
            style={btnStyle(false, 'red')}
            onClick={() => engine.dispatch({ type: 'PAY_RENT' })}
          >
            💸 NỘP THUẾ{' '}
            {(pendingAction as { type: 'pay_tax'; amount: number }).amount} tr
          </button>
        )}

        {/* End turn */}
        {canEndTurn && (
          <button
            style={btnStyle(false, 'blue')}
            onClick={() => engine.dispatch({ type: 'END_TURN' })}
          >
            ✅ KẾT THÚC LƯỢT
          </button>
        )}

        {/* Jail options */}
        {inJailPhase && (
          <>
            <button
              style={btnStyle(!canRollJail, 'green')}
              disabled={!canRollJail}
              onClick={() => engine.dispatch({ type: 'PAY_JAIL_BAIL' })}
            >
              💰 TRẢ BẢO LÃNH 50 triệu
            </button>
            {hasJailCard && (
              <button
                style={btnStyle(!canRollJail, 'teal')}
                disabled={!canRollJail}
                onClick={() => engine.dispatch({ type: 'USE_JAIL_FREE_CARD' })}
              >
                🃏 DÙNG THẺ TỰ DO
              </button>
            )}
            <button
              style={btnStyle(!canRollJail, 'red')}
              disabled={!canRollJail}
              onClick={() => engine.rollForJail()}
            >
              🎲 TUNG ĐỂ THOÁT TÙ
            </button>
          </>
        )}
      </div>
    </div>
  );
}


