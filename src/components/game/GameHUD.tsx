import React from 'react';
import { PlayerPanel } from './PlayerPanel';
import { DicePanel } from './DicePanel';
import { ActionDialog } from './ActionDialog';
import { CardDrawModal } from './CardDrawModal';
import { BuildPanel } from './BuildPanel';
import { GameLog } from './GameLog';
import type { UseGameEngineReturn } from '../../game/hooks/useGameEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  engine: UseGameEngineReturn;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

/** Root layer: covers viewport but does NOT capture mouse events itself. */
const hudRootStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 200,
  pointerEvents: 'none',
};

/** Dark full-screen overlay for game over. */
const gameOverOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.75)',
  zIndex: 600,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'auto',
  backdropFilter: 'blur(6px)',
};

const gameOverCardStyle: React.CSSProperties = {
  background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)',
  border: '2px solid rgba(255,215,0,0.4)',
  borderRadius: 20,
  padding: '48px 56px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 18,
  boxShadow: '0 20px 80px rgba(0,0,0,0.8), 0 0 60px rgba(255,215,0,0.15)',
  color: '#fff',
  textAlign: 'center',
  minWidth: 320,
};

const gameOverTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 900,
  letterSpacing: 4,
  color: '#FFD700',
  textTransform: 'uppercase',
  textShadow: '0 2px 12px rgba(255,215,0,0.6)',
};

const trophyStyle: React.CSSProperties = {
  fontSize: 64,
  lineHeight: 1,
  filter: 'drop-shadow(0 4px 12px rgba(255,215,0,0.5))',
};

const winnerNameStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 900,
  color: '#fff',
  lineHeight: 1.2,
  textShadow: '0 2px 8px rgba(0,0,0,0.5)',
};

const winnerMoneyStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: '#4ade80',
};

const winnerSubStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'rgba(255,255,255,0.5)',
  letterSpacing: 1,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(amount: number): string {
  return `${amount.toLocaleString('vi-VN')} triệu`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GameHUD({ engine }: Props): React.JSX.Element {
  const {
    state,
    isPlayerTurn,
    currentPlayer,
    humanPlayer,
    isGameOver,
    isTokenMoving,
    buyProperty,
    declineProperty,
  } = engine;

  // No state yet (game not started) — render nothing
  if (!state) {
    return <div style={hudRootStyle} />;
  }

  const {
    players,
    squares,
    currentPlayerIndex,
    log,
    lastDrawnCard,
    phase,
    pendingAction,
    winner,
  } = state;

  // Find winner player object for game-over screen
  const winnerPlayer = winner
    ? players.find(p => p.id === winner) ?? null
    : null;

  // ── Handlers passed to ActionDialog ────────────────────────────────────────

  function handleBuy(): void {
    buyProperty();
  }

  function handleDecline(): void {
    declineProperty();
  }

  // ── Card confirm ─────────────────────────────────────────────────────────────

  function handleCardConfirm(): void {
    engine.dispatch({ type: 'APPLY_CARD' });
  }

  return (
    <div style={hudRootStyle}>

      {/* ── Player panel (top-left) ─────────────────────────────────────── */}
      <PlayerPanel
        players={players}
        currentPlayerIndex={currentPlayerIndex}
        squares={squares}
      />

      {/* ── Dice panel (bottom-centre) ──────────────────────────────────── */}
      <DicePanel engine={engine} />

      {/* ── Build panel (mid-right) ─────────────────────────────────────── */}
      <BuildPanel
        humanPlayer={humanPlayer}
        squares={squares}
        engine={engine}
      />

      {/* ── Game log (bottom-right) ─────────────────────────────────────── */}
      <GameLog log={log} players={players} />

      {/* ── Action dialog: buy / tax / rent ─────────────────────────────── */}
      {/* Only show AFTER the token has finished walking to its destination. */}
      {isPlayerTurn && !isTokenMoving && pendingAction !== null && (
        <ActionDialog
          pendingAction={pendingAction}
          squares={squares}
          currentPlayer={currentPlayer}
          onBuy={handleBuy}
          onDecline={handleDecline}
        />
      )}

      {/* ── Card draw modal ──────────────────────────────────────────────── */}
      {/* Shown only after movement completes so the player can read the card. */}
      {!isTokenMoving && (
        <CardDrawModal
          card={lastDrawnCard}
          phase={phase}
          onConfirm={handleCardConfirm}
        />
      )}

      {/* ── Game Over overlay ────────────────────────────────────────────── */}
      {isGameOver && winnerPlayer && (
        <div style={gameOverOverlayStyle}>
          <div style={gameOverCardStyle}>
            <div style={trophyStyle}>🏆</div>
            <div style={gameOverTitleStyle}>Game Over</div>
            <div style={winnerNameStyle}>{winnerPlayer.name}</div>
            <div style={winnerMoneyStyle}>
              {formatMoney(winnerPlayer.money)}
            </div>
            <div style={winnerSubStyle}>ĐÃ THẮNG TRẬN ĐẤU!</div>
          </div>
        </div>
      )}

      {/* Edge-case: game over but no winner object resolved */}
      {isGameOver && !winnerPlayer && winner && (
        <div style={gameOverOverlayStyle}>
          <div style={gameOverCardStyle}>
            <div style={trophyStyle}>🏆</div>
            <div style={gameOverTitleStyle}>Game Over</div>
            <div style={winnerNameStyle}>Người chơi thắng!</div>
          </div>
        </div>
      )}
    </div>
  );
}
