import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { NotificationBell } from './Notifications';
import { Briefcase, MessageSquare, FileText, User, LogOut, LayoutDashboard, Shield, Menu, X } from 'lucide-react';

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => { await signOut(); setMobileOpen(false); navigate('/'); };
  const isActive = (path: string) => location.pathname === path;

  const NavLink = ({ to, label, icon, mobile }: { to: string; label: string; icon: React.ReactNode; mobile?: boolean }) => (
    <Link
      to={to}
      onClick={() => mobile && setMobileOpen(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: mobile ? '12px 16px' : '7px 14px',
        borderRadius: 8, fontSize: mobile ? 14 : 13, fontWeight: 400, textDecoration: 'none',
        transition: 'all 0.15s ease',
        background: isActive(to) ? 'var(--accent-dim)' : 'transparent',
        color: isActive(to) ? 'var(--accent)' : mobile ? 'var(--text)' : 'var(--text-sec)',
      }}
    >
      {icon}<span>{label}</span>
    </Link>
  );

  const navLinks = profile?.role === 'admin'
    ? [{ to: '/admin', label: 'Admin Panel', icon: <Shield size={15} /> }]
    : profile?.role === 'client'
    ? [
        { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
        { to: '/jobs', label: 'Browse Jobs', icon: <Briefcase size={15} /> },
        { to: '/contracts', label: 'Contracts', icon: <FileText size={15} /> },
        { to: '/messages', label: 'Messages', icon: <MessageSquare size={15} /> },
      ]
    : [
        { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
        { to: '/jobs', label: 'Find Work', icon: <Briefcase size={15} /> },
        { to: '/contracts', label: 'Contracts', icon: <FileText size={15} /> },
        { to: '/messages', label: 'Messages', icon: <MessageSquare size={15} /> },
      ];

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'var(--bg-nav)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)', transition: 'background 0.3s, border-color 0.3s',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>
            {/* Logo */}
            <Link to={profile ? '/dashboard' : '/'} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <img src="/logo.png" alt="GENOSHA" style={{ height: 28, width: 'auto', objectFit: 'contain' }} />
              <span style={{ fontFamily: "'YDYoonche L', 'YDYoonche M', sans-serif", fontSize: 16, fontWeight: 300, color: 'var(--text)', letterSpacing: '-0.01em' }}>GENOSHA</span>
            </Link>

            {/* Desktop nav links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }} className="nav-desktop">
              {navLinks.map((l) => <NavLink key={l.to} {...l} />)}
              <NavLink to="/profile" label="Profile" icon={<User size={15} />} />
            </div>

            {/* Right side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <NotificationBell />
              <button onClick={toggle} className="gen-theme-toggle" title={isDark ? 'Light mode' : 'Dark mode'}
                style={{ width: 32, height: 32, fontSize: 14 }}>
                {isDark ? '☀' : '☾'}
              </button>

              {profile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} className="nav-desktop">
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', overflow: 'hidden',
                    background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {(profile as any).avatar_url ? (
                      <img src={(profile as any).avatar_url} alt="" style={{ width: 28, height: 28, objectFit: 'cover' }} />
                    ) : (
                      <span style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 600 }}>
                        {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  <span className="gen-truncate" style={{ color: 'var(--text-sec)', fontSize: 12, maxWidth: 80 }}>{profile.full_name}</span>
                </div>
              )}

              <button onClick={handleSignOut} className="nav-desktop"
                style={{ background: 'none', border: 'none', padding: 6, borderRadius: 6, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', transition: 'color 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                title="Sign out">
                <LogOut size={15} />
              </button>

              {/* Mobile hamburger */}
              <button onClick={() => setMobileOpen(!mobileOpen)} className="nav-mobile-btn"
                style={{ background: 'none', border: 'none', padding: 6, color: 'var(--text)', cursor: 'pointer', display: 'none' }}>
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 59 }} />
          <div style={{
            position: 'fixed', top: 52, right: 0, bottom: 0, width: 280, zIndex: 60,
            background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', padding: '16px 0', overflowY: 'auto',
          }}>
            {/* User info */}
            {profile && (
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--accent-border)' }}>
                  {(profile as any).avatar_url ? (
                    <img src={(profile as any).avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 600 }}>{profile.full_name?.charAt(0) || 'U'}</span>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{profile.full_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{profile.role}</div>
                </div>
              </div>
            )}

            {/* Nav links */}
            <div style={{ padding: '0 8px' }}>
              {navLinks.map((l) => <NavLink key={l.to} {...l} mobile />)}
              <NavLink to="/profile" label="Profile" icon={<User size={15} />} mobile />
            </div>

            {/* Sign out */}
            <div style={{ padding: '8px 8px', marginTop: 'auto', borderTop: '1px solid var(--border)' }}>
              <button onClick={handleSignOut} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
                borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.08)',
                color: '#ef4444', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              }}>
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
