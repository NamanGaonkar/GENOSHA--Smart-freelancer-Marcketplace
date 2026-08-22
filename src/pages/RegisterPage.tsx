import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { ArrowRight, Code, Briefcase, Eye, EyeOff } from 'lucide-react';
import type { UserRole } from '../types/database';

const BG_VIDEO = 'https://www.image2url.com/r2/default/videos/1787382605958-7ce3d7a5-36d0-4ffd-9f68-cbff84478f61.mp4';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('freelancer');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    const { error } = await signUp(email, password, fullName, role);
    if (error) { toast.error(error); setLoading(false); return; }
    toast.success('Account created! Check your email to verify.');
    navigate('/login');
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px', borderRadius: 10,
    border: '1px solid var(--border)', background: 'var(--bg-input)',
    color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
      <video autoPlay loop muted playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55, zIndex: 0 }} src={BG_VIDEO} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.9) 100%)', zIndex: 1 }} />

      <Link to="/" style={{ position: 'absolute', top: 28, left: 36, zIndex: 10, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/logo.png" alt="GENOSHA" style={{ height: 36, width: 'auto', objectFit: 'contain' }} />
        <span style={{ fontFamily: "'YDYoonche L', 'YDYoonche M', sans-serif", fontSize: 20, fontWeight: 300, color: '#fff', letterSpacing: '-0.01em' }}>GENOSHA</span>
      </Link>

      <div className="relative z-10 w-full max-w-md mx-4" style={{ padding: '48px 40px', borderRadius: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1 style={{ fontFamily: "'YDYoonche L', 'YDYoonche M', sans-serif", fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 300, letterSpacing: '-0.01em', lineHeight: 1.2, marginBottom: 8 }}>
            <span style={{ color: '#fff' }}>Join GENOSHA</span>
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-sec)', fontWeight: 400 }}>Create your account and start building</p>
        </div>

        {/* Role Selection */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
          <button type="button" onClick={() => setRole('freelancer')} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 10,
            border: role === 'freelancer' ? '1px solid rgba(39,243,169,0.4)' : '1px solid var(--border)',
            background: role === 'freelancer' ? 'rgba(39,243,169,0.08)' : 'var(--bg-card)',
            color: role === 'freelancer' ? 'var(--accent)' : 'var(--text-sec)', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.2s',
          }}><Code size={16} /> Freelancer</button>
          <button type="button" onClick={() => setRole('client')} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 10,
            border: role === 'client' ? '1px solid rgba(39,243,169,0.4)' : '1px solid var(--border)',
            background: role === 'client' ? 'rgba(39,243,169,0.08)' : 'var(--bg-card)',
            color: role === 'client' ? 'var(--accent)' : 'var(--text-sec)', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.2s',
          }}><Briefcase size={16} /> Client</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-sec)', marginBottom: 8, fontWeight: 400 }}>Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(39,243,169,0.3)')} onBlur={(e) => (e.target.style.borderColor = 'var(--border)')} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-sec)', marginBottom: 8, fontWeight: 400 }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(39,243,169,0.3)')} onBlur={(e) => (e.target.style.borderColor = 'var(--border)')} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-sec)', marginBottom: 8, fontWeight: 400 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" required minLength={8}
                style={{ ...inputStyle, paddingRight: 44 }} onFocus={(e) => (e.target.style.borderColor = 'rgba(39,243,169,0.3)')} onBlur={(e) => (e.target.style.borderColor = 'var(--border)')} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')} onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="gen-btn-primary" style={{ width: '100%', padding: '14px', marginTop: 8 }}>
            {loading ? <div className="gen-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : <><span style={{ color: 'var(--text-inv)' }}>Create Account</span><ArrowRight size={15} color="var(--text-inv)" /></>}
          </button>
        </form>
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 28 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
