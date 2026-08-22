import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

// GENOSHA Media Assets
const HLS_STREAM_URL = 'https://stream.mux.com/tLkHO1qZoaaQOUeVWo8hEBeGQfySP02EPS02BmnNFyXys.m3u8';

// Video sources for the circular icons
const VIDEO_HUMAN = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260424_090051_64ea5059-da6b-492b-a171-aa7ecc767dc3.mp4';
const VIDEO_AI = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260424_093237_ff0ddc63-c068-4e29-96da-fdd0e40af133.mp4';

// ── VideoIcon Component ───────────────────────────────────────────
interface VideoIconProps {
  src: string;
  size?: number;
}

function VideoIcon({ src, size = 72 }: VideoIconProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  return (
    <span
      className="video-icon"
      style={{
        width: `clamp(48px, 10vw, ${size}px)`,
        height: `clamp(48px, 10vw, ${size}px)`,
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      >
        <source src={src} type="video/mp4" />
      </video>
    </span>
  );
}

// ── HeroSection Component ────────────────────────────────────────
export default function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls({ autoStartLoad: true });
      hlsRef.current = hls;
      hls.loadSource(HLS_STREAM_URL);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = HLS_STREAM_URL;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {});
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  return (
    <section
      style={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
      }}
    >
      {/* ── HLS Video Background ──────────────────────────────── */}
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

      {/* ── Content Container ─────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 1rem',
          maxWidth: '80rem',
          margin: '0 auto',
          marginTop: '380px',
        }}
      >
        {/* ── Headline ────────────────────────────────────────── */}
        <h1
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 'clamp(2.2rem, 7vw, 6.5rem)',
            color: '#fff',
            fontWeight: 300,
            letterSpacing: '-0.01em',
            lineHeight: 1.1,
          }}
          className="leading-tight"
        >
          <span className="gradient-text">The vision</span>
          <span className="gradient-text">of freelance</span>
          
          {/* Human + AI line */}
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
              color: '#fff',
              marginTop: '0.5rem',
            }}
          >
            <span style={{ color: '#999' }}>is</span>
            <VideoIcon src={VIDEO_HUMAN} size={110} />
            <span>human</span>
            <span
              style={{
                color: '#999',
                position: 'relative',
                top: '0.15em',
                marginLeft: '0.25em',
              }}
            >
              +
            </span>
            <VideoIcon src={VIDEO_AI} size={110} />
            <span>AI</span>
          </span>
        </h1>

        {/* ── Subheading ──────────────────────────────────────── */}
        <p
          style={{
            marginTop: '1rem',
            maxWidth: '36rem',
            textAlign: 'center',
            padding: '0 0.5rem',
            fontSize: 'clamp(0.95rem, 2.2vw, 1.2rem)',
            color: '#ccc',
            lineHeight: 1.4,
            fontWeight: 400,
          }}
        >
          Connect with elite freelancers. Post jobs, submit proposals, track milestones, and collaborate in real-time — all in one streamlined marketplace.
        </p>

        {/* ── CTA Button ──────────────────────────────────────── */}
        <button
          className="transition-all duration-300 hover:scale-[1.03] hover:shadow-[0px_6px_32px_8px_rgba(39,243,169,0.22)] active:scale-[0.98]"
          style={{
            marginTop: '1.5rem',
            padding: '12px 28px',
            background: '#000',
            boxShadow: '0px 6px 24px 6px rgba(39, 243, 169, 0.15)',
            borderRadius: 8,
            outline: '1px solid #30463C',
            outlineOffset: -1,
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 400 }}>
            Join GENOSHA
          </span>
        </button>
      </div>
    </section>
  );
}
