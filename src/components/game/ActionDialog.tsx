import React from 'react';
import type { PendingAction, Square, Player, PropertyGroup } from '../../game/types/index';

// ─── Group colours ────────────────────────────────────────────────────────────

const GROUP_COLORS: Record<PropertyGroup, string> = {
  brown:      '#92400e',
  light_blue: '#0284c7',
  pink:       '#db2777',
  orange:     '#ea580c',
  red:        '#dc2626',
  yellow:     '#ca8a04',
  green:      '#16a34a',
  dark_blue:  '#1d4ed8',
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(amount: number): string {
  return `${amount.toLocaleString('vi-VN')} tr`;
}

// ─── Base overlay ─────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.72)',
  backdropFilter: 'blur(6px)',
  zIndex: 500,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'auto',
};

// ─── Card shell ───────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: '#0f172a',
  borderRadius: 20,
  maxWidth: 360,
  width: '90vw',
  boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  fontFamily: '"Inter", system-ui, sans-serif',
};

// ─── Coloured header ──────────────────────────────────────────────────────────

function headerStyle(color: string): React.CSSProperties {
  return {
    background: `linear-gradient(135deg, ${color}dd 0%, ${color}88 100%)`,
    padding: '22px 22px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    position: 'relative',
    overflow: 'hidden',
  };
}

const headerGlowStyle = (color: string): React.CSSProperties => ({
  position: 'absolute',
  inset: 0,
  background: `radial-gradient(circle at 70% 30%, ${color}55 0%, transparent 65%)`,
  pointerEvents: 'none',
});

const groupBadgeStyle = (_color: string): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  background: 'rgba(255,255,255,0.18)',
  color: '#fff',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1.5,
  textTransform: 'uppercase' as const,
  padding: '3px 8px',
  borderRadius: 99,
  width: 'fit-content',
  border: `1px solid rgba(255,255,255,0.25)`,
});

const headerDotStyle = (color: string): React.CSSProperties => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: '#fff',
  boxShadow: `0 0 6px ${color}`,
});

const propNameStyle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 900,
  color: '#fff',
  lineHeight: 1.15,
  textShadow: '0 2px 8px rgba(0,0,0,0.35)',
  letterSpacing: -0.3,
};

const headerPriceStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.85)',
  marginTop: 2,
};

// ─── Body ─────────────────────────────────────────────────────────────────────

const bodyStyle: React.CSSProperties = {
  padding: '16px 20px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
};

// ─── Stats row ────────────────────────────────────────────────────────────────

const statsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 8,
};

function statBoxStyle(highlight?: boolean): React.CSSProperties {
  return {
    background: highlight ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
    border: `1px solid ${highlight ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.07)'}`,
    borderRadius: 10,
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  };
}

const statLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase',
  letterSpacing: 1,
};

function statValueStyle(color?: string): React.CSSProperties {
  return {
    fontSize: 15,
    fontWeight: 800,
    color: color ?? '#e2e8f0',
  };
}

// ─── Wallet strip ─────────────────────────────────────────────────────────────

const walletStripStyle = (canAfford: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: canAfford ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
  border: `1px solid ${canAfford ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
  borderRadius: 10,
  padding: '10px 14px',
});

const walletLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.45)',
  textTransform: 'uppercase',
  letterSpacing: 1,
};

// ─── Buttons ──────────────────────────────────────────────────────────────────

const btnRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
};

function buyBtnStyle(disabled: boolean, color: string): React.CSSProperties {
  return {
    flex: 1,
    padding: '13px 0',
    background: disabled ? 'rgba(255,255,255,0.07)' : `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
    color: disabled ? 'rgba(255,255,255,0.25)' : '#fff',
    border: 'none',
    borderRadius: 11,
    fontWeight: 800,
    fontSize: 13,
    cursor: disabled ? 'not-allowed' : 'pointer',
    letterSpacing: 0.4,
    boxShadow: disabled ? 'none' : `0 4px 16px ${color}55`,
    transition: 'all 0.15s',
  };
}

const declineBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '13px 0',
  background: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.6)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 11,
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  letterSpacing: 0.4,
};

const confirmBtnStyle = (color: string): React.CSSProperties => ({
  padding: '14px 0',
  background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
  color: '#fff',
  border: 'none',
  borderRadius: 11,
  fontWeight: 800,
  fontSize: 14,
  cursor: 'pointer',
  width: '100%',
  letterSpacing: 0.4,
  boxShadow: `0 4px 16px ${color}55`,
});

// ─── Divider ──────────────────────────────────────────────────────────────────

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: 'rgba(255,255,255,0.06)',
  margin: '0 -20px',
};

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
    const accentColor = group ? (GROUP_COLORS[group] ?? '#6366f1') : '#6366f1';
    const groupLabel  = group ? (GROUP_LABELS[group] ?? '') : '';
    const price       = square.price ?? 0;
    const wallet      = currentPlayer?.money ?? 0;
    const canAfford   = wallet >= price;
    const afterBuy    = wallet - price;

    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>

          {/* ── Coloured header ── */}
          <div style={headerStyle(accentColor)}>
            <div style={headerGlowStyle(accentColor)} />
            {group && (
              <div style={groupBadgeStyle(accentColor)}>
                <div style={headerDotStyle(accentColor)} />
                {groupLabel}
              </div>
            )}
            <div style={propNameStyle}>{square.name}</div>
            <div style={headerPriceStyle}>💰 {formatMoney(price)}</div>
          </div>

          {/* ── Body ── */}
          <div style={bodyStyle}>

            {/* Stats grid */}
            <div style={statsGridStyle}>
              {square.rentBase !== undefined && (
                <div style={statBoxStyle()}>
                  <div style={statLabelStyle}>Thuê cơ bản</div>
                  <div style={statValueStyle()}>{formatMoney(square.rentBase)}</div>
                </div>
              )}
              {square.mortgageValue !== undefined && (
                <div style={statBoxStyle()}>
                  <div style={statLabelStyle}>Thế chấp</div>
                  <div style={statValueStyle()}>{formatMoney(square.mortgageValue)}</div>
                </div>
              )}
              {square.houseCost !== undefined && (
                <div style={statBoxStyle()}>
                  <div style={statLabelStyle}>Xây nhà</div>
                  <div style={statValueStyle()}>{formatMoney(square.houseCost)}</div>
                </div>
              )}
              {square.rentWithHotel !== undefined && (
                <div style={statBoxStyle()}>
                  <div style={statLabelStyle}>Thuê KS</div>
                  <div style={statValueStyle('#f59e0b')}>{formatMoney(square.rentWithHotel)}</div>
                </div>
              )}
            </div>

            <div style={dividerStyle} />

            {/* Wallet */}
            <div style={walletStripStyle(canAfford)}>
              <div>
                <div style={walletLabelStyle}>Ví của bạn</div>
                <div style={statValueStyle(canAfford ? '#34d399' : '#f87171')}>
                  {formatMoney(wallet)}
                </div>
              </div>
              {canAfford && (
                <div style={{ textAlign: 'right' }}>
                  <div style={walletLabelStyle}>Sau khi mua</div>
                  <div style={statValueStyle(afterBuy < 200 ? '#fbbf24' : '#94a3b8')}>
                    {formatMoney(afterBuy)}
                  </div>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div style={btnRowStyle}>
              <button
                style={buyBtnStyle(!canAfford, accentColor)}
                disabled={!canAfford}
                onClick={onBuy}
              >
                🏠 MUA {formatMoney(price)}
              </button>
              <button style={declineBtnStyle} onClick={onDecline}>
                BỎ QUA
              </button>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // ── PAY TAX ────────────────────────────────────────────────────────────────
  if (pendingAction.type === 'pay_tax') {
    const amount    = pendingAction.amount;
    const wallet    = currentPlayer?.money ?? 0;
    const remaining = Math.max(0, wallet - amount);
    const taxColor  = '#7c3aed';

    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>

          <div style={headerStyle(taxColor)}>
            <div style={headerGlowStyle(taxColor)} />
            <div style={groupBadgeStyle(taxColor)}>📋 Thuế</div>
            <div style={propNameStyle}>Nộp Thuế</div>
            <div style={headerPriceStyle}>💸 {formatMoney(amount)}</div>
          </div>

          <div style={bodyStyle}>
            <div style={statsGridStyle}>
              <div style={statBoxStyle()}>
                <div style={statLabelStyle}>Số thuế</div>
                <div style={statValueStyle('#f87171')}>{formatMoney(amount)}</div>
              </div>
              <div style={statBoxStyle()}>
                <div style={statLabelStyle}>Ví của bạn</div>
                <div style={statValueStyle()}>{formatMoney(wallet)}</div>
              </div>
            </div>

            <div style={walletStripStyle(remaining >= 0)}>
              <div style={walletLabelStyle}>Số dư sau thuế</div>
              <div style={statValueStyle(remaining < 100 ? '#f87171' : '#34d399')}>
                {formatMoney(remaining)}
              </div>
            </div>

            <button style={confirmBtnStyle(taxColor)} onClick={onPayTax}>
              ✅ ĐÓNG THUẾ {formatMoney(amount)}
            </button>
          </div>

        </div>
      </div>
    );
  }

  return null;
}
