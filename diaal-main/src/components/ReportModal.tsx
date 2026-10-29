import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ReportCase } from '../types';

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
  const [reason, setReason] = useState<ReportCase['reason']>('fraud_fake_listing');
  const [email, setEmail] = useState(currentUser.email || '');
  const [description, setDescription] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-700 dark:text-amber-400 font-bold">
              <span className="material-symbols-outlined text-[20px]">flag</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('reportConcern', 'Report Concern')}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
                {targetTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {isSubmitted ? (
          <div className="py-8 flex flex-col items-center text-center gap-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">check_circle</span>
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">{t('reportSubmitted', 'Report Submitted')}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
              {t('reportSubmittedSub', 'Thank you for keeping DILAAL safe. Our compliance team will audit the reported evidence.')}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('reasonForReport', 'Reason for Report')}
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ReportCase['reason'])}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="fraud_fake_listing">{t('reasonFraud', 'Suspected Fraudulent / Fake Listing')}</option>
                <option value="ownership_dispute">{t('reasonDispute', 'Boundary or Ownership Dispute')}</option>
                <option value="wrong_price">{t('reasonWrongPrice', 'Inaccurate or Misleading Pricing')}</option>
                <option value="misleading_photos">{t('reasonPhotos', 'Stolen or Misleading Property Photos')}</option>
                <option value="harassment">{t('reasonHarassment', 'Broker Misconduct or Harassment')}</option>
                <option value="other">{t('reasonOther', 'Other Violation')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('contactEmailOptional', 'Your Contact Email (Optional for updates)')}
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('detailsEvidenceDesc', 'Details & Evidence Description')}
              </label>
              <textarea
                rows={3}
                placeholder={t('detailsPlaceholder', 'Please describe what you discovered or provide registry references...')}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setError('');
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
              {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                {t('cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-sm cursor-pointer"
              >
                {t('submitReportBtn', 'Submit Report')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
