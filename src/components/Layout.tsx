import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import AIChatbot from './AIChatbot';
import GlobalToast from './GlobalToast';
import { VideoCallModal, IncomingCallModal, OutgoingCallModal } from './VideoCall';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

/*
  ════════════════════════════════════════════════════════════
  CALL SIGNALING — DB-backed via `call_signaling` table
  
  Flow:
  1. Caller clicks Meet → inserts `incoming_call` row
  2. Receiver's subscription picks it up → shows IncomingCallModal
  3. Receiver clicks Accept → inserts `call_accepted` row  
  4. Caller's subscription picks it up → both open Jitsi
  5. Either clicks End → inserts `call_ended` row → other closes
  ════════════════════════════════════════════════════════════
*/

async function insertSignal(
  roomId: string,
  senderId: string,
  receiverId: string,
  event: string,
  payload: Record<string, any> = {}
) {
  try {
    await supabase.from('call_signaling').insert({
      room_id: roomId,
      sender_id: senderId,
      receiver_id: receiverId,
      event,
      payload,
    });
  } catch (e) {
    console.error('Signal insert error:', e);
  }
}

export default function Layout() {
  const { profile } = useAuth();

  // ── Video call state ────────────────────────────────────
  const [activeCall, setActiveCall] = useState<string | null>(null);
  const [callPeerName, setCallPeerName] = useState('');
  const [callPeerAvatar, setCallPeerAvatar] = useState<string | undefined>();
  const [callPeerId, setCallPeerId] = useState<string | null>(null);
  const [outgoingCall, setOutgoingCall] = useState<{
    roomName: string; peerName: string; peerAvatar?: string; peerId: string;
  } | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    roomName: string; callerName: string; callerAvatar?: string; callerId: string;
  } | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signalingChannelRef = useRef<any>(null);

  // ── Persistent signaling listener via DB ─────────────────
  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel(`signaling-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_signaling',
          filter: `receiver_id=eq.${profile.id}`,
        },
        async (payload) => {
          const row = payload.new as any;
          const evt = row.event;
          const senderId = row.sender_id;
          const roomId = row.room_id;
          const p = typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload || {});

          // Ignore our own signals
          if (senderId === profile.id) return;

          console.log('[Signaling] Received:', evt, 'from', senderId, 'room:', roomId);

          if (evt === 'incoming_call') {
            setIncomingCall({
              roomName: roomId,
              callerName: p.caller_name || 'User',
              callerAvatar: p.caller_avatar,
              callerId: senderId,
            });
          }

          if (evt === 'call_accepted') {
            // Our outgoing call was accepted — open Jitsi
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            const peerName = outgoingCall?.peerName || p.peer_name || 'User';
            const peerAvatar = outgoingCall?.peerAvatar || p.peer_avatar;
            setOutgoingCall(null);
            setCallPeerName(peerName);
            setCallPeerAvatar(peerAvatar);
            setCallPeerId(senderId);
            setActiveCall(roomId);
          }

          if (evt === 'call_declined') {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setOutgoingCall(null);
            toast.error('Meet declined');
          }

          if (evt === 'call_ended') {
            setActiveCall(null);
            setOutgoingCall(null);
            setIncomingCall(null);
            toast('Meet ended by other party');
          }
        }
      )
      .subscribe();

    signalingChannelRef.current = channel;

    return () => {
      channel.unsubscribe();
      signalingChannelRef.current = null;
    };
  }, [profile?.id]);

  // ── Listen for start-meet events from MessagesPage ──
  useEffect(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.peerName || !profile) return;

      const roomName = `genosha-meet-${Date.now().toString(36)}`;

      setOutgoingCall({
        roomName,
        peerName: detail.peerName,
        peerAvatar: detail.peerAvatar,
        peerId: detail.peerId,
      });

      setCallPeerName(detail.peerName);
      setCallPeerAvatar(detail.peerAvatar);
      setCallPeerId(detail.peerId);

      // Insert signaling row — receiver's subscription picks it up
      await insertSignal(roomName, profile.id, detail.peerId, 'incoming_call', {
        caller_name: profile.full_name || 'User',
        caller_avatar: (profile as any).avatar_url,
      });

      // 30-second timeout
      timeoutRef.current = setTimeout(async () => {
        setOutgoingCall(null);
        toast('No answer — meet missed');
        try {
          await insertSignal(roomName, profile.id, detail.peerId, 'call_ended', {});
        } catch (_) {}
      }, 30000);
    };

    window.addEventListener('genosha:start-meet', handler);
    return () => window.removeEventListener('genosha:start-meet', handler);
  }, [profile]);

  // ── Accept incoming call → insert `call_accepted` ──
  const acceptCall = useCallback(async () => {
    if (incomingCall && profile) {
      setCallPeerName(incomingCall.callerName);
      setCallPeerAvatar(incomingCall.callerAvatar);
      setCallPeerId(incomingCall.callerId);
      setIncomingCall(null);

      // This is the critical fix: insert into DB so caller's subscription sees it
      await insertSignal(
        incomingCall.roomName,
        profile.id,
        incomingCall.callerId,
        'call_accepted',
        {
          peer_name: profile.full_name || 'User',
          peer_avatar: (profile as any).avatar_url,
        }
      );

      // Also open Jitsi on our side immediately
      setActiveCall(incomingCall.roomName);
    }
  }, [incomingCall, profile]);

  // ── Decline incoming call → insert `call_declined` ──
  const declineCall = useCallback(async () => {
    if (incomingCall && profile) {
      await insertSignal(
        incomingCall.roomName,
        profile.id,
        incomingCall.callerId,
        'call_declined',
        {}
      );
      setIncomingCall(null);
    }
  }, [incomingCall, profile]);

  // ── Cancel outgoing call → insert `call_declined` (from receiver's perspective) ──
  const cancelOutgoingCall = useCallback(async () => {
    if (outgoingCall && profile) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      // Send ended so receiver closes modal
      await insertSignal(outgoingCall.roomName, profile.id, outgoingCall.peerId, 'call_ended', {});
      setOutgoingCall(null);
    }
  }, [outgoingCall, profile]);

  // ── End active call → insert `call_ended` to notify peer ──
  const endCall = useCallback(async () => {
    if (profile && callPeerId) {
      const roomId = activeCall || '';
      await insertSignal(roomId, profile.id, callPeerId, 'call_ended', {});
    }
    setActiveCall(null);
    setCallPeerId(null);
  }, [profile, callPeerId, activeCall]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  return (
    <div className="gen-page">
      <Navbar />
      <main style={{ maxWidth: 1280, margin: '0 auto', overflowX: 'hidden' }}>
        <Outlet />
      </main>
      <AIChatbot />
      <GlobalToast />

      {/* ── Outgoing Call Modal ── */}
      {outgoingCall && (
        <OutgoingCallModal
          peerName={outgoingCall.peerName}
          peerAvatar={outgoingCall.peerAvatar}
          onCancel={cancelOutgoingCall}
        />
      )}

      {/* ── Incoming Call Modal ── */}
      {incomingCall && (
        <IncomingCallModal
          callerName={incomingCall.callerName}
          callerAvatar={incomingCall.callerAvatar}
          onAccept={acceptCall}
          onDecline={declineCall}
        />
      )}

      {/* ── Active Jitsi Meet ── */}
      {activeCall && (
        <VideoCallModal
          roomId={activeCall}
          otherUserName={callPeerName}
          otherUserAvatar={callPeerAvatar}
          onEnd={endCall}
        />
      )}
    </div>
  );
}
