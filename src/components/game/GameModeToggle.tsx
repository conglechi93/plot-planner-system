import React, { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  isGameActive: boolean;
  onStartGame: (playerName: string, aiCount: number) => void;
  onStopGame: () => void;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const wrapperStyle: React.CSSProperties = {
  position: 'fixed',
  top: 8,
  right: 8,
  zIndex: 200,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: 8,
  pointerEvents: 'auto',
};

const mainBtnStyle = (variant: 'start' | 'stop'): React.CSSProperties => ({
  padding: '10px 18px',
  background: variant === 'start' ? '#16a34a' : '#7c3aed',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  fontWeight: 800,
  fontSize: 13,
  cursor: 'pointer',
  letterSpacing: 0.5,
  boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
  backdropFilter: 'blur(4px)',
  transition: 'transform 0.1s, background 0.15s',
});

const setupCardStyle: React.CSSProperties = {
  background: 'rgba(10,10,20,0.95)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 12,
  padding: '18px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  minWidth: 240,
  backdropFilter: 'blur(8px)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  color: '#fff',
};

const setupTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 800,
  letterSpacing: 0.5,
  color: '#fff',
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.5)',
  letterSpacing: 1,
  textTransform: 'uppercase',
  marginBottom: 4,
};

const textInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.08)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 600,
  outline: 'none',
  boxSizing: 'border-box',
};

const aiSelectorRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
};

function aiCountBtnStyle(selected: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: '8px 0',
    background: selected ? '#7c3aed' : 'rgba(255,255,255,0.08)',
    color: selected ? '#fff' : 'rgba(255,255,255,0.5)',
    border: selected ? '2px solid #a78bfa' : '2px solid transparent',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.15s',
  };
}

const startBtnStyle: React.CSSProperties = {
  padding: '12px 0',
  background: 'linear-gradient(90deg, #16a34a, #15803d)',
  color: '#fff',
  border: 'none',
  borderRadius: 9,
  fontWeight: 900,
  fontSize: 14,
  cursor: 'pointer',
  letterSpacing: 1,
  boxShadow: '0 3px 12px rgba(22,163,74,0.45)',
  marginTop: 2,
};

const cancelLinkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'rgba(255,255,255,0.35)',
  fontSize: 11,
  cursor: 'pointer',
  textAlign: 'center',
  padding: '4px 0',
  textDecoration: 'underline',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function GameModeToggle({
  isGameActive,
  onStartGame,
  onStopGame,
}: Props): React.JSX.Element {
  const [showSetup, setShowSetup] = useState(false);
  const [playerName, setPlayerName] = useState('Người Chơi 1');
  const [aiCount, setAiCount] = useState(3);

  function handleStart(): void {
    const name = playerName.trim() || 'Người Chơi 1';
    onStartGame(name, aiCount);
    setShowSetup(false);
  }

  // ── Active game: show "return to design" button ─────────────────────────────
  if (isGameActive) {
    return (
      <div style={wrapperStyle}>
        <button
          style={mainBtnStyle('stop')}
          onClick={onStopGame}
          title="Thoát trận đấu và quay lại chế độ thiết kế"
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        >
          ✏️ Quay lại Thiết kế
        </button>
      </div>
    );
  }

  // ── No active game ──────────────────────────────────────────────────────────
  return (
    <div style={wrapperStyle}>
      {/* Main "Play" button */}
      <button
        style={mainBtnStyle('start')}
        onClick={() => setShowSetup(v => !v)}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
        }}
      >
        🎲 Chơi Cờ Tỉ Phú
      </button>

      {/* Setup dialog */}
      {showSetup && (
        <div style={setupCardStyle}>
          <div style={setupTitleStyle}>🎲 Thiết lập trận đấu</div>

          {/* Player name */}
          <div>
            <div style={fieldLabelStyle}>Tên người chơi</div>
            <input
              type="text"
              style={textInputStyle}
              value={playerName}
              maxLength={20}
              onChange={e => setPlayerName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleStart();
              }}
              autoFocus
            />
          </div>

          {/* AI count */}
          <div>
            <div style={fieldLabelStyle}>Số đối thủ AI</div>
            <div style={aiSelectorRowStyle}>
              {[1, 2, 3].map(n => (
                <button
                  key={n}
                  style={aiCountBtnStyle(aiCount === n)}
                  onClick={() => setAiCount(n)}
                >
                  {n} AI
                </button>
              ))}
            </div>
          </div>

          {/* Start button */}
          <button style={startBtnStyle} onClick={handleStart}>
            BẮT ĐẦU GAME
          </button>

          {/* Cancel */}
          <button style={cancelLinkStyle} onClick={() => setShowSetup(false)}>
            Huỷ
          </button>
        </div>
      )}
    </div>
  );
}
