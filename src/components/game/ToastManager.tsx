import React, { useEffect, useRef, useState } from 'react';
import type { GameLogEntry, Player } from '../../game/types/index';

// ─── Toast types ──────────────────────────────────────────────────────────────

type ToastVariant = 'money_in' | 'money_out' | 'property' | 'jail' | 'card' | 'build' | 'bankrupt' | 'info';

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
  playerColor: string;
  playerName: string;
  exiting: boolean;
}

// ─── Classify log entry → variant ────────────────────────────────────────────

function classifyEntry(msg: string): ToastVariant | null {
  const m = msg.toLowerCase();

  // Không toast cho các sự kiện bình thường/kém quan trọng
  if (m.includes('tung xúc xắc') || m.includes('kết thúc lượt')) return null;
  if (m.includes('bắt đầu lượt'))                                  return null;

  if (m.includes('phá sản'))                                       return 'bankrupt';
  if (m.includes('bị bắt') || m.includes('vào tù') || m.includes('tù'))  return 'jail';
  if (m.includes('rút thẻ') || m.includes('cơ hội') || m.includes('công quỹ')) return 'card';
  if (m.includes('xây') || m.includes('bán nhà') || m.includes('khách sạn')) return 'build';
  if (m.includes('mua') || m.includes('sở hữu'))                   return 'property';
  if (m.includes('nhận') || m.includes('thu') || m.includes('tiền thưởng') || m.includes('qua ô xuất phát')) return 'money_in';
  if (m.includes('trả') || m.includes('nộp') || m.includes('thuê') || m.includes('thuế')) return 'money_out';

  return 'info';
}

const VARIANT_META: Record<ToastVariant, { icon: string; bg: string; border: string }> = {
  money_in:  { icon: '💰', bg: 'rgba(16,185,129,0.92)',  border: 'rgba(52,211,153,0.4)' },
  money_out: { icon: '💸', bg: 'rgba(220,38,38,0.88)',   border: 'rgba(248,113,113,0.4)' },
  property:  { icon: '🏠', bg: 'rgba(37,99,235,0.90)',   border: 'rgba(96,165,250,0.4)' },
  jail:      { icon: '🔒', bg: 'rgba(180,83,9,0.92)',    border: 'rgba(251,146,60,0.4)' },
  card:      { icon: '🃏', bg: 'rgba(109,40,217,0.92)',  border: 'rgba(167,139,250,0.4)' },
  build:     { icon: '🏗️', bg: 'rgba(14,116,144,0.92)',  border: 'rgba(34,211,238,0.4)' },
  bankrupt:  { icon: '💀', bg: 'rgba(55,10,10,0.96)',    border: 'rgba(248,113,113,0.5)' },
  info:      { icon: 'ℹ️', bg: 'rgba(30,30,50,0.92)',    border: 'rgba(255,255,255,0.15)' },
};

const TOAST_DURATION_MS = 3200;
const MAX_TOASTS        = 4;

// ─── Styles ───────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  top: 56,          // dưới TurnBanner
  right: 16,
  zIndex: 540,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  alignItems: 'flex-end',
  pointerEvents: 'none',
  maxWidth: 320,
};

function toastStyle(meta: typeof VARIANT_META[ToastVariant], exiting: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    background: meta.bg,
    border: `1px solid ${meta.border}`,
    borderRadius: 12,
    padding: '9px 13px',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
    maxWidth: 300,
    opacity: exiting ? 0 : 1,
    transform: exiting ? 'translateX(16px)' : 'translateX(0)',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    animation: exiting ? 'none' : 'toastSlideIn 0.3s cubic-bezier(0.34,1.2,0.64,1)',
  };
}

const iconStyle: React.CSSProperties = {
  fontSize: 16,
  lineHeight: 1.2,
  flexShrink: 0,
};

const toastContentStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};

const toastNameStyle = (color: string): React.CSSProperties => ({
  fontSize: 10,
  fontWeight: 700,
  color,
  letterSpacing: 0.3,
});

const toastMsgStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.9)',
  lineHeight: 1.35,
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  log: GameLogEntry[];
  players: Player[];
}

let _toastId = 0;

export function ToastManager({ log, players }: Props): React.JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const prevLogLenRef = useRef(log.length);

  useEffect(() => {
    const newEntries = log.slice(prevLogLenRef.current);
    prevLogLenRef.current = log.length;

    if (newEntries.length === 0) return;

    const newToasts: Toast[] = [];
    for (const entry of newEntries) {
      const variant = classifyEntry(entry.message);
      if (!variant) continue;

      const player = players.find(p => p.id === entry.playerId);
      newToasts.push({
        id:          ++_toastId,
        message:     entry.message,
        variant,
        playerColor: player?.tokenColor ?? '#888',
        playerName:  player?.name ?? entry.playerId,
        exiting:     false,
      });
    }

    if (newToasts.length === 0) return;

    setToasts(prev => {
      const combined = [...prev, ...newToasts];
      // Giữ tối đa MAX_TOASTS toast
      return combined.slice(-MAX_TOASTS);
    });

    // Schedule dismiss cho từng toast mới
    for (const t of newToasts) {
      // Bắt đầu exit animation
      setTimeout(() => {
        setToasts(prev => prev.map(x => x.id === t.id ? { ...x, exiting: true } : x));
      }, TOAST_DURATION_MS - 350);

      // Xoá khỏi DOM
      setTimeout(() => {
        setToasts(prev => prev.filter(x => x.id !== t.id));
      }, TOAST_DURATION_MS);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log.length]);

  if (toasts.length === 0) return <></>;

  return (
    <>
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <div style={containerStyle}>
        {toasts.map(t => {
          const meta = VARIANT_META[t.variant];
          return (
            <div key={t.id} style={toastStyle(meta, t.exiting)}>
              <span style={iconStyle}>{meta.icon}</span>
              <div style={toastContentStyle}>
                <span style={toastNameStyle(t.playerColor)}>{t.playerName}</span>
                <span style={toastMsgStyle}>{t.message}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
