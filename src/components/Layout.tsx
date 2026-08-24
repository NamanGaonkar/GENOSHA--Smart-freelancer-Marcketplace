import { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import AIChatbot from './AIChatbot';
import { VideoCallModal, IncomingCallModal } from './VideoCall';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function Layout() {
  const { profile } = useAuth();

  // ── Global video call state ────────────────────────────
  const [activeCall, setActiveCall] = useState<string | null>(null);
  const [callPeerName, setCallPeerName] = useState('');
  const [callPeerAvatar, setCallPeerAvatar] = useState<string | undefined>();
  const [incomingCall, setIncomingCall] = useState<{
    roomName: string; callerName: string; callerAvatar?: string; callerId: string;
  } | null>(null);

  // ── Global incoming call listener (works on any page) ──
  useEffect(() => {
    if (!profile) return;

    const ch = supabase.channel(`vc-user-${profile.id}`)
      .on('broadcast', { event: 'incoming_call' }, (payload) => {
        const d = payload.payload as any;
        if (d.caller_id !== profile.id) {
          setIncomingCall({
            roomName: d.room_name,
            callerName: d.caller_name,
            callerAvatar: d.caller_avatar,
            callerId: d.caller_id,
          });
        }
      })
      .on('broadcast', { event: 'call_accepted' }, (payload) => {
        const d = payload.payload as any;
        setActiveCall(d.room_name);

      })
      .on('broadcast', { event: 'call_declined' }, (payload) => {
        const d = payload.payload as any;
        if (d.caller_id === profile.id) {
          setActiveCall(null);
  
          toast('Meet declined');
        }
      })
      .on('broadcast', { event: 'call_ended' }, (payload) => {
        const d = payload.payload as any;
        if (d.user_id !== profile.id) {
          setActiveCall(null);
  
          toast('Meet ended by other party');
        }
      })
      .subscribe();

    return () => { ch.unsubscribe(); };
  }, [profile?.id]);

  // ── Call actions ───────────────────────────────────────
  const startCall = useCallback(async (peerName: string, peerAvatar?: string, peerId?: string) => {
    if (!profile) return;
    const roomName = `genosha-meet-${Date.now().toString(36)}`;

    setCallPeerName(peerName);
    setCallPeerAvatar(peerAvatar);

    if (peerId) {
      const ch = supabase.channel(`vc-user-${peerId}`);
      await ch.send({
        type: 'broadcast', event: 'incoming_call',
        payload: { room_name: roomName, caller_id: profile.id, caller_name: profile.full_name || 'User', caller_avatar: (profile as any).avatar_url },
      });
    }
  }, [profile]);

  // Listen for start-meet events from MessagesPage
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.peerName) startCall(detail.peerName, detail.peerAvatar, detail.peerId);
    };
    window.addEventListener('genosha:start-meet', handler);
    return () => window.removeEventListener('genosha:start-meet', handler);
  }, [startCall]);

  const acceptCall = useCallback(() => {
    if (incomingCall) {
      setActiveCall(incomingCall.roomName);
      setCallPeerName(incomingCall.callerName);
      setCallPeerAvatar(incomingCall.callerAvatar);
      setIncomingCall(null);
    }
  }, [incomingCall]);

  const declineCall = useCallback(async () => {
    if (incomingCall && profile) {
      const ch = supabase.channel(`vc-user-${incomingCall.callerId}`);
      await ch.send({ type: 'broadcast', event: 'call_declined', payload: { caller_id: profile.id } });
      setIncomingCall(null);
    }
  }, [incomingCall, profile]);

  const endCall = useCallback(async () => {
    if (profile) {
      // Notify peer via their user channel — find peer from incoming or outgoing
      // For simplicity, broadcast on the room channel if we know the room
      // The actual peer notification is handled by the caller's startCall or by postMessage hangup
    }
    setActiveCall(null);
    setIsRinging(false);
  }, [profile]);

  return (
    <div className="gen-page">
      <Navbar />
      <main style={{ maxWidth: 1200, margin: '0 auto', overflowX: 'hidden' }}>
        <Outlet />
      </main>
      <AIChatbot />

      {/* Global Incoming Call Modal */}
      {incomingCall && (
        <IncomingCallModal
          callerName={incomingCall.callerName}
          callerAvatar={incomingCall.callerAvatar}
          onAccept={acceptCall}
          onDecline={declineCall}
        />
      )}

      {/* Global Active Meet Modal */}
      {activeCall && (
        <VideoCallModal
          roomId={activeCall}
          otherUserName={callPeerName}
          otherUserAvatar={callPeerAvatar}
          onClose={endCall}
        />
      )}
    </div>
  );
}
