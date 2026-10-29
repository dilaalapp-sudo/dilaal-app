import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { insertCallLog } from './persistence';

export type CallKind = 'audio' | 'video';
export type CallStatus = 'ringing' | 'connecting' | 'connected' | 'ended';

export interface CallViewState {
  callId: string;
  conversationId: string;
  direction: 'outgoing' | 'incoming';
  kind: CallKind;
  peerName: string;
  peerAvatar?: string;
  status: CallStatus;
  muted: boolean;
  cameraOff: boolean;
  speakerMuted: boolean;
  seconds: number;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  endedReason?: string;
}

type CallSignal =
  | {
      kind: 'ring';
      callId: string;
      conversationId: string;
      callType: CallKind;
      fromUserId: string;
      fromName: string;
    }
  | { kind: 'accept' | 'decline' | 'busy'; callId: string; fromUserId: string }
  | { kind: 'offer'; callId: string; sdp: RTCSessionDescriptionInit }
  | { kind: 'answer'; callId: string; sdp: RTCSessionDescriptionInit }
  | { kind: 'ice'; callId: string; candidate: RTCIceCandidateInit }
  | { kind: 'end'; callId: string; fromUserId: string; reason?: string };

const RING_TIMEOUT_MS = 45_000;
const CONNECT_TIMEOUT_MS = 30_000;
const ENDED_AUTO_DISMISS_MS = 4_000;

// Public STUN plus Metered's open relay so carrier-grade NATs on mobile networks
// can still connect. Replace the TURN entries with your own credentials before
// running this in production.
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

function subscribeChannel(channel: RealtimeChannel): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    channel.subscribe((status) => {
      if (
        status === 'SUBSCRIBED' ||
        status === 'CHANNEL_ERROR' ||
        status === 'TIMED_OUT' ||
        status === 'CLOSED'
      ) {
        finish();
      }
    });
    setTimeout(finish, 5000);
  });
}

function mediaErrorMessage(err: unknown): string {
  const name = (err as DOMException | undefined)?.name;
  switch (name) {
    case 'NotAllowedError':
      return 'Microphone or camera access was blocked. Allow it in your browser settings and try again.';
    case 'NotFoundError':
      return 'No microphone or camera was found on this device.';
    case 'NotReadableError':
      return 'Your microphone or camera is already in use by another app.';
    case 'OverconstrainedError':
      return 'This camera cannot provide the requested video quality.';
    case 'NotSupportedError':
      return 'Calling is not supported in this browser.';
    default:
      return 'Could not start the call on this device.';
  }
}

const newCallId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `call-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export class CallClient {
  private authUserId = '';
  private userChannel: RealtimeChannel | null = null;
  private callChannel: RealtimeChannel | null = null;
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private pendingIce: RTCIceCandidateInit[] = [];
  private remoteDescriptionSet = false;
  private state: CallViewState | null = null;
  private onChange: (state: CallViewState | null) => void;
  private ringTimeout: ReturnType<typeof setTimeout> | null = null;
  private connectTimeout: ReturnType<typeof setTimeout> | null = null;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private dismissTimeout: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private peerUserId = '';
  private callStartedAt: string | null = null;
  private callConnectedAt: number | null = null;

  constructor(onChange: (state: CallViewState | null) => void) {
    this.onChange = onChange;
  }

  async setIdentity(userId: string): Promise<void> {
    if (!userId || userId === this.authUserId || this.disposed) return;
    this.authUserId = userId;
    if (this.userChannel) {
      await supabase.removeChannel(this.userChannel);
      this.userChannel = null;
    }
    const channel = supabase.channel(`dilaal-calls-user:${userId}`, {
      config: { broadcast: { self: false } },
    });
    channel.on('broadcast', { event: 'call' }, ({ payload }) => {
      const signal = payload as CallSignal;
      if (signal?.kind === 'ring') void this.handleIncomingRing(signal);
    });
    await subscribeChannel(channel);
    if (this.disposed) {
      void supabase.removeChannel(channel);
      return;
    }
    this.userChannel = channel;
  }

  async startCall(input: {
    conversationId: string;
    kind: CallKind;
    peerName: string;
    peerAvatar?: string;
    calleeUserId: string;
    callerName: string;
  }): Promise<void> {
    if (this.state && this.state.status !== 'ended') return;
    if (!input.calleeUserId || input.calleeUserId === this.authUserId) {
      this.fail('This contact cannot receive calls right now.');
      return;
    }
    this.resetCall();
    this.peerUserId = input.calleeUserId;
    this.callStartedAt = new Date().toISOString();
    this.callConnectedAt = null;
    const callId = newCallId();
    this.state = {
      callId,
      conversationId: input.conversationId,
      direction: 'outgoing',
      kind: input.kind,
      peerName: input.peerName,
      peerAvatar: input.peerAvatar,
      status: 'ringing',
      muted: false,
      cameraOff: input.kind !== 'video',
      speakerMuted: false,
      seconds: 0,
      localStream: null,
      remoteStream: null,
    };
    this.emit();

    try {
      await this.ensureMedia(input.kind);
    } catch (err) {
      this.finish(mediaErrorMessage(err));
      return;
    }
    if (!this.state) return;
    this.state.localStream = this.localStream;
    this.state.cameraOff = input.kind === 'video' && !this.hasLiveVideo();
    this.emit();

    this.callChannel = await joinChannel(`dilaal-call:${input.conversationId}`, this.handleCallSignal);
    if (this.disposed || !this.state) return;

    if (!this.userChannel) {
      this.finish('Calling is still starting up. Please try again.');
      return;
    }

    // Broadcast rooms are shared, so the ring has to be published to the
    // callee's user room, not the caller's own subscription.
    const calleeChannel = await joinChannel(
      `dilaal-calls-user:${input.calleeUserId}`,
      () => undefined
    );
    await this.send(calleeChannel, {
      kind: 'ring',
      callId,
      conversationId: input.conversationId,
      callType: input.kind,
      fromUserId: this.authUserId,
      fromName: input.callerName,
    });
    setTimeout(() => {
      void supabase.removeChannel(calleeChannel);
    }, 2000);

    this.ringTimeout = setTimeout(() => {
      if (this.state?.status === 'ringing') {
        const callId = this.state.callId;
        void this.finishWithSignal('No answer. The other side did not pick up.', {
          kind: 'end',
          callId,
          fromUserId: this.authUserId,
          reason: 'No answer',
        });
      }
    }, RING_TIMEOUT_MS);
  }

  acceptCall(): void {
    if (!this.state || this.state.direction !== 'incoming') return;
    void this.acceptIncoming();
  }

  declineCall(): void {
    if (!this.state || this.state.direction !== 'incoming') return;
    const callId = this.state.callId;
    void this.finishWithSignal('Call declined', {
      kind: 'decline',
      callId,
      fromUserId: this.authUserId,
    });
  }

  hangUp(): void {
    if (!this.state || this.state.status === 'ended') return;
    const callId = this.state.callId;
    void this.finishWithSignal('Call ended', {
      kind: 'end',
      callId,
      fromUserId: this.authUserId,
      reason: 'Call ended',
    });
  }

  toggleMute(): void {
    if (!this.state) return;
    this.state.muted = !this.state.muted;
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !this.state!.muted;
    });
    this.emit();
  }

  toggleCamera(): void {
    if (!this.state || this.state.kind !== 'video') return;
    this.state.cameraOff = !this.state.cameraOff;
    this.localStream?.getVideoTracks().forEach((track) => {
      track.enabled = !this.state!.cameraOff;
    });
    this.emit();
  }

  toggleSpeaker(): void {
    if (!this.state) return;
    this.state.speakerMuted = !this.state.speakerMuted;
    this.emit();
  }

  dismiss(): void {
    if (this.state && this.state.status !== 'ended') {
      this.hangUp();
      return;
    }
    this.state = null;
    this.clearDismissTimeout();
    this.emit();
  }

  fail(message: string): void {
    if (this.state && this.state.status !== 'ended') return;
    this.resetCall();
    this.state = {
      callId: '',
      conversationId: '',
      direction: 'outgoing',
      kind: 'audio',
      peerName: '',
      status: 'ended',
      muted: false,
      cameraOff: true,
      speakerMuted: false,
      seconds: 0,
      localStream: null,
      remoteStream: null,
      endedReason: message,
    };
    this.emit();
    this.scheduleDismiss();
  }

  dispose(): void {
    this.disposed = true;
    this.teardown();
    if (this.userChannel) {
      void supabase.removeChannel(this.userChannel);
      this.userChannel = null;
    }
    if (this.state) {
      this.state = null;
      this.onChange(null);
    }
  }

  private async handleIncomingRing(
    signal: Extract<CallSignal, { kind: 'ring' }>
  ): Promise<void> {
    if (this.disposed || signal.fromUserId === this.authUserId) return;

    if (this.state && this.state.status !== 'ended') {
      const channel = await joinChannel(
        `dilaal-call:${signal.conversationId}`,
        this.handleCallSignal
      );
      await this.send(channel, {
        kind: 'busy',
        callId: signal.callId,
        fromUserId: this.authUserId,
      });
      if (this.callChannel !== channel) void supabase.removeChannel(channel);
      return;
    }

    this.resetCall();
    this.peerUserId = signal.fromUserId;
    this.callStartedAt = new Date().toISOString();
    this.callConnectedAt = null;
    this.callChannel = await joinChannel(
      `dilaal-call:${signal.conversationId}`,
      this.handleCallSignal
    );
    if (this.disposed) return;

    this.state = {
      callId: signal.callId,
      conversationId: signal.conversationId,
      direction: 'incoming',
      kind: signal.callType,
      peerName: signal.fromName || 'DILAAL caller',
      status: 'ringing',
      muted: false,
      cameraOff: signal.callType !== 'video',
      speakerMuted: false,
      seconds: 0,
      localStream: null,
      remoteStream: null,
    };
    this.emit();
  }

  private async acceptIncoming(): Promise<void> {
    const state = this.state;
    if (!state) return;
    try {
      await this.ensureMedia(state.kind);
    } catch (err) {
      await this.send(this.callChannel, {
        kind: 'decline',
        callId: state.callId,
        fromUserId: this.authUserId,
      });
      this.finish(mediaErrorMessage(err));
      return;
    }
    if (!this.state) return;

    this.state.localStream = this.localStream;
    this.state.cameraOff = state.kind === 'video' && !this.hasLiveVideo();
    this.state.status = 'connecting';
    this.createPeerConnection();
    this.emit();
    this.startConnectWatchdog();
    await this.send(this.callChannel, {
      kind: 'accept',
      callId: state.callId,
      fromUserId: this.authUserId,
    });
  }

  private handleCallSignal = (payload: unknown): void => {
    const signal = payload as CallSignal;
    if (!signal || signal.kind === 'ring') return;
    if (!this.state || signal.callId !== this.state.callId) return;

    switch (signal.kind) {
      case 'accept':
        if (this.state.direction === 'outgoing' && this.state.status === 'ringing') {
          void this.beginCallerPeer();
        }
        break;
      case 'decline':
        this.finish('Call declined');
        break;
      case 'busy':
        this.finish('The other side is on another call.');
        break;
      case 'offer':
        void this.handleOffer(signal.sdp);
        break;
      case 'answer':
        void this.handleAnswer(signal.sdp);
        break;
      case 'ice':
        void this.handleRemoteIce(signal.candidate);
        break;
      case 'end':
        this.finish(signal.reason || 'Call ended');
        break;
      default:
        break;
    }
  };

  private async beginCallerPeer(): Promise<void> {
    if (!this.state || !this.localStream) return;
    this.clearRingTimeout();
    this.createPeerConnection();
    if (!this.pc) return;
    this.localStream.getTracks().forEach((track) => {
      this.pc?.addTrack(track, this.localStream!);
    });
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.state.status = 'connecting';
    this.emit();
    this.startConnectWatchdog();
    await this.send(this.callChannel, {
      kind: 'offer',
      callId: this.state.callId,
      sdp: offer,
    });
  }

  private async handleOffer(sdp: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc || this.state?.direction !== 'incoming') return;
    await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    this.remoteDescriptionSet = true;
    await this.flushPendingIce();
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    if (!this.state) return;
    await this.send(this.callChannel, {
      kind: 'answer',
      callId: this.state.callId,
      sdp: answer,
    });
  }

  private async handleAnswer(sdp: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) return;
    await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    this.remoteDescriptionSet = true;
    await this.flushPendingIce();
  }

  private async handleRemoteIce(candidate: RTCIceCandidateInit): Promise<void> {
    if (!candidate) return;
    if (!this.pc || !this.remoteDescriptionSet) {
      this.pendingIce.push(candidate);
      return;
    }
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn('[DILAAL] ICE candidate rejected:', err);
    }
  }

  private async flushPendingIce(): Promise<void> {
    if (!this.pc) return;
    const queued = this.pendingIce;
    this.pendingIce = [];
    for (const candidate of queued) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('[DILAAL] ICE candidate rejected:', err);
      }
    }
  }

  private createPeerConnection(): void {
    if (this.pc) return;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.pc = pc;
    this.remoteDescriptionSet = false;
    this.pendingIce = [];
    this.remoteStream = new MediaStream();

    pc.ontrack = (event) => {
      const stream = this.remoteStream;
      if (!stream) return;
      if (event.streams[0]) {
        event.streams[0].getTracks().forEach((track) => {
          if (!stream.getTracks().some((existing) => existing.id === track.id)) {
            stream.addTrack(track);
          }
        });
      } else if (!stream.getTracks().some((track) => track.id === event.track.id)) {
        stream.addTrack(event.track);
      }
      if (this.state) {
        this.state.remoteStream = stream;
        this.emit();
      }
    };

    pc.onicecandidate = (event) => {
      if (!event.candidate || !this.state) return;
      void this.send(this.callChannel, {
        kind: 'ice',
        callId: this.state.callId,
        candidate: event.candidate.toJSON(),
      });
    };

    pc.onconnectionstatechange = () => {
      if (!this.pc || this.pc !== pc) return;
      if (pc.connectionState === 'connected') {
        this.markConnected();
      } else if (pc.connectionState === 'failed') {
        this.finish('The call connection failed. Please try again.');
      }
    };
  }

  private markConnected(): void {
    if (!this.state || this.state.status === 'connected') return;
    this.clearConnectTimeout();
    this.state.status = 'connected';
    this.state.seconds = 0;
    this.callConnectedAt = Date.now();
    this.emit();
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.tickInterval = setInterval(() => {
      if (!this.state || this.state.status !== 'connected') return;
      this.state.seconds += 1;
      this.emit();
    }, 1000);
  }

  private startConnectWatchdog(): void {
    this.clearConnectTimeout();
    this.connectTimeout = setTimeout(() => {
      if (this.state?.status === 'connecting') {
        this.finish('Could not connect. Make sure both sides are online and allow calls.');
      }
    }, CONNECT_TIMEOUT_MS);
  }

  private async finishWithSignal(reason: string, signal: CallSignal | null): Promise<void> {
    if (!this.state) return;
    const channel = this.callChannel;
    if (signal) await this.send(channel, signal);
    if (this.state) this.finish(reason);
  }

  private finish(reason: string): void {
    this.clearTimers();
    this.teardown();
    if (!this.state) return;
    this.state = {
      ...this.state,
      status: 'ended',
      endedReason: reason,
      localStream: null,
      remoteStream: null,
      muted: false,
      speakerMuted: false,
      cameraOff: true,
    };
    this.emit();
    this.logCall(reason);
    this.scheduleDismiss();
  }

  private logCall(reason: string): void {
    const callState = this.state;
    if (!callState?.callId || !this.authUserId || !this.peerUserId) return;
    const connected = this.callConnectedAt !== null;
    const status = connected
      ? 'ended'
      : /declin/i.test(reason)
      ? 'declined'
      : /no answer/i.test(reason)
      ? 'missed'
      : 'failed';
    void insertCallLog({
      conversationId: callState.conversationId,
      callerId: callState.direction === 'outgoing' ? this.authUserId : this.peerUserId,
      calleeId: callState.direction === 'outgoing' ? this.peerUserId : this.authUserId,
      kind: callState.kind,
      status,
      startedAt: this.callStartedAt,
      endedAt: new Date().toISOString(),
      durationSeconds: connected ? callState.seconds : null,
    }).then((result) => {
      if (!result.success && !result.missing) {
        console.warn('[DILAAL] call log failed:', result.error);
      }
    });
  }

  private scheduleDismiss(): void {
    this.clearDismissTimeout();
    this.dismissTimeout = setTimeout(() => {
      if (this.state?.status === 'ended') {
        this.state = null;
        this.emit();
      }
    }, ENDED_AUTO_DISMISS_MS);
  }

  private teardown(): void {
    if (this.pc) {
      this.pc.ontrack = null;
      this.pc.onicecandidate = null;
      this.pc.onconnectionstatechange = null;
      this.pc.close();
      this.pc = null;
    }
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
    this.remoteStream = null;
    this.pendingIce = [];
    this.remoteDescriptionSet = false;
    if (this.callChannel) {
      void supabase.removeChannel(this.callChannel);
      this.callChannel = null;
    }
  }

  private resetCall(): void {
    this.clearTimers();
    this.clearDismissTimeout();
    this.teardown();
    this.state = null;
    this.peerUserId = '';
    this.callStartedAt = null;
    this.callConnectedAt = null;
  }

  private clearRingTimeout(): void {
    if (this.ringTimeout) {
      clearTimeout(this.ringTimeout);
      this.ringTimeout = null;
    }
  }

  private clearConnectTimeout(): void {
    if (this.connectTimeout) {
      clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }
  }

  private clearDismissTimeout(): void {
    if (this.dismissTimeout) {
      clearTimeout(this.dismissTimeout);
      this.dismissTimeout = null;
    }
  }

  private clearTimers(): void {
    this.clearRingTimeout();
    this.clearConnectTimeout();
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  private async ensureMedia(kind: CallKind): Promise<void> {
    if (this.localStream) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      const error = new Error('unsupported');
      error.name = 'NotSupportedError';
      throw error;
    }
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video:
        kind === 'video'
          ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
          : false,
    });
  }

  private hasLiveVideo(): boolean {
    return Boolean(this.localStream?.getVideoTracks().some((track) => track.readyState === 'live'));
  }

  private async send(channel: RealtimeChannel | null, signal: CallSignal): Promise<void> {
    if (!channel) return;
    try {
      await channel.send({ type: 'broadcast', event: 'call', payload: signal });
    } catch (err) {
      console.warn('[DILAAL] call signal failed:', err);
    }
  }

  private emit(): void {
    this.onChange(this.state ? { ...this.state } : null);
  }
}

async function joinChannel(
  name: string,
  onSignal: (payload: unknown) => void
): Promise<RealtimeChannel> {
  const channel = supabase.channel(name, { config: { broadcast: { self: false } } });
  channel.on('broadcast', { event: 'call' }, ({ payload }) => onSignal(payload));
  await subscribeChannel(channel);
  return channel;
}
