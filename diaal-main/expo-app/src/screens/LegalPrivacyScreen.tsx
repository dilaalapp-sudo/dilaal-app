import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Share,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { Icon } from '../components/Icon';
import { useColors, typography, shadow, Palette } from '../theme';

type Section = 'terms' | 'privacy' | 'datasafety' | 'account';

const makeStyles = (colors: Palette, isDark: boolean) => {
  const page = isDark ? '#020617' : '#f8fafc';
  const card = isDark ? '#0f172a' : '#ffffff';
  const border = isDark ? '#1e293b' : '#e2e8f0';
  const text = isDark ? '#ffffff' : '#0f172a';
  const muted = isDark ? '#94a3b8' : '#334155';
  const soft = isDark ? '#1e293b' : '#f8fafc';

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: page },
    header: { backgroundColor: '#0f172a', paddingHorizontal: 16, paddingVertical: 22 },
    headerInner: { width: '100%', maxWidth: 896, alignSelf: 'center', gap: 4 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { fontSize: 20, fontFamily: typography.bold, color: '#ffffff', flexShrink: 1 },
    headerSub: { fontSize: 12, color: '#94a3b8', lineHeight: 18, maxWidth: 560 },
    body: { width: '100%', maxWidth: 896, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 24, paddingBottom: 96 },
    tabsRow: {
      flexDirection: 'row',
      gap: 16,
      borderBottomWidth: 1,
      borderBottomColor: border,
      marginBottom: 24,
    },
    tab: { paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: '#059669' },
    tabDangerActive: { borderBottomColor: '#dc2626' },
    tabText: { fontSize: 12, fontFamily: typography.bold, color: muted },
    tabTextActive: { color: isDark ? '#34d399' : '#047857' },
    tabTextDangerActive: { color: isDark ? '#f87171' : '#dc2626' },
    sectionCard: {
      backgroundColor: card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: border,
      padding: 24,
      gap: 16,
    },
    h3: { fontSize: 15, fontFamily: typography.bold, color: text },
    h4: { fontSize: 12, fontFamily: typography.bold, color: text },
    p: { fontSize: 12, lineHeight: 20, color: muted },
    strong: { fontFamily: typography.bold, color: text },
    bullet: { flexDirection: 'row', gap: 6, paddingLeft: 4 },
    bulletMark: { fontSize: 12, color: muted },
    bulletText: { flex: 1, fontSize: 12, lineHeight: 19, color: muted },
    safetyItem: {
      padding: 12,
      borderRadius: 12,
      backgroundColor: soft,
      borderWidth: 1,
      borderColor: border,
      gap: 2,
    },
    safetyLabel: { fontSize: 12, fontFamily: typography.bold, color: isDark ? '#34d399' : '#047857' },
    safetyText: { fontSize: 11, lineHeight: 16, color: muted },
    rightsHead: { fontSize: 15, fontFamily: typography.bold, color: text },
    rightsSub: { fontSize: 12, color: isDark ? '#94a3b8' : '#475569', marginTop: 2 },
    actionCard: {
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: border,
      backgroundColor: isDark ? '#1e293b80' : '#f8fafc',
      gap: 12,
    },
    actionTitle: { fontSize: 12, fontFamily: typography.bold, color: text },
    actionText: { fontSize: 11, lineHeight: 16, color: muted },
    exportBtn: {
      alignSelf: 'flex-start',
      backgroundColor: '#0f172a',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    exportText: { fontSize: 12, fontFamily: typography.bold, color: '#ffffff' },
    dangerCard: {
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? '#7f1d1d' : '#fecaca',
      backgroundColor: isDark ? '#450a0a33' : '#fef2f2',
      gap: 12,
    },
    dangerTitle: { fontSize: 12, fontFamily: typography.bold, color: isDark ? '#fecaca' : '#7f1d1d' },
    dangerText: { fontSize: 11, lineHeight: 16, color: isDark ? '#fca5a5' : '#b91c1c' },
    deleteBtn: {
      alignSelf: 'flex-start',
      backgroundColor: '#dc2626',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    deleteText: { fontSize: 12, fontFamily: typography.bold, color: '#ffffff' },
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
      borderColor: '#fecaca',
      padding: 24,
      gap: 14,
      ...shadow.floating,
    },
    modalDangerHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    modalDangerTitle: { fontSize: 16, fontFamily: typography.bold, color: '#dc2626', flexShrink: 1 },
    modalText: { fontSize: 12, lineHeight: 19, color: muted },
    confirmLabel: { fontSize: 12, fontFamily: typography.semibold, color: text },
    confirmInput: {
      borderWidth: 1,
      borderColor: isDark ? '#475569' : '#cbd5e1',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 12,
      color: text,
      backgroundColor: isDark ? '#1e293b' : '#ffffff',
    },
    modalActions: { flexDirection: 'row', gap: 8 },
    cancelBtn: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: border,
      paddingVertical: 10,
      alignItems: 'center',
    },
    cancelText: { fontSize: 12, fontFamily: typography.semibold, color: text },
    purgeBtn: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
    purgeOn: { backgroundColor: '#dc2626' },
    purgeOff: { backgroundColor: isDark ? '#7f1d1d' : '#fca5a5' },
    purgeText: { fontSize: 12, fontFamily: typography.bold, color: '#ffffff' },
    deletedBox: { paddingVertical: 24, alignItems: 'center', gap: 6 },
    deletedTitle: { fontSize: 16, fontFamily: typography.bold, color: text },
    deletedText: { fontSize: 12, color: muted },
  });
};

export const LegalPrivacyScreen: React.FC = () => {
  const { deleteAccountData, exportAccountData, setCurrentScreen, isDarkMode } = useApp();
  const colors = useColors();
  const styles = makeStyles(colors, isDarkMode);

  const [activeSection, setActiveSection] = useState<Section>('terms');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleted, setIsDeleted] = useState(false);

  const handleExportData = async () => {
    const jsonStr = exportAccountData();
    await Share.share({
      title: `dilaal-user-data-export-${new Date().toISOString().split('T')[0]}.json`,
      message: jsonStr,
    });
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmationText !== 'DELETE') return;
    deleteAccountData();
    setIsDeleted(true);
    setTimeout(() => {
      setShowDeleteConfirm(false);
      setCurrentScreen('home');
    }, 2000);
  };

  const tab = (id: Section, label: string, danger = false) => {
    const active = activeSection === id;
    return (
      <Pressable
        key={id}
        onPress={() => setActiveSection(id)}
        style={[styles.tab, active && (danger ? styles.tabDangerActive : styles.tabActive)]}
      >
        <Text
          style={[
            styles.tabText,
            active && (danger ? styles.tabTextDangerActive : styles.tabTextActive),
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerInner}>
            <View style={styles.headerTitleRow}>
              <Icon name="gavel" size={22} color="#34d399" />
              <Text style={styles.headerTitle}>Legal, Privacy & Compliance Hub</Text>
            </View>
            <Text style={styles.headerSub}>
              Governing terms, data safety disclosures, and account privacy rights in compliance
              with international data protection and Google Play policies.
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsRow}
          >
            {tab('terms', 'Terms of Service')}
            {tab('privacy', 'Privacy Notice')}
            {tab('datasafety', 'Google Play Data Safety')}
            {tab('account', 'Account & Data Purge', true)}
          </ScrollView>

          {activeSection === 'terms' ? (
            <View style={styles.sectionCard}>
              <Text style={styles.h3}>1. Scope of Marketplace Services</Text>
              <Text style={styles.p}>
                DILAAL is a real estate and permitted asset discovery marketplace. DILAAL does not
                own, sell, lease, or broker listed properties directly. All advertisements are
                submitted by property owners, authorized legal representatives, or verified
                independent brokers.
              </Text>
              <Text style={styles.h3}>2. Nature of Title Verification</Text>
              <Text style={styles.p}>
                The "Deed Verified" indicator confirms that a specific title deed document, boundary
                survey, or cadastral certificate was submitted and inspected against municipal
                cadastral archives.{' '}
                <Text style={styles.strong}>
                  It does not constitute commercial title insurance, an absolute sovereign
                  guarantee, or an indemnity against unrecorded disputes.
                </Text>{' '}
                Buyers are strongly advised to conduct independent in-person boundary inspections
                and engage licensed advocates.
              </Text>
              <Text style={styles.h3}>3. Transaction & Escrow Pilot Notice</Text>
              <Text style={styles.p}>
                The transaction milestone tracker provided within this application currently
                operates under sandbox pilot conditions. Where third-party escrow is used, funds are
                handled strictly through licensed banking institutions, licensed trust providers, or
                authorized public notaries in their respective jurisdictions.
              </Text>
            </View>
          ) : null}

          {activeSection === 'privacy' ? (
            <View style={styles.sectionCard}>
              <Text style={styles.h3}>Privacy Notice & Information Gathering</Text>
              <Text style={styles.p}>
                We prioritize data minimization. We only collect information strictly required to
                provide marketplace discovery, prevent fraudulent listings, and facilitate verified
                communications between parties.
              </Text>
              <Text style={styles.h4}>Data We Collect:</Text>
              <View style={styles.bullet}>
                <Text style={styles.bulletMark}>•</Text>
                <Text style={styles.bulletText}>
                  Listing details, photographs, and optional cadastral registry references provided
                  voluntarily by sellers.
                </Text>
              </View>
              <View style={styles.bullet}>
                <Text style={styles.bulletMark}>•</Text>
                <Text style={styles.bulletText}>
                  Inquiry messages, offers, and counter-proposals exchanged between users and
                  registered brokers.
                </Text>
              </View>
              <View style={styles.bullet}>
                <Text style={styles.bulletMark}>•</Text>
                <Text style={styles.bulletText}>
                  Device preferences (currency selection, interface language, dark mode state).
                </Text>
              </View>
              <Text style={styles.h4}>Your Legal Rights:</Text>
              <Text style={styles.p}>
                Users have the right to request a complete machine-readable copy of their data or
                execute an irreversible purge of their account and activity at any time.
              </Text>
            </View>
          ) : null}

          {activeSection === 'datasafety' ? (
            <View style={styles.sectionCard}>
              <Text style={styles.h3}>Google Play Data Safety Declarations</Text>
              <View style={styles.safetyItem}>
                <Text style={styles.safetyLabel}>Data Shared with 3rd Parties:</Text>
                <Text style={styles.safetyText}>
                  No user data is sold, monetized, or shared with third-party advertising networks.
                </Text>
              </View>
              <View style={styles.safetyItem}>
                <Text style={styles.safetyLabel}>Data Encryption:</Text>
                <Text style={styles.safetyText}>All communications use HTTPS/TLS in transit.</Text>
              </View>
              <View style={styles.safetyItem}>
                <Text style={styles.safetyLabel}>Account Deletion Mechanism:</Text>
                <Text style={styles.safetyText}>
                  In-app self-service account deletion and complete data purging is provided below.
                </Text>
              </View>
            </View>
          ) : null}

          {activeSection === 'account' ? (
            <View style={styles.sectionCard}>
              <View>
                <Text style={styles.rightsHead}>User Data Rights & Account Management</Text>
                <Text style={styles.rightsSub}>
                  Exercise your GDPR and Google Play data privacy rights.
                </Text>
              </View>

              <View style={styles.actionCard}>
                <View>
                  <Text style={styles.actionTitle}>Export Personal Data</Text>
                  <Text style={styles.actionText}>
                    Download a machine-readable JSON archive of your searches, inquiries, and
                    preferences.
                  </Text>
                </View>
                <Pressable onPress={() => void handleExportData()} style={styles.exportBtn}>
                  <Icon name="download" size={14} color="#ffffff" />
                  <Text style={styles.exportText}>Download Archive</Text>
                </Pressable>
              </View>

              <View style={styles.dangerCard}>
                <View>
                  <Text style={styles.dangerTitle}>Irreversible Account & Data Deletion</Text>
                  <Text style={styles.dangerText}>
                    Permanently delete your profile, inquiry threads, saved favorites, and local
                    identifiers.
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    setDeleteConfirmationText('');
                    setShowDeleteConfirm(true);
                  }}
                  style={styles.deleteBtn}
                >
                  <Text style={styles.deleteText}>Delete Account</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            {isDeleted ? (
              <View style={styles.deletedBox}>
                <Icon name="check_circle" size={40} color="#059669" />
                <Text style={styles.deletedTitle}>Account Data Purged</Text>
                <Text style={styles.deletedText}>Returning to public marketplace view...</Text>
              </View>
            ) : (
              <>
                <View style={styles.modalDangerHead}>
                  <Icon name="warning" size={20} color="#dc2626" />
                  <Text style={styles.modalDangerTitle}>Confirm Complete Data Deletion</Text>
                </View>
                <Text style={styles.modalText}>
                  This action cannot be undone. All your locally cached preferences, saved
                  properties, inquiry records, and role states will be permanently deleted
                  immediately.
                </Text>
                <View>
                  <Text style={styles.confirmLabel}>
                    Type <Text style={{ color: '#dc2626' }}>DELETE</Text> to confirm:
                  </Text>
                  <TextInput
                    value={deleteConfirmationText}
                    onChangeText={setDeleteConfirmationText}
                    placeholder="DELETE"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                    style={styles.confirmInput}
                  />
                </View>
                <View style={styles.modalActions}>
                  <Pressable
                    onPress={() => setShowDeleteConfirm(false)}
                    style={styles.cancelBtn}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleDeleteAccount}
                    disabled={deleteConfirmationText !== 'DELETE'}
                    style={[
                      styles.purgeBtn,
                      deleteConfirmationText === 'DELETE' ? styles.purgeOn : styles.purgeOff,
                    ]}
                  >
                    <Text style={styles.purgeText}>Purge All Data</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};
