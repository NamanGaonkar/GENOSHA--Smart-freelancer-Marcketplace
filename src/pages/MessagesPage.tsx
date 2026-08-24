import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getChatRooms, getMessages, sendMessage, markMessagesAsRead, uploadFile } from '../lib/api';
import type { MessageWithSender } from '../types/database';
import { Send, MessageSquare, ArrowLeft, Paperclip, File, X, Video } from 'lucide-react';
import { VideoCallModal, IncomingCallModal } from '../components/VideoCall';

export default function MessagesPage() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [attachPreview, setAttachPreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Video call state — declared BEFORE any early return
  const [activeCall, setActiveCall] = useState<string | null>(null);
  const [isRinging, setIsRinging] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{ roomName: string; callerName: string; callerAvatar?: string; callerId: string } | null>(null);

  const loadRooms = useCallback(async () => {
    if (!profile) return;
    const res = await getChatRooms(profile.id);
    setRooms(res.data || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  useEffect(() => {
    if (!profile) return;
    const roomParam = searchParams.get('room');
    if (roomParam && rooms.length > 0) {
      const roomData = rooms as any[];
      const room = roomData.find((r: any) => r.room?.id === roomParam || r.room?.contract_id === roomParam);
      if (room) setSelectedRoom(room.room.id);
    }
  }, [searchParams, rooms]);

  useEffect(() => {
    if (!selectedRoom || !profile) return;
    mountedRef.current = true;

    async function loadMessages() {
      const res = await getMessages(selectedRoom!);
      if (mountedRef.current) setMessages(res.data || []);
      await markMessagesAsRead(selectedRoom!, profile!.id);
    }

    loadMessages();

    if (channelRef.current) channelRef.current.unsubscribe();

    const channel = supabase
      .channel(`room:${selectedRoom}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${selectedRoom}` },
        async (payload) => {
          if (!mountedRef.current) return;
          const { data } = await supabase
            .from('messages')
            .select('*, sender:profiles!messages_sender_id_fkey(*)')
            .eq('id', payload.new.id)
            .single();
          if (mountedRef.current && data) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.id)) return prev;
              return [...prev, data as MessageWithSender];
            });
            if (data.sender_id !== profile.id) {
              await markMessagesAsRead(selectedRoom!, profile.id);
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { mountedRef.current = false; channel.unsubscribe(); channelRef.current = null; };
  }, [selectedRoom, profile]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Video call realtime channel — use user-level channel so recipient gets it regardless of which room they're viewing
  useEffect(() => {
    if (!profile) return;
    const ch = supabase.channel(`vc-user-${profile.id}`)
      .on('broadcast', { event: 'incoming_call' }, (payload) => {
        const d = payload.payload as any;
        if (d.caller_id !== profile.id) {
          setIncomingCall({ roomName: d.room_name, callerName: d.caller_name, callerAvatar: d.caller_avatar, callerId: d.caller_id });
        }
      })
      .on('broadcast', { event: 'call_accepted' }, (payload) => {
        const d = payload.payload as any;
        // The person who was calling now joins the call
        setActiveCall(d.room_name);
        setIsRinging(false);
      })
      .on('broadcast', { event: 'call_declined' }, (payload) => {
        const d = payload.payload as any;
        if (d.caller_id === profile.id) {
          setActiveCall(null);
          setIsRinging(false);
        }
      })
      .on('broadcast', { event: 'call_ended' }, (payload) => {
        const d = payload.payload as any;
        if (d.user_id !== profile.id) {
          setActiveCall(null);
          setIsRinging(false);
          toast('Call ended by other party');
        }
      })
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [profile?.id]);

  const startCall = useCallback(async (_name: string, _avatar?: string) => {
    if (!selectedRoom || !profile) return;
    const room = `genosha-call-${selectedRoom}-${Date.now().toString(36)}`;
    // Don't open Jitsi yet — show ringing state, wait for call_accepted
    setIsRinging(true);
    // Get the other user's ID to send to their user-level channel
    const roomInfo = rooms.find((r: any) => r.room?.id === selectedRoom);
    const otherUserId = roomInfo?.other_user?.id;
    if (otherUserId) {
      const ch = supabase.channel(`vc-user-${otherUserId}`);
      await ch.send({ type: 'broadcast', event: 'incoming_call', payload: { room_name: room, caller_id: profile.id, caller_name: profile.full_name || 'User', caller_avatar: (profile as any).avatar_url } });
    }
    // Store room name so accept can reference it
    (window as any).__genosha_call_room = room;
  }, [selectedRoom, profile, rooms]);

  const acceptCall = useCallback(async () => {
    if (incomingCall && profile) {
      setActiveCall(incomingCall.roomName);
      setIncomingCall(null);
      // Notify the caller that call was accepted
      const ch = supabase.channel(`vc-user-${incomingCall.callerId}`);
      await ch.send({ type: 'broadcast', event: 'call_accepted', payload: { room_name: incomingCall.roomName, acceptor_id: profile.id } });
    }
  }, [incomingCall, profile]);

  const declineCall = useCallback(async () => {
    if (incomingCall && profile) {
      // Send decline to the CALLER's channel (not own)
      const ch = supabase.channel(`vc-user-${incomingCall.callerId}`);
      await ch.send({ type: 'broadcast', event: 'call_declined', payload: { caller_id: incomingCall.callerId } });
      setIncomingCall(null);
    }
  }, [incomingCall, profile]);
  const endCall = useCallback(async () => {
    // Notify the other party that call ended
    if (selectedRoom && profile) {
      const ch = supabase.channel(`video-call-${selectedRoom}`);
      await ch.send({ type: 'broadcast', event: 'call_ended', payload: { user_id: profile.id } });
    }
    setActiveCall(null);
    setIsRinging(false);
  }, [selectedRoom, profile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('Max 10MB'); return; }
    setAttachFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setAttachPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setAttachPreview(null);
    }
  };

  const removeAttachment = () => {
    setAttachFile(null);
    setAttachPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachFile) || !selectedRoom || !profile || sending) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage('');

    let attachmentUrl: string | null = null;
    let attachmentName: string | null = null;

    if (attachFile) {
      const filePath = `chat/${selectedRoom}/${Date.now()}_${attachFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { url } = await uploadFile('chat-attachments', filePath, attachFile);
      if (url) {
        attachmentUrl = url;
        attachmentName = attachFile.name;
      }
    }

    removeAttachment();

    const { error } = await sendMessage({
      room_id: selectedRoom,
      sender_id: profile.id,
      content: content || (attachmentName ? `Sent ${attachmentName}` : ''),
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
    });

    if (error) {
      setNewMessage(content);
      console.error('Send error:', error);
    }
    setSending(false);
  };

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // ═══════════════════════════════════════════════════════════
  // EARLY RETURN AFTER ALL HOOKS
  // ═══════════════════════════════════════════════════════════
  if (loading) return (
    <div className="gen-page" style={{ display: 'flex', justifyContent: 'center', paddingTop: 200 }}>
      <div className="gen-spinner" />
    </div>
  );

  const selectedRoomData = rooms.find((r: any) => r.room?.id === selectedRoom)?.room;
  const isCompleted = selectedRoomData?.contract?.status === 'completed';
  const isCancelled = selectedRoomData?.contract?.status === 'cancelled';
  const chatDisabled = isCompleted || isCancelled;

  const otherMember = rooms.find((r: any) => r.room?.id === selectedRoom);
  const otherProfile = otherMember?.other_user || null;
  const jobTitle = selectedRoomData?.contract?.job?.title || null;

  return (
    <div className="flex flex-col md:flex-row" style={{ height: 'calc(100vh - 68px)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
      {/* ═══ ROOM LIST ═══ */}
      <div
        style={{
          height: '100%',
          background: 'var(--bg-card)',
          flexDirection: 'column',
          flexShrink: 0,
        }}
        className={selectedRoom ? 'hidden md:flex' : 'flex w-full md:w-72 flex-col border-r border-[var(--border)]'}
      >
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Chats</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rooms.length}</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {rooms.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <MessageSquare size={28} style={{ margin: '0 auto 10px', opacity: 0.2 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No conversations yet</p>
            </div>
          ) : (
            rooms.map((room: any) => {
              const rd = room.room;
              if (!rd) return null;
              const isActive = selectedRoom === rd.id;
              return (
                <button key={rd.id} onClick={() => setSelectedRoom(rd.id)} style={{
                  width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none',
                  borderBottom: '1px solid var(--border)',
                  background: isActive ? 'var(--accent-dim)' : 'transparent',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {room.other_user?.avatar_url ? (
                      <img src={room.other_user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>{room.other_user?.full_name?.charAt(0) || '?'}</span>
                    )}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="gen-break-words" style={{ fontSize: 13, fontWeight: 500, color: isActive ? 'var(--accent)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {room.other_user?.full_name || rd.name || 'Chat'}
                    </div>
                    <div className="gen-break-words" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {rd.contract?.job?.title ? rd.contract.job.title : 'Direct message'}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ═══ CHAT AREA ═══ */}
      <div
        style={{ flex: 1, flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}
        className={!selectedRoom ? 'hidden md:flex' : 'flex w-full'}
      >
        {!selectedRoom ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <MessageSquare size={32} style={{ margin: '0 auto 10px', opacity: 0.15 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Select a conversation to start</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-card)', flexShrink: 0 }}>
              <button onClick={() => setSelectedRoom(null)} style={{
                background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                padding: 4, display: 'flex', alignItems: 'center',
              }}>
                <ArrowLeft size={18} />
              </button>
              <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(16,185,129,0.2)' }}>
                {otherProfile?.avatar_url ? (
                  <img src={otherProfile.avatar_url} alt={otherProfile.full_name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>{otherProfile?.full_name?.charAt(0) || '?'}</span>
                )}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="gen-break-words" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {otherProfile?.full_name || selectedRoomData?.name || 'Chat'}
                </div>
                <div className="gen-break-words" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {jobTitle ? `Re: ${jobTitle}` : 'Direct message'}{otherProfile?.role ? ` · ${otherProfile.role}` : ''}
                </div>
              </div>
              {!chatDisabled && !isRinging && !activeCall && (
                <button onClick={() => startCall(otherProfile?.full_name || 'User', otherProfile?.avatar_url)} style={{
                  width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)',
                  background: 'rgba(16,185,129,0.06)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#10b981', transition: 'all 0.15s', flexShrink: 0,
                }} title="Start video call">
                  <Video size={16} />
                </button>
              )}
              {isRinging && !activeCall && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 500, animation: 'pulse 1.5s ease-in-out infinite' }}>Calling...</span>
                  <button onClick={endCall} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', transition: 'all 0.15s', flexShrink: 0 }} title="Cancel call">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 004.73.89 2 2 0 012 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  </button>
                </div>
              )}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {messages.length === 0 && <div style={{ textAlign: 'center', padding: 40 }}><p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Say hello!</p></div>}
              {messages.map((msg) => {
                const isOwn = msg.sender_id === profile?.id;
                return (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '80%' }}>
                      {!isOwn && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                          <div style={{ width: 18, height: 18, borderRadius: '50%', overflow: 'hidden', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {msg.sender?.avatar_url ? (
                              <img src={msg.sender.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ color: '#10b981', fontSize: 8, fontWeight: 600 }}>{msg.sender?.full_name?.charAt(0) || '?'}</span>
                            )}
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{msg.sender?.full_name}</span>
                        </div>
                      )}
                      <div style={{
                        padding: '8px 12px',
                        borderRadius: isOwn ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        fontSize: 13, lineHeight: 1.5,
                        background: isOwn ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.04)',
                        color: isOwn ? '#fff' : 'var(--text)',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                        whiteSpace: 'pre-wrap',
                      }}>
                        {msg.attachment_url && (
                          <div style={{ marginBottom: msg.content ? 8 : 0 }}>
                            {msg.attachment_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                              <img src={msg.attachment_url} alt={msg.attachment_name} style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 8, display: 'block' }} />
                            ) : (
                              <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderRadius: 8, background: isOwn ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)', textDecoration: 'none', color: isOwn ? '#fff' : 'var(--text-sec)', fontSize: 12 }}>
                                <File size={14} />
                                <span className="gen-break-words" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.attachment_name || 'File'}</span>
                              </a>
                            )}
                          </div>
                        )}
                        {msg.content}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, textAlign: isOwn ? 'right' : 'left' }}>
                        {formatTime(msg.created_at)} {isOwn && msg.is_read && <span style={{ color: '#10b981', marginLeft: 2 }}>✓✓</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Attachment Preview */}
            {attachFile && (
              <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', flexShrink: 0 }}>
                {attachPreview ? (
                  <img src={attachPreview} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <File size={14} color="var(--text-muted)" />
                  </div>
                )}
                <span className="gen-break-words" style={{ flex: 1, fontSize: 12, color: 'var(--text-sec)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachFile.name}</span>
                <button onClick={removeAttachment} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 }}>
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Chat Disabled Banner */}
            {chatDisabled && (
              <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: isCancelled ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)', textAlign: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: isCancelled ? '#ef4444' : '#10b981', fontWeight: 500 }}>
                  {isCancelled ? 'This contract has been cancelled. Chat is now read-only.' : 'This contract is completed. Chat is now read-only.'}
                </span>
              </div>
            )}

            {/* Input */}
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)', flexShrink: 0 }}>
              <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {!chatDisabled && (
                  <>
                    <input ref={fileInputRef} type="file" onChange={handleFileSelect} style={{ display: 'none' }} accept="image/*,.pdf,.doc,.docx,.zip" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} style={{
                      width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)',
                      background: 'var(--bg-input)', cursor: 'pointer', color: 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      transition: 'all 0.15s',
                    }}>
                      <Paperclip size={15} />
                    </button>
                  </>
                )}
                <input
                  type="text" value={chatDisabled ? '' : newMessage} onChange={(e) => !chatDisabled && setNewMessage(e.target.value)}
                  placeholder={chatDisabled ? 'Chat is read-only' : 'Type a message...'}
                  disabled={chatDisabled}
                  autoFocus={!chatDisabled}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'var(--bg-input)', color: 'var(--text)', fontSize: 13,
                    outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s',
                    opacity: chatDisabled ? 0.5 : 1, cursor: chatDisabled ? 'not-allowed' : 'text',
                    minWidth: 0,
                  }}
                  onFocus={(e) => { if (!chatDisabled) e.target.style.borderColor = 'var(--accent)'; }}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
                {!chatDisabled && (
                  <button type="submit" disabled={(!newMessage.trim() && !attachFile) || sending} style={{
                    width: 36, height: 36, borderRadius: 8, border: 'none',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: (!newMessage.trim() && !attachFile) ? 0.3 : 1,
                    transition: 'all 0.15s', flexShrink: 0,
                  }}>
                    <Send size={15} color="#fff" />
                  </button>
                )}
              </form>
            </div>
          </>
        )}
      </div>

      {/* Active Video Call */}
      {activeCall && (
        <VideoCallModal
          roomId={activeCall}
          otherUserName={otherProfile?.full_name || 'User'}
          otherUserAvatar={otherProfile?.avatar_url}
          onClose={endCall}
        />
      )}

      {/* Incoming Call */}
      {incomingCall && (
        <IncomingCallModal
          callerName={incomingCall.callerName}
          callerAvatar={incomingCall.callerAvatar}
          onAccept={acceptCall}
          onDecline={declineCall}
        />
      )}
    </div>
  );
}
