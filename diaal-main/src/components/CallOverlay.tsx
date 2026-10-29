import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useCall } from '../context/CallContext';

const initials = (name: string) => {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  return letters || 'DI';
};

const formatTimer = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const CallOverlay: React.FC = () => {
  const { session, accept, decline, hangUp, dismiss, toggleMute, toggleCamera, toggleSpeaker } =
    useCall();
  const { t } = useApp();
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const [needsAudioTap, setNeedsAudioTap] = useState(false);

  const remoteStream = session?.remoteStream ?? null;
  const localStream = session?.localStream ?? null;
  const speakerMuted = session?.speakerMuted ?? false;
  const status = session?.status ?? null;
  const isVideo = session?.kind === 'video';

  useEffect(() => {
    const video = remoteVideoRef.current;
    if (video) {
      video.srcObject = remoteStream;
      if (remoteStream) void video.play().catch(() => setNeedsAudioTap(true));
    }
    const audio = remoteAudioRef.current;
    if (audio) {
      audio.srcObject = remoteStream;
      if (remoteStream) void audio.play().catch(() => setNeedsAudioTap(true));
    }
    const local = localVideoRef.current;
    if (local) local.srcObject = localStream;
  }, [remoteStream, localStream, status, isVideo]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.muted = speakerMuted;
    if (remoteAudioRef.current) remoteAudioRef.current.muted = speakerMuted;
  }, [speakerMuted, status, isVideo, remoteStream]);

  useEffect(() => {
    setNeedsAudioTap(false);
  }, [session?.callId]);

  if (!session) return null;

  const playRemoteAudio = () => {
    void remoteVideoRef.current?.play().catch(() => undefined);
    void remoteAudioRef.current?.play().catch(() => undefined);
    setNeedsAudioTap(false);
  };

  const endButton = (
    <button
      type="button"
      onClick={hangUp}
      aria-label={t('endCall', 'End call')}
      title={t('endCall', 'End call')}
      className="flex h-14 w-14 items-center justify-center rounded-full bg-error text-on-error shadow-xl transition-transform active:scale-90 cursor-pointer hover:bg-error/90"
    >
      <span className="material-symbols-outlined text-[26px]">call_end</span>
    </button>
  );

  const audioControlClass = (active: boolean) =>
    `flex h-12 w-12 items-center justify-center rounded-full shadow-md transition-all cursor-pointer ${
      active ? 'bg-error text-on-error' : 'bg-primary-container text-on-primary'
    }`;

  if (status === 'ended') {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-3xl bg-primary p-6 text-center text-on-primary shadow-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-container/70">
            <span className="material-symbols-outlined text-[26px]">
              {session.endedReason?.includes('No answer') ? 'phone_missed' : 'call_end'}
            </span>
          </div>
          <p className="text-sm font-bold leading-relaxed">
            {session.endedReason || t('callEnded', 'Call ended')}
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="mt-5 w-full rounded-xl bg-primary-container py-2.5 text-xs font-bold text-on-primary transition-colors cursor-pointer hover:bg-tertiary-container"
          >
            {t('close', 'Close')}
          </button>
        </div>
      </div>
    );
  }

  if (session.direction === 'incoming' && status === 'ringing') {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-3xl bg-primary p-6 text-center text-on-primary shadow-2xl">
          <span className="inline-block rounded-full bg-primary-container/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-fixed">
            {isVideo
              ? t('incomingVideoCall', 'Incoming video inspection')
              : t('incomingAudioCall', 'Incoming voice call')}
          </span>
          <div className="relative mx-auto mt-5 mb-3 h-24 w-24">
            <span className="absolute inset-0 animate-ping rounded-full bg-tertiary-fixed-dim/30" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary-container text-3xl font-bold ring-4 ring-primary-fixed/40">
              {initials(session.peerName)}
            </div>
          </div>
          <h3 className="text-lg font-bold">{session.peerName}</h3>
          <p className="mt-1 text-xs text-primary-fixed">
            {isVideo
              ? t('incomingVideoSub', 'Wants to start a live video inspection')
              : t('incomingAudioSub', 'Is calling you on DILAAL')}
          </p>
          <div className="mt-7 flex items-center justify-center gap-10">
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={decline}
                aria-label={t('declineCall', 'Decline')}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-error text-on-error shadow-xl transition-transform active:scale-90 cursor-pointer hover:bg-error/90"
              >
                <span className="material-symbols-outlined text-[26px]">call_end</span>
              </button>
              <span className="text-[10px] font-bold text-primary-fixed">{t('declineCall', 'Decline')}</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={accept}
                aria-label={t('acceptCall', 'Accept')}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-tertiary-fixed-dim text-on-primary shadow-xl transition-transform active:scale-90 cursor-pointer hover:bg-tertiary-fixed"
              >
                <span className="material-symbols-outlined text-[26px]">call</span>
              </button>
              <span className="text-[10px] font-bold text-primary-fixed">{t('acceptCall', 'Accept')}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'ringing' || status === 'connecting') {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-3xl bg-primary p-6 text-center text-on-primary shadow-2xl">
          {isVideo && localStream ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="mb-4 h-40 w-full rounded-2xl bg-black object-cover shadow-inner"
            />
          ) : (
            <div className="relative mx-auto mb-3 h-24 w-24">
              <span className="absolute inset-0 animate-pulse rounded-full bg-tertiary-fixed-dim/25" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary-container text-3xl font-bold ring-4 ring-primary-fixed/40">
                {initials(session.peerName)}
              </div>
            </div>
          )}

          <h3 className="text-lg font-bold">{session.peerName}</h3>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-secondary-fixed">
            <span className="material-symbols-outlined text-[14px]">
              {status === 'ringing' ? 'ring_volume' : 'progress_activity'}
            </span>
            {status === 'ringing'
              ? t('callingPeer', 'Calling…')
              : t('connectingCall', 'Connecting…')}
          </p>

          <div className="mt-7 flex items-center justify-center">{endButton}</div>
          <p className="mt-3 text-[10px] text-primary-fixed">
            {isVideo
              ? t('videoCallHint', 'Live video inspection')
              : t('audioCallHint', 'Voice call')}
          </p>
        </div>
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95 p-0 backdrop-blur-md sm:p-4">
        <div className="relative flex h-full w-full max-w-2xl flex-col overflow-hidden bg-black shadow-2xl sm:h-[86vh] sm:rounded-3xl">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/75 to-transparent p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{session.peerName}</p>
              <p className="font-mono text-[11px] text-white/70">{formatTimer(session.seconds)}</p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
              Live
            </span>
          </div>

          {localStream && (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute bottom-28 right-3 h-36 w-24 rounded-2xl border border-white/20 object-cover shadow-lg sm:h-44 sm:w-32"
            />
          )}

          {needsAudioTap && (
            <button
              type="button"
              onClick={playRemoteAudio}
              className="absolute left-1/2 top-20 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-bold text-black shadow-lg cursor-pointer"
            >
              {t('tapForSound', 'Tap to enable sound')}
            </button>
          )}

          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 bg-gradient-to-t from-black/85 to-transparent p-4 pb-5">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={session.muted ? t('unmute', 'Unmute') : t('mute', 'Mute')}
              className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-md transition-all cursor-pointer ${
                session.muted ? 'bg-error' : 'bg-white/15 hover:bg-white/25'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">
                {session.muted ? 'mic_off' : 'mic'}
              </span>
            </button>
            <button
              type="button"
              onClick={toggleCamera}
              aria-label={session.cameraOff ? t('cameraOn', 'Turn camera on') : t('cameraOff', 'Turn camera off')}
              className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-md transition-all cursor-pointer ${
                session.cameraOff ? 'bg-error' : 'bg-white/15 hover:bg-white/25'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">
                {session.cameraOff ? 'videocam_off' : 'videocam'}
              </span>
            </button>
            <button
              type="button"
              onClick={hangUp}
              aria-label={t('endCall', 'End call')}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-error text-on-error shadow-xl transition-transform active:scale-90 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[26px]">call_end</span>
            </button>
            <button
              type="button"
              onClick={toggleSpeaker}
              aria-label={t('speaker', 'Speaker')}
              className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-md transition-all cursor-pointer ${
                speakerMuted ? 'bg-error' : 'bg-white/15 hover:bg-white/25'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">
                {speakerMuted ? 'volume_off' : 'volume_up'}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-primary p-6 text-center text-on-primary shadow-2xl">
        <div className="mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-primary-container text-3xl font-bold ring-4 ring-primary-fixed/40">
          {initials(session.peerName)}
        </div>
        <h3 className="text-lg font-bold">{session.peerName}</h3>
        <p className="mt-2 font-mono text-sm font-bold text-secondary-fixed">
          {formatTimer(session.seconds)}
        </p>

        {needsAudioTap && (
          <button
            type="button"
            onClick={playRemoteAudio}
            className="mt-3 rounded-full bg-secondary-fixed px-3 py-1.5 text-[11px] font-bold text-primary shadow-md cursor-pointer"
          >
            {t('tapForSound', 'Tap to enable sound')}
          </button>
        )}

        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={session.muted ? t('unmute', 'Unmute') : t('mute', 'Mute')}
            className={audioControlClass(session.muted)}
          >
            <span className="material-symbols-outlined text-[22px]">
              {session.muted ? 'mic_off' : 'mic'}
            </span>
          </button>
          <button
            type="button"
            onClick={toggleSpeaker}
            aria-label={t('speaker', 'Speaker')}
            className={audioControlClass(speakerMuted)}
          >
            <span className="material-symbols-outlined text-[22px]">
              {speakerMuted ? 'volume_off' : 'volume_up'}
            </span>
          </button>
          {endButton}
        </div>

        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      </div>
    </div>
  );
};
