import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import AIChatbot from './AIChatbot';
import GlobalToast from './GlobalToast';
import { VideoCallModal, IncomingCallModal, OutgoingCallModal } from './VideoCall';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function Layout() {
  const { profile } = useAuth();

  // ── Global video call state ────────────────────────────
  const [activeCall, setActiveCall] = useState<string | null>(null);
  const [callPeerName, setCallPeerName] = useState('');
  const [callPeerAvatar, setCallPeerAvatar] = useState<string | undefined>();

  // Outgoing call state (caller sees "Ringing...")
  const [outgoingCall, setOutgoingCall] = useState<{
    roomName: string; peerName: string; peerAvatar?: string; peerId: string;
  } | null>(null);

  // Incoming call state (receiver sees accept/decline modal)
  const [incomingCall, setIncomingCall] = useState<{
    roomName: string; callerName: string; callerAvatar?: string; callerId: string;
  } | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<any>(null);

  // ── Global incoming call listener (works on ANY page) ──
  useEffect(() => {
    if (!profile) return;

    const ch = supabase.channel(`vc-user-${profile.id}`, {
      config: { broadcast: { self: false } },
    })
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
        if (d.accepted_by !== profile.id) {
          // Someone else accepted our call — open Jitsi
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setOutgoingCall(null);
          setActiveCall(d.room_name);
        }
      })
      .on('broadcast', { event: 'call_declined' }, (payload) => {
        const d = payload.payload as any;
        if (d.declined_by !== profile.id) {
          // Someone declined our call
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setOutgoingCall(null);
          toast.error('Meet declined');
        }
      })
      .on('broadcast', { event: 'call_ended' }, (payload) => {
        const d = payload.payload as any;
        if (d.ended_by !== profile.id) {
          setActiveCall(null);
          setOutgoingCall(null);
          toast('Meet ended by other party');
        }
      })
      .subscribe();

    channelRef.current = ch;
    return () => { ch.unsubscribe(); channelRef.current = null; };
  }, [profile?.id]);

  // ── Listen for start-meet events from MessagesPage ──
  useEffect(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.peerName || !profile) return;

      const roomName = `genosha-meet-${Date.now().toString(36)}`;

      // Show outgoing call modal immediately
      setOutgoingCall({
        roomName,
        peerName: detail.peerName,
        peerAvatar: detail.peerAvatar,
        peerId: detail.peerId,
      });

      setCallPeerName(detail.peerName);
      setCallPeerAvatar(detail.peerAvatar);

      // Send signal to recipient
      if (detail.peerId) {
        const peerCh = supabase.channel(`vc-user-${detail.peerId}`);
        await peerCh.send({
          type: 'broadcast',
          event: 'incoming_call',
          payload: {
            room_name: roomName,
            caller_id: profile.id,
            caller_name: profile.full_name || 'User',
            caller_avatar: (profile as any).avatar_url,
          },
        });
      }

      // 30-second timeout — auto-miss if unanswered
      timeoutRef.current = setTimeout(async () => {
        setOutgoingCall(null);
        toast('No answer — meet missed');
        // Mark as missed in DB if table exists
        try {
          await supabase.from('call_sessions').insert({
            room_id: roomName,
            caller_id: profile.id,
            receiver_id: detail.peerId,
            status: 'missed',
          });
        } catch (_) { /* table may not exist yet */ }
      }, 30000);
    };

    window.addEventListener('genosha:start-meet', handler);
    return () => window.removeEventListener('genosha:start-meet', handler);
  }, [profile]);

  // ── Accept incoming call ──
  const acceptCall = useCallback(async () => {
    if (incomingCall && profile) {
      // Notify the caller that we accepted
      const callerCh = supabase.channel(`vc-user-${incomingCall.callerId}`);
      await callerCh.send({
        type: 'broadcast',
        event: 'call_accepted',
        payload: {
          room_name: incomingCall.roomName,
          accepted_by: profile.id,
        },
      });

      setCallPeerName(incomingCall.callerName);
      setCallPeerAvatar(incomingCall.callerAvatar);
      setIncomingCall(null);
      setActiveCall(incomingCall.roomName);
    }
  }, [incomingCall, profile]);

  // ── Decline incoming call ──
  const declineCall = useCallback(async () => {
    if (incomingCall && profile) {
      const callerCh = supabase.channel(`vc-user-${incomingCall.callerId}`);
      await callerCh.send({
        type: 'broadcast',
        event: 'call_declined',
        payload: {
          declined_by: profile.id,
        },
      });
      setIncomingCall(null);
    }
  }, [incomingCall, profile]);

  // ── Cancel outgoing call ──
  const cancelOutgoingCall = useCallback(async () => {
    if (outgoingCall && profile) {
      // Notify recipient that call was cancelled (same as decline)
      const peerCh = supabase.channel(`vc-user-${outgoingCall.peerId}`);
      await peerCh.send({
        type: 'broadcast',
        event: 'call_declined',
        payload: { declined_by: profile.id },
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setOutgoingCall(null);
    }
  }, [outgoingCall, profile]);

  // ── End active call ──
  const endCall = useCallback(async () => {
    if (profile) {
      // Notify peer to close their side too
      // We broadcast on the caller's or receiver's channel
      // The VideoCallModal handles Jitsi hangup via postMessage
      try {
        if (channelRef.current) {
          await channelRef.current.send({
            type: 'broadcast',
            event: 'call_ended',
            payload: { ended_by: profile.id },
          });
        }
      } catch (_) {}
    }
    setActiveCall(null);
  }, [profile]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="gen-page">
      <Navbar />
      <main style={{ maxWidth: 1280, margin: '0 auto', overflowX: 'hidden' }}>
        <Outlet />
      </main>
      <AIChatbot />
      <GlobalToast />

      {/* ── Outgoing Call Modal (Caller sees "Ringing...") ── */}
      {outgoingCall && (
        <OutgoingCallModal
          peerName={outgoingCall.peerName}
          peerAvatar={outgoingCall.peerAvatar}
          onCancel={cancelOutgoingCall}
        />
      )}

      {/* ── Incoming Call Modal (Receiver sees Accept/Decline) ── */}
      {incomingCall && (
        <IncomingCallModal
          callerName={incomingCall.callerName}
          callerAvatar={incomingCall.callerAvatar}
          onAccept={acceptCall}
          onDecline={declineCall}
        />
      )}

      {/* ── Active Jitsi Meet Modal ── */}
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
