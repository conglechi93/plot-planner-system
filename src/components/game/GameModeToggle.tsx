import React from 'react';

interface Props {
  isGameActive: boolean;
  onStopGame: () => void;
}

const wrapperStyle: React.CSSProperties = {
  position: 'fixed',
  top: 8,
  right: 8,
  zIndex: 200,
  pointerEvents: 'auto',
};

const stopBtnStyle: React.CSSProperties = {
  padding: '10px 18px',
  background: '#7c3aed',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  fontWeight: 800,
  fontSize: 13,
  cursor: 'pointer',
  letterSpacing: 0.5,
  boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
  backdropFilter: 'blur(4px)',
  transition: 'transform 0.1s',
};

export function GameModeToggle({ isGameActive, onStopGame }: Props): React.JSX.Element | null {
  if (!isGameActive) return null;

  return (
    <div style={wrapperStyle}>
      <button
        style={stopBtnStyle}
        onClick={onStopGame}
        title="Thoát trận đấu và quay lại chế độ thiết kế"
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
      >
        ✏️ Quay lại Thiết kế
      </button>
    </div>
  );
}
