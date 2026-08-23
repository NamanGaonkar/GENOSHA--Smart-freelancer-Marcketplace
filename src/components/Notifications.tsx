import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Bell, Briefcase, FileText, MessageSquare, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: 'job_posted' | 'proposal_received' | 'proposal_accepted' | 'proposal_rejected' | 'contract_created' | 'contract_completed' | 'job_edited' | 'job_deleted' | 'message_received';
  link?: string;
  read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const loadNotifications = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) {
      setNotifications(data);
      setUnread(data.filter((n) => !n.read).length);
    }
  };

  useEffect(() => { loadNotifications(); }, [profile]);
  useEffect(() => {
    if (!profile) return;
    const ch = supabase.channel('notif-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, (payload) => {
        const n = payload.new as AppNotification;
        toast(n.title + ': ' + n.body, { icon: '🔔' });
        loadNotifications();
      })
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [profile]);

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnread((prev) => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    if (!profile) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', profile.id).eq('read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  };

  const clearNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnread((prev) => {
      const n = notifications.find((x) => x.id === id);
      return n && !n.read ? Math.max(0, prev - 1) : prev;
    });
  };

  const clearAllNotifications = async () => {
    if (!profile) return;
    await supabase.from('notifications').delete().eq('user_id', profile.id);
    setNotifications([]);
    setUnread(0);
  };

  return { notifications, unread, markRead, markAllRead, clearNotification, clearAllNotifications, refresh: loadNotifications };
}

export async function notifyUsers(
  userIds: string[],
  title: string,
  body: string,
  type: AppNotification['type'],
  link?: string
) {
  const rows = userIds.map((uid) => ({ user_id: uid, title, body, type, link, read: false }));
  await supabase.from('notifications').insert(rows);
}

/* ── Bell Icon + Dropdown ────────────────────────────── */
export function NotificationBell() {
  const { profile } = useAuth();
  const { notifications, unread, markRead, markAllRead, clearNotification, clearAllNotifications } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  if (!profile) return null;

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
      default: return <Bell size={14} />;
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'relative', width: 36, height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 10, border: '1px solid var(--border)',
          background: 'var(--bg-input)', cursor: 'pointer',
          color: 'var(--text-sec)', transition: 'all 0.15s', flexShrink: 0,
        }}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%',
            background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'fixed', top: 56, right: 8, marginTop: 0,
            width: 'min(360px, calc(100vw - 16px))', maxHeight: 420, overflowY: 'auto',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            zIndex: 9999,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Notifications</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {unread > 0 && (
                  <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Mark all read</button>
                )}
                {notifications.length > 0 && (
                  <button onClick={() => { if (confirm('Clear all notifications?')) clearAllNotifications(); }} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Clear all</button>
                )}
              </div>
            </div>
            {notifications.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No notifications yet</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    display: 'flex', gap: 10, padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                    background: n.read ? 'transparent' : 'var(--accent-dim)',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onClick={() => { markRead(n.id); if (n.link) navigate(n.link); setOpen(false); }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = n.read ? 'transparent' : 'var(--accent-dim)'; }}
                >
                  <div style={{ flexShrink: 0, marginTop: 2 }}>{iconFor(n.type)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{n.title}</div>
                    <div className="gen-break-words" style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{n.body}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); clearNotification(n.id); }}
                    style={{ flexShrink: 0, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
                  ><X size={12} /></button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
