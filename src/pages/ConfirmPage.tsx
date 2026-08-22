import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Hls from 'hls.js';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const HLS_STREAM =
  'https://stream.mux.com/tLkHO1qZoaaQOUeVWo8hEBeGQfySP02EPS02BmnNFyXys.m3u8';

type ConfirmState = 'loading' | 'success' | 'error';

export default function ConfirmPage() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<ConfirmState>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hasVerified = useRef(false);

  // Video background
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (Hls.isSupported()) {
      const hls = new Hls({ autoStartLoad: true });
      hlsRef.current = hls;
      hls.loadSource(HLS_STREAM);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = HLS_STREAM;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {});
      });
    }
    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, []);

  // Verify token on mount
  useEffect(() => {
    if (hasVerified.current) return;
    hasVerified.current = true;

    async function confirm() {
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');

      if (!tokenHash || !type) {
        setState('error');
        setErrorMsg('Invalid confirmation link. Please request a new one.');
        return;
      }

      try {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as 'signup' | 'magiclink' | 'recovery' | 'email_change',
        });

        if (error) {
          setState('error');
          setErrorMsg(error.message || 'Confirmation failed. The link may have expired.');
        } else {
          setState('success');
        }
      } catch {
        setState('error');
        setErrorMsg('Something went wrong. Please try again.');
      }
    }

    confirm();
  }, [searchParams]);

  return (
    <div
      style={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
      }}
    >
      {/* Video BG */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
        }}
      />

      {/* Gradient overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, var(--bg-nav) 50%, rgba(0,0,0,0.95) 100%)',
          zIndex: 1,
        }}
      />

      {/* GENOSHA branding top-left */}
      <Link to="/" style={{ position: 'absolute', top: 28, left: 36, zIndex: 10, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/logo.png" alt="GENOSHA" style={{ height: 36, width: 'auto', objectFit: 'contain' }} />
        <span style={{ fontFamily: "'YDYoonche L', 'YDYoonche M', sans-serif", fontSize: 20, fontWeight: 300, color: '#fff', letterSpacing: '-0.01em' }}>GENOSHA</span>
      </Link>

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-md mx-4"
        style={{
          padding: '56px 40px',
          borderRadius: 16,
          background: 'var(--bg-nav)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--border)',
          textAlign: 'center',
        }}
      >
        {/* Loading */}
        {state === 'loading' && (
          <>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(39,243,169,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 28px',
              }}
            >
              <Loader2
                size={28}
                color="#27f3a9"
                style={{ animation: 'spin 1s linear infinite' }}
              />
            </div>
            <h1
              style={{
                fontFamily: "'YDYoonche L', 'YDYoonche M', sans-serif",
                fontSize: 'clamp(1.4rem, 3vw, 1.8rem)',
                fontWeight: 300,
                letterSpacing: '-0.01em',
                marginBottom: 12,
              }}
            >
              <span style={{ color: '#fff' }}>Confirming your account</span>
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-sec)', lineHeight: 1.6 }}>
              Verifying your email address...
            </p>
          </>
        )}

        {/* Success */}
        {state === 'success' && (
          <>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'var(--accent-dim)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 28px',
                boxShadow: '0 0 40px 8px var(--accent-dim)',
              }}
            >
              <CheckCircle size={32} color="#27f3a9" />
            </div>
            <h1
              style={{
                fontFamily: "'YDYoonche L', 'YDYoonche M', sans-serif",
                fontSize: 'clamp(1.4rem, 3vw, 1.8rem)',
                fontWeight: 300,
                letterSpacing: '-0.01em',
                marginBottom: 12,
              }}
            >
              <span style={{ color: '#fff' }}>You're all set</span>
            </h1>
            <p
              style={{ fontSize: 14, color: 'var(--text-sec)', lineHeight: 1.6, marginBottom: 32 }}
            >
              Your email has been confirmed. Welcome to GENOSHA.
            </p>
            <Link
              to="/login"
              className="transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '14px 32px',
                borderRadius: 10,
                border: 'none',
                background: 'var(--accent)',
                boxShadow: '0px 4px 20px 4px rgba(39, 243, 169, 0.2)',
                cursor: 'pointer',
                textDecoration: 'none',
                width: '100%',
              }}
            >
              <span style={{ color: 'var(--text-inv)', fontSize: 14, fontWeight: 600 }}>
                Sign In to Your Account
              </span>
            </Link>
          </>
        )}

        {/* Error */}
        {state === 'error' && (
          <>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(239,68,68,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 28px',
                boxShadow: '0 0 40px 8px rgba(239,68,68,0.1)',
              }}
            >
              <XCircle size={32} color="#ef4444" />
            </div>
            <h1
              style={{
                fontFamily: "'YDYoonche L', 'YDYoonche M', sans-serif",
                fontSize: 'clamp(1.4rem, 3vw, 1.8rem)',
                fontWeight: 300,
                letterSpacing: '-0.01em',
                marginBottom: 12,
              }}
            >
              <span style={{
                background: 'linear-gradient(90deg, #666666 0%, #d0d0d0 50%, #666666 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Confirmation failed
              </span>
            </h1>
            <p
              style={{
                fontSize: 14,
                color: 'var(--text-sec)',
                lineHeight: 1.6,
                marginBottom: 32,
              }}
            >
              {errorMsg}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Link
                to="/register"
                className="transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '14px 32px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--accent)',
                  boxShadow: '0px 4px 20px 4px rgba(39, 243, 169, 0.2)',
                  cursor: 'pointer',
                  textDecoration: 'none',
                }}
              >
                <span style={{ color: 'var(--text-inv)', fontSize: 14, fontWeight: 600 }}>
                  Try Again
                </span>
              </Link>
              <Link
                to="/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '14px 32px',
                  borderRadius: 10,
                  border: '1px solid var(--border-hover)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-sec)',
                  fontSize: 14,
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
              >
                Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

