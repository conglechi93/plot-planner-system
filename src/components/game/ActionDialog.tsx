import React from 'react';
import type { PendingAction, Square, Player, PropertyGroup } from '../../game/types/index';

// ─── Group colours ────────────────────────────────────────────────────────────

const GROUP_COLORS: Record<PropertyGroup, string> = {
  brown:      '#8B4513',
  light_blue: '#87CEEB',
  pink:       '#FF69B4',
  orange:     '#FF8C00',
  red:        '#DC143C',
  yellow:     '#FFD700',
  green:      '#228B22',
  dark_blue:  '#00008B',
};

const GROUP_LABELS: Record<PropertyGroup, string> = {
  brown:      'Nâu',
  light_blue: 'Xanh nhạt',
  pink:       'Hồng',
  orange:     'Cam',
  red:        'Đỏ',
  yellow:     'Vàng',
  green:      'Lục',
  dark_blue:  'Xanh đậm',
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.55)',
  zIndex: 500,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'auto',
};

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 14,
  padding: '28px 24px 22px',
  maxWidth: 380,
  width: '90vw',
  boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  position: 'relative',
  overflow: 'hidden',
};

const colorStripStyle = (color: string): React.CSSProperties => ({
  position: 'absolute',
  top: 0, left: 0, right: 0,
  height: 10,
  background: color,
});

const propNameStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 900,
  color: '#111',
  marginTop: 4,
  lineHeight: 1.2,
};

const groupTagStyle = (color: string): React.CSSProperties => ({
  display: 'inline-block',
  background: color,
  color: '#fff',
  fontSize: 11,
  fontWeight: 700,
  padding: '2px 8px',
  borderRadius: 4,
  marginBottom: 2,
});

const infoRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  background: '#f9fafb',
  borderRadius: 8,
  padding: '10px 12px',
};

const infoLineStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#374151',
  display: 'flex',
  justifyContent: 'space-between',
};

const labelStyle: React.CSSProperties = { color: '#6b7280', fontWeight: 500 };
const valueStyle: React.CSSProperties = { fontWeight: 700, color: '#111' };

const playerMoneyStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#059669',
  fontWeight: 600,
};

const warningStyle: React.CSSProperties = {
  color: '#dc2626',
  fontSize: 12,
  fontWeight: 700,
  background: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: 6,
  padding: '6px 10px',
};

const btnRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  marginTop: 4,
};

const buyBtnStyle = (disabled: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '12px 0',
  background: disabled ? '#9ca3af' : '#16a34a',
  color: 'white',
  border: 'none',
  borderRadius: 9,
  fontWeight: 800,
  fontSize: 14,
  cursor: disabled ? 'not-allowed' : 'pointer',
  letterSpacing: 0.3,
  transition: 'background 0.15s',
});

const declineBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '12px 0',
  background: '#dc2626',
  color: 'white',
  border: 'none',
  borderRadius: 9,
  fontWeight: 800,
  fontSize: 14,
  cursor: 'pointer',
  letterSpacing: 0.3,
};

const confirmBtnStyle: React.CSSProperties = {
  padding: '12px 24px',
  background: '#dc2626',
  color: 'white',
  border: 'none',
  borderRadius: 9,
  fontWeight: 800,
  fontSize: 14,
  cursor: 'pointer',
  width: '100%',
  letterSpacing: 0.3,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(amount: number): string {
  return `${amount.toLocaleString('vi-VN')} triệu`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  pendingAction: PendingAction | null;
  squares: Square[];
  currentPlayer: Player | null;
  onBuy: () => void;
  onDecline: () => void;
  /** Called when player confirms paying tax. Dispatches PAY_RENT internally. */
  onPayTax: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ActionDialog({
  pendingAction,
  squares,
  currentPlayer,
  onBuy,
  onDecline,
  onPayTax,
}: Props): React.JSX.Element | null {
  if (!pendingAction) return null;

  // ── BUY OR AUCTION ─────────────────────────────────────────────────────────
  if (pendingAction.type === 'buy_or_auction') {
    const square = squares[pendingAction.squareIndex];
    if (!square) return null;

    const group      = square.group as PropertyGroup | undefined;
    const groupColor = group ? (GROUP_COLORS[group] ?? '#6b7280') : '#6b7280';
    const groupLabel = group ? (GROUP_LABELS[group] ?? '') : '';
    const price      = square.price ?? 0;
    const canAfford  = (currentPlayer?.money ?? 0) >= price;

    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>
          <div style={colorStripStyle(groupColor)} />

          {group && <span style={groupTagStyle(groupColor)}>{groupLabel}</span>}
          <div style={propNameStyle}>{square.name}</div>

          <div style={infoRowStyle}>
            <div style={infoLineStyle}>
              <span style={labelStyle}>Giá mua</span>
              <span style={valueStyle}>{formatMoney(price)}</span>
            </div>
            {square.rentBase !== undefined && (
              <div style={infoLineStyle}>
                <span style={labelStyle}>Tiền thuê cơ bản</span>
                <span style={valueStyle}>{formatMoney(square.rentBase)}</span>
              </div>
            )}
            {square.mortgageValue !== undefined && (
              <div style={infoLineStyle}>
                <span style={labelStyle}>Giá thế chấp</span>
                <span style={valueStyle}>{formatMoney(square.mortgageValue)}</span>
              </div>
            )}
          </div>

          <div style={playerMoneyStyle}>
            Ví của bạn: {formatMoney(currentPlayer?.money ?? 0)}
          </div>

          {!canAfford && (
            <div style={warningStyle}>
              ⚠️ Không đủ tiền để mua bất động sản này!
            </div>
          )}

          <div style={btnRowStyle}>
            <button
              style={buyBtnStyle(!canAfford)}
              disabled={!canAfford}
              onClick={onBuy}
            >
              MUA ({formatMoney(price)})
            </button>
            <button style={declineBtnStyle} onClick={onDecline}>
              BỎ QUA
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── PAY TAX ────────────────────────────────────────────────────────────────
  if (pendingAction.type === 'pay_tax') {
    const amount     = pendingAction.amount;
    const remaining  = Math.max(0, (currentPlayer?.money ?? 0) - amount);

    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>
          <div style={colorStripStyle('#1f2937')} />
          <div style={propNameStyle}>Nộp Thuế</div>

          <div style={infoRowStyle}>
            <div style={infoLineStyle}>
              <span style={labelStyle}>Số thuế phải nộp</span>
              <span style={{ ...valueStyle, color: '#dc2626' }}>{formatMoney(amount)}</span>
            </div>
            <div style={infoLineStyle}>
              <span style={labelStyle}>Ví của bạn</span>
              <span style={valueStyle}>{formatMoney(currentPlayer?.money ?? 0)}</span>
            </div>
            <div style={infoLineStyle}>
              <span style={labelStyle}>Số dư sau thuế</span>
              <span style={{ ...valueStyle, color: remaining < 100 ? '#dc2626' : '#059669' }}>
                {formatMoney(remaining)}
              </span>
            </div>
          </div>

          <button style={confirmBtnStyle} onClick={onPayTax}>
            ĐÓNG THUẾ {formatMoney(amount)}
          </button>
        </div>
      </div>
    );
  }

  return null;
}


