import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const LegalPrivacyScreen: React.FC = () => {
  const { deleteAccountData, exportAccountData, setCurrentScreen } = useApp();
  const [activeSection, setActiveSection] = useState<'terms' | 'privacy' | 'datasafety' | 'account'>('terms');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleted, setIsDeleted] = useState(false);
  const [dataError, setDataError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleExportData = async () => {
    setDataError('');
    setBusy(true);
    try {
      const jsonStr = await exportAccountData();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dilaal-user-data-export-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setDataError('Could not export your data. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText !== 'DELETE' || busy) return;
    setDataError('');
    setBusy(true);
    const result = await deleteAccountData();
    setBusy(false);
    if (!result.success) {
      setDataError(result.error || 'Could not delete the account. Please try again.');
      return;
    }
    setIsDeleted(true);
    setTimeout(() => {
      setShowDeleteConfirm(false);
      setCurrentScreen('home');
    }, 2000);
  };

  return (
    <div className="flex-1 flex flex-col w-full pb-24 sm:pb-12 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      {/* Header */}
      <div className="bg-slate-900 text-white px-4 py-6 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-emerald-400">gavel</span>
            <h1 className="text-xl font-bold">Legal, Privacy & Compliance Hub</h1>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Governing terms, data safety disclosures, and account privacy rights in compliance with international data protection and Google Play policies.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 mb-6 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveSection('terms')}
            className={`pb-2.5 text-xs font-bold transition-colors border-b-2 cursor-pointer shrink-0 ${
              activeSection === 'terms'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Terms of Service
          </button>
          <button
            onClick={() => setActiveSection('privacy')}
            className={`pb-2.5 text-xs font-bold transition-colors border-b-2 cursor-pointer shrink-0 ${
              activeSection === 'privacy'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Privacy Notice
          </button>
          <button
            onClick={() => setActiveSection('datasafety')}
            className={`pb-2.5 text-xs font-bold transition-colors border-b-2 cursor-pointer shrink-0 ${
              activeSection === 'datasafety'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Google Play Data Safety
          </button>
          <button
            onClick={() => setActiveSection('account')}
            className={`pb-2.5 text-xs font-bold transition-colors border-b-2 cursor-pointer shrink-0 ${
              activeSection === 'account'
                ? 'border-red-600 text-red-600 dark:text-red-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Account & Data Purge
          </button>
        </div>

        {/* Section 1: Terms */}
        {activeSection === 'terms' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">1. Scope of Marketplace Services</h3>
            <p>
              DILAAL is a real estate and permitted asset discovery marketplace. DILAAL does not own, sell, lease, or broker listed properties directly. All advertisements are submitted by property owners, authorized legal representatives, or verified independent brokers.
            </p>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">2. Nature of Title Verification</h3>
            <p>
              The "Deed Verified" indicator confirms that a specific title deed document, boundary survey, or cadastral certificate was submitted and inspected against municipal cadastral archives. <strong>It does not constitute commercial title insurance, an absolute sovereign guarantee, or an indemnity against unrecorded disputes.</strong> Buyers are strongly advised to conduct independent in-person boundary inspections and engage licensed advocates.
            </p>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">3. Transaction & Escrow Pilot Notice</h3>
            <p>
              The transaction milestone tracker provided within this application currently operates under sandbox pilot conditions. Where third-party escrow is used, funds are handled strictly through licensed banking institutions, licensed trust providers, or authorized public notaries in their respective jurisdictions.
            </p>
          </div>
        )}

        {/* Section 2: Privacy */}
        {activeSection === 'privacy' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Privacy Notice & Information Gathering</h3>
            <p>
              We prioritize data minimization. We only collect information strictly required to provide marketplace discovery, prevent fraudulent listings, and facilitate verified communications between parties.
            </p>
            <h4 className="font-bold text-slate-900 dark:text-white">Data We Collect:</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Listing details, photographs, and optional cadastral registry references provided voluntarily by sellers.</li>
              <li>Inquiry messages, offers, and counter-proposals exchanged between users and registered brokers.</li>
              <li>Device preferences (currency selection, interface language, dark mode state).</li>
            </ul>
            <h4 className="font-bold text-slate-900 dark:text-white">Your Legal Rights:</h4>
            <p>
              Users have the right to request a complete machine-readable copy of their data or execute an irreversible purge of their account and activity at any time.
            </p>
          </div>
        )}

        {/* Section 3: Data Safety (Google Play) */}
        {activeSection === 'datasafety' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Google Play Data Safety Declarations</h3>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-0.5">Data Shared with 3rd Parties:</span>
                <p className="text-[11px]">No user data is sold, monetized, or shared with third-party advertising networks.</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-0.5">Data Encryption:</span>
                <p className="text-[11px]">All communications use HTTPS/TLS in transit.</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-0.5">Account Deletion Mechanism:</span>
                <p className="text-[11px]">In-app self-service account deletion and complete data purging is provided below.</p>
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Account & Data Purge */}
        {activeSection === 'account' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-5 text-xs text-slate-700 dark:text-slate-300">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">User Data Rights & Account Management</h3>
              <p className="text-xs text-slate-500 mt-1">
                Exercise your GDPR and Google Play data privacy rights.
              </p>
            </div>

            {/* Export */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">Export Personal Data</h4>
                <p className="text-[11px] text-slate-500">Download a machine-readable JSON archive of your searches, inquiries, and preferences.</p>
              </div>
              <button
                onClick={() => void handleExportData()}
                disabled={busy}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shrink-0 cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                <span>{busy ? 'Preparing…' : 'Download Archive'}</span>
              </button>
            </div>

            {/* Delete Account */}
            <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-red-900 dark:text-red-200">Irreversible Account & Data Deletion</h4>
                <p className="text-[11px] text-red-700 dark:text-red-300">
                  Permanently delete your profile, inquiry threads, saved favorites, and local identifiers.
                </p>
              </div>
              <button
                onClick={() => {
                  setDeleteConfirmationText('');
                  setShowDeleteConfirm(true);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shrink-0 cursor-pointer"
              >
                Delete Account
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 shadow-2xl border border-red-200 dark:border-red-900 animate-in zoom-in-95">
            {isDeleted ? (
              <div className="py-6 text-center">
                <span className="material-symbols-outlined text-4xl text-emerald-600 mb-2">check_circle</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Account Data Purged</h3>
                <p className="text-xs text-slate-500 mt-1">Returning to public marketplace view...</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
                  <span className="material-symbols-outlined">warning</span>
                  <h3 className="text-base font-bold">Confirm Complete Data Deletion</h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  This action cannot be undone. All your locally cached preferences, saved properties, inquiry records, and role states will be permanently deleted immediately.
                </p>
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Type <strong className="text-red-600">DELETE</strong> to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmationText}
                    onChange={(e) => setDeleteConfirmationText(e.target.value)}
                    placeholder="DELETE"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                {dataError ? (
                  <p className="text-xs text-red-600 dark:text-red-400 mb-3">{dataError}</p>
                ) : null}
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => void handleDeleteAccount()}
                    disabled={deleteConfirmationText !== 'DELETE' || busy}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl text-white cursor-pointer ${
                      deleteConfirmationText === 'DELETE' && !busy
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-red-300 dark:bg-red-950 cursor-not-allowed'
                    }`}
                  >
                    {busy ? 'Deleting…' : 'Purge All Data'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
