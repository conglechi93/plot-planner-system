import React, { useState } from 'react';
import type { AuctionState, Player, Square } from '../../game/types/index';

interface Props {
  auction: AuctionState | null;
  players: Player[];
  squares: Square[];
  humanPlayer: Player | null;
  onBid: (amount: number) => void;
  onPass: () => void;
}

export function AuctionModal({
  auction,
  players,
  squares,
  humanPlayer,
  onBid,
  onPass,
}: Props): React.JSX.Element | null {
  const [bidInput, setBidInput] = useState<number>(0);

  if (!auction || !auction.isActive) return null;

  const auctionedSquare = squares[auction.squareIndex];
  const squareName = auctionedSquare?.name ?? `Ô ${auction.squareIndex}`;

  const minBid = auction.currentBidderId === null
    ? 10
    : auction.currentBid + 10;

  // Sync bid input to minimum when auction state changes
  const effectiveBid = bidInput < minBid ? minBid : bidInput;

  const humanHasPassed = humanPlayer
    ? auction.passedPlayers.includes(humanPlayer.id)
    : true;

  const canBid =
    !humanHasPassed &&
    humanPlayer !== null &&
    humanPlayer.money >= minBid &&
    !humanPlayer.isBankrupt;

  const getPlayerName = (id: string) =>
    players.find((p) => p.id === id)?.name ?? id;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,
    pointerEvents: 'auto',
  };

  const cardStyle: React.CSSProperties = {
    background: '#1a1a2e',
    border: '2px solid #f0c040',
    borderRadius: 16,
    padding: '28px 32px',
    minWidth: 340,
    maxWidth: 460,
    color: '#fff',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 20,
    fontWeight: 700,
    color: '#f0c040',
    marginBottom: 4,
    textAlign: 'center',
  };

  const squareNameStyle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 600,
    textAlign: 'center',
    marginBottom: 16,
    color: '#e2e8f0',
  };

  const currentBidStyle: React.CSSProperties = {
    background: '#2d3748',
    borderRadius: 8,
    padding: '10px 16px',
    marginBottom: 12,
    textAlign: 'center',
  };

  const bidsListStyle: React.CSSProperties = {
    maxHeight: 120,
    overflowY: 'auto',
    background: '#111827',
    borderRadius: 8,
    padding: '8px 12px',
    marginBottom: 12,
    fontSize: 13,
  };

  const passedStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#718096',
    marginBottom: 12,
  };

  const inputRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: 8,
    marginBottom: 12,
    alignItems: 'center',
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid #4a5568',
    background: '#2d3748',
    color: '#fff',
    fontSize: 15,
  };

  const bidBtnStyle: React.CSSProperties = {
    padding: '8px 18px',
    borderRadius: 6,
    border: 'none',
    background: canBid ? '#38a169' : '#4a5568',
    color: '#fff',
    fontWeight: 700,
    cursor: canBid ? 'pointer' : 'not-allowed',
    fontSize: 14,
  };

  const passBtnStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 0',
    borderRadius: 6,
    border: 'none',
    background: humanHasPassed ? '#4a5568' : '#e53e3e',
    color: '#fff',
    fontWeight: 700,
    cursor: humanHasPassed ? 'not-allowed' : 'pointer',
    fontSize: 14,
  };

  const moneyStyle: React.CSSProperties = {
    textAlign: 'center',
    fontSize: 13,
    color: '#68d391',
    marginBottom: 8,
  };

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={titleStyle}>🔨 ĐẤU GIÁ</div>
        <div style={squareNameStyle}>{squareName}</div>

        <div style={currentBidStyle}>
          {auction.currentBidderId ? (
            <>
              <div style={{ fontSize: 13, color: '#a0aec0', marginBottom: 2 }}>Giá cao nhất hiện tại:</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#f0c040' }}>
                {auction.currentBid.toLocaleString('vi-VN')} triệu
              </div>
              <div style={{ fontSize: 13, color: '#a0aec0' }}>
                bởi {getPlayerName(auction.currentBidderId)}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 15, color: '#a0aec0' }}>
              Chưa có ai đặt giá. Giá tối thiểu: 10 triệu
            </div>
          )}
        </div>

        {auction.bids.length > 0 && (
          <div style={bidsListStyle}>
            <div style={{ color: '#a0aec0', marginBottom: 4, fontSize: 11 }}>LỊCH SỬ ĐẶT GIÁ:</div>
            {auction.bids.slice(-8).map((bid, i) => (
              <div key={i} style={{ color: '#cbd5e0', marginBottom: 2 }}>
                {getPlayerName(bid.playerId)}: {bid.amount.toLocaleString('vi-VN')} tr
              </div>
            ))}
          </div>
        )}

        {auction.passedPlayers.length > 0 && (
          <div style={passedStyle}>
            Đã bỏ qua: {auction.passedPlayers.map(getPlayerName).join(', ')}
          </div>
        )}

        {humanPlayer && (
          <div style={moneyStyle}>
            Tiền của bạn: {humanPlayer.money.toLocaleString('vi-VN')} triệu
          </div>
        )}

        {!humanHasPassed && canBid && (
          <div style={inputRowStyle}>
            <input
              type="number"
              style={inputStyle}
              min={minBid}
              value={effectiveBid}
              onChange={(e) => setBidInput(Number(e.target.value))}
            />
            <span style={{ fontSize: 13, color: '#a0aec0', whiteSpace: 'nowrap' }}>triệu</span>
            <button
              style={bidBtnStyle}
              onClick={() => onBid(effectiveBid)}
              disabled={!canBid}
            >
              ĐẶT GIÁ
            </button>
          </div>
        )}

        <button
          style={passBtnStyle}
          onClick={onPass}
          disabled={humanHasPassed}
        >
          {humanHasPassed ? '✓ ĐÃ BỎ QUA' : 'BỎ QUA'}
        </button>
      </div>
    </div>
  );
}
