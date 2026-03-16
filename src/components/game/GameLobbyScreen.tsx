import React, { useEffect, useRef, useState } from 'react';
import type { AIStrategy } from '../../game/types/index';

// ─── Token palette ────────────────────────────────────────────────────────────

export const TOKEN_PALETTE = [
  '#E53E3E', // đỏ
  '#3182CE', // xanh dương
  '#D69E2E', // vàng
  '#805AD5', // tím
  '#38A169', // xanh lá
  '#DD6B20', // cam
  '#319795', // teal
  '#D53F8C', // hồng
];

const AI_STRATEGY_LABELS: Record<AIStrategy, string> = {
  aggressive:   '⚔️ Tấn công',
  balanced:     '⚖️ Cân bằng',
  conservative: '🛡️ Thủ',
};

const AI_STRATEGY_DESC: Record<AIStrategy, string> = {
  aggressive:   'Mua mọi thứ, xây nhanh',
  balanced:     'Chiến lược hợp lý',
  conservative: 'Giữ tiền, ít rủi ro',
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 900,
  background: 'rgba(4,4,14,0.96)',
  backdropFilter: 'blur(12px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: '"Segoe UI", system-ui, sans-serif',
  pointerEvents: 'auto',
  animation: 'lobbyFadeIn 0.3s ease',
};

const panelStyle: React.CSSProperties = {
  background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 24,
  padding: '36px 40px 32px',
  width: 480,
  maxWidth: '94vw',
  maxHeight: '92vh',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
  boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
  color: '#fff',
};

const heroStyle: React.CSSProperties = {
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
};

const heroDiceStyle: React.CSSProperties = {
  fontSize: 44,
  lineHeight: 1,
  filter: 'drop-shadow(0 4px 14px rgba(255,215,0,0.45))',
};

const heroTitleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 900,
  letterSpacing: -0.5,
  color: '#fff',
};

const heroSubStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: 'rgba(255,255,255,0.35)',
  letterSpacing: 1.5,
  textTransform: 'uppercase',
};

const sectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.4)',
  letterSpacing: 1.2,
  textTransform: 'uppercase',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 10,
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};

// Token color picker
const paletteRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
};

function swatchStyle(color: string, selected: boolean): React.CSSProperties {
  return {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: color,
    border: selected ? '3px solid #fff' : '2px solid rgba(255,255,255,0.2)',
    cursor: 'pointer',
    transition: 'transform 0.15s, border-color 0.15s',
    transform: selected ? 'scale(1.2)' : 'scale(1)',
    boxShadow: selected ? `0 0 12px ${color}` : 'none',
    flexShrink: 0,
  };
}

// AI count selector
const aiCountRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
};

function countBtnStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: '10px 0',
    background: active ? 'rgba(255,215,0,0.12)' : 'rgba(255,255,255,0.06)',
    border: active ? '2px solid rgba(255,215,0,0.4)' : '2px solid transparent',
    borderRadius: 10,
    color: active ? '#facc15' : 'rgba(255,255,255,0.5)',
    fontWeight: 800,
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.15s',
    letterSpacing: 0.3,
  };
}

// AI strategy per-bot
const strategyRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const botRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: 'rgba(255,255,255,0.04)',
  borderRadius: 8,
  padding: '7px 10px',
};

function stratBtnStyle(active: boolean, bg: string): React.CSSProperties {
  return {
    padding: '4px 9px',
    background: active ? bg : 'rgba(255,255,255,0.05)',
    border: active ? `1px solid ${bg}` : '1px solid transparent',
    borderRadius: 6,
    color: active ? '#fff' : 'rgba(255,255,255,0.4)',
    fontWeight: 700,
    fontSize: 10,
    cursor: 'pointer',
    letterSpacing: 0.3,
    whiteSpace: 'nowrap' as const,
  };
}

const stratBgMap: Record<AIStrategy, string> = {
  aggressive:   'rgba(220,38,38,0.7)',
  balanced:     'rgba(37,99,235,0.7)',
  conservative: 'rgba(21,128,61,0.7)',
};

function previewDotStyle(color: string): React.CSSProperties {
  return {
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: color,
    border: '2px solid rgba(255,255,255,0.4)',
    flexShrink: 0,
    boxShadow: `0 0 6px ${color}`,
  };
}

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: 'rgba(255,255,255,0.07)',
};

// Start button
const startBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '15px 0',
  background: disabled
    ? 'rgba(255,255,255,0.08)'
    : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
  color: disabled ? 'rgba(255,255,255,0.25)' : '#fff',
  border: 'none',
  borderRadius: 12,
  fontWeight: 900,
  fontSize: 15,
  cursor: disabled ? 'not-allowed' : 'pointer',
  letterSpacing: 0.5,
  boxShadow: disabled ? 'none' : '0 6px 24px rgba(22,163,74,0.4)',
  transition: 'all 0.2s',
  width: '100%',
});

const cancelBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'rgba(255,255,255,0.3)',
  fontSize: 12,
  cursor: 'pointer',
  textDecoration: 'underline',
  padding: '4px 0',
  textAlign: 'center' as const,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Chọn màu cho AI dựa trên màu human đã chọn */
function pickAiColors(humanColor: string, count: number): string[] {
  const available = TOKEN_PALETTE.filter(c => c !== humanColor);
  return available.slice(0, count);
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface LobbyResult {
  playerName:  string;
  tokenColor:  string;
  aiCount:     number;
  aiStrategies: AIStrategy[];
}

interface Props {
  onStart:  (result: LobbyResult) => void;
  onCancel: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GameLobbyScreen({ onStart, onCancel }: Props): React.JSX.Element {
  const [playerName,  setPlayerName]  = useState('Người Chơi 1');
  const [tokenColor,  setTokenColor]  = useState(TOKEN_PALETTE[0]);
  const [aiCount,     setAiCount]     = useState(3);
  const [strategies,  setStrategies]  = useState<AIStrategy[]>(['aggressive', 'balanced', 'conservative']);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => nameInputRef.current?.focus());
  }, []);

  const aiColors = pickAiColors(tokenColor, aiCount);
  const nameValid = playerName.trim().length > 0;

  function handleSetStrategy(idx: number, s: AIStrategy) {
    setStrategies(prev => {
      const next = [...prev];
      next[idx] = s;
      return next;
    });
  }

  function handleStart() {
    if (!nameValid) return;
    onStart({
      playerName:  playerName.trim() || 'Người Chơi 1',
      tokenColor,
      aiCount,
      aiStrategies: strategies.slice(0, aiCount),
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter')  handleStart();
    if (e.key === 'Escape') onCancel();
  }

  return (
    <>
      <style>{`
        @keyframes lobbyFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <div style={overlayStyle} onKeyDown={handleKeyDown}>
        <div style={panelStyle}>

          {/* ── Hero ── */}
          <div style={heroStyle}>
            <div style={heroDiceStyle}>🎲</div>
            <div style={heroTitleStyle}>Cờ Tỷ Phú</div>
            <div style={heroSubStyle}>Thiết lập trận đấu mới</div>
          </div>

          <div style={dividerStyle} />

          {/* ── Tên người chơi ── */}
          <div style={sectionStyle}>
            <div style={labelStyle}>Tên của bạn</div>
            <input
              ref={nameInputRef}
              style={inputStyle}
              type="text"
              maxLength={20}
              value={playerName}
              placeholder="Nhập tên..."
              onChange={e => setPlayerName(e.target.value)}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(99,102,241,0.6)'; }}
              onBlur={e  => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.14)'; }}
            />
          </div>

          {/* ── Màu token ── */}
          <div style={sectionStyle}>
            <div style={labelStyle}>Màu quân cờ</div>
            <div style={paletteRowStyle}>
              {TOKEN_PALETTE.map(c => (
                <div
                  key={c}
                  style={swatchStyle(c, tokenColor === c)}
                  title={c}
                  onClick={() => setTokenColor(c)}
                />
              ))}
            </div>
          </div>

          <div style={dividerStyle} />

          {/* ── Số AI ── */}
          <div style={sectionStyle}>
            <div style={labelStyle}>Số đối thủ AI</div>
            <div style={aiCountRowStyle}>
              {[1, 2, 3].map(n => (
                <button
                  key={n}
                  style={countBtnStyle(aiCount === n)}
                  onClick={() => setAiCount(n)}
                >
                  {n} AI
                </button>
              ))}
            </div>
          </div>

          {/* ── Chiến thuật AI ── */}
          <div style={sectionStyle}>
            <div style={labelStyle}>Chiến thuật AI</div>
            <div style={strategyRowStyle}>
              {Array.from({ length: aiCount }).map((_, i) => {
                const aiColor = aiColors[i] ?? TOKEN_PALETTE[(i + 1) % TOKEN_PALETTE.length];
                const strat   = strategies[i] ?? 'balanced';
                return (
                  <div key={i} style={botRowStyle}>
                    <div style={{ ...previewDotStyle(aiColor), width: 10, height: 10 }} />
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', width: 40, flexShrink: 0 }}>
                      AI {i + 1}
                    </span>
                    {(Object.keys(AI_STRATEGY_LABELS) as AIStrategy[]).map(s => (
                      <button
                        key={s}
                        style={stratBtnStyle(strat === s, stratBgMap[s])}
                        title={AI_STRATEGY_DESC[s]}
                        onClick={() => handleSetStrategy(i, s)}
                      >
                        {AI_STRATEGY_LABELS[s]}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Nút bắt đầu ── */}
          <button
            style={startBtnStyle(!nameValid)}
            disabled={!nameValid}
            onClick={handleStart}
            onMouseEnter={e => { if (nameValid) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.01)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          >
            🎮 BẮT ĐẦU TRẬN ĐẤU
          </button>
          <button style={cancelBtnStyle} onClick={onCancel}>
            Huỷ
          </button>

        </div>
      </div>
    </>
  );
}
