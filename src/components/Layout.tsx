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
  CALL SIGNALING — Database Polling (1s interval)
  
  Works on localhost AND Vercel. No broadcast/realtime needed.
  
  Flow:
  1. Caller inserts call_sessions row (status='calling')
  2. Receiver's poll picks it up → IncomingCallModal
  3. Receiver updates status='accepted' → both open Jitsi
  4. Either updates status='ended' → both close Jitsi
  ════════════════════════════════════════════════════════════
*/

export default function Layout() {
  const { profile } = useAuth();

  // ── Call state ──────────────────────────────────────────
  const [activeCall, setActiveCall] = useState<string | null>(null);
  const [callPeerName, setCallPeerName] = useState('');
  const [callPeerAvatar, setCallPeerAvatar] = useState<string | undefined>();
  const [callPeerId, setCallPeerId] = useState<string | null>(null);

  const [outgoingCall, setOutgoingCall] = useState<{
    roomName: string; peerName: string; peerAvatar?: string; peerId: string;
  } | null>(null);

  const [incomingCall, setIncomingCall] = useState<{
    roomName: string; callerName: string; callerAvatar?: string; callerId: string; callId: string;
  } | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeCallIdRef = useRef<string | null>(null);

  // ── Poll for incoming calls every 1 second ──────────────
  useEffect(() => {
    if (!profile) return;

    const poll = async () => {
      try {
        // Check for incoming calls (status='calling' where I am receiver)
        // Skip if we already have an incoming modal, outgoing call, or active call
        if (!activeCall && !outgoingCall && !incomingCall) {
          const { data: incoming, error: e1 } = await supabase
          .from('call_sessions')
          .select('*')
          .eq('receiver_id', profile.id)
          .eq('status', 'calling')
          .order('started_at', { ascending: false })
          .limit(1);

        if (!e1 && incoming && incoming.length > 0) {
          const call = incoming[0];

          // Don't show if we already have this call open
          if (activeCallIdRef.current === call.id) return;

          // Get caller's profile
          const { data: callerProfile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', call.caller_id)
            .single();

          setIncomingCall({
            roomName: call.room_id,
            callerName: callerProfile?.full_name || 'User',
            callerAvatar: callerProfile?.avatar_url,
            callerId: call.caller_id,
            callId: call.id,
          });
          activeCallIdRef.current = call.id;
          return;
        }
        } // end incoming calls check

        // Check if our outgoing call was accepted
        if (outgoingCall) {
          const oc = outgoingCall as any;
          const { data: accepted, error: e2 } = await supabase
            .from('call_sessions')
            .select('status')
            .eq('room_id', oc.roomName)
            .eq('status', 'accepted')
            .limit(1);

          if (!e2 && accepted && accepted.length > 0) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setOutgoingCall(null);
            setCallPeerName(oc.peerName);
            setCallPeerAvatar(oc.peerAvatar);
            setCallPeerId(oc.peerId);
            setActiveCall(oc.roomName);
            return;
          }

          const { data: ended } = await supabase
            .from('call_sessions')
            .select('status')
            .eq('room_id', oc.roomName)
            .in('status', ['declined', 'ended', 'missed'])
            .limit(1);

          if (ended && ended.length > 0) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setOutgoingCall(null);
            toast.error(ended[0].status === 'declined' ? 'Meet declined' : 'No answer');
          }
        }

        // Check if our active call was ended by the other party
        if (activeCall && callPeerId) {
          const { data: callEnded } = await supabase
            .from('call_sessions')
            .select('status')
            .eq('room_id', activeCall)
            .eq('status', 'ended')
            .limit(1);

          if (callEnded && callEnded.length > 0) {
            setActiveCall(null);
            setCallPeerId(null);
            toast('Meet ended by other party');
          }
        }
      } catch (_) { /* polling error, ignore */ }
    };

    pollRef.current = setInterval(poll, 1000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [profile?.id, activeCall, outgoingCall, callPeerId, incomingCall]);

  // ── Listen for start-meet from MessagesPage ─────────────
  useEffect(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.peerName || !profile) return;

      const roomName = `genosha-meet-${Date.now().toString(36)}`;

      // Insert call_sessions row
      const { error } = await supabase
        .from('call_sessions')
        .insert({
          room_id: roomName,
          caller_id: profile.id,
          receiver_id: detail.peerId,
          status: 'calling',
          call_type: 'video',
        });

      if (error) {
        toast.error('Failed to start meet');
        return;
      }

      setOutgoingCall({
        roomName, peerName: detail.peerName,
        peerAvatar: detail.peerAvatar, peerId: detail.peerId,
      });
      setCallPeerName(detail.peerName);
      setCallPeerAvatar(detail.peerAvatar);
      setCallPeerId(detail.peerId);

      // 30-second timeout
      timeoutRef.current = setTimeout(async () => {
        setOutgoingCall(null);
        await supabase
          .from('call_sessions')
          .update({ status: 'missed', ended_at: new Date().toISOString() })
          .eq('room_id', roomName);
        toast('No answer — meet missed');
      }, 30000);
    };

    window.addEventListener('genosha:start-meet', handler);
    return () => window.removeEventListener('genosha:start-meet', handler);
  }, [profile]);

  // ── Accept call → update DB ──
  const acceptCall = useCallback(async () => {
    if (!incomingCall || !profile) return;

    await supabase
      .from('call_sessions')
      .update({ status: 'accepted' })
      .eq('id', incomingCall.callId);

    setCallPeerName(incomingCall.callerName);
    setCallPeerAvatar(incomingCall.callerAvatar);
    setCallPeerId(incomingCall.callerId);
    setIncomingCall(null);
    setActiveCall(incomingCall.roomName);
  }, [incomingCall, profile]);

  // ── Decline call → update DB ──
  const declineCall = useCallback(async () => {
    if (!incomingCall) return;

    await supabase
      .from('call_sessions')
      .update({ status: 'declined', ended_at: new Date().toISOString() })
      .eq('id', incomingCall.callId);

    setIncomingCall(null);
    activeCallIdRef.current = null;
  }, [incomingCall]);

  // ── Cancel outgoing → update DB ──
  const cancelOutgoingCall = useCallback(async () => {
    if (!outgoingCall) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    await supabase
      .from('call_sessions')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('room_id', outgoingCall.roomName);

    setOutgoingCall(null);
  }, [outgoingCall]);

  // ── End active call → update DB ──
  const endCall = useCallback(async () => {
    if (activeCall) {
      await supabase
        .from('call_sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('room_id', activeCall);
    }
    setActiveCall(null);
    setCallPeerId(null);
  }, [activeCall]);

  // Cleanup timeout
  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  return (
    <div className="gen-page">
      <Navbar />
      <main style={{ maxWidth: 1280, margin: '0 auto', overflowX: 'hidden' }}>
        <Outlet />
      </main>
      <AIChatbot />
      <GlobalToast />

      {outgoingCall && (
        <OutgoingCallModal
          peerName={outgoingCall.peerName}
          peerAvatar={outgoingCall.peerAvatar}
          onCancel={cancelOutgoingCall}
        />
      )}

      {incomingCall && (
        <IncomingCallModal
          callerName={incomingCall.callerName}
          callerAvatar={incomingCall.callerAvatar}
          onAccept={acceptCall}
          onDecline={declineCall}
        />
      )}

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
