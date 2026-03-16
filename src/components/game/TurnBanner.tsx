import React, { useEffect, useRef, useState } from 'react';
import type { Player } from '../../game/types/index';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  currentPlayer: Player | null;
  turnCount: number;
  isGameOver: boolean;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const bannerWrapStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 550,
  display: 'flex',
  justifyContent: 'center',
  pointerEvents: 'none',
};

function bannerStyle(visible: boolean, isHuman: boolean): React.CSSProperties {
  return {
    marginTop: visible ? 12 : -80,
    opacity: visible ? 1 : 0,
    transition: 'margin-top 0.35s cubic-bezier(0.34,1.2,0.64,1), opacity 0.35s ease',
    background: isHuman
      ? 'linear-gradient(135deg, rgba(16,185,129,0.95) 0%, rgba(5,150,105,0.95) 100%)'
      : 'linear-gradient(135deg, rgba(30,30,60,0.95) 0%, rgba(50,50,90,0.95) 100%)',
    border: isHuman
      ? '1px solid rgba(52,211,153,0.5)'
      : '1px solid rgba(255,255,255,0.12)',
    borderRadius: 30,
    padding: '8px 22px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    boxShadow: isHuman
      ? '0 4px 24px rgba(16,185,129,0.35)'
      : '0 4px 24px rgba(0,0,0,0.5)',
    backdropFilter: 'blur(10px)',
    minWidth: 240,
    maxWidth: 380,
  };
}

function tokenDotStyle(color: string): React.CSSProperties {
  return {
    width: 14,
    height: 14,
    borderRadius: '50%',
    background: color,
    border: '2px solid rgba(255,255,255,0.5)',
    flexShrink: 0,
    boxShadow: `0 0 8px ${color}`,
  };
}

const bannerTextStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: '#fff',
  letterSpacing: 0.3,
  flex: 1,
};

const turnBadgeStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.55)',
  letterSpacing: 1,
  whiteSpace: 'nowrap',
};

// ─── Component ────────────────────────────────────────────────────────────────

const BANNER_DURATION_MS = 1800;

export function TurnBanner({ currentPlayer, turnCount, isGameOver }: Props): React.JSX.Element {
  const [visible,        setVisible]        = useState(false);
  const [displayPlayer,  setDisplayPlayer]  = useState<Player | null>(null);

  const prevPlayerIdRef = useRef<string | null>(null);
  const timerRef        = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!currentPlayer || isGameOver) return;

    // Primeira render ou mudança de jogador
    if (prevPlayerIdRef.current === null) {
      // Primeira vez — só armazena, não mostra banner
      prevPlayerIdRef.current = currentPlayer.id;
      return;
    }

    if (prevPlayerIdRef.current === currentPlayer.id) return;

    // Player mudou → show banner
    prevPlayerIdRef.current = currentPlayer.id;
    setDisplayPlayer(currentPlayer);
    setVisible(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setVisible(false);
    }, BANNER_DURATION_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer?.id, isGameOver]);

  if (!displayPlayer) return <></>;

  const isHuman = !displayPlayer.isAI;
  const label   = isHuman
    ? '⚡ Đến lượt của bạn!'
    : `🤖 ${displayPlayer.name} đang chơi…`;

  return (
    <div style={bannerWrapStyle}>
      <div style={bannerStyle(visible, isHuman)}>
        <div style={tokenDotStyle(displayPlayer.tokenColor)} />
        <span style={bannerTextStyle}>{label}</span>
        <span style={turnBadgeStyle}>Lượt {turnCount}</span>
      </div>
    </div>
  );
}
