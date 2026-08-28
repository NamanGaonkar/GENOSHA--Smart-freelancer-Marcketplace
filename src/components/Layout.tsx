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
  Call signaling uses BOTH:
  1. Supabase broadcast (instant, same channel for both users)
  2. DB call_signaling table (fallback, persistent)

  Both users subscribe to: signaling-{sorted-user-ids}
  This ensures both parties are on the exact same channel.
*/

function getChannelName(id1: string, id2: string) {
  return `signaling-${[id1, id2].sort().join('-')}`;
}

export default function Layout() {
  const { profile } = useAuth();

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
  const channelsRef = useRef<Map<string, any>>(new Map());
  const peerIdsRef = useRef<Map<string, string>>(new Map()); // roomId -> peerId

  // ── Get or create a broadcast channel for a peer pair ──
  const getOrCreateChannel = useCallback((peerId: string) => {
    if (!profile) return null;
    const key = getChannelName(profile.id, peerId);
    if (channelsRef.current.has(key)) return channelsRef.current.get(key);

    const ch = supabase.channel(key, { config: { broadcast: { self: false } } });
    channelsRef.current.set(key, ch);
    return ch;
  }, [profile]);

  // ── Send signal via broadcast + DB fallback ──
  const sendSignal = useCallback(async (peerId: string, event: string, payload: Record<string, any>) => {
    const ch = getOrCreateChannel(peerId);
    if (ch) {
      // Broadcast for instant delivery
      await ch.send({ type: 'broadcast', event, payload: { ...payload, sender_id: profile?.id } });
    }
    // DB fallback
    try {
      await supabase.from('call_signaling').insert({
        room_id: payload.room_name || 'unknown',
        sender_id: profile?.id,
        receiver_id: peerId,
        event,
        payload,
      });
    } catch (_) {}
  }, [profile, getOrCreateChannel]);

  // ── Subscribe to signals from a peer ──
  const subscribeToPeer = useCallback((peerId: string) => {
    const ch = getOrCreateChannel(peerId);
    if (!ch) return;

    ch.on('broadcast', { event: 'incoming_call' }, (p) => {
      const d = p.payload;
      if (d.sender_id === profile?.id) return;
      setIncomingCall({
        roomName: d.room_name,
        callerName: d.caller_name || 'User',
        callerAvatar: d.caller_avatar,
        callerId: d.sender_id,
      });
    });

    ch.on('broadcast', { event: 'call_accepted' }, (p) => {
      const d = p.payload;
      if (d.sender_id === profile?.id) return;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const pn = outgoingCall?.peerName || d.peer_name || 'User';
      const pa = outgoingCall?.peerAvatar || d.peer_avatar;
      setOutgoingCall(null);
      setCallPeerName(pn);
      setCallPeerAvatar(pa);
      setCallPeerId(d.sender_id);
      setActiveCall(d.room_name);
    });

    ch.on('broadcast', { event: 'call_declined' }, (p) => {
      const d = p.payload;
      if (d.sender_id === profile?.id) return;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setOutgoingCall(null);
      toast.error('Meet declined');
    });

    ch.on('broadcast', { event: 'call_ended' }, (p) => {
      const d = p.payload;
      if (d.sender_id === profile?.id) return;
      setActiveCall(null);
      setOutgoingCall(null);
      setIncomingCall(null);
      toast('Meet ended');
    });

    ch.subscribe();
  }, [profile, getOrCreateChannel, outgoingCall]);

  // ── Listen for start-meet from MessagesPage ──
  useEffect(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.peerName || !profile) return;

      const roomName = `genosha-meet-${Date.now().toString(36)}`;
      peerIdsRef.current.set(roomName, detail.peerId);

      setOutgoingCall({
        roomName, peerName: detail.peerName,
        peerAvatar: detail.peerAvatar, peerId: detail.peerId,
      });
      setCallPeerName(detail.peerName);
      setCallPeerAvatar(detail.peerAvatar);
      setCallPeerId(detail.peerId);

      // Subscribe to this peer's channel first, then send
      subscribeToPeer(detail.peerId);
      await new Promise(r => setTimeout(r, 500)); // Wait for subscription

      await sendSignal(detail.peerId, 'incoming_call', {
        room_name: roomName,
        caller_name: profile.full_name || 'User',
        caller_avatar: (profile as any).avatar_url,
      });

      timeoutRef.current = setTimeout(() => {
        setOutgoingCall(null);
        toast('No answer — meet missed');
      }, 30000);
    };

    window.addEventListener('genosha:start-meet', handler);
    return () => window.removeEventListener('genosha:start-meet', handler);
  }, [profile, sendSignal, subscribeToPeer]);

  // ── Accept call ──
  const acceptCall = useCallback(async () => {
    if (!incomingCall || !profile) return;
    setCallPeerName(incomingCall.callerName);
    setCallPeerAvatar(incomingCall.callerAvatar);
    setCallPeerId(incomingCall.callerId);
    setIncomingCall(null);
    setActiveCall(incomingCall.roomName);

    subscribeToPeer(incomingCall.callerId);
    await new Promise(r => setTimeout(r, 300));

    await sendSignal(incomingCall.callerId, 'call_accepted', {
      room_name: incomingCall.roomName,
      peer_name: profile.full_name || 'User',
      peer_avatar: (profile as any).avatar_url,
    });
  }, [incomingCall, profile, sendSignal, subscribeToPeer]);

  // ── Decline call ──
  const declineCall = useCallback(async () => {
    if (!incomingCall || !profile) return;
    await sendSignal(incomingCall.callerId, 'call_declined', { room_name: incomingCall.roomName });
    setIncomingCall(null);
  }, [incomingCall, profile, sendSignal]);

  // ── Cancel outgoing ──
  const cancelOutgoingCall = useCallback(async () => {
    if (!outgoingCall || !profile) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    await sendSignal(outgoingCall.peerId, 'call_ended', { room_name: outgoingCall.roomName });
    setOutgoingCall(null);
  }, [outgoingCall, profile, sendSignal]);

  // ── End active call ──
  const endCall = useCallback(async () => {
    if (!profile || !callPeerId) { setActiveCall(null); return; }
    await sendSignal(callPeerId, 'call_ended', { room_name: activeCall || '' });
    setActiveCall(null);
    setCallPeerId(null);
  }, [profile, callPeerId, activeCall, sendSignal]);

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
        <OutgoingCallModal peerName={outgoingCall.peerName} peerAvatar={outgoingCall.peerAvatar} onCancel={cancelOutgoingCall} />
      )}
      {incomingCall && (
        <IncomingCallModal callerName={incomingCall.callerName} callerAvatar={incomingCall.callerAvatar} onAccept={acceptCall} onDecline={declineCall} />
      )}
      {activeCall && (
        <VideoCallModal roomId={activeCall} otherUserName={callPeerName} otherUserAvatar={callPeerAvatar} onEnd={endCall} />
      )}
    </div>
  );
}
