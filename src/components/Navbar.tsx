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
      {/* ═══════════ NAVBAR ═══════════ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'var(--bg-nav)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
      }}>
        {/* MATCH gen-page: max-width 1280px, padding 0 16px */}
        <div style={{
          maxWidth: 1280, width: '100%', margin: '0 auto',
          padding: '0 16px', boxSizing: 'border-box',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>

            {/* ═══ LEFT: Logo ═══ */}
            <Link to={profile ? '/dashboard' : '/'} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 5, borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <img src="/logo.png" alt="GENOSHA" style={{ height: 24, width: 24, objectFit: 'contain', display: 'block' }} />
              </div>
              <span style={{ fontFamily: "'YDYoonche L', 'YDYoonche M', sans-serif", fontSize: 18, fontWeight: 400, color: 'var(--text)', letterSpacing: '-0.01em' }}>GENOSHA</span>
            </Link>

            {/* ═══ CENTER: Nav Links (absolute center) ═══ */}
            <div className="nav-desktop" style={{
              position: 'absolute', left: '50%', transform: 'translateX(-50%)',
              display: 'flex', alignItems: 'center', gap: 2,
            }}>
              {navLinks.map((l) => (
                <Link key={l.to} to={l.to} style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '7px 13px', borderRadius: 8,
                  fontSize: 13, fontWeight: 400, textDecoration: 'none', whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  background: isActive(l.to) ? 'var(--accent-dim)' : 'transparent',
                  color: isActive(l.to) ? 'var(--accent)' : 'var(--text-sec)',
                }}>
                  {l.icon}<span>{l.label}</span>
                </Link>
              ))}
              <Link to="/profile" style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '7px 13px', borderRadius: 8,
                fontSize: 13, fontWeight: 400, textDecoration: 'none', whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                background: isActive('/profile') ? 'var(--accent-dim)' : 'transparent',
                color: isActive('/profile') ? 'var(--accent)' : 'var(--text-sec)',
              }}>
                <User size={15} /><span>Profile</span>
              </Link>
            </div>

            {/* ═══ RIGHT: Controls ═══ */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <NotificationBell />

              <button onClick={toggle} title={isDark ? 'Light mode' : 'Dark mode'} style={{
                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--bg-input)', color: 'var(--text-sec)',
                cursor: 'pointer', transition: 'all 0.15s', fontSize: 15,
              }}>
                {isDark ? '☀' : '☾'}
              </button>

              {profile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="nav-desktop">
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', overflow: 'hidden',
                    background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {(profile as any).avatar_url ? (
                      <img src={(profile as any).avatar_url} alt="" style={{ width: 32, height: 32, objectFit: 'cover' }} />
                    ) : (
                      <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 600 }}>
                        {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  <span className="gen-truncate" style={{ color: 'var(--text-sec)', fontSize: 12, maxWidth: 90 }}>{profile.full_name}</span>
                </div>
              )}

              <button onClick={handleSignOut} className="nav-desktop"
                title="Sign out" style={{
                  width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 10, border: '1px solid transparent',
                  background: 'transparent', color: 'var(--text-sec)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; e.currentTarget.style.background = 'rgba(239,68,68,0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-sec)'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent'; }}
              >
                <LogOut size={15} />
              </button>

              {/* Mobile hamburger */}
              <button onClick={() => setMobileOpen(!mobileOpen)} className="nav-mobile-btn" style={{
                width: 36, height: 36, display: 'none', alignItems: 'center', justifyContent: 'center',
                borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--bg-input)', color: 'var(--text)',
                cursor: 'pointer',
              }}>
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ═══════════ MOBILE DRAWER ═══════════ */}
      {mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)', zIndex: 59,
          }} />
          <div style={{
            position: 'fixed', top: 56, right: 0, bottom: 0, width: 280, zIndex: 60,
            background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', padding: '16px 0', overflowY: 'auto',
            boxShadow: '-8px 0 30px rgba(0,0,0,0.3)',
          }}>
            {/* User info */}
            {profile && (
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--accent-border)', flexShrink: 0 }}>
                  {(profile as any).avatar_url ? (
                    <img src={(profile as any).avatar_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ color: 'var(--accent)', fontSize: 15, fontWeight: 600 }}>{profile.full_name?.charAt(0) || 'U'}</span>
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.full_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{profile.role}</div>
                </div>
              </div>
            )}

            {/* Nav links */}
            <div style={{ padding: '0 8px' }}>
              {navLinks.map((l) => (
                <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
                  borderRadius: 8, fontSize: 14, textDecoration: 'none', transition: 'all 0.15s',
                  background: isActive(l.to) ? 'var(--accent-dim)' : 'transparent',
                  color: isActive(l.to) ? 'var(--accent)' : 'var(--text)',
                }}>
                  {l.icon}<span>{l.label}</span>
                </Link>
              ))}
              <Link to="/profile" onClick={() => setMobileOpen(false)} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
                borderRadius: 8, fontSize: 14, textDecoration: 'none', transition: 'all 0.15s',
                background: isActive('/profile') ? 'var(--accent-dim)' : 'transparent',
                color: isActive('/profile') ? 'var(--accent)' : 'var(--text)',
              }}>
                <User size={15} /><span>Profile</span>
              </Link>
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
