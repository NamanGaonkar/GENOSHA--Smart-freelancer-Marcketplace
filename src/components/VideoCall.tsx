import { useState, useRef, useEffect, useCallback } from 'react';
import { Video, Phone, PhoneOff, Minimize2, Maximize2, Mic, MicOff, Camera, CameraOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

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
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Duration timer
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
    // Tell Jitsi to hang up via postMessage before closing
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ type: 'hangup' }),
        'https://meet.jit.si'
      );
    } catch (_) { /* cross-origin ignore */ }
    onEnd();
  }, [onEnd]);

  if (!profile) return null;

  const jitsiUrl = `https://meet.jit.si/${roomId}` +
    `#config.toolbarButtons=%5B%22microphone%22%2C%22camera%22%2C%22desktop%22%2C%22fullscreen%22%2C%22hangup%22%2C%22tileview%22%5D` +
    `&config.startWithAudioMuted=false` +
    `&config.startWithVideoMuted=false` +
    `&config.disableDeepLinking=true` +
    `&config.externalConnectUrl=null` +
    `&config.enableExternalConnection=false` +
    `&config.p2p.enabled=true` +
    `&config.analytics.disabled=true` +
    `&userInfo.displayName=${encodeURIComponent(profile.full_name || 'User')}`;

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
        {/* ─── Header Bar ─── */}
        <div style={{
          padding: minimized ? '4px 8px' : '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(16,185,129,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
            <div style={{
              width: minimized ? 22 : 28, height: minimized ? 22 : 28, borderRadius: '50%',
              overflow: 'hidden', border: '2px solid #10b981', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 10px rgba(16,185,129,0.3)',
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
            {!minimized && (
              <>
                <button onClick={() => setAudioMuted(!audioMuted)} style={{
                  width: 30, height: 30, borderRadius: 8,
                  border: audioMuted ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.08)',
                  background: audioMuted ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: audioMuted ? '#ef4444' : '#fff',
                }} title={audioMuted ? 'Unmute' : 'Mute'}>
                  {audioMuted ? <MicOff size={13} /> : <Mic size={13} />}
                </button>
                <button onClick={() => setVideoOff(!videoOff)} style={{
                  width: 30, height: 30, borderRadius: 8,
                  border: videoOff ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.08)',
                  background: videoOff ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: videoOff ? '#ef4444' : '#fff',
                }} title={videoOff ? 'Turn on camera' : 'Turn off camera'}>
                  {videoOff ? <CameraOff size={13} /> : <Camera size={13} />}
                </button>
              </>
            )}
            <button onClick={() => setMinimized(!minimized)} style={{
              width: 30, height: 30, borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.06)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
            }} title={minimized ? 'Maximize' : 'Minimize'}>
              {minimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
            </button>
            <button onClick={handleEndCall} style={{
              width: minimized ? 30 : 'auto',
              height: 30,
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

        {/* ─── Jitsi Iframe — ALWAYS mounted, hidden when minimized ─── */}
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

        {/* ─── Minimized PiP Info ─── */}
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
   INCOMING CALL MODAL
   ════════════════════════════════════════════════════════════ */

interface IncomingCallModalProps {
  callerName: string;
  callerAvatar?: string;
  callType?: string;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallModal({ callerName, callerAvatar, callType = 'video', onAccept, onDecline }: IncomingCallModalProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Play ringtone
    try {
      const ctx = new AudioContext();
      // Create a simple ringtone using Web Audio API
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.value = 440;
      osc2.frequency.value = 480;
      gain.gain.value = 0.1;

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      // Ring pattern: on 1s, off 1s
      const ringInterval = setInterval(() => {
        gain.gain.value = gain.gain.value > 0 ? 0 : 0.1;
      }, 1000);

      audioRef.current = { stop: () => { osc1.stop(); osc2.stop(); clearInterval(ringInterval); ctx.close(); } } as any;
    } catch (_) { /* fallback: no audio */ }

    return () => {
      try { audioRef.current?.stop(); } catch (_) {}
    };
  }, []);

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
        {/* Avatar with pulse ring */}
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

        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
          {callerName}
        </div>
        <div style={{ fontSize: 13, color: '#10b981', marginBottom: 6, fontWeight: 500 }}>
          Incoming {callType === 'presentation' ? 'screen share' : 'video'} call
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 28 }}>
          Tap accept to join the meet
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
          <button onClick={() => { try { audioRef.current?.stop(); } catch (_) {} onDecline(); }} style={{
            width: 60, height: 60, borderRadius: '50%', border: 'none',
            background: 'rgba(239,68,68,0.12)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.25)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }}
          >
            <PhoneOff size={24} color="#ef4444" />
          </button>
          <button onClick={() => { try { audioRef.current?.stop(); } catch (_) {} onAccept(); }} style={{
            width: 60, height: 60, borderRadius: '50%', border: 'none',
            background: 'linear-gradient(135deg, #10b981, #059669)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 24px rgba(16,185,129,0.4)',
            animation: 'pulse 2s ease-in-out infinite',
            transition: 'all 0.2s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <Phone size={24} color="#fff" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   OUTGOING CALL MODAL — Shows "Ringing..." to the caller
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
        {/* Pulsing avatar */}
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

        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
          {peerName}
        </div>
        <div style={{ fontSize: 13, color: '#10b981', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <span style={{ animation: 'pulse 1.5s infinite' }}>Calling</span>
          <span style={{ letterSpacing: 2 }}>...</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>{elapsed}s</span>
        </div>

        <button onClick={onCancel} style={{
          padding: '12px 32px', borderRadius: 12, border: 'none',
          background: 'rgba(239,68,68,0.12)', color: '#ef4444',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          transition: 'all 0.15s',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.25)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
