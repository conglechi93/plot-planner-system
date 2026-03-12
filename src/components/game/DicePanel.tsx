import React from 'react';
import type { UseGameEngineReturn } from '../../game/hooks/useGameEngine';

// ─── Dice face mapping (Unicode U+2680–U+2685) ────────────────────────────────

const DICE_FACES: Partial<Record<number, string>> = {
  1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅',
};

function diceFace(value: number): string {
  return DICE_FACES[value] ?? '⚀';
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

const diceFaceStyle: React.CSSProperties = {
  fontSize: 48,
  lineHeight: 1,
  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
  userSelect: 'none',
};

const dicePlaceholderStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  background: 'rgba(255,255,255,0.08)',
  borderRadius: 10,
  border: '2px dashed rgba(255,255,255,0.2)',
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
  const { state, isHumanTurn, currentPlayer, isDiceAnimating } = engine;

  if (!state) {
    return (
      <div style={containerStyle}>
        <div style={totalStyle}>Chờ bắt đầu game…</div>
      </div>
    );
  }

  const { phase, diceValues, isDoubles, pendingAction } = state;

  const inJailPhase   = phase === 'in_jail' && isHumanTurn;
  // Disable rolling while the 3-D animation is playing.
  const canRoll       = isHumanTurn && phase === 'player_turn_start' && !inJailPhase && !isDiceAnimating;
  const canEndTurn    = isHumanTurn && pendingAction === null &&
                        (phase === 'landing' || phase === 'building') && !isDiceAnimating;
  const canRollJail   = isHumanTurn && inJailPhase && !isDiceAnimating;
  const hasJailCard   = (currentPlayer?.jailFreeCards ?? 0) > 0;
  const diceTotal     = diceValues != null ? diceValues[0] + diceValues[1] : null;

  // Spinning animation CSS for the dice placeholders during roll.
  const spinStyle: React.CSSProperties = isDiceAnimating
    ? { animation: 'diceSpin 0.4s linear infinite', display: 'inline-block' }
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
          /* Show spinning placeholders while the 3-D dice are in the air */
          <>
            <span style={{ ...diceFaceStyle, ...spinStyle }}>🎲</span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 22 }}>+</span>
            <span style={{ ...diceFaceStyle, ...spinStyle, animationDelay: '0.2s' }}>🎲</span>
          </>
        ) : diceValues != null ? (
          <>
            <span style={diceFaceStyle}>{diceFace(diceValues[0])}</span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 22 }}>+</span>
            <span style={diceFaceStyle}>{diceFace(diceValues[1])}</span>
          </>
        ) : (
          <>
            <div style={dicePlaceholderStyle} />
            <div style={dicePlaceholderStyle} />
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
      {!isDiceAnimating && isDoubles && diceValues !== null && (
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


