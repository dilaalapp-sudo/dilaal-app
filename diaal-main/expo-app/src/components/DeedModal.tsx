import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { VerificationEvidence, VerificationStatus } from '../types';
import { Icon } from './Icon';
import { useColors, typography, shadow } from '../theme';

interface DeedModalProps {
  registryNumber: string;
  propertyTitle: string;
  evidence?: VerificationEvidence[];
  issuingAuthority?: string;
  verificationStatus?: VerificationStatus;
  isVerified?: boolean;
  onClose: () => void;
}

export const DeedModal: React.FC<DeedModalProps> = ({
  registryNumber,
  propertyTitle,
  evidence,
  issuingAuthority,
  verificationStatus,
  isVerified,
  onClose,
}) => {
  const { t } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [isDownloaded, setIsDownloaded] = useState(false);

  const primaryEvidence = evidence?.[0];
  const isAuditVerified = isVerified === true || verificationStatus === 'approved';
  const notOnFile = t('notOnFile', 'Not on file');
  const resolvedRegistryNumber = registryNumber || notOnFile;
  const resolvedAuthority = primaryEvidence?.issuerAuthority || issuingAuthority || notOnFile;
  const resolvedAuditedBy = primaryEvidence?.verifiedBy || notOnFile;
  const resolvedVerifiedAt = primaryEvidence?.verifiedAt || notOnFile;
  const resolvedDocumentRef = primaryEvidence?.documentRef || notOnFile;

  const row = (label: string, value: string, mono?: boolean) => (
    <View style={[styles.row, { borderBottomColor: colors.outlineVariant + '55' }]}>
      <Text style={[styles.rowLabel, { color: colors.onSurfaceVariant }]}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          { color: mono ? colors.primary : colors.onSurface },
          mono && { fontFamily: 'monospace' },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );

  const handleDownload = async () => {
    const auditReport = {
      document: 'DILAAL Cadastral & Title Deed Audit Certificate',
      registryNumber,
      propertyTitle,
      issuingAuthority: resolvedAuthority,
      auditedBy: resolvedAuditedBy,
      verificationDate: resolvedVerifiedAt,
      evidenceReference: resolvedDocumentRef,
      auditorNotes: primaryEvidence?.notes || null,
      status: isAuditVerified ? 'Audit Verified' : verificationStatus || 'Not verified',
      generatedAt: new Date().toISOString(),
    };
    try {
      await Share.share({
        title: `DILAAL-AUDIT-DEED-${registryNumber.replace(/[^a-zA-Z0-9]/g, '') || 'UNFILED'}`,
        message: JSON.stringify(auditReport, null, 2),
      });
    } catch {
      // Sharing can be dismissed; the record is still shown on screen.
    }
    setIsDownloaded(true);
    setTimeout(onClose, 1200);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant + '55' },
          ]}
        >
          <ScrollView
            contentContainerStyle={[styles.sheetBody, { paddingBottom: Math.max(insets.bottom, 20) }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.header, { borderBottomColor: colors.surfaceContainer }]}>
              <View style={styles.headerLeft}>
                <View style={[styles.headerIcon, { backgroundColor: colors.primaryFixed }]}>
                  <Icon name="verified" size={22} color={colors.primary} />
                </View>
                <View style={{ flexShrink: 1 }}>
                  <Text style={[styles.title, { color: colors.onSurface }]}>
                    Title Registry Audit Record
                  </Text>
                  <Text style={[styles.subtitle, { color: colors.outline }]} numberOfLines={1}>
                    {resolvedAuthority}
                  </Text>
                </View>
              </View>
              <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceContainer }]}>
                <Icon name="close" size={14} color={colors.outline} />
              </Pressable>
            </View>

            <View
              style={[
                styles.certCard,
                { backgroundColor: colors.surfaceContainerLow, borderColor: colors.success + '55' },
              ]}
            >
              <View style={styles.certTop}>
                <View style={{ flexShrink: 1 }}>
                  <Text style={[styles.certKicker, { color: colors.primary }]}>
                    {isAuditVerified ? 'Audited Registry Filing' : 'Registry Record'}
                  </Text>
                  <Text style={[styles.certNumber, { color: colors.onSurface }]} numberOfLines={1}>
                    {resolvedRegistryNumber}
                  </Text>
                </View>
                {isAuditVerified && (
                  <View style={[styles.auditPill, { backgroundColor: colors.primaryFixed }]}>
                    <Text style={[styles.auditPillText, { color: colors.primary }]}>Audit Verified</Text>
                  </View>
                )}
              </View>

              <View>
                {row('Target Asset:', propertyTitle || notOnFile)}
                {row('Issuing Registry:', resolvedAuthority)}
                {row('Audited By:', resolvedAuditedBy)}
                {row('Verification Date:', resolvedVerifiedAt)}
                <View style={[styles.row, { borderBottomWidth: 0 }]}>
                  <Text style={[styles.rowLabel, { color: colors.onSurfaceVariant }]}>Evidence Reference:</Text>
                  <Text style={[styles.rowValue, { color: colors.primary, fontFamily: 'monospace' }]} numberOfLines={1}>
                    {resolvedDocumentRef}
                  </Text>
                </View>
              </View>

              {primaryEvidence?.notes ? (
                <View
                  style={[
                    styles.notes,
                    { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant + '55' },
                  ]}
                >
                  <Text style={[styles.notesTitle, { color: colors.onSurface }]}>Auditor Notes:</Text>
                  <Text style={[styles.notesBody, { color: colors.onSurfaceVariant }]}>
                    {primaryEvidence.notes}
                  </Text>
                </View>
              ) : null}

              <View style={[styles.disclosure, { backgroundColor: colors.secondaryFixed + '66', borderColor: colors.secondaryFixedDim }]}>
                <Icon name="info" size={18} color={colors.secondary} />
                <Text style={[styles.disclosureText, { color: colors.onSecondaryFixedVariant }]}>
                  <Text style={{ fontFamily: typography.bold }}>Evidence-Based Disclosure: </Text>
                  This view only reflects registry evidence uploaded for this listing. Buyers are advised
                  to engage independent legal counsel prior to closing.
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleDownload}
              style={[styles.downloadBtn, { backgroundColor: isDownloaded ? colors.success : colors.primary }]}
            >
              <Icon name={isDownloaded ? 'task_alt' : 'download'} size={16} color={colors.onPrimary} />
              <Text style={[styles.downloadText, { color: colors.onPrimary }]}>
                {isDownloaded ? 'Record Saved' : 'Download Record (.json)'}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
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
  sheetBody: { padding: 20, gap: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 14, fontFamily: typography.bold },
  subtitle: { fontSize: 11, marginTop: 1 },
  closeBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  certCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  certTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  certKicker: { fontSize: 10, fontFamily: typography.bold, textTransform: 'uppercase', letterSpacing: 0.6 },
  certNumber: { fontSize: 16, fontFamily: 'monospace', marginTop: 2 },
  auditPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  auditPillText: { fontSize: 10, fontFamily: typography.bold },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  rowLabel: { fontSize: 12 },
  rowValue: { fontSize: 12, fontFamily: typography.semibold, flexShrink: 1, textAlign: 'right' },
  notes: { borderRadius: 10, borderWidth: 1, padding: 10 },
  notesTitle: { fontSize: 11, fontFamily: typography.semibold, marginBottom: 2 },
  notesBody: { fontSize: 11, lineHeight: 16 },
  disclosure: { flexDirection: 'row', gap: 8, borderRadius: 10, borderWidth: 1, padding: 10 },
  disclosureText: { fontSize: 10, lineHeight: 15, flex: 1 },
  downloadBtn: {
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  downloadText: { fontSize: 12, fontFamily: typography.bold },
});
