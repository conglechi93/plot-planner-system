import React from 'react';
import type { Player, Square } from '../../game/types/index';
import { calcNetWorth } from '../../game/utils/netWorth';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(amount: number): string {
  return `${amount.toLocaleString('vi-VN')} tr`;
}

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

// ─── Styles ───────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.82)',
  zIndex: 600,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'auto',
  backdropFilter: 'blur(8px)',
};

const panelStyle: React.CSSProperties = {
  background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)',
  border: '1px solid rgba(255,215,0,0.25)',
  borderRadius: 22,
  width: 440,
  maxWidth: '92vw',
  maxHeight: '88vh',
  overflowY: 'auto',
  scrollbarWidth: 'none',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 24px 80px rgba(0,0,0,0.85), 0 0 80px rgba(255,215,0,0.08)',
  color: '#fff',
};

// Header vàng
const headerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  padding: '30px 28px 22px',
  borderBottom: '1px solid rgba(255,255,255,0.07)',
};

const trophyStyle: React.CSSProperties = {
  fontSize: 52,
  lineHeight: 1,
  filter: 'drop-shadow(0 4px 16px rgba(255,215,0,0.55))',
};

const titleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: 5,
  color: '#FFD700',
  textTransform: 'uppercase' as const,
  textShadow: '0 2px 12px rgba(255,215,0,0.5)',
};

const winnerNameStyle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 900,
  color: '#fff',
  lineHeight: 1.2,
};

const winnerSubStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'rgba(255,255,255,0.45)',
  letterSpacing: 1.5,
  textTransform: 'uppercase' as const,
};

// Bảng xếp hạng
const rankingBodyStyle: React.CSSProperties = {
  padding: '16px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const rankSectionLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 2,
  color: 'rgba(255,255,255,0.35)',
  textTransform: 'uppercase' as const,
  marginBottom: 4,
};

function rankRowStyle(rank: number, isWinner: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    borderRadius: 12,
    background: isWinner
      ? 'linear-gradient(90deg, rgba(255,215,0,0.12) 0%, rgba(255,215,0,0.04) 100%)'
      : rank === 0
        ? 'rgba(255,255,255,0.05)'
        : 'rgba(255,255,255,0.03)',
    border: isWinner
      ? '1px solid rgba(255,215,0,0.25)'
      : '1px solid rgba(255,255,255,0.06)',
  };
}

const medalStyle: React.CSSProperties = {
  fontSize: 20,
  lineHeight: 1,
  width: 26,
  textAlign: 'center' as const,
  flexShrink: 0,
};

function tokenDotStyle(color: string): React.CSSProperties {
  return {
    width: 12, height: 12,
    borderRadius: '50%',
    background: color,
    border: '1.5px solid rgba(255,255,255,0.3)',
    boxShadow: `0 0 6px ${color}88`,
    flexShrink: 0,
  };
}

const playerInfoStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  overflow: 'hidden',
};

const playerNameStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: '#e2e8f0',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap' as const,
};

const playerStatsStyle: React.CSSProperties = {
  fontSize: 10,
  color: 'rgba(255,255,255,0.4)',
};

const netWorthStyle = (isWinner: boolean): React.CSSProperties => ({
  fontSize: 14,
  fontWeight: 800,
  color: isWinner ? '#fbbf24' : '#4ade80',
  flexShrink: 0,
  textAlign: 'right' as const,
});

// Stats row
const statsRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  padding: '0 20px 16px',
};

function statBoxStyle(): React.CSSProperties {
  return {
    flex: 1,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 10,
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    alignItems: 'center',
  };
}

const statLabelStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 1.2,
  color: 'rgba(255,255,255,0.35)',
  textTransform: 'uppercase' as const,
  textAlign: 'center' as const,
};

const statValueStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 900,
  color: '#e2e8f0',
};

// Footer buttons
const footerStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  padding: '4px 20px 22px',
};

const stopBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '13px 0',
  background: 'rgba(255,255,255,0.07)',
  color: 'rgba(255,255,255,0.65)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 11,
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  letterSpacing: 0.4,
};

const primaryBtnStyle: React.CSSProperties = {
  flex: 2,
  padding: '13px 0',
  background: 'linear-gradient(135deg, #d97706, #b45309)',
  color: '#fff',
  border: 'none',
  borderRadius: 11,
  fontWeight: 900,
  fontSize: 13,
  cursor: 'pointer',
  letterSpacing: 0.4,
  boxShadow: '0 4px 16px rgba(217,119,6,0.4)',
};

// ─── Bankrupt row ─────────────────────────────────────────────────────────────

const bankruptRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 14px',
  borderRadius: 10,
  background: 'rgba(239,68,68,0.06)',
  border: '1px solid rgba(239,68,68,0.1)',
  opacity: 0.65,
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  players: Player[];
  squares: Square[];
  winnerId: string;
  turnCount: number;
  onStop: () => void;
}

export function GameOverScreen({ players, squares, winnerId, turnCount, onStop }: Props): React.JSX.Element {
  const winnerPlayer = players.find(p => p.id === winnerId) ?? players[0];

  // Chia active (không phá sản) và bankrupt, sort theo net worth
  const activePlayers = players
    .filter(p => !p.isBankrupt)
    .map(p => ({ player: p, netWorth: calcNetWorth(p, squares) }))
    .sort((a, b) => b.netWorth - a.netWorth);

  const bankruptPlayers = players
    .filter(p => p.isBankrupt)
    .map(p => ({ player: p, netWorth: 0 }));

  // Stats trận đấu
  const totalProps   = squares.filter(sq => sq.ownerId !== null).length;
  const totalBuildings = squares.reduce((acc, sq) => acc + (sq.houses > 0 ? 1 : 0), 0);

  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>

        {/* ── Header ── */}
        <div style={headerStyle}>
          <div style={trophyStyle}>🏆</div>
          <div style={titleStyle}>Kết thúc trận đấu</div>
          <div style={winnerNameStyle}>{winnerPlayer?.name ?? 'Người chơi'}</div>
          <div style={winnerSubStyle}>Đã giành chiến thắng!</div>
        </div>

        {/* ── Bảng xếp hạng ── */}
        <div style={rankingBodyStyle}>
          <div style={rankSectionLabel}>Bảng xếp hạng</div>

          {/* Active players */}
          {activePlayers.map(({ player, netWorth }, idx) => {
            const isWinner = player.id === winnerId;
            const medal    = RANK_MEDALS[idx] ?? `#${idx + 1}`;
            return (
              <div key={player.id} style={rankRowStyle(idx, isWinner)}>
                <div style={medalStyle}>{medal}</div>
                <div style={tokenDotStyle(player.tokenColor)} />
                <div style={playerInfoStyle}>
                  <div style={playerNameStyle}>
                    {player.name}
                    {player.isAI && (
                      <span style={{
                        marginLeft: 6, fontSize: 9, fontWeight: 700,
                        color: '#60a5fa', background: 'rgba(96,165,250,0.15)',
                        border: '1px solid rgba(96,165,250,0.25)',
                        borderRadius: 4, padding: '1px 4px', letterSpacing: 0.5,
                      }}>AI</span>
                    )}
                  </div>
                  <div style={playerStatsStyle}>
                    💰 {formatMoney(player.money)} mặt · 🏠 {player.ownedSquares.length} BĐS
                  </div>
                </div>
                <div style={netWorthStyle(isWinner)}>{formatMoney(netWorth)}</div>
              </div>
            );
          })}

          {/* Bankrupt players */}
          {bankruptPlayers.length > 0 && (
            <>
              <div style={{ ...rankSectionLabel, marginTop: 6 }}>Đã phá sản</div>
              {bankruptPlayers.map(({ player }, idx) => (
                <div key={player.id} style={bankruptRowStyle}>
                  <div style={medalStyle}>💀</div>
                  <div style={tokenDotStyle(player.tokenColor)} />
                  <div style={playerInfoStyle}>
                    <div style={{ ...playerNameStyle, color: 'rgba(255,255,255,0.45)' }}>
                      {player.name}
                      {player.isAI && (
                        <span style={{
                          marginLeft: 6, fontSize: 9, fontWeight: 700,
                          color: 'rgba(96,165,250,0.5)', padding: '1px 4px',
                          border: '1px solid rgba(96,165,250,0.15)', borderRadius: 4,
                        }}>AI</span>
                      )}
                    </div>
                    <div style={playerStatsStyle}>Phá sản · hạng {activePlayers.length + idx + 1}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#f87171', fontWeight: 700 }}>PHÁ SẢN</div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* ── Stats trận đấu ── */}
        <div style={statsRowStyle}>
          <div style={statBoxStyle()}>
            <div style={statValueStyle}>{turnCount}</div>
            <div style={statLabelStyle}>Số lượt</div>
          </div>
          <div style={statBoxStyle()}>
            <div style={statValueStyle}>{totalProps}</div>
            <div style={statLabelStyle}>BĐS giao dịch</div>
          </div>
          <div style={statBoxStyle()}>
            <div style={statValueStyle}>{totalBuildings}</div>
            <div style={statLabelStyle}>Công trình</div>
          </div>
          <div style={statBoxStyle()}>
            <div style={statValueStyle}>{players.length - activePlayers.length}</div>
            <div style={statLabelStyle}>Phá sản</div>
          </div>
        </div>

        {/* ── Footer buttons ── */}
        <div style={footerStyle}>
          <button
            style={stopBtnStyle}
            onClick={onStop}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'; }}
          >
            🏠 Về thiết kế
          </button>
          <button
            style={primaryBtnStyle}
            onClick={onStop}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
          >
            🔄 Chơi lại
          </button>
        </div>

      </div>
    </div>
  );
}
