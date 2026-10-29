// Web preview fallback: react-native-webrtc ships native modules only, so the
// browser build shows a clear message instead of attempting a native call.
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
  localStream: null;
  remoteStream: null;
  endedReason?: string;
}

export class CallClient {
  private onChange: (state: CallViewState | null) => void;
  private state: CallViewState | null = null;

  constructor(onChange: (state: CallViewState | null) => void) {
    this.onChange = onChange;
  }

  async setIdentity(): Promise<void> {}

  async startCall(): Promise<void> {
    this.fail('Calling runs in the installed DILAAL mobile app.');
  }

  acceptCall(): void {}
  declineCall(): void {}

  hangUp(): void {
    this.fail('Call ended');
  }

  toggleMute(): void {}

  toggleCamera(): void {}

  toggleSpeaker(): void {}

  dismiss(): void {
    this.state = null;
    this.onChange(null);
  }

  fail(message: string): void {
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
    this.onChange(this.state);
    setTimeout(() => {
      this.state = null;
      this.onChange(null);
    }, 4000);
  }

  dispose(): void {
    this.state = null;
    this.onChange(null);
  }
}
