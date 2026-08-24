import { useState, useEffect, useCallback, useRef } from 'react';
import { Video, Phone, PhoneOff, Minimize2, Maximize2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface VideoCallProps {
  roomId: string;
  otherUserName: string;
  otherUserAvatar?: string;
  onClose: () => void;
}

export function VideoCallModal({ roomId, otherUserName, otherUserAvatar, onClose }: VideoCallProps) {
  const { profile } = useAuth();
  const [minimized, setMinimized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [jitsiError, setJitsiError] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadJitsi() {
      try {
        await import('@jitsi/react-sdk');
        if (!mounted) return;
      } catch (err) {
        console.error('Failed to load Jitsi:', err);
        if (mounted) setJitsiError(true);
      }
    }
    loadJitsi();
    return () => { mounted = false; };
  }, []);

  if (!profile) return null;

  const handleEndCall = () => {
    toast.success('Call ended');
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: minimized ? 'flex-end' : 'center',
      justifyContent: minimized ? 'flex-end' : 'center',
      background: minimized ? 'transparent' : 'rgba(0,0,0,0.7)',
      backdropFilter: minimized ? 'none' : 'blur(4px)',
      padding: minimized ? '16px' : 0,
    }}>
      <div className="video-call-container" style={{
        width: minimized ? 280 : '92vw',
        maxWidth: minimized ? 280 : 900,
        height: minimized ? 180 : '75vh',
        maxHeight: minimized ? 180 : 700,
        borderRadius: minimized ? 16 : 16,
        overflow: 'hidden',
        background: '#000',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        border: '1px solid rgba(16,185,129,0.2)',
        transition: 'all 0.3s ease',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Call Header */}
        <div style={{
          padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(16,185,129,0.1)', borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <Video size={12} color="#10b981" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {otherUserName}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button onClick={() => setMinimized(!minimized)} style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6,
              cursor: 'pointer', padding: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            }}>
              {minimized ? <Maximize2 size={11} /> : <Minimize2 size={11} />}
            </button>
            <button onClick={handleEndCall} style={{
              background: '#ef4444', border: 'none', borderRadius: 6,
              cursor: 'pointer', padding: '5px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: 4,
            }}>
              <PhoneOff size={11} /><span style={{ fontSize: 10, fontWeight: 600 }}>End</span>
            </button>
          </div>
        </div>

        {/* Jitsi Iframe */}
        {!minimized && (
          <div ref={containerRef} style={{ flex: 1, minHeight: 0 }}>
            {jitsiError ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#fff', flexDirection: 'column', gap: 10 }}>
                <Video size={32} color="#ef4444" />
                <p style={{ fontSize: 14 }}>Failed to load video call</p>
                <button onClick={handleEndCall} style={{ padding: '8px 20px', borderRadius: 8, background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer' }}>Close</button>
              </div>
            ) : (
              <iframe
                src={`https://meet.jit.si/${roomId}#config.toolbarButtons=%5B%22microphone%22%2C%22camera%22%2C%22desktop%22%2C%22fullscreen%22%2C%22hangup%22%2C%22tileview%22%5D&config.startWithAudioMuted=false&config.startWithVideoMuted=false&config.disableDeepLinking=true&userInfo.displayName=${encodeURIComponent(profile.full_name || 'User')}`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="camera; microphone; fullscreen; display-capture; screen-sharing"
                title="Video Call"
              />
            )}
          </div>
        )}

        {/* Minimized PiP view */}
        {minimized && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', overflow: 'hidden',
              border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {otherUserAvatar ? (
                <img src={otherUserAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: '#10b981', fontSize: 14, fontWeight: 600 }}>{otherUserName.charAt(0)}</span>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{otherUserName}</div>
              <div style={{ color: '#10b981', fontSize: 9 }}>Call in progress...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Incoming Call Modal ────────────────────────────────────
interface IncomingCallModalProps {
  callerName: string;
  callerAvatar?: string;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallModal({ callerName, callerAvatar, onAccept, onDecline }: IncomingCallModalProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        width: '85vw', maxWidth: 320, padding: '28px 24px', borderRadius: 24,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        textAlign: 'center', animation: 'gen-zoomIn 0.3s ease-out',
        margin: '0 16px',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', margin: '0 auto 16px',
          overflow: 'hidden', border: '3px solid #10b981',
          boxShadow: '0 0 20px rgba(16,185,129,0.3)',
        }}>
          {callerAvatar ? (
            <img src={callerAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#10b981', fontSize: 28, fontWeight: 600 }}>{callerName.charAt(0)}</span>
            </div>
          )}
        </div>

        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{callerName}</div>
        <div style={{ fontSize: 12, color: '#10b981', marginBottom: 24 }}>Incoming video call...</div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
          <button onClick={onDecline} style={{
            width: 56, height: 56, borderRadius: '50%', border: 'none',
            background: 'rgba(239,68,68,0.15)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <PhoneOff size={22} color="#ef4444" />
          </button>
          <button onClick={onAccept} style={{
            width: 56, height: 56, borderRadius: '50%', border: 'none',
            background: 'linear-gradient(135deg, #10b981, #059669)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(16,185,129,0.4)',
          }}>
            <Phone size={22} color="#fff" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Video Call Hook ────────────────────────────────────────
export function useVideoCall(roomId: string) {
  const { profile } = useAuth();
  const [activeCall, setActiveCall] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ roomName: string; callerName: string; callerAvatar?: string } | null>(null);

  useEffect(() => {
    if (!profile || !roomId) return;

    const channel = supabase.channel(`video-call-${roomId}`)
      .on('broadcast', { event: 'incoming_call' }, (payload) => {
        const data = payload.payload as any;
        if (data.caller_id !== profile.id) {
          setIncomingCall({
            roomName: data.room_name,
            callerName: data.caller_name,
            callerAvatar: data.caller_avatar,
          });
        }
      })
      .on('broadcast', { event: 'call_declined' }, (payload) => {
        const data = payload.payload as any;
        if (data.caller_id === profile.id) {
          setActiveCall(null);
        }
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [profile, roomId]);

  const startCall = useCallback(async () => {
    const roomName = `genosha-call-${roomId}-${Date.now().toString(36)}`;
    setActiveCall(roomName);

    const channel = supabase.channel(`video-call-${roomId}`);
    await channel.send({
      type: 'broadcast',
      event: 'incoming_call',
      payload: {
        room_name: roomName,
        caller_id: profile?.id,
        caller_name: profile?.full_name || 'User',
        caller_avatar: profile?.avatar_url,
      },
    });
  }, [roomId, profile]);

  const acceptCall = useCallback(() => {
    if (incomingCall) {
      setActiveCall(incomingCall.roomName);
      setIncomingCall(null);
    }
  }, [incomingCall]);

  const declineCall = useCallback(async () => {
    if (incomingCall) {
      const channel = supabase.channel(`video-call-${roomId}`);
      await channel.send({
        type: 'broadcast',
        event: 'call_declined',
        payload: { caller_id: profile?.id },
      });
      setIncomingCall(null);
    }
  }, [incomingCall, roomId, profile]);

  const endCall = useCallback(() => {
    setActiveCall(null);
  }, []);

  return { activeCall, incomingCall, startCall, acceptCall, declineCall, endCall };
}
