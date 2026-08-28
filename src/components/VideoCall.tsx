import { useState, useRef, useEffect, useCallback } from 'react';
import { Phone, PhoneOff, Minimize2, Maximize2, Mic, MicOff, Camera, CameraOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/* ════════════════════════════════════════════════════════════
   VIDEO CALL MODAL — Full Jitsi Integration
   ════════════════════════════════════════════════════════════ */

interface VideoCallProps {
  roomId: string;
  otherUserName: string;
  otherUserAvatar?: string;
  onEnd: () => void;
}

export function VideoCallModal({ roomId, otherUserName, otherUserAvatar, onEnd }: VideoCallProps) {
  const { profile } = useAuth();
  const [minimized, setMinimized] = useState(false);
  const [duration, setDuration] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleEndCall = useCallback(() => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ type: 'hangup' }), '*'
      );
    } catch (_) {}
    onEnd();
  }, [onEnd]);

  if (!profile) return null;

  const jitsiUrl = `https://meet.jit.si/${roomId}#config.toolbarButtons=%5B%22microphone%22%2C%22camera%22%2C%22desktop%22%2C%22fullscreen%22%2C%22hangup%22%2C%22tileview%22%5D&config.disableDeepLinking=true&config.p2p.enabled=true&config.analytics.disabled=true&userInfo.displayName=${encodeURIComponent(profile.full_name || 'User')}`;

  return (
    <div style={{
      position: 'fixed',
      ...(minimized
        ? { bottom: 16, right: 16, top: 'auto', left: 'auto', width: 300, height: 200 }
        : { inset: 0 }),
      zIndex: 9999,
      display: 'flex',
      alignItems: minimized ? 'stretch' : 'center',
      justifyContent: minimized ? 'stretch' : 'center',
      background: minimized ? 'transparent' : 'rgba(0,0,0,0.8)',
      backdropFilter: minimized ? 'none' : 'blur(8px)',
    }}>
      <div className="video-call-container" style={{
        width: minimized ? '100%' : '94vw',
        maxWidth: minimized ? 300 : 960,
        height: minimized ? '100%' : '80vh',
        maxHeight: minimized ? 200 : 720,
        borderRadius: minimized ? 16 : 20,
        overflow: 'hidden',
        background: '#0a0a0a',
        boxShadow: minimized
          ? '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(16,185,129,0.15)'
          : '0 20px 60px rgba(0,0,0,0.5)',
        border: '1px solid rgba(16,185,129,0.12)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
        position: 'relative',
      }}>
        {/* Header */}
        <div style={{
          padding: minimized ? '4px 8px' : '8px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(16,185,129,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
            <div style={{
              width: minimized ? 22 : 28, height: minimized ? 22 : 28, borderRadius: '50%',
              overflow: 'hidden', border: '2px solid #10b981', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {otherUserAvatar ? (
                <img src={otherUserAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: '#10b981', fontSize: minimized ? 10 : 12, fontWeight: 600 }}>
                  {otherUserName.charAt(0)}
                </span>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: minimized ? 10 : 12, fontWeight: 600, color: '#fff',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                Meet with {otherUserName}
              </div>
              {!minimized && (
                <div style={{ fontSize: 9, color: '#10b981', marginTop: 1 }}>
                  {formatDuration(duration)}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button onClick={() => setMinimized(!minimized)} style={{
              width: 30, height: 30, borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.06)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            }}>
              {minimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
            </button>
            <button onClick={handleEndCall} style={{
              width: minimized ? 30 : 'auto', height: 30,
              padding: minimized ? 0 : '0 12px',
              borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', gap: 4, fontWeight: 600,
            }}>
              <PhoneOff size={12} />
              {!minimized && <span style={{ fontSize: 11 }}>End</span>}
            </button>
          </div>
        </div>

        {/* Jitsi Iframe — ALWAYS mounted */}
        <div style={{
          flex: 1, minHeight: 0, position: 'relative',
          ...(minimized
            ? { position: 'absolute', left: -9999, top: 0, width: 800, height: 600, opacity: 0, pointerEvents: 'none' as const }
            : {}),
        }}>
          <iframe
            ref={iframeRef}
            src={jitsiUrl}
            style={{ width: '100%', height: '100%', border: 'none' }}
            allow="camera; microphone; fullscreen; display-capture; screen-sharing"
            title="Jitsi Meet"
          />
        </div>

        {/* Minimized PiP */}
        {minimized && (
          <div style={{
            position: 'absolute', bottom: 8, left: 8, right: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            borderRadius: 8, padding: '4px 8px',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', animation: 'pulse 1.5s infinite' }} />
            <span style={{ color: '#10b981', fontSize: 10, fontWeight: 600 }}>{formatDuration(duration)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   INCOMING CALL MODAL — with guaranteed ringtone stop
   ════════════════════════════════════════════════════════════ */

interface IncomingCallModalProps {
  callerName: string;
  callerAvatar?: string;
  callType?: string;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallModal({ callerName, callerAvatar, callType = 'video', onAccept, onDecline }: IncomingCallModalProps) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRefs = useRef<OscillatorNode[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let ctx: AudioContext | null = null;
    const oscs: OscillatorNode[] = [];

    try {
      ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.value = 440;
      osc2.frequency.value = 480;
      gain.gain.value = 0.08;

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      oscs.push(osc1, osc2);
      oscRefs.current = oscs;

      // Ring pattern
      intervalRef.current = setInterval(() => {
        gain.gain.value = gain.gain.value > 0 ? 0 : 0.08;
      }, 1000);
    } catch (_) {}

    // AGGRESSIVE cleanup — guaranteed stop on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      oscs.forEach((o) => { try { o.stop(); } catch (_) {} });
      oscRefs.current = [];
      if (ctx) {
        try { ctx.close(); } catch (_) {}
        audioCtxRef.current = null;
      }
    };
  }, []);

  // Force-stop ringtone when accept or decline is called
  const stopRing = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    oscRefs.current.forEach((o) => { try { o.stop(); } catch (_) {} });
    oscRefs.current = [];
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch (_) {} audioCtxRef.current = null; }
  }, []);

  const handleAccept = useCallback(() => { stopRing(); onAccept(); }, [stopRing, onAccept]);
  const handleDecline = useCallback(() => { stopRing(); onDecline(); }, [stopRing, onDecline]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)',
    }}>
      <div style={{
        width: '88vw', maxWidth: 340, padding: '32px 28px', borderRadius: 28,
        background: 'var(--bg-card)',
        border: '1px solid rgba(16,185,129,0.15)',
        textAlign: 'center',
        animation: 'gen-zoomIn 0.3s ease-out',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(16,185,129,0.1)',
      }}>
        <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 20px' }}>
          <div style={{
            position: 'absolute', inset: -4, borderRadius: '50%',
            border: '2px solid #10b981',
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
          <div style={{
            width: 80, height: 80, borderRadius: '50%', overflow: 'hidden',
            border: '3px solid #10b981',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {callerAvatar ? (
              <img src={callerAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#10b981', fontSize: 32, fontWeight: 600 }}>{callerName.charAt(0)}</span>
              </div>
            )}
          </div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{callerName}</div>
        <div style={{ fontSize: 13, color: '#10b981', marginBottom: 6, fontWeight: 500 }}>
          Incoming {callType === 'presentation' ? 'screen share' : 'video'} call
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 28 }}>
          Tap accept to join the meet
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
          <button onClick={handleDecline} style={{
            width: 60, height: 60, borderRadius: '50%', border: 'none',
            background: 'rgba(239,68,68,0.12)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <PhoneOff size={24} color="#ef4444" />
          </button>
          <button onClick={handleAccept} style={{
            width: 60, height: 60, borderRadius: '50%', border: 'none',
            background: 'linear-gradient(135deg, #10b981, #059669)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 24px rgba(16,185,129,0.4)',
            animation: 'pulse 2s ease-in-out infinite',
          }}>
            <Phone size={24} color="#fff" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   OUTGOING CALL MODAL
   ════════════════════════════════════════════════════════════ */

interface OutgoingCallProps {
  peerName: string;
  peerAvatar?: string;
  onCancel: () => void;
}

export function OutgoingCallModal({ peerName, peerAvatar, onCancel }: OutgoingCallProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)',
    }}>
      <div style={{
        width: '88vw', maxWidth: 320, padding: '32px 28px', borderRadius: 28,
        background: 'var(--bg-card)',
        border: '1px solid rgba(16,185,129,0.15)',
        textAlign: 'center',
        animation: 'gen-zoomIn 0.3s ease-out',
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
          overflow: 'hidden', border: '3px solid #10b981',
          animation: 'pulse 1.5s ease-in-out infinite',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {peerAvatar ? (
            <img src={peerAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#10b981', fontSize: 32, fontWeight: 600 }}>{peerName.charAt(0)}</span>
            </div>
          )}
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{peerName}</div>
        <div style={{ fontSize: 13, color: '#10b981', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <span style={{ animation: 'pulse 1.5s infinite' }}>Calling</span>
          <span style={{ letterSpacing: 2 }}>...</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>{elapsed}s</span>
        </div>
        <button onClick={onCancel} style={{
          padding: '12px 32px', borderRadius: 12, border: 'none',
          background: 'rgba(239,68,68,0.12)', color: '#ef4444',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
