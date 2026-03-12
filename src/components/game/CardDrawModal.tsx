import React from 'react';
import type { Card } from '../../game/types/index';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  card: Card | null;
  phase: string;
  onConfirm: () => void;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.58)',
  zIndex: 300,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'auto',
};

function cardWrapperStyle(isChance: boolean): React.CSSProperties {
  return {
    background: isChance
      ? 'linear-gradient(140deg, #92400e 0%, #d97706 55%, #fbbf24 100%)'
      : 'linear-gradient(140deg, #1e3a5f 0%, #1d4ed8 55%, #60a5fa 100%)',
    borderRadius: 18,
    padding: '32px 28px',
    maxWidth: 340,
    width: '88vw',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
    boxShadow: isChance
      ? '0 12px 60px rgba(217, 119, 6, 0.55)'
      : '0 12px 60px rgba(29, 78, 216, 0.55)',
    border: '2px solid rgba(255,255,255,0.22)',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
  };
}

const cardIconStyle: React.CSSProperties = {
  fontSize: 44,
  lineHeight: 1,
  filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))',
};

function typeLabelStyle(isChance: boolean): React.CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 3.5,
    color: isChance ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.82)',
    textTransform: 'uppercase',
  };
}

const dividerStyle: React.CSSProperties = {
  width: 55,
  height: 2,
  background: 'rgba(255,255,255,0.35)',
  borderRadius: 2,
};

const descriptionStyle: React.CSSProperties = {
  fontSize: 17,
  fontWeight: 700,
  color: '#fff',
  lineHeight: 1.55,
  maxWidth: 280,
  textShadow: '0 1px 4px rgba(0,0,0,0.35)',
};

const confirmBtnStyle: React.CSSProperties = {
  marginTop: 4,
  padding: '12px 38px',
  background: 'rgba(255,255,255,0.18)',
  color: '#fff',
  border: '2px solid rgba(255,255,255,0.5)',
  borderRadius: 30,
  fontWeight: 900,
  fontSize: 13,
  cursor: 'pointer',
  letterSpacing: 2,
  textTransform: 'uppercase',
  backdropFilter: 'blur(4px)',
  transition: 'background 0.15s, transform 0.1s',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function CardDrawModal({ card, phase, onConfirm }: Props): React.JSX.Element | null {
  if (!card || phase !== 'drawing_card') return null;

  const isChance = card.type === 'chance';
  const typeLabel = isChance ? 'Cơ Hội' : 'Công Quỹ Cộng Đồng';
  const typeIcon  = isChance ? '🎲' : '🏦';

  return (
    <div style={overlayStyle}>
      <div style={cardWrapperStyle(isChance)}>
        <span style={cardIconStyle}>{typeIcon}</span>
        <div style={typeLabelStyle(isChance)}>{typeLabel}</div>
        <div style={dividerStyle} />
        <div style={descriptionStyle}>{card.description}</div>
        <div style={dividerStyle} />
        <button
          style={confirmBtnStyle}
          onClick={onConfirm}
          onMouseEnter={e => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.background = 'rgba(255,255,255,0.3)';
            btn.style.transform = 'scale(1.03)';
          }}
          onMouseLeave={e => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.background = 'rgba(255,255,255,0.18)';
            btn.style.transform = 'scale(1)';
          }}
        >
          Xác Nhận
        </button>
      </div>
    </div>
  );
}
