import { useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { ArrowRight, Eye, EyeOff, Code, Briefcase } from 'lucide-react';
import type { UserRole } from '../types/database';


const BG_VIDEO = 'https://www.image2url.com/r2/default/videos/1787382605958-7ce3d7a5-36d0-4ffd-9f68-cbff84478f61.mp4';

type AuthMode = 'login' | 'register';

export default function AuthPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [transitioning, setTransitioning] = useState(false);
  const [displayMode, setDisplayMode] = useState<AuthMode>(initialMode);

  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Register extras
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('freelancer');

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);

  const switchMode = (next: AuthMode) => {
    if (next === mode || transitioning) return;
    setTransitioning(true);
    // Start slide out
    setTimeout(() => {
      setDisplayMode(next);
      setMode(next);
      setSearchParams({ mode: next }, { replace: true });
      // Start slide in after paint
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTransitioning(false);
        });
      });
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (displayMode === 'login') {
      const { error } = await signIn(email, password);
      if (error) { toast.error(error); setLoading(false); return; }
      toast.success('Welcome back!');
      navigate('/dashboard');
    } else {
      if (password.length < 8) { toast.error('Password must be at least 8 characters'); setLoading(false); return; }
      const { error } = await signUp(email, password, fullName, role);
      if (error) { toast.error(error); setLoading(false); return; }
      toast.success('Account created! Check your email to verify.');
      navigate('/login');
    }
    setLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: 10,
    border: '1px solid var(--border)',
    background: 'var(--bg-input)',
    color: 'var(--text)',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  };

  const isLogin = displayMode === 'login';

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
      {/* Background video */}
      <video
        autoPlay loop muted playsInline
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55, zIndex: 0 }}
        src={BG_VIDEO}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.9) 100%)', zIndex: 1 }} />

      {/* Logo */}
      <Link to="/" style={{ position: 'absolute', top: 28, left: 36, zIndex: 10, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, borderRadius: 10, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <img src="/logo.png" alt="GENOSHA" style={{ height: 28, width: 28, objectFit: 'contain', display: 'block' }} />
        </div>
        <span style={{ fontFamily: "'YDYoonche L', 'YDYoonche M', sans-serif", fontSize: 20, fontWeight: 300, color: '#fff', letterSpacing: '-0.01em' }}>GENOSHA</span>
      </Link>

      {/* Auth card */}
      <div
        ref={cardRef}
        className="relative z-10 w-full max-w-md mx-4 auth-card"
        style={{
          padding: 'clamp(24px, 5vw, 48px) clamp(20px, 4vw, 40px)',
          borderRadius: 16,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}
      >

        <div
          style={{
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            opacity: transitioning ? 0 : 1,
            transform: transitioning ? 'translateY(8px)' : 'translateY(0)',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: isLogin ? 40 : 36 }}>
            <h1 style={{
              fontFamily: "'YDYoonche L', 'YDYoonche M', sans-serif",
              fontSize: 'clamp(1.6rem, 4vw, 2.2rem)',
              fontWeight: 300,
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
              marginBottom: 8,
              color: '#fff',
            }}>
              {isLogin ? 'Welcome back' : 'Join GENOSHA'}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-sec)', fontWeight: 400 }}>
              {isLogin ? 'Sign in to your GENOSHA account' : 'Create your account and start building'}
            </p>
          </div>

          {/* Register: role selection */}
          {!isLogin && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
              <button
                type="button"
                onClick={() => setRole('freelancer')}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '14px', borderRadius: 10,
                  border: role === 'freelancer' ? '1px solid rgba(39,243,169,0.4)' : '1px solid var(--border)',
                  background: role === 'freelancer' ? 'rgba(39,243,169,0.08)' : 'var(--bg-card)',
                  color: role === 'freelancer' ? 'var(--accent)' : 'var(--text-sec)',
                  cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.2s',
                }}
              >
                <Code size={16} /> Freelancer
              </button>
              <button
                type="button"
                onClick={() => setRole('client')}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '14px', borderRadius: 10,
                  border: role === 'client' ? '1px solid rgba(39,243,169,0.4)' : '1px solid var(--border)',
                  background: role === 'client' ? 'rgba(39,243,169,0.08)' : 'var(--bg-card)',
                  color: role === 'client' ? 'var(--accent)' : 'var(--text-sec)',
                  cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.2s',
                }}
              >
                <Briefcase size={16} /> Client
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: isLogin ? 20 : 18 }}>
            {/* Full Name (register only) */}
            {!isLogin && (
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-sec)', marginBottom: 8, fontWeight: 400 }}>Full Name</label>
                <input
                  type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(39,243,169,0.3)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-sec)', marginBottom: 8, fontWeight: 400 }}>Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(39,243,169,0.3)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-sec)', marginBottom: 8, fontWeight: 400 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isLogin ? 'Enter your password' : 'Min 8 characters'}
                  required
                  minLength={isLogin ? undefined : 8}
                  style={{ ...inputStyle, paddingRight: 44 }}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(39,243,169,0.3)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', padding: 4, display: 'flex', alignItems: 'center', transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="gen-btn-primary" style={{ width: '100%', padding: '14px', marginTop: 8 }}>
              {loading
                ? <div className="gen-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                : <><span style={{ color: 'var(--text-inv)' }}>{isLogin ? 'Sign In' : 'Create Account'}</span><ArrowRight size={15} color="var(--text-inv)" /></>
              }
            </button>
          </form>

          {/* Toggle link */}
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 28 }}>
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => switchMode(isLogin ? 'register' : 'login')}
              style={{
                color: 'var(--accent)', textDecoration: 'none', fontWeight: 500,
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: 'inherit',
              }}
            >
              {isLogin ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
