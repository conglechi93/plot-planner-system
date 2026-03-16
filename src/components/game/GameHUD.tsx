import React from 'react';
import { PlayerPanel } from './PlayerPanel';
import { DicePanel } from './DicePanel';
import { ActionDialog } from './ActionDialog';
import { CardDrawModal } from './CardDrawModal';
import { BuildPanel } from './BuildPanel';
import { GameLog } from './GameLog';
import { GameOverScreen } from './GameOverScreen';
import { TurnBanner } from './TurnBanner';
import { ToastManager } from './ToastManager';
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

const freeParkingBadgeStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 102,           // just above the DicePanel (height ~86px + 16px gap)
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 300,
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  background: 'rgba(8,8,18,0.88)',
  border: '1px solid rgba(250,204,21,0.3)',
  borderRadius: 20,
  padding: '5px 14px',
  backdropFilter: 'blur(8px)',
  boxShadow: '0 2px 12px rgba(0,0,0,0.5), 0 0 20px rgba(250,204,21,0.08)',
};

const freeParkingLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.45)',
  letterSpacing: 0.5,
};

const freeParkingAmountStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 900,
  color: '#facc15',
  letterSpacing: 0.3,
};

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
    stopGame,
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
    turnCount,
    freeParkingPot,
  } = state;

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleBuy(): void { buyProperty(); }
  function handleDecline(): void { declineProperty(); }
  function handlePayTax(): void { engine.payRent(); }
  function handleCardConfirm(): void { engine.dispatch({ type: 'APPLY_CARD' }); }

  return (
    <div style={hudRootStyle}>

      {/* ── Turn banner (top-centre, slide-in) ── */}
      <TurnBanner
        currentPlayer={currentPlayer}
        turnCount={turnCount}
        isGameOver={isGameOver}
      />

      {/* ── Toast notifications (top-right) ── */}
      <ToastManager log={log} players={players} />

      {/* ── Player panel (top-left) ── */}
      <PlayerPanel
        players={players}
        currentPlayerIndex={currentPlayerIndex}
        squares={squares}
      />

      {/* ── Free Parking pot — chỉ hiện khi có tiền trong quỹ ── */}
      {freeParkingPot > 0 && (
        <div style={freeParkingBadgeStyle}>
          <span style={{ fontSize: 14 }}>🅿️</span>
          <span style={freeParkingLabelStyle}>Quỹ chung:</span>
          <span style={freeParkingAmountStyle}>
            {freeParkingPot.toLocaleString('vi-VN')} tr
          </span>
        </div>
      )}

      {/* ── Dice panel (bottom-centre) ── */}
      <DicePanel engine={engine} />

      {/* ── Build panel — tạm ẩn, nhà tự hiện khi mua BĐS ── */}
      {/* <BuildPanel humanPlayer={humanPlayer} squares={squares} engine={engine} /> */}

      {/* ── Game log (bottom-right) ── */}
      <GameLog log={log} players={players} />

      {/* ── Action dialog: buy / tax / rent ── */}
      {isPlayerTurn && !isTokenMoving && pendingAction !== null && (
        <ActionDialog
          pendingAction={pendingAction}
          squares={squares}
          currentPlayer={currentPlayer}
          onBuy={handleBuy}
          onDecline={handleDecline}
          onPayTax={handlePayTax}
        />
      )}

      {/* ── Card draw modal ── */}
      {!isTokenMoving && (
        <CardDrawModal
          card={lastDrawnCard}
          phase={phase}
          onConfirm={handleCardConfirm}
        />
      )}

      {/* ── Game Over screen ── */}
      {isGameOver && winner && (
        <GameOverScreen
          players={players}
          squares={squares}
          winnerId={winner}
          turnCount={turnCount}
          onStop={stopGame}
        />
      )}
    </div>
  );
}
