// Web preview fallback: react-native-webrtc ships native modules only, so the
// browser build shows a clear message instead of attempting a native call.
export type CallKind = 'audio' | 'video';
export type CallStatus = 'ringing' | 'connecting' | 'connected' | 'ended';

export interface CallStream {
  toURL(): string;
}

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
  localStream: CallStream | null;
  remoteStream: CallStream | null;
  endedReason?: string;
}

export class CallClient {
  private onChange: (state: CallViewState | null) => void;
  private state: CallViewState | null = null;

  constructor(onChange: (state: CallViewState | null) => void) {
    this.onChange = onChange;
  }

  async setIdentity(_userId: string): Promise<void> {}

  async startCall(_input: {
    conversationId: string;
    kind: CallKind;
    peerName: string;
    peerAvatar?: string;
    calleeUserId: string;
    callerName: string;
  }): Promise<void> {
    this.fail('Calling needs the DILAAL development build, not Expo Go.');
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
