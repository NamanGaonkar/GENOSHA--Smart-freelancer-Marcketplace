import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Briefcase, FileText, MessageSquare, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { AppNotification } from './Notifications';

/* ════════════════════════════════════════════════════════════
   GLOBAL FLOATING TOAST — Real-time in-app notifications
   ════════════════════════════════════════════════════════════ */

interface ToastItem {
  id: string;
  notification: AppNotification;
  progress: number;
}

export default function GlobalToast() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Play notification sound
  const playNotifSound = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.value = 0.05;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (_) { /* silent fallback */ }
  }, []);

  // Listen for real-time notifications via Supabase Realtime
  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel('global-toast-notifs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        (payload) => {
          const n = payload.new as AppNotification;

          // Don't show toast for chat messages if user is in the messages page
          if (n.type === 'message_received' && window.location.pathname === '/messages') return;

          // Don't show toast if the link matches current page
          if (n.link && window.location.pathname === n.link) return;

          playNotifSound();

          const toastItem: ToastItem = {
            id: n.id,
            notification: n,
            progress: 100,
          };

          setToasts((prev) => [...prev.slice(-4), toastItem]); // max 5 toasts
        }
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [profile?.id, playNotifSound, navigate]);

  // Auto-dismiss progress bar + removal
  useEffect(() => {
    if (toasts.length === 0) return;

    const interval = setInterval(() => {
      setToasts((prev) =>
        prev
          .map((t) => ({ ...t, progress: t.progress - 2 }))
          .filter((t) => t.progress > 0)
      );
    }, 100); // 100 ticks * 100ms = 10 seconds

    return () => clearInterval(interval);
  }, [toasts.length]);

  // Remove toast
  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Click toast → navigate
  const handleClick = useCallback((toast: ToastItem) => {
    if (toast.notification.link) {
      navigate(toast.notification.link);
    }
    dismiss(toast.id);
  }, [navigate, dismiss]);

  if (toasts.length === 0) return null;

  const iconFor = (type: string) => {
    switch (type) {
      case 'job_posted': return <Briefcase size={14} color="#10b981" />;
      case 'proposal_received': return <FileText size={14} color="#f59e0b" />;
      case 'proposal_accepted': return <Check size={14} color="#10b981" />;
      case 'proposal_rejected': return <X size={14} color="#ef4444" />;
      case 'contract_created': return <FileText size={14} color="#06b6d4" />;
      case 'contract_completed': return <Check size={14} color="#a78bfa" />;
      case 'job_edited': return <Briefcase size={14} color="#f59e0b" />;
      case 'job_deleted': return <Briefcase size={14} color="#ef4444" />;
      case 'message_received': return <MessageSquare size={14} color="#06b6d4" />;
      default: return <AlertCircle size={14} />;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 68,
      right: 16,
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      width: 340,
      maxWidth: 'calc(100vw - 32px)',
    }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => handleClick(toast)}
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 14,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(16,185,129,0.08)',
            cursor: 'pointer',
            animation: 'slideInRight 0.3s ease-out',
            transition: 'transform 0.15s ease, opacity 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateX(-4px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateX(0)'; }}
        >
          <div style={{ display: 'flex', gap: 10, padding: '12px 14px', alignItems: 'flex-start' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: 'var(--accent-dim)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {iconFor(toast.notification.type)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: 600, color: 'var(--text)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {toast.notification.title}
              </div>
              <div style={{
                fontSize: 11, color: 'var(--text-muted)', marginTop: 2,
                lineHeight: 1.4,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {toast.notification.body}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); dismiss(toast.id); }}
              style={{
                width: 20, height: 20, borderRadius: 6,
                background: 'rgba(255,255,255,0.06)', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0,
                color: 'var(--text-muted)',
              }}
            >
              <X size={10} />
            </button>
          </div>
          {/* Progress bar */}
          <div style={{
            height: 2,
            background: 'rgba(16,185,129,0.2)',
            width: '100%',
          }}>
            <div style={{
              height: '100%',
              width: `${toast.progress}%`,
              background: 'linear-gradient(90deg, #10b981, #34d399)',
              borderRadius: '0 2px 2px 0',
              transition: 'width 0.1s linear',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}
