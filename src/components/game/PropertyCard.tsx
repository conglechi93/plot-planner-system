import React from 'react';
import type { Square, Player } from '../../game/types/index';

// ─── Group colors ─────────────────────────────────────────────────────────────

const GROUP_COLORS: Record<string, string> = {
  brown:      '#8B4513',
  light_blue: '#87CEEB',
  pink:       '#FF69B4',
  orange:     '#FFA500',
  red:        '#FF0000',
  yellow:     '#FFD700',
  green:      '#008000',
  dark_blue:  '#00008B',
};

const GROUP_LABELS: Record<string, string> = {
  brown:      'Nâu',
  light_blue: 'Xanh nhạt',
  pink:       'Hồng',
  orange:     'Cam',
  red:        'Đỏ',
  yellow:     'Vàng',
  green:      'Lục',
  dark_blue:  'Xanh đậm',
};

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
  if (houses === 0) return 'Không có nhà';
  if (houses === 5) return '🏨 Khách sạn';
  return `${'🏠'.repeat(houses)} (${houses} nhà)`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  zIndex: 400,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'auto',
};

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 14,
  maxWidth: 320,
  width: '88vw',
  boxShadow: '0 12px 48px rgba(0,0,0,0.45)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  fontFamily: 'sans-serif',
};

function headerStyle(color: string): React.CSSProperties {
  return {
    background: color,
    padding: '14px 18px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  };
}

const groupLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: 2,
  color: 'rgba(255,255,255,0.8)',
  textTransform: 'uppercase',
};

const nameLargeStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 900,
  color: '#fff',
  textShadow: '0 1px 3px rgba(0,0,0,0.4)',
  lineHeight: 1.2,
};

const priceBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  background: 'rgba(255,255,255,0.25)',
  color: '#fff',
  fontWeight: 800,
  fontSize: 13,
  padding: '3px 10px',
  borderRadius: 6,
  marginTop: 2,
  backdropFilter: 'blur(4px)',
};

const bodyStyle: React.CSSProperties = {
  padding: '14px 18px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const rentTableStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  background: '#f9fafb',
  borderRadius: 8,
  padding: '8px 12px',
  border: '1px solid #e5e7eb',
};

const rentRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 12,
  color: '#374151',
  padding: '2px 0',
  borderBottom: '1px solid #f3f4f6',
};

const rentRowLastStyle: React.CSSProperties = {
  ...rentRowStyle,
  borderBottom: 'none',
  fontWeight: 700,
  color: '#111',
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1.5,
  color: '#9ca3af',
  textTransform: 'uppercase',
  marginBottom: 2,
};

const ownerInfoStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#374151',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontWeight: 600,
};

function ownerDotStyle(color: string): React.CSSProperties {
  return {
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: color,
    border: '1.5px solid rgba(0,0,0,0.2)',
    flexShrink: 0,
  };
}

const mortgagedBannerStyle: React.CSSProperties = {
  background: '#fef2f2',
  border: '1px solid #fecaca',
  color: '#dc2626',
  fontSize: 12,
  fontWeight: 700,
  borderRadius: 6,
  padding: '6px 10px',
  textAlign: 'center',
};

const closeBtnStyle: React.CSSProperties = {
  margin: '2px 18px 14px',
  padding: '10px 0',
  background: '#1f2937',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  letterSpacing: 0.5,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function PropertyCard({ square, owner, onClose }: Props): React.JSX.Element | null {
  if (!square) return null;

  const group = square.group;
  const groupColor = group ? (GROUP_COLORS[group] ?? '#6b7280') : '#6b7280';
  const groupLabel = group ? (GROUP_LABELS[group] ?? '') : '';

  const hasRents =
    square.rentBase !== undefined ||
    square.rentWith1House !== undefined;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={cardStyle} onClick={e => e.stopPropagation()}>

        {/* Colored header */}
        <div style={headerStyle(groupColor)}>
          {group && <div style={groupLabelStyle}>{groupLabel}</div>}
          <div style={nameLargeStyle}>{square.name}</div>
          {square.price !== undefined && (
            <div style={priceBadgeStyle}>
              Giá mua: {formatMoney(square.price)}
            </div>
          )}
        </div>

        <div style={bodyStyle}>

          {/* Mortgaged warning */}
          {square.isMortgaged && (
            <div style={mortgagedBannerStyle}>
              ⚠️ Bất động sản đang bị thế chấp
            </div>
          )}

          {/* Owner */}
          <div>
            <div style={sectionLabelStyle}>Chủ sở hữu</div>
            {owner ? (
              <div style={ownerInfoStyle}>
                <div style={ownerDotStyle(owner.tokenColor)} />
                {owner.name}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#9ca3af' }}>Chưa có chủ</div>
            )}
          </div>

          {/* Buildings */}
          {square.type === 'property' && (
            <div>
              <div style={sectionLabelStyle}>Công trình</div>
              <div style={{ fontSize: 13, color: '#374151' }}>
                {buildingLabel(square.houses)}
              </div>
            </div>
          )}

          {/* Rent table */}
          {hasRents && (
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
                    <span>🏠 2 nhà</span>
                    <span>{formatMoney(square.rentWith2Houses)}</span>
                  </div>
                )}
                {square.rentWith3Houses !== undefined && (
                  <div style={rentRowStyle}>
                    <span>🏠 3 nhà</span>
                    <span>{formatMoney(square.rentWith3Houses)}</span>
                  </div>
                )}
                {square.rentWith4Houses !== undefined && (
                  <div style={rentRowStyle}>
                    <span>🏠 4 nhà</span>
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
          )}

          {/* House cost & mortgage value */}
          {(square.houseCost !== undefined || square.mortgageValue !== undefined) && (
            <div style={{ ...rentTableStyle, gap: 1 }}>
              {square.houseCost !== undefined && (
                <div style={rentRowStyle}>
                  <span>Chi phí xây nhà/KS</span>
                  <span>{formatMoney(square.houseCost)}</span>
                </div>
              )}
              {square.mortgageValue !== undefined && (
                <div style={{ ...rentRowStyle, borderBottom: 'none' }}>
                  <span>Giá thế chấp</span>
                  <span>{formatMoney(square.mortgageValue)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <button style={closeBtnStyle} onClick={onClose}>
          ĐÓNG
        </button>
      </div>
    </div>
  );
}
