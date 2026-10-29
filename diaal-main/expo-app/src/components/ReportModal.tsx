import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { ReportCase } from '../types';
import { Icon } from './Icon';
import { useColors, typography, shadow } from '../theme';

interface ReportModalProps {
  targetType: 'listing' | 'broker' | 'message';
  targetId: string;
  targetTitle: string;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  targetType,
  targetId,
  targetTitle,
  onClose,
}) => {
  const { submitReport, currentUser, t } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [reason, setReason] = useState<ReportCase['reason']>('fraud_fake_listing');
  const [email, setEmail] = useState(currentUser.email || '');
  const [description, setDescription] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isReasonOpen, setIsReasonOpen] = useState(false);

  const reasons: { value: ReportCase['reason']; label: string }[] = [
    { value: 'fraud_fake_listing', label: t('reasonFraud', 'Suspected Fraudulent / Fake Listing') },
    { value: 'ownership_dispute', label: t('reasonDispute', 'Boundary or Ownership Dispute') },
    { value: 'wrong_price', label: t('reasonWrongPrice', 'Inaccurate or Misleading Pricing') },
    { value: 'misleading_photos', label: t('reasonPhotos', 'Stolen or Misleading Property Photos') },
    { value: 'harassment', label: t('reasonHarassment', 'Broker Misconduct or Harassment') },
    { value: 'other', label: t('reasonOther', 'Other Violation') },
  ];

  const handleSubmit = async () => {
    if (!description.trim() || description.length < 10) {
      setError(t('reportErrMinLength', 'Please provide at least 10 characters describing the issue.'));
      return;
    }

    setError('');
    const res = await submitReport({
      targetType,
      targetId,
      targetTitle,
      reporterEmail: email.trim() || currentUser.email,
      reason,
      description: description.trim(),
    });

    if (!res.success) {
      setError(
        t('reportErrSubmit', 'Your report could not be sent. Check your connection and try again.')
      );
      return;
    }

    setIsSubmitted(true);
    setTimeout(onClose, 1500);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant + '55' },
          ]}
        >
          <ScrollView
            contentContainerStyle={[styles.body, { paddingBottom: Math.max(insets.bottom, 20) }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.header, { borderBottomColor: colors.surfaceContainer }]}>
              <View style={styles.headerLeft}>
                <View style={[styles.headerIcon, { backgroundColor: colors.secondaryFixed }]}>
                  <Icon name="flag" size={20} color={colors.secondary} />
                </View>
                <View style={{ flexShrink: 1 }}>
                  <Text style={[styles.title, { color: colors.onSurface }]}>
                    {t('reportConcern', 'Report Concern')}
                  </Text>
                  <Text style={[styles.subtitle, { color: colors.outline }]} numberOfLines={1}>
                    {targetTitle}
                  </Text>
                </View>
              </View>
              <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceContainer }]}>
                <Icon name="close" size={14} color={colors.outline} />
              </Pressable>
            </View>

            {isSubmitted ? (
              <View style={styles.success}>
                <View style={[styles.successIcon, { backgroundColor: colors.primaryFixed }]}>
                  <Icon name="check_circle" size={24} color={colors.primary} />
                </View>
                <Text style={[styles.successTitle, { color: colors.onSurface }]}>
                  {t('reportSubmitted', 'Report Submitted')}
                </Text>
                <Text style={[styles.successSub, { color: colors.outline }]}>
                  {t(
                    'reportSubmittedSub',
                    'Thank you for keeping DILAAL safe. Our compliance team will audit the reported evidence.'
                  )}
                </Text>
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                <View>
                  <Text style={[styles.label, { color: colors.onSurface }]}>
                    {t('reasonForReport', 'Reason for Report')}
                  </Text>
                  <Pressable
                    onPress={() => setIsReasonOpen((v) => !v)}
                    style={[
                      styles.select,
                      { borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainerLow },
                    ]}
                  >
                    <Text style={[styles.selectText, { color: colors.onSurface }]} numberOfLines={1}>
                      {reasons.find((r) => r.value === reason)?.label}
                    </Text>
                    <Icon name={isReasonOpen ? 'expand_less' : 'expand_more'} size={18} color={colors.outline} />
                  </Pressable>
                  {isReasonOpen && (
                    <View
                      style={[
                        styles.dropdown,
                        { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant },
                      ]}
                    >
                      {reasons.map((r, idx) => {
                        const active = reason === r.value;
                        return (
                          <Pressable
                            key={r.value}
                            onPress={() => {
                              setReason(r.value);
                              setIsReasonOpen(false);
                            }}
                            style={[
                              styles.dropdownRow,
                              idx < reasons.length - 1 && {
                                borderBottomWidth: StyleSheet.hairlineWidth,
                                borderBottomColor: colors.outlineVariant + '55',
                              },
                              active && { backgroundColor: colors.primary + '0D' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.dropdownText,
                                { color: active ? colors.primary : colors.onSurfaceVariant },
                                active && { fontFamily: typography.bold },
                              ]}
                            >
                              {r.label}
                            </Text>
                            {active && <Icon name="check" size={16} color={colors.primary} />}
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>

                <View>
                  <Text style={[styles.label, { color: colors.onSurface }]}>
                    {t('contactEmailOptional', 'Your Contact Email (Optional for updates)')}
                  </Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="name@example.com"
                    placeholderTextColor={colors.outline}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={[
                      styles.input,
                      {
                        borderColor: colors.outlineVariant,
                        backgroundColor: colors.surfaceContainerLow,
                        color: colors.onSurface,
                      },
                    ]}
                  />
                </View>

                <View>
                  <Text style={[styles.label, { color: colors.onSurface }]}>
                    {t('detailsEvidenceDesc', 'Details & Evidence Description')}
                  </Text>
                  <TextInput
                    value={description}
                    onChangeText={(txt) => {
                      setDescription(txt);
                      setError('');
                    }}
                    placeholder={t(
                      'detailsPlaceholder',
                      'Please describe what you discovered or provide registry references...'
                    )}
                    placeholderTextColor={colors.outline}
                    multiline
                    numberOfLines={4}
                    style={[
                      styles.input,
                      styles.textarea,
                      {
                        borderColor: colors.outlineVariant,
                        backgroundColor: colors.surfaceContainerLow,
                        color: colors.onSurface,
                      },
                    ]}
                  />
                  {error ? (
                    <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
                  ) : null}
                </View>

                <View style={styles.actions}>
                  <Pressable
                    onPress={onClose}
                    style={[styles.cancelBtn, { borderColor: colors.outlineVariant }]}
                  >
                    <Text style={[styles.cancelText, { color: colors.onSurfaceVariant }]}>
                      {t('cancel', 'Cancel')}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSubmit}
                    style={[styles.submitBtn, { backgroundColor: colors.secondary }]}
                  >
                    <Text style={[styles.submitText, { color: colors.onSecondary }]}>
                      {t('submitReportBtn', 'Submit Report')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  sheet: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '88%',
    borderRadius: 20,
    borderWidth: 1,
    ...shadow.floating,
  },
  body: { padding: 20, gap: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  headerIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontFamily: typography.bold },
  subtitle: { fontSize: 11, marginTop: 1, maxWidth: 220 },
  closeBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  success: { paddingVertical: 28, alignItems: 'center', gap: 8 },
  successIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 16, fontFamily: typography.bold },
  successSub: { fontSize: 12, textAlign: 'center', lineHeight: 18, maxWidth: 300 },
  label: { fontSize: 12, fontFamily: typography.semibold, marginBottom: 5 },
  select: {
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  selectText: { fontSize: 12, flex: 1 },
  dropdown: { marginTop: 4, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  dropdownRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dropdownText: { fontSize: 12, flex: 1 },
  input: {
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
  },
  textarea: { minHeight: 88, textAlignVertical: 'top' },
  error: { fontSize: 11, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, paddingTop: 2 },
  cancelBtn: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: 12, fontFamily: typography.semibold },
  submitBtn: { flex: 1, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 12, fontFamily: typography.bold },
});
