import React, { useEffect, useRef } from 'react';
import { Animated, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type RTCViewProps = {
  streamURL: string;
  style?: object;
  objectFit?: 'contain' | 'cover';
  mirror?: boolean;
  zOrder?: number;
};

function loadRTCView(): React.ComponentType<RTCViewProps> {
  if (Constants.appOwnership === 'expo') {
    return View as unknown as React.ComponentType<RTCViewProps>;
  }
  try {
    return require('react-native-webrtc').RTCView as React.ComponentType<RTCViewProps>;
  } catch {
    return View as unknown as React.ComponentType<RTCViewProps>;
  }
}

const RTCView = loadRTCView();
import { useApp } from '../context/AppContext';
import { useCall } from '../context/CallContext';
import { Icon } from '../components/Icon';
import { useColors, typography, shadow, Palette } from '../theme';

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

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.75)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    },
    videoBackdrop: { flex: 1, backgroundColor: '#000000' },
    card: {
      width: '100%',
      maxWidth: 384,
      borderRadius: 24,
      backgroundColor: colors.primary,
      padding: 24,
      alignItems: 'center',
      ...shadow.floating,
    },
    badge: {
      backgroundColor: colors.primaryContainer,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 4,
      marginBottom: 20,
    },
    badgeText: {
      fontSize: 10,
      fontFamily: typography.bold,
      color: colors.primaryFixed,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    avatarWrap: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    pulse: {
      position: 'absolute',
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.tertiaryFixedDim + '4D',
    },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.primaryContainer,
      borderWidth: 4,
      borderColor: colors.primaryFixed + '66',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarText: { fontSize: 30, fontFamily: typography.bold, color: colors.onPrimary },
    peerName: {
      fontSize: 20,
      fontFamily: typography.bold,
      color: colors.onPrimary,
      textAlign: 'center',
    },
    subtitle: {
      marginTop: 4,
      fontSize: 12,
      color: colors.primaryFixed,
      textAlign: 'center',
      lineHeight: 18,
    },
    actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 40, marginTop: 28 },
    actionCol: { alignItems: 'center', gap: 6 },
    actionLabel: { fontSize: 10, fontFamily: typography.bold, color: colors.primaryFixed },
    declineBtn: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.error,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow.floating,
    },
    acceptBtn: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.tertiaryFixedDim,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow.floating,
    },
    endBtn: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.error,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow.floating,
    },
    endSolo: { marginTop: 28 },
    hint: { marginTop: 12, fontSize: 10, color: colors.primaryFixed },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    statusText: { fontSize: 12, fontFamily: typography.semibold, color: colors.secondaryFixed },
    localPreview: {
      width: '100%',
      height: 160,
      borderRadius: 16,
      backgroundColor: '#000000',
      marginBottom: 16,
      overflow: 'hidden',
    },
    videoRoot: { flex: 1, backgroundColor: '#000000' },
    remoteVideo: { flex: 1 },
    videoTop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      padding: 16,
      paddingTop: 56,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    videoName: { fontSize: 14, fontFamily: typography.bold, color: '#ffffff' },
    videoTimer: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    livePill: {
      backgroundColor: 'rgba(16,185,129,0.2)',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    liveText: {
      fontSize: 10,
      fontFamily: typography.bold,
      color: '#6ee7b7',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    localPip: {
      position: 'absolute',
      bottom: 112,
      right: 12,
      width: 96,
      height: 144,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.25)',
      backgroundColor: '#000000',
    },
    videoControls: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: 16,
      paddingBottom: 28,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    videoControlBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    controlDefault: { backgroundColor: 'rgba(255,255,255,0.15)' },
    controlActive: { backgroundColor: colors.error },
    timer: {
      fontVariant: ['tabular-nums'],
      fontSize: 14,
      fontFamily: typography.bold,
      color: colors.secondaryFixed,
      marginTop: 8,
    },
    audioControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 28 },
    audioControl: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow.card,
    },
    audioOn: { backgroundColor: colors.primaryContainer },
    audioOff: { backgroundColor: colors.error },
    endedCard: { paddingVertical: 28 },
    endedIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    endedText: {
      fontSize: 14,
      fontFamily: typography.bold,
      color: colors.onPrimary,
      textAlign: 'center',
      lineHeight: 20,
    },
    closeBtn: {
      marginTop: 20,
      width: '100%',
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: 'center',
      backgroundColor: colors.primaryContainer,
    },
    closeText: { fontSize: 12, fontFamily: typography.bold, color: colors.onPrimary },
  });

export const CallOverlay: React.FC = () => {
  const { session, accept, decline, hangUp, dismiss, toggleMute, toggleCamera, toggleSpeaker } =
    useCall();
  const { t } = useApp();
  const colors = useColors();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const pulse = useRef(new Animated.Value(0)).current;

  const status = session?.status ?? null;
  const isVideo = session?.kind === 'video';
  const remoteStream = session?.remoteStream ?? null;
  const localStream = session?.localStream ?? null;
  const speakerMuted = session?.speakerMuted ?? false;

  useEffect(() => {
    if (!session) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [session, pulse]);

  if (!session) return null;

  const pulseStyle = {
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.1] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) }],
  };

  const peerAvatar = (size: number) =>
    session.peerAvatar ? (
      <Image source={{ uri: session.peerAvatar }} style={styles.avatarImage} />
    ) : (
      <Text style={[styles.avatarText, { fontSize: size }]}>{initials(session.peerName)}</Text>
    );

  const endButton = (extraStyle?: object) => (
    <Pressable
      onPress={hangUp}
      style={[styles.endBtn, extraStyle]}
      accessibilityLabel={t('endCall', 'End call')}
    >
      <Icon name="call_end" size={26} color={colors.onError} />
    </Pressable>
  );

  const audioControlClass = (active: boolean) => [
    styles.audioControl,
    active ? styles.audioOff : styles.audioOn,
  ];

  if (status === 'ended') {
    return (
      <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={dismiss}>
        <View style={styles.backdrop}>
          <View style={[styles.card, styles.endedCard]}>
            <View style={styles.endedIcon}>
              <Icon
                name={session.endedReason?.includes('No answer') ? 'phone_missed' : 'call_end'}
                size={26}
                color={colors.onPrimary}
              />
            </View>
            <Text style={styles.endedText}>
              {session.endedReason || t('callEnded', 'Call ended')}
            </Text>
            <Pressable onPress={dismiss} style={styles.closeBtn}>
              <Text style={styles.closeText}>{t('close', 'Close')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  if (session.direction === 'incoming' && status === 'ringing') {
    return (
      <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={decline}>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {isVideo
                  ? t('incomingVideoCall', 'Incoming video inspection')
                  : t('incomingAudioCall', 'Incoming voice call')}
              </Text>
            </View>

            <View style={styles.avatarWrap}>
              <Animated.View style={[styles.pulse, pulseStyle]} />
              <View style={styles.avatar}>{peerAvatar(30)}</View>
            </View>

            <Text style={styles.peerName}>{session.peerName}</Text>
            <Text style={styles.subtitle}>
              {isVideo
                ? t('incomingVideoSub', 'Wants to start a live video inspection')
                : t('incomingAudioSub', 'Is calling you on DILAAL')}
            </Text>

            <View style={styles.actionRow}>
              <View style={styles.actionCol}>
                <Pressable
                  onPress={decline}
                  style={styles.declineBtn}
                  accessibilityLabel={t('declineCall', 'Decline')}
                >
                  <Icon name="call_end" size={26} color={colors.onError} />
                </Pressable>
                <Text style={styles.actionLabel}>{t('declineCall', 'Decline')}</Text>
              </View>
              <View style={styles.actionCol}>
                <Pressable
                  onPress={accept}
                  style={styles.acceptBtn}
                  accessibilityLabel={t('acceptCall', 'Accept')}
                >
                  <Icon name="call" size={26} color={colors.onPrimary} />
                </Pressable>
                <Text style={styles.actionLabel}>{t('acceptCall', 'Accept')}</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  if (status === 'ringing' || status === 'connecting') {
    return (
      <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={hangUp}>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            {isVideo && localStream ? (
              <View style={styles.localPreview}>
                <RTCView streamURL={localStream.toURL()} style={{ flex: 1 }} objectFit="cover" />
              </View>
            ) : (
              <View style={styles.avatarWrap}>
                <Animated.View style={[styles.pulse, pulseStyle]} />
                <View style={styles.avatar}>{peerAvatar(30)}</View>
              </View>
            )}

            <Text style={styles.peerName}>{session.peerName}</Text>
            <View style={styles.statusRow}>
              <Icon
                name={status === 'ringing' ? 'ring_volume' : 'progress_activity'}
                size={14}
                color={colors.secondaryFixed}
              />
              <Text style={styles.statusText}>
                {status === 'ringing'
                  ? t('callingPeer', 'Calling…')
                  : t('connectingCall', 'Connecting…')}
              </Text>
            </View>

            {endButton(styles.endSolo)}
            <Text style={styles.hint}>
              {isVideo
                ? t('videoCallHint', 'Live video inspection')
                : t('audioCallHint', 'Voice call')}
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (isVideo) {
    return (
      <Modal visible animationType="fade" statusBarTranslucent onRequestClose={hangUp}>
        <View style={styles.videoRoot}>
          {remoteStream ? (
            <RTCView streamURL={remoteStream.toURL()} style={styles.remoteVideo} objectFit="cover" />
          ) : null}

          <View style={[styles.videoTop, { paddingTop: Math.max(insets.top, 16) + 16 }]}>
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.videoName} numberOfLines={1}>
                {session.peerName}
              </Text>
              <Text style={styles.videoTimer}>{formatTimer(session.seconds)}</Text>
            </View>
            <View style={styles.livePill}>
              <Text style={styles.liveText}>Live</Text>
            </View>
          </View>

          {localStream ? (
            <View style={styles.localPip}>
              <RTCView
                streamURL={localStream.toURL()}
                style={{ flex: 1 }}
                objectFit="cover"
                mirror
                zOrder={1}
              />
            </View>
          ) : null}

          <View style={[styles.videoControls, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
            <Pressable
              onPress={toggleMute}
              style={[styles.videoControlBtn, session.muted ? styles.controlActive : styles.controlDefault]}
              accessibilityLabel={session.muted ? t('unmute', 'Unmute') : t('mute', 'Mute')}
            >
              <Icon name={session.muted ? 'mic_off' : 'mic'} size={22} color="#ffffff" />
            </Pressable>
            <Pressable
              onPress={toggleCamera}
              style={[
                styles.videoControlBtn,
                session.cameraOff ? styles.controlActive : styles.controlDefault,
              ]}
              accessibilityLabel={
                session.cameraOff ? t('cameraOn', 'Turn camera on') : t('cameraOff', 'Turn camera off')
              }
            >
              <Icon name={session.cameraOff ? 'videocam_off' : 'videocam'} size={22} color="#ffffff" />
            </Pressable>
            <Pressable
              onPress={hangUp}
              style={styles.endBtn}
              accessibilityLabel={t('endCall', 'End call')}
            >
              <Icon name="call_end" size={26} color={colors.onError} />
            </Pressable>
            <Pressable
              onPress={toggleSpeaker}
              style={[
                styles.videoControlBtn,
                speakerMuted ? styles.controlActive : styles.controlDefault,
              ]}
              accessibilityLabel={t('speaker', 'Speaker')}
            >
              <Icon name={speakerMuted ? 'volume_off' : 'volume_up'} size={22} color="#ffffff" />
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={hangUp}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { paddingVertical: 28 }]}>
          <View style={[styles.avatar, { width: 96, height: 96 }]}>{peerAvatar(30)}</View>
          <Text style={[styles.peerName, { marginTop: 12 }]}>{session.peerName}</Text>
          <Text style={styles.timer}>{formatTimer(session.seconds)}</Text>

          <View style={styles.audioControls}>
            <Pressable
              onPress={toggleMute}
              style={audioControlClass(session.muted)}
              accessibilityLabel={session.muted ? t('unmute', 'Unmute') : t('mute', 'Mute')}
            >
              <Icon
                name={session.muted ? 'mic_off' : 'mic'}
                size={22}
                color={colors.onPrimary}
              />
            </Pressable>
            <Pressable
              onPress={toggleSpeaker}
              style={audioControlClass(speakerMuted)}
              accessibilityLabel={t('speaker', 'Speaker')}
            >
              <Icon
                name={speakerMuted ? 'volume_off' : 'volume_up'}
                size={22}
                color={colors.onPrimary}
              />
            </Pressable>
            {endButton()}
          </View>

          <Text style={styles.hint}>{t('audioCallHint', 'Voice call')}</Text>
        </View>
      </View>
    </Modal>
  );
};
