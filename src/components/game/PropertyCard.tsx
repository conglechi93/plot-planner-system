import React from 'react';
import type { Square, Player } from '../../game/types/index';
import { GROUP_COLORS, GROUP_LABELS } from '../../game/constants/groupColors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  square: Square | null;
  owner: Player | null;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(amount: number): string {
  return `${amount.toLocaleString('vi-VN')} triệu`;
}

function buildingLabel(houses: number): string {
  if (houses === 0) return 'Chưa xây';
  if (houses === 5) return '🏨 Khách sạn';
  return `${'🏠'.repeat(houses)} (${houses} nhà)`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

// ─── Header (màu theo nhóm) ───────────────────────────────────────────────────

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

const groupBadgeStyle: React.CSSProperties = {
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
  border: '1px solid rgba(255,255,255,0.25)',
};

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

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: 'rgba(255,255,255,0.06)',
  margin: '0 -20px',
};

// ─── Section label ────────────────────────────────────────────────────────────

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1.5,
  color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase' as const,
  marginBottom: 4,
};

// ─── Owner ────────────────────────────────────────────────────────────────────

const ownerRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const ownerNameStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: '#e2e8f0',
};

function ownerDotStyle(color: string): React.CSSProperties {
  return {
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: color,
    border: '1.5px solid rgba(255,255,255,0.3)',
    flexShrink: 0,
    boxShadow: `0 0 6px ${color}88`,
  };
}

// ─── Buildings ────────────────────────────────────────────────────────────────

const buildingValueStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#4ade80',
};

// ─── Rent table ───────────────────────────────────────────────────────────────

const rentTableStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
  background: 'rgba(255,255,255,0.04)',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.07)',
  overflow: 'hidden',
};

const rentRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: 12,
  color: 'rgba(255,255,255,0.65)',
  padding: '7px 12px',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
};

const rentRowLastStyle: React.CSSProperties = {
  ...rentRowStyle,
  borderBottom: 'none',
  color: '#fbbf24',
  fontWeight: 700,
};

// ─── Stats grid (giá xây / thế chấp) ─────────────────────────────────────────

const statsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 8,
};

function statBoxStyle(): React.CSSProperties {
  return {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
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
  textTransform: 'uppercase' as const,
  letterSpacing: 1,
};

const statValueStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 800,
  color: '#e2e8f0',
};

// ─── Mortgaged banner ─────────────────────────────────────────────────────────

const mortgagedBannerStyle: React.CSSProperties = {
  background: 'rgba(239,68,68,0.1)',
  border: '1px solid rgba(239,68,68,0.3)',
  color: '#f87171',
  fontSize: 12,
  fontWeight: 700,
  borderRadius: 8,
  padding: '8px 12px',
  textAlign: 'center',
};

// ─── Close button ─────────────────────────────────────────────────────────────

const closeBtnStyle: React.CSSProperties = {
  margin: '0 20px 20px',
  padding: '12px 0',
  background: 'rgba(255,255,255,0.07)',
  color: 'rgba(255,255,255,0.7)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 11,
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  letterSpacing: 0.5,
  transition: 'background 0.15s',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function PropertyCard({ square, owner, onClose }: Props): React.JSX.Element | null {
  if (!square) return null;

  const group      = square.group;
  const groupColor = group ? (GROUP_COLORS[group] ?? '#6b7280') : '#6b7280';
  const groupLabel = group ? (GROUP_LABELS[group] ?? '') : '';

  const hasRents =
    square.rentBase !== undefined ||
    square.rentWith1House !== undefined;

  const hasCosts =
    square.houseCost !== undefined ||
    square.mortgageValue !== undefined;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={cardStyle} onClick={e => e.stopPropagation()}>

        {/* ── Coloured header ── */}
        <div style={headerStyle(groupColor)}>
          <div style={headerGlowStyle(groupColor)} />
          {group && (
            <div style={groupBadgeStyle}>{groupLabel}</div>
          )}
          <div style={propNameStyle}>{square.name}</div>
          {square.price !== undefined && (
            <div style={headerPriceStyle}>💰 Giá mua: {formatMoney(square.price)}</div>
          )}
        </div>

        {/* ── Body ── */}
        <div style={bodyStyle}>

          {/* Mortgaged warning */}
          {square.isMortgaged && (
            <div style={mortgagedBannerStyle}>
              ⚠️ Bất động sản đang bị thế chấp
            </div>
          )}

          {/* Owner + Buildings row */}
          <div style={statsGridStyle}>
            <div style={statBoxStyle()}>
              <div style={statLabelStyle}>Chủ sở hữu</div>
              {owner ? (
                <div style={ownerRowStyle}>
                  <div style={ownerDotStyle(owner.tokenColor)} />
                  <span style={ownerNameStyle}>{owner.name}</span>
                </div>
              ) : (
                <div style={{ ...statValueStyle, color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
                  Chưa có chủ
                </div>
              )}
            </div>

            {square.type === 'property' && (
              <div style={statBoxStyle()}>
                <div style={statLabelStyle}>Công trình</div>
                <div style={buildingValueStyle}>{buildingLabel(square.houses)}</div>
              </div>
            )}
          </div>

          {/* Rent table */}
          {hasRents && (
            <>
              <div style={dividerStyle} />
              <div>
                <div style={sectionLabelStyle}>Bảng tiền thuê</div>
                <div style={rentTableStyle}>
                  {square.rentBase !== undefined && (
                    <div style={rentRowStyle}>
                      <span>Không có nhà</span>
                      <span>{formatMoney(square.rentBase)}</span>
                    </div>
                  )}
                  {square.rentWith1House !== undefined && (
                    <div style={rentRowStyle}>
                      <span>🏠 1 nhà</span>
                      <span>{formatMoney(square.rentWith1House)}</span>
                    </div>
                  )}
                  {square.rentWith2Houses !== undefined && (
                    <div style={rentRowStyle}>
                      <span>🏠🏠 2 nhà</span>
                      <span>{formatMoney(square.rentWith2Houses)}</span>
                    </div>
                  )}
                  {square.rentWith3Houses !== undefined && (
                    <div style={rentRowStyle}>
                      <span>🏠🏠🏠 3 nhà</span>
                      <span>{formatMoney(square.rentWith3Houses)}</span>
                    </div>
                  )}
                  {square.rentWith4Houses !== undefined && (
                    <div style={rentRowStyle}>
                      <span>🏠🏠🏠🏠 4 nhà</span>
                      <span>{formatMoney(square.rentWith4Houses)}</span>
                    </div>
                  )}
                  {square.rentWithHotel !== undefined && (
                    <div style={rentRowLastStyle}>
                      <span>🏨 Khách sạn</span>
                      <span>{formatMoney(square.rentWithHotel)}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* House cost & mortgage value */}
          {hasCosts && (
            <>
              <div style={dividerStyle} />
              <div style={statsGridStyle}>
                {square.houseCost !== undefined && (
                  <div style={statBoxStyle()}>
                    <div style={statLabelStyle}>Xây nhà / KS</div>
                    <div style={statValueStyle}>{formatMoney(square.houseCost)}</div>
                  </div>
                )}
                {square.mortgageValue !== undefined && (
                  <div style={statBoxStyle()}>
                    <div style={statLabelStyle}>Thế chấp</div>
                    <div style={statValueStyle}>{formatMoney(square.mortgageValue)}</div>
                  </div>
                )}
              </div>
            </>
          )}

        </div>

        {/* ── Close button ── */}
        <button
          style={closeBtnStyle}
          onClick={onClose}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'; }}
        >
          ĐÓNG
        </button>

      </div>
    </div>
  );
}
