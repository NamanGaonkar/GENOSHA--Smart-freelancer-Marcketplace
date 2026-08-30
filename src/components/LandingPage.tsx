import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HyperText } from './ui/hyper-text';
import {
  MessageSquareCode,
  ShieldCheck,
  Layers,
  Cpu,
  ArrowRight,
  Video,
} from 'lucide-react';


/* ─── useInView hook ──────────────────────────────────────────── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

/* ─── Hero Section ───────────────────────────────────────────── */
function HeroSection() {

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
      {/* Background Video */}
      <video
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
          opacity: 0.55,
          zIndex: 0,
        }}
        src="https://www.image2url.com/r2/default/videos/1787382605958-7ce3d7a5-36d0-4ffd-9f68-cbff84478f61.mp4"
      />

      {/* Dark overlay for text legibility */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.8) 100%)',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />

      {/* Top-left GENOSHA branding */}
      <div
        className="absolute top-0 left-0 right-0 z-20"
        style={{ padding: '28px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, borderRadius: 10, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <img src="/logo.png" alt="GENOSHA" style={{ height: 28, width: 28, objectFit: 'contain', display: 'block' }} />
          </div>
          <span style={{ fontFamily: "'YDYoonche L', 'YDYoonche M', sans-serif", fontSize: 20, fontWeight: 300, color: '#fff', letterSpacing: '-0.01em' }}>GENOSHA</span>
        </div>

      </div>


      {/* GENOSHA Hyper Text — white text with scramble animation */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center justify-center" style={{ padding: '0 16px' }}>
        <div style={{ textAlign: 'center' }}>
          <HyperText
            text="GENOSHA"
            className="text-white select-none"
            style={{ fontSize: 'clamp(3rem, 14vw, 12rem)', fontWeight: 900, letterSpacing: '0.04em', lineHeight: 1 }}
            duration={1200}
          />
        </div>

        {/* Tagline */}
        <p style={{
          fontSize: 'clamp(0.75rem, 2vw, 1.1rem)',
          fontWeight: 700,
          letterSpacing: '0.3em',
          color: '#10b981',
          marginTop: 16,
          textTransform: 'uppercase',
          textAlign: 'center',
        }}>
          THE FREELANCE MARKETPLACE
        </p>

        {/* Subtitle */}
        <p
          className="max-w-xl text-center px-2"
          style={{
            fontSize: 'clamp(0.8rem, 2vw, 1rem)',
            color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.6,
            fontWeight: 400,
            marginTop: 12,
          }}
        >
          Connect with elite freelancers. Post jobs, submit proposals, track
          milestones, and collaborate in real-time, all in one streamlined marketplace.
        </p>

        {/* CTA */}
        <Link
          to="/register"
          className="transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
          style={{
            marginTop: 32,
            padding: '14px 36px',
            background: '#10b981',
            border: 'none',
            borderRadius: 9999,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            textDecoration: 'none',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            boxShadow: '0 0 30px rgba(16,185,129,0.35)',
            transition: 'all 0.3s',
          }}
        >
          Join GENOSHA
        </Link>
      </div>
    </section>
  );
}

/* ─── Features Section ───────────────────────────────────────── */
const FEATURES = [
  {
    Icon: MessageSquareCode,
    title: 'Real-time Workspace & Chat',
    desc: 'Live collaboration rooms powered by Supabase Realtime for instant messaging, proposal discussions, and code review.',
  },
  {
    Icon: ShieldCheck,
    title: 'Milestone & Contract Management',
    desc: 'Structured lifecycle tracking from proposal acceptance to milestone handoffs and sign-offs.',
  },
  {
    Icon: Layers,
    title: 'Verified Skill Taxonomy',
    desc: 'Filter talent by specialized stacks (React, Supabase, AI/LLMs, Tailwind) and role seniority without noise.',
  },
  {
    Icon: Cpu,
    title: 'AI-Assisted Scoping & Proposals',
    desc: 'Streamlined brief generation for clients and rapid proposal formatting for freelancers.',
  },
  {
    Icon: Video,
    title: 'HD Video Calls via Jitsi',
    desc: 'Built-in video conferencing powered by Jitsi Meet. Screen sharing, real-time collaboration, zero setup required.',
    link: 'https://jitsi.org',
    linkLabel: 'Get started with Jitsi',
  },
];

function FeatureCard({
  Icon,
  title,
  desc,
  delay,
  link,
  linkLabel,
}: {
  Icon: typeof MessageSquareCode;
  title: string;
  desc: string;
  delay: number;
  link?: string;
  linkLabel?: string;
}) {
  const { ref, visible } = useInView(0.2);

  return (
    <div
      ref={ref}
      style={{
        padding: '32px 24px',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)',
        transition: `all 0.5s cubic-bezier(0.22,1,0.36,1) ${delay}ms, border 0.3s ease, background 0.3s ease`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
        display: 'flex', flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.border = '1px solid rgba(39,243,169,0.15)';
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.border = '1px solid rgba(255,255,255,0.06)';
        e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
      }}
    >
      <Icon
        size={28}
        style={{ color: '#27f3a9', marginBottom: 20 }}
        strokeWidth={1.5}
      />
      <h3
        style={{
          fontSize: 17,
          fontWeight: 500,
          color: '#fff',
          marginBottom: 10,
          fontFamily: "'YDYoonche L', 'YDYoonche M', sans-serif",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 13.5,
          lineHeight: 1.6,
          color: '#888',
          fontWeight: 400,
        }}
      >
        {desc}
      </p>
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            marginTop: 'auto', paddingTop: 16,
            fontSize: 12, fontWeight: 500, color: '#27f3a9',
            textDecoration: 'none', transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#34d399')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#27f3a9')}
        >
          {linkLabel || 'Learn more'} <ArrowRight size={12} />
        </a>
      )}
    </div>
  );
}

function Features() {
  const header = useInView(0.3);

  return (
    <section
      style={{
        background: '#000',
        padding: '100px 20px',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Section Header — single line */}
        <div
          ref={header.ref}
          style={{
            textAlign: 'center',
            marginBottom: 64,
            opacity: header.visible ? 1 : 0,
            transform: header.visible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.6s cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          <h2
            style={{
              fontFamily: "'YDYoonche L', 'YDYoonche M', sans-serif",
              fontSize: 'clamp(1.8rem, 4vw, 3rem)',
              fontWeight: 300,
              letterSpacing: '-0.01em',
              lineHeight: 1.1,
            }}
          >
            <span style={{ color: '#fff' }}>
              Everything you need to hire and deliver.
            </span>
          </h2>
        </div>

        {/* 4 cards in a single row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 16,
            justifyItems: 'center',
          }}
        >
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} {...f} delay={i * 100} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── About Section ──────────────────────────────────────────── */
function About() {
  const content = useInView(0.3);

  return (
    <section
      style={{
        background: '#000',
        padding: '100px 20px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <div
        ref={content.ref}
        style={{
          maxWidth: 800,
          margin: '0 auto',
          textAlign: 'center',
          opacity: content.visible ? 1 : 0,
          transform: content.visible ? 'translateY(0)' : 'translateY(24px)',
          transition: 'all 0.6s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        {/* Single line header */}
        <h2
          style={{
            fontFamily: "'YDYoonche L', 'YDYoonche M', sans-serif",
            fontSize: 'clamp(1.8rem, 4vw, 3rem)',
            fontWeight: 300,
            letterSpacing: '-0.01em',
            lineHeight: 1.1,
            marginBottom: 24,
          }}
        >
          <span style={{ color: '#fff' }}>Hire fast. Ship faster.</span>
        </h2>
        <p
          style={{
            fontSize: 'clamp(0.9rem, 1.8vw, 1.05rem)',
            lineHeight: 1.8,
            color: '#777',
            fontWeight: 400,
            maxWidth: 520,
            margin: '0 auto',
          }}
        >
          We cut the middlemen and the markup. Post a job, get proposals from
          vetted freelancers, lock in milestones, and pay only when the work
          is done. Real-time chat. Transparent pricing. No surprises.
        </p>

        {/* 3 Info Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 48, maxWidth: 1000, margin: '48px auto 0' }}>
          {[
            { title: 'For Freelancers', desc: 'Build your profile, set your rate, and get matched with projects that fit your skills. Track earnings, deliver milestones, and grow your reputation all in one place.' },
            { title: 'For Clients', desc: 'Post a job in minutes, review proposals from vetted talent, hire freelancers, and collaborate in real-time. Pay only when the work is delivered.' },
            { title: 'How It Works', desc: 'Create an account, browse or post a job, submit or accept proposals, lock in milestones, and ship work. Simple as that. No hidden fees.' },
            { title: 'AI-Powered Insights', desc: 'Smart matching, automated scoping, and real-time analytics to help you hire smarter and deliver faster. Built for the GenAI era.' },
          ].map((card) => (
            <div
              key={card.title}
              style={{
                padding: '28px 24px', borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.02)',
                transition: 'border-color 0.3s, background 0.3s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.2)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
            >
              <div style={{ marginBottom: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 4, borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <img src="/logo.png" alt="GENOSHA" style={{ height: 16, width: 16, objectFit: 'contain', display: 'block' }} />
              </div>
              <h4 style={{ fontSize: 16, fontWeight: 300, color: '#fff', marginBottom: 12, fontFamily: "'YDYoonche L', 'YDYoonche M', sans-serif", letterSpacing: '-0.01em' }}>{card.title}</h4>
              <p style={{ fontSize: 12.5, color: '#555', lineHeight: 1.75 }}>{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Bottom CTA ─────────────────────────────────────────────── */
function BottomCTA() {
  const content = useInView(0.3);

  return (
    <section
      style={{
        background: '#000',
        padding: '80px 20px 100px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <div
        ref={content.ref}
        style={{
          maxWidth: 700,
          margin: '0 auto',
          textAlign: 'center',
          opacity: content.visible ? 1 : 0,
          transform: content.visible ? 'translateY(0)' : 'translateY(24px)',
          transition: 'all 0.6s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <h2
          style={{
            fontFamily: "'YDYoonche L', 'YDYoonche M', sans-serif",
            fontSize: 'clamp(1.8rem, 4vw, 3rem)',
            fontWeight: 300,
            letterSpacing: '-0.01em',
            lineHeight: 1.1,
            color: '#fff',
            marginBottom: 16,
          }}
        >
          Ready to build?
        </h2>
        <p
          style={{
            fontSize: 14,
            color: '#666',
            marginBottom: 28,
            lineHeight: 1.6,
          }}
        >
          Your next project starts here. Sign up in 30 seconds.
        </p>

        <div
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            to="/register"
            className="transition-all duration-300 hover:scale-[1.03] hover:shadow-[0px_6px_32px_8px_rgba(39,243,169,0.22)] active:scale-[0.98]"
            style={{
              padding: '12px 28px',
              background: '#27f3a9',
              boxShadow: '0px 6px 24px 6px rgba(39, 243, 169, 0.25)',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              textDecoration: 'none',
            }}
          >
            <span style={{ color: '#000', fontSize: 14, fontWeight: 600 }}>
              Create an Account
            </span>
            <ArrowRight size={14} style={{ color: '#000' }} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─────────────────────────────────────────────────── */
function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        background: '#000',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '32px 20px',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Bottom bar */}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.04)',
            paddingTop: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/logo.png" alt="GENOSHA" style={{ height: 16, width: 16, objectFit: 'contain', display: 'block' }} />
            <span style={{ fontSize: 11, color: '#444', fontFamily: "'Space Mono', monospace" }}>
              &copy; {year} GENOSHA. All rights reserved.
            </span>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Privacy', 'Terms', 'Contact'].map((item) => (
              <span key={item} style={{ fontSize: 11, color: '#444', cursor: 'default', transition: 'color 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#666'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#444'; }}
              >{item}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── Landing Page ───────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div style={{ background: '#000', minHeight: '100vh' }}>
      <HeroSection />
      <Features />
      <About />
      <BottomCTA />
      <Footer />
    </div>
  );
}
