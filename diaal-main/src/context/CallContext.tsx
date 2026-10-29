import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useApp } from './AppContext';
import { CallClient, type CallKind, type CallViewState } from '../lib/calls';
import { getOrCreateConversation, resolveListingBroker } from '../lib/chat';
import { CallOverlay } from '../components/CallOverlay';

export interface StartCallInput {
  conversationId?: string;
  listingId?: string;
  brokerId: string;
  calleeUserId?: string;
  kind: CallKind;
  peerName: string;
  peerAvatar?: string;
}

interface CallContextValue {
  session: CallViewState | null;
  startCall: (input: StartCallInput) => Promise<void>;
  accept: () => void;
  decline: () => void;
  hangUp: () => void;
  dismiss: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  toggleSpeaker: () => void;
}

const CallContext = createContext<CallContextValue | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authUserId, currentUser, brokers } = useApp();
  const [session, setSession] = useState<CallViewState | null>(null);
  const clientRef = useRef<CallClient | null>(null);

  useEffect(() => {
    const client = new CallClient(setSession);
    clientRef.current = client;
    return () => {
      client.dispose();
      clientRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (authUserId) void clientRef.current?.setIdentity(authUserId);
  }, [authUserId]);

  const startCall = useCallback(
    async (input: StartCallInput) => {
      const client = clientRef.current;
      if (!client) return;
      if (!authUserId) {
        client.fail('Sign in to place a call.');
        return;
      }

      const broker = brokers.find((b) => b.id === input.brokerId);
      const calleeUserId = input.calleeUserId || broker?.ownerId || '';
      if (!calleeUserId) {
        client.fail('This broker has not enabled calls on DILAAL yet.');
        return;
      }
      if (calleeUserId === authUserId) {
        client.fail('You cannot call your own account.');
        return;
      }

      let conversationId = input.conversationId || '';
      if (!conversationId) {
        const resolved = input.listingId
          ? await resolveListingBroker(input.listingId)
          : { brokerId: null };
        const brokerId = resolved.brokerId || broker?.id || input.brokerId;
        const conversation = await getOrCreateConversation({
          listingId: input.listingId || null,
          brokerId,
          buyerId: authUserId,
        });
        conversationId = conversation?.id || '';
      }
      if (!conversationId) {
        client.fail('Could not open a call channel. Please try again.');
        return;
      }

      await client.startCall({
        conversationId,
        kind: input.kind,
        peerName: input.peerName,
        peerAvatar: input.peerAvatar,
        calleeUserId,
        callerName: currentUser.name?.trim() || 'DILAAL user',
      });
    },
    [authUserId, brokers, currentUser.name]
  );

  const value: CallContextValue = {
    session,
    startCall,
    accept: () => clientRef.current?.acceptCall(),
    decline: () => clientRef.current?.declineCall(),
    hangUp: () => clientRef.current?.hangUp(),
    dismiss: () => clientRef.current?.dismiss(),
    toggleMute: () => clientRef.current?.toggleMute(),
    toggleCamera: () => clientRef.current?.toggleCamera(),
    toggleSpeaker: () => clientRef.current?.toggleSpeaker(),
  };

  return (
    <CallContext.Provider value={value}>
      {children}
      <CallOverlay />
    </CallContext.Provider>
  );
};

export function useCall(): CallContextValue {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used inside CallProvider');
  return context;
}
