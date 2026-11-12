import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { Icon } from '../components/Icon';
import { useColors, typography, shadow, Palette } from '../theme';

type TicketCategory = 'dispute' | 'verification' | 'fraud' | 'payments' | 'general';

const CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] = [
  { value: 'general', label: 'General Marketplace Inquiry' },
  { value: 'dispute', label: 'Transaction / Deal Dispute' },
  { value: 'verification', label: 'Title Deed Audit Questions' },
  { value: 'fraud', label: 'Suspected Impersonation / Fraud' },
  { value: 'payments', label: 'Escrow / Payment Guidance' },
];

const makeStyles = (colors: Palette, isDark: boolean) => {
  const page = isDark ? '#020617' : '#f8fafc';
  const card = isDark ? '#0f172a' : '#ffffff';
  const border = isDark ? '#1e293b' : '#e2e8f0';
  const text = isDark ? '#ffffff' : '#0f172a';
  const muted = isDark ? '#94a3b8' : '#475569';
  const soft = isDark ? '#1e293b' : '#f1f5f9';

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: page },
    header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
    headerInner: { width: '100%', maxWidth: 896, alignSelf: 'center', gap: 12 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { fontSize: 20, fontFamily: typography.bold, color: text, flexShrink: 1 },
    headerSub: { fontSize: 12, color: muted, lineHeight: 18, maxWidth: 560 },
    openBtn: {
      alignSelf: 'flex-start',
      backgroundColor: '#059669',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    openBtnText: { fontSize: 12, fontFamily: typography.bold, color: '#ffffff' },
    body: { width: '100%', maxWidth: 896, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 24, gap: 20 },
    guidelines: {
      backgroundColor: card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: border,
      padding: 16,
      gap: 10,
    },
    guidelinesHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    guidelinesTitle: { fontSize: 14, fontFamily: typography.bold, color: text },
    bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    bulletDot: { color: '#059669', fontFamily: typography.bold, fontSize: 12 },
    bulletText: { flex: 1, fontSize: 12, lineHeight: 18, color: muted },
    strong: { fontFamily: typography.bold, color: text },
    ticketsCard: {
      backgroundColor: card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: border,
      padding: 16,
      gap: 8,
    },
    ticketsTitle: { fontSize: 14, fontFamily: typography.bold, color: text, marginBottom: 4 },
    emptyTickets: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: border,
      borderRadius: 12,
      paddingVertical: 24,
      paddingHorizontal: 8,
      alignItems: 'center',
      gap: 4,
    },
    emptyTicketsTitle: { fontSize: 12, fontFamily: typography.semibold, color: text },
    emptyTicketsText: { fontSize: 11, color: muted, textAlign: 'center', lineHeight: 16 },
    ticketRow: {
      borderWidth: 1,
      borderColor: border,
      borderRadius: 12,
      padding: 10,
      gap: 2,
    },
    ticketRowActive: { backgroundColor: isDark ? '#022c22' : '#ecfdf5', borderColor: '#10b98166' },
    ticketTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    ticketCategory: {
      fontSize: 10,
      fontFamily: typography.bold,
      color: muted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    ticketDate: { fontSize: 10, color: muted },
    ticketSubject: { fontSize: 12, fontFamily: typography.semibold, color: text },
    conversation: {
      backgroundColor: card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: border,
      overflow: 'hidden',
      minHeight: 480,
      maxHeight: 560,
    },
    convoHead: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: border,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
    },
    convoKicker: {
      fontSize: 10,
      fontFamily: typography.bold,
      color: '#059669',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    convoTitle: { fontSize: 14, fontFamily: typography.bold, color: text, marginTop: 2, flexShrink: 1 },
    statusPill: {
      backgroundColor: isDark ? '#064e3b' : '#d1fae5',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    statusPillText: { fontSize: 10, fontFamily: typography.bold, color: isDark ? '#6ee7b7' : '#065f46' },
    messages: { padding: 16, gap: 12 },
    msgColUser: { alignItems: 'flex-end' },
    msgColSupport: { alignItems: 'flex-start' },
    bubbleUser: { backgroundColor: '#047857', borderTopRightRadius: 0 },
    bubbleSupport: {
      backgroundColor: soft,
      borderWidth: 1,
      borderColor: border,
      borderTopLeftRadius: 0,
    },
    bubble: { maxWidth: '80%', borderRadius: 16, padding: 12 },
    bubbleSender: {
      fontSize: 10,
      fontFamily: typography.semibold,
      opacity: 0.75,
      marginBottom: 4,
    },
    bubbleTextUser: { fontSize: 12, lineHeight: 18, color: '#ffffff' },
    bubbleTextSupport: { fontSize: 12, lineHeight: 18, color: text },
    msgTime: { fontSize: 10, color: muted, marginTop: 4 },
    replyRow: {
      borderTopWidth: 1,
      borderTopColor: border,
      padding: 12,
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    replyInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: border,
      backgroundColor: isDark ? '#1e293b' : '#f8fafc',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 12,
      color: text,
    },
    replyBtn: {
      backgroundColor: '#047857',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    replyBtnText: { fontSize: 12, fontFamily: typography.bold, color: '#ffffff' },
    noSelected: {
      minHeight: 480,
      backgroundColor: card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: border,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      gap: 4,
    },
    noSelectedTitle: { fontSize: 14, fontFamily: typography.semibold, color: text },
    noSelectedText: { fontSize: 12, color: muted, textAlign: 'center' },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
    },
    modalCard: {
      width: '100%',
      maxWidth: 448,
      backgroundColor: card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: border,
      padding: 20,
      gap: 12,
      ...shadow.floating,
    },
    modalHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: border,
      paddingBottom: 12,
    },
    modalTitle: { fontSize: 14, fontFamily: typography.bold, color: text },
    closeCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: soft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fieldLabel: { fontSize: 12, fontFamily: typography.semibold, color: text, marginBottom: 4 },
    fieldInput: {
      borderWidth: 1,
      borderColor: border,
      backgroundColor: isDark ? '#1e293b' : '#ffffff',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 12,
      color: text,
    },
    fieldTextarea: { minHeight: 92, textAlignVertical: 'top' },
    option: {
      borderWidth: 1,
      borderColor: border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 6,
    },
    optionActive: { borderColor: '#059669', backgroundColor: isDark ? '#022c22' : '#ecfdf5' },
    optionText: { fontSize: 12, color: text },
    optionTextActive: { fontFamily: typography.semibold, color: isDark ? '#6ee7b7' : '#065f46' },
    modalActions: { flexDirection: 'row', gap: 8, paddingTop: 4 },
    cancelBtn: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: border,
      paddingVertical: 10,
      alignItems: 'center',
    },
    cancelText: { fontSize: 12, fontFamily: typography.semibold, color: text },
    submitBtn: {
      flex: 1,
      borderRadius: 12,
      backgroundColor: '#047857',
      paddingVertical: 10,
      alignItems: 'center',
    },
    submitText: { fontSize: 12, fontFamily: typography.bold, color: '#ffffff' },
  });
};

export const SupportSafetyScreen: React.FC = () => {
  const { supportTickets, createSupportTicket, sendSupportReply, t, isDarkMode } = useApp();
  const colors = useColors();
  const styles = makeStyles(colors, isDarkMode);

  const [activeTicketId, setActiveTicketId] = useState<string | null>(
    supportTickets.length > 0 ? supportTickets[0].id : null
  );
  const [replyText, setReplyText] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState<TicketCategory>('general');
  const [newMessage, setNewMessage] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);

  const selectedTicket = supportTickets.find((ticket) => ticket.id === activeTicketId);

  const handleSendReply = () => {
    if (!activeTicketId || !replyText.trim()) return;
    sendSupportReply(activeTicketId, replyText.trim());
    setReplyText('');
  };

  const handleCreateTicket = () => {
    if (!newSubject.trim() || !newMessage.trim()) return;
    createSupportTicket(newSubject.trim(), newCategory, newMessage.trim());
    setNewSubject('');
    setNewMessage('');
    setShowNewModal(false);
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 96 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerInner}>
            <View style={{ gap: 4 }}>
              <View style={styles.headerTitleRow}>
                <Icon name="shield_with_heart" size={22} color="#059669" />
                <Text style={styles.headerTitle}>Safety, Dispute & Support Center</Text>
              </View>
              <Text style={styles.headerSub}>
                {t(
                  'supportCenterSubtitle',
                  'Guidance for safe property transactions, dispute mediation, and marketplace support.'
                )}
              </Text>
            </View>
            <Pressable onPress={() => setShowNewModal(true)} style={styles.openBtn}>
              <Icon name="add" size={16} color="#ffffff" />
              <Text style={styles.openBtnText}>Open Support Case</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.guidelines}>
            <View style={styles.guidelinesHead}>
              <Icon name="verified_user" size={18} color="#f59e0b" />
              <Text style={styles.guidelinesTitle}>{t('safetyGuidelines', 'Safety Guidelines')}</Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.strong}>Never send un-escrowed funds: </Text>
                Avoid direct peer transfers to personal mobile wallets without contract execution.
              </Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.strong}>Check physical boundary beacons: </Text>
                Always verify stone beacons against the cadastral survey map.
              </Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.strong}>Independent legal counsel: </Text>
                Engage an independent advocate or notary public to audit registry folios.
              </Text>
            </View>
          </View>

          <View style={styles.ticketsCard}>
            <Text style={styles.ticketsTitle}>
              Your Support Inquiries ({supportTickets.length})
            </Text>
            {supportTickets.length === 0 ? (
              <View style={styles.emptyTickets}>
                <Icon name="mark_email_unread" size={22} color="#94a3b8" />
                <Text style={styles.emptyTicketsTitle}>
                  {t('noSupportTicketsTitle', 'No support tickets yet')}
                </Text>
                <Text style={styles.emptyTicketsText}>
                  {t(
                    'noSupportTicketsDesc',
                    'Open a support case to start a conversation with our team.'
                  )}
                </Text>
              </View>
            ) : (
              supportTickets.map((ticket) => (
                <Pressable
                  key={ticket.id}
                  onPress={() => setActiveTicketId(ticket.id)}
                  style={[
                    styles.ticketRow,
                    activeTicketId === ticket.id && styles.ticketRowActive,
                  ]}
                >
                  <View style={styles.ticketTop}>
                    <Text style={styles.ticketCategory}>{ticket.category}</Text>
                    <Text style={styles.ticketDate}>{ticket.createdAt}</Text>
                  </View>
                  <Text style={styles.ticketSubject} numberOfLines={1}>
                    {ticket.subject}
                  </Text>
                </Pressable>
              ))
            )}
          </View>

          {selectedTicket ? (
            <View style={styles.conversation}>
              <View style={styles.convoHead}>
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.convoKicker}>
                    {selectedTicket.category.toUpperCase()} • ID: {selectedTicket.id}
                  </Text>
                  <Text style={styles.convoTitle}>{selectedTicket.subject}</Text>
                </View>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>
                    {selectedTicket.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <ScrollView contentContainerStyle={styles.messages} showsVerticalScrollIndicator={false}>
                {selectedTicket.messages.map((message, idx) => {
                  const isUser = message.sender === 'user';
                  return (
                    <View
                      key={`${message.timestamp}-${idx}`}
                      style={isUser ? styles.msgColUser : styles.msgColSupport}
                    >
                      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleSupport]}>
                        <Text
                          style={[
                            styles.bubbleSender,
                            { color: isUser ? '#ffffff' : '#64748b' },
                          ]}
                        >
                          {isUser ? t('you', 'You') : t('supportTeam', 'Support Team')}
                        </Text>
                        <Text style={isUser ? styles.bubbleTextUser : styles.bubbleTextSupport}>
                          {message.text}
                        </Text>
                      </View>
                      <Text style={styles.msgTime}>{message.timestamp}</Text>
                    </View>
                  );
                })}
              </ScrollView>

              <View style={styles.replyRow}>
                <TextInput
                  value={replyText}
                  onChangeText={setReplyText}
                  placeholder="Provide additional details or inquiries..."
                  placeholderTextColor="#94a3b8"
                  style={styles.replyInput}
                />
                <Pressable onPress={handleSendReply} style={styles.replyBtn}>
                  <Text style={styles.replyBtnText}>Reply</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.noSelected}>
              <Icon name="inbox" size={36} color="#cbd5e1" />
              <Text style={styles.noSelectedTitle}>No Support Case Selected</Text>
              <Text style={styles.noSelectedText}>
                Select an existing inquiry or open a new support ticket.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showNewModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNewModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Submit Support Ticket</Text>
              <Pressable onPress={() => setShowNewModal(false)} style={styles.closeCircle}>
                <Icon name="close" size={14} color="#64748b" />
              </Pressable>
            </View>

            <View>
              <Text style={styles.fieldLabel}>Topic Category</Text>
              {CATEGORY_OPTIONS.map((option) => {
                const active = newCategory === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setNewCategory(option.value)}
                    style={[styles.option, active && styles.optionActive]}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View>
              <Text style={styles.fieldLabel}>Subject Summary</Text>
              <TextInput
                value={newSubject}
                onChangeText={setNewSubject}
                placeholder={t(
                  'supportSubjectPlaceholder',
                  'e.g. Payment question about my escrow deposit'
                )}
                placeholderTextColor="#94a3b8"
                style={styles.fieldInput}
              />
            </View>

            <View>
              <Text style={styles.fieldLabel}>Detailed Message</Text>
              <TextInput
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Explain your inquiry in detail..."
                placeholderTextColor="#94a3b8"
                multiline
                style={[styles.fieldInput, styles.fieldTextarea]}
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowNewModal(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleCreateTicket} style={styles.submitBtn}>
                <Text style={styles.submitText}>Submit Ticket</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};
