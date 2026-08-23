import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { updateProfile, getPortfolioItems, createPortfolioItem, deletePortfolioItem, getSkills, getReviewsForUser } from '../lib/api';
import { calcProfileCompleteness, validateFileSize, validateImageType, formatFileSize, MAX_FILE_SIZE, formatDual } from '../lib/utils';
import type { PortfolioItem, Skill } from '../types/database';
import toast from 'react-hot-toast';
import { Edit3, Save, X, Plus, Trash2, ExternalLink, Star, Camera, MapPin, Globe, Link2, Shield } from 'lucide-react';

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [showPfForm, setShowPfForm] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [rateType, setRateType] = useState('hourly');
  const [pricingNote, setPricingNote] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [availability, setAvailability] = useState('');
  const [customSkill, setCustomSkill] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, { enabled: boolean; from: string; to: string }>>({
    Mon: { enabled: true, from: '09:00', to: '17:00' },
    Tue: { enabled: true, from: '09:00', to: '17:00' },
    Wed: { enabled: true, from: '09:00', to: '17:00' },
    Thu: { enabled: true, from: '09:00', to: '17:00' },
    Fri: { enabled: true, from: '09:00', to: '17:00' },
    Sat: { enabled: false, from: '10:00', to: '14:00' },
    Sun: { enabled: false, from: '10:00', to: '14:00' },
  });
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [languages, setLanguages] = useState('');

  useEffect(() => {
    async function load() {
      if (!profile) return;
      setFullName(profile.full_name || '');
      setBio(profile.bio || '');
      setHourlyRate(profile.hourly_rate?.toString() || '');
      setExperienceLevel(profile.experience_level || '');
      setAvailability(profile.availability || 'available');
      setSelectedSkills(profile.skills || []);
      if ((profile as any).weekly_schedule) {
        setWeeklySchedule((profile as any).weekly_schedule);
      }
      setLocation((profile as any).location || '');
      setWebsite((profile as any).website || '');
      setLanguages((profile as any).languages || '');
      if (profile.role === 'freelancer') {
        const [pfRes, skillRes] = await Promise.all([getPortfolioItems(profile.id), getSkills()]);
        setPortfolio(pfRes.data); setAllSkills(skillRes.data);
      }
      // Load reviews
      const revRes = await getReviewsForUser(profile.id);
      setReviews(revRes.data || []);

      setLoading(false);
    }
    load();
  }, [profile]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (!validateImageType(file)) { toast.error('Only JPEG, PNG, WebP, GIF allowed'); return; }
    if (!validateFileSize(file)) { toast.error(`Max ${formatFileSize(MAX_FILE_SIZE)}`); return; }

    const ext = file.name.split('.').pop();
    const path = `avatars/${profile.id}.${ext}`;
    const { error } = await supabase.storage.from('portfolio').upload(path, file, { upsert: true });
    if (error) { toast.error('Upload failed: ' + error.message); return; }

    const { data: urlData } = supabase.storage.from('portfolio').getPublicUrl(path);
    await updateProfile(profile.id, { avatar_url: urlData.publicUrl });
    await refreshProfile();
    toast.success('Photo updated!');
  };

  const handleSave = async () => {
    if (!profile) return; setSaving(true);
    const updates: any = {
      full_name: fullName, bio,
      location: location || null, website: website || null, languages: languages || null,
    };
    if (profile.role === 'freelancer') {
      updates.hourly_rate = hourlyRate ? Number(hourlyRate) : null;
      updates.experience_level = experienceLevel || null;
      updates.availability = availability;
      updates.skills = selectedSkills;
      updates.weekly_schedule = weeklySchedule;
      updates.rate_type = rateType;
      updates.pricing_note = pricingNote || null;
    }
    const { error } = await updateProfile(profile.id, updates);
    if (error) { toast.error('Failed'); setSaving(false); return; }
    await refreshProfile(); setEditing(false); setSaving(false); toast.success('Profile updated!');
  };

  const handleAddPf = async (e: React.FormEvent) => {
    e.preventDefault(); if (!profile) return; setSaving(true);
    const pfTitle = (document.getElementById('pf-title') as HTMLInputElement)?.value;
    const pfDesc = (document.getElementById('pf-desc') as HTMLTextAreaElement)?.value;
    const pfLink = (document.getElementById('pf-link') as HTMLInputElement)?.value;
    const { error } = await createPortfolioItem({ freelancer_id: profile.id, title: pfTitle, description: pfDesc || null, image_url: null, external_link: pfLink || null });
    if (error) { toast.error('Failed'); setSaving(false); return; }
    const res = await getPortfolioItems(profile.id); setPortfolio(res.data);
    setShowPfForm(false); setSaving(false); toast.success('Added!');
  };

  const handleDeletePf = async (itemId: string) => {
    const { error } = await deletePortfolioItem(itemId);
    if (error) { toast.error('Failed'); return; }
    setPortfolio((prev) => prev.filter((p) => p.id !== itemId)); toast.success('Deleted');
  };

  const toggleSkill = (name: string) => {
    setSelectedSkills((prev) => prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}><div className="gen-spinner" /></div>;

  const pct = calcProfileCompleteness(profile);
  const isAdmin = profile?.role === 'admin';

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 className="gen-heading" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>Profile</h1>
        {!isAdmin && (
          !editing ? (
            <button onClick={() => setEditing(true)} className="gen-btn-ghost" style={{ padding: '8px 16px', fontSize: 12 }}><Edit3 size={13} /> Edit</button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSave} disabled={saving} className="gen-btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}><Save size={13} /> {saving ? 'Saving...' : 'Save'}</button>
              <button onClick={() => setEditing(false)} className="gen-btn-ghost" style={{ padding: '8px 12px', fontSize: 12 }}><X size={13} /></button>
            </div>
          )
        )}
      </div>

      {/* Profile Card */}
      <div className="gen-card" style={{ padding: 28, marginBottom: 28 }}>
        {/* Avatar + Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
          <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--accent-border)' }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" style={{ width: 72, height: 72, objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ width: 72, height: 72, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'var(--accent)', fontSize: 28, fontWeight: 600 }}>{profile?.full_name?.charAt(0) || 'U'}</span>
                </div>
              )}
            </div>
            {!isAdmin && (
              <label style={{
                position: 'absolute', bottom: -2, right: -2, width: 26, height: 26, borderRadius: '50%',
                background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '3px solid var(--bg)', cursor: 'pointer', transition: 'transform 0.15s',
              }}>
                <Camera size={11} color="var(--text-inv)" />
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              </label>
            )}
          </div>
          <div>
            <div style={{ color: 'var(--text)', fontSize: 18, fontWeight: 500 }}>{profile?.full_name}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 3, textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 6 }}>
              {isAdmin && <Shield size={12} color="var(--accent)" />}
              {profile?.role} {profile?.experience_level && `· ${profile.experience_level}`}
            </div>
            {profile?.role === 'freelancer' && profile?.hourly_rate && (
              <div style={{ color: 'var(--accent)', fontSize: 13, marginTop: 4, fontWeight: 500 }}>{formatDual(profile.hourly_rate)}/hr</div>
            )}
          </div>
        </div>

        {/* Completeness (not for admin) */}
        {!isAdmin && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
              <span>Profile completeness</span><span>{pct}%</span>
            </div>
            <div style={{ height: 4, background: 'var(--bg-card-hover)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: pct === 100 ? 'var(--accent)' : 'var(--amber)', borderRadius: 999, width: `${pct}%`, transition: 'width 0.5s' }} />
            </div>
          </div>
        )}

        {/* Admin: Read-only view */}
        {isAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, borderRadius: 10, background: 'var(--green-bg)', border: '1px solid var(--accent-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)', fontSize: 13, fontWeight: 500 }}>
              <Shield size={14} /> Platform Administrator
            </div>
            <p style={{ color: 'var(--text-sec)', fontSize: 13, lineHeight: 1.6 }}>
              You have full access to manage users, jobs, and platform settings via the Admin Panel.
            </p>
          </div>
        )}

        {/* Freelancer View */}
        {profile?.role === 'freelancer' && !editing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {profile?.bio && <p style={{ color: 'var(--text-sec)', fontSize: 13, lineHeight: 1.6 }}>{profile.bio}</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, color: 'var(--text-muted)' }}>
              {profile?.hourly_rate && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Star size={12} />{formatDual(profile.hourly_rate)}/hr</span>}
              {profile?.availability && <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: profile.availability === 'available' ? 'var(--accent)' : profile.availability === 'busy' ? 'var(--amber)' : '#555' }} /><span style={{ textTransform: 'capitalize' }}>{profile.availability}</span></span>}
              {(profile as any)?.location && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} />{(profile as any).location}</span>}
              {(profile as any)?.website && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Globe size={12} />{(profile as any).website}</span>}
              {(profile as any)?.languages && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Link2 size={12} />{(profile as any).languages}</span>}
            </div>
            {profile?.skills && profile.skills.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 8 }}>
                {profile.skills.map((skill) => (
                  <span key={skill} style={{ padding: '4px 12px', borderRadius: 8, fontSize: 12, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>{skill}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Client View */}
        {profile?.role === 'client' && !editing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {profile?.bio && <p style={{ color: 'var(--text-sec)', fontSize: 13, lineHeight: 1.6 }}>{profile.bio}</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, color: 'var(--text-muted)' }}>
              {(profile as any)?.location && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} />{(profile as any).location}</span>}
              {(profile as any)?.website && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Globe size={12} />{(profile as any).website}</span>}
              {(profile as any)?.languages && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Link2 size={12} />{(profile as any).languages}</span>}
            </div>
          </div>
        )}

        {/* Reviews Section */}
        {!isAdmin && reviews.length > 0 && !editing && (
          <div className="gen-card" style={{ padding: 20, marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Star size={15} color="#f59e0b" fill="#f59e0b" />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Reviews ({reviews.length})</span>
              <span style={{ fontSize: 12, color: '#f59e0b', marginLeft: 4 }}>
                {((profile as any)?.average_rating || 0).toFixed(1)} ★
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {reviews.slice(0, 5).map((r: any) => (
                <div key={r.id} style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: 'var(--accent)', fontSize: 10, fontWeight: 600 }}>{r.reviewer?.full_name?.charAt(0) || '?'}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{r.reviewer?.full_name || 'Anonymous'}</span>
                    <span style={{ fontSize: 11, color: '#f59e0b' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                  </div>
                  {r.comment && <p style={{ fontSize: 12, color: 'var(--text-sec)', lineHeight: 1.5 }}>{r.comment}</p>}
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{new Date(r.created_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Edit Mode — role-specific fields */}
        {editing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div><label className="gen-label">Full Name</label><input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="gen-input" /></div>
            <div><label className="gen-label">{profile?.role === 'freelancer' ? 'About You' : 'Company Bio'}</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="gen-input" placeholder={profile?.role === 'freelancer' ? 'Tell clients about your skills and experience...' : 'Describe what kind of talent you need...'} />
            </div>

            {/* Freelancer-only fields */}
            {profile?.role === 'freelancer' && (
              <>
                <div>
                  <label className="gen-label">Pricing Structure</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[{ value: 'hourly', label: 'Hourly Rate' }, { value: 'fixed', label: 'Fixed Project' }, { value: 'retainer', label: 'Weekly Retainer' }].map((t) => (
                      <button key={t.value} type="button" onClick={() => setRateType(t.value)} style={{
                        flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                        background: rateType === t.value ? 'var(--accent-dim)' : 'var(--bg-input)',
                        color: rateType === t.value ? 'var(--accent)' : 'var(--text-sec)',
                        border: rateType === t.value ? '1px solid var(--accent-border)' : '1px solid var(--border)',
                        transition: 'all 0.15s',
                      }}>{t.label}</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="gen-label">{rateType === 'hourly' ? 'Hourly Rate (₹ INR)' : rateType === 'fixed' ? 'Starting From (₹ INR)' : 'Weekly Rate (₹ INR)'}</label><input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder={rateType === 'hourly' ? 'e.g. 2500' : rateType === 'fixed' ? 'e.g. 20000' : 'e.g. 50000'} className="gen-input" /></div>
                  <div><label className="gen-label">Experience Level</label>
                    <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)} className="gen-input">
                      <option value="">Select</option><option value="junior">Junior</option><option value="mid">Mid-Level</option><option value="senior">Senior</option><option value="expert">Expert</option>
                    </select>
                  </div>
                </div>
                <div><label className="gen-label">Availability</label>
                  <select value={availability} onChange={(e) => setAvailability(e.target.value)} className="gen-input">
                    <option value="available">Available</option><option value="busy">Busy</option><option value="unavailable">Unavailable</option>
                  </select>
                </div>
                {/* Weekly Schedule */}
                <div>
                  <label className="gen-label">Weekly Schedule</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Object.entries(weeklySchedule).map(([day, sched]) => (
                      <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: sched.enabled ? 'var(--accent-dim)' : 'var(--bg-input)', border: sched.enabled ? '1px solid var(--accent-border)' : '1px solid var(--border)', transition: 'all 0.15s' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', minWidth: 40 }}>
                          <input type="checkbox" checked={sched.enabled} onChange={(e) => setWeeklySchedule(prev => ({ ...prev, [day]: { ...prev[day], enabled: e.target.checked } }))}
                            style={{ accentColor: 'var(--accent)', width: 16, height: 16, cursor: 'pointer' }} />
                          <span style={{ fontSize: 13, fontWeight: 500, color: sched.enabled ? 'var(--text)' : 'var(--text-muted)', minWidth: 32 }}>{day}</span>
                        </label>
                        {sched.enabled && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                            <input type="time" value={sched.from} onChange={(e) => setWeeklySchedule(prev => ({ ...prev, [day]: { ...prev[day], from: e.target.value } }))}
                              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>to</span>
                            <input type="time" value={sched.to} onChange={(e) => setWeeklySchedule(prev => ({ ...prev, [day]: { ...prev[day], to: e.target.value } }))}
                              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div><label className="gen-label">Pricing Note (optional)</label><input type="text" value={pricingNote} onChange={(e) => setPricingNote(e.target.value)} placeholder="e.g. Includes UI design, 2 rounds of revisions" className="gen-input" /></div>                <div><label className="gen-label">Skills</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                    {allSkills.map((skill) => (
                      <button key={skill.id} type="button" onClick={() => toggleSkill(skill.name)} style={{
                        padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                        background: selectedSkills.includes(skill.name) ? 'var(--accent-dim)' : 'var(--bg-input)',
                        color: selectedSkills.includes(skill.name) ? 'var(--accent)' : 'var(--text-sec)',
                        border: selectedSkills.includes(skill.name) ? '1px solid var(--accent-border)' : '1px solid var(--border)',
                      }}>{skill.name}</button>
                    ))}
                  </div>
                  {/* Custom skills */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="text" value={customSkill} onChange={(e) => setCustomSkill(e.target.value)}
                      placeholder="Add a custom skill..."
                      className="gen-input"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customSkill.trim()) {
                          e.preventDefault();
                          const name = customSkill.trim();
                          if (!selectedSkills.includes(name)) setSelectedSkills([...selectedSkills, name]);
                          setCustomSkill('');
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                    <button type="button" onClick={() => {
                      if (customSkill.trim()) {
                        const name = customSkill.trim();
                        if (!selectedSkills.includes(name)) setSelectedSkills([...selectedSkills, name]);
                        setCustomSkill('');
                      }
                    }} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                      Add
                    </button>
                  </div>
                  {selectedSkills.filter(s => !allSkills.find(a => a.name === s)).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                      {selectedSkills.filter(s => !allSkills.find(a => a.name === s)).map((skill) => (
                        <span key={skill} style={{
                          padding: '5px 12px', borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
                          background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)',
                        }}>
                          {skill}
                          <button type="button" onClick={() => toggleSkill(skill)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1, display: 'flex' }}>&times;</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Common fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="gen-label">Location</label><input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Mumbai, India" className="gen-input" /></div>
              <div><label className="gen-label">Languages</label><input type="text" value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="e.g. English, Hindi" className="gen-input" /></div>
            </div>
            <div><label className="gen-label">Website</label><input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yoursite.com" className="gen-input" /></div>
          </div>
        )}
      </div>

      {/* Portfolio — freelancer only */}
      {profile?.role === 'freelancer' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 className="gen-heading" style={{ fontSize: 17 }}>Portfolio</h2>
            <button onClick={() => setShowPfForm(true)} className="gen-btn-ghost" style={{ padding: '8px 14px', fontSize: 12 }}><Plus size={13} /> Add</button>
          </div>

          {showPfForm && (
            <div className="gen-card" style={{ padding: 22, marginBottom: 14 }}>
              <form onSubmit={handleAddPf} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input id="pf-title" type="text" placeholder="Project title" required className="gen-input" />
                <textarea id="pf-desc" placeholder="Description" rows={2} className="gen-input" style={{ resize: 'none' }} />
                <input id="pf-link" type="url" placeholder="External link (optional)" className="gen-input" />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" disabled={saving} className="gen-btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>Add</button>
                  <button type="button" onClick={() => setShowPfForm(false)} className="gen-btn-ghost" style={{ padding: '8px 16px', fontSize: 12 }}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {portfolio.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No portfolio items yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {portfolio.map((item) => (
                <div key={item.id} className="gen-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '18px 20px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--text)', fontSize: 14, fontWeight: 500 }}>{item.title}</div>
                    {item.description && <p style={{ color: 'var(--text-sec)', fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>{item.description}</p>}
                    {item.external_link && (
                      <a href={item.external_link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 12, marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                        <ExternalLink size={11} /> View Project
                      </a>
                    )}
                  </div>
                  <button onClick={() => handleDeletePf(item.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6, transition: 'color 0.15s' }} onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red)')} onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
