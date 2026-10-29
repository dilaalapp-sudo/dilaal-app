import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { VerificationEvidence, VerificationStatus } from '../types';

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
  const [isDownloaded, setIsDownloaded] = useState(false);
  const primaryEvidence = evidence?.[0];
  const isAuditVerified = isVerified === true || verificationStatus === 'approved';
  const notOnFile = t('notOnFile', 'Not on file');
  const resolvedRegistryNumber = registryNumber || notOnFile;
  const resolvedAuthority = primaryEvidence?.issuerAuthority || issuingAuthority || notOnFile;
  const resolvedAuditedBy = primaryEvidence?.verifiedBy || notOnFile;
  const resolvedVerifiedAt = primaryEvidence?.verifiedAt || notOnFile;
  const resolvedDocumentRef = primaryEvidence?.documentRef || notOnFile;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md max-h-[88vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold">
              <span className="material-symbols-outlined text-[22px]">verified</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Title Registry Audit Record</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{resolvedAuthority}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Certificate Card */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-emerald-500/30 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">
                {isAuditVerified ? 'Audited Registry Filing' : 'Registry Record'}
              </span>
              <h4 className="text-base font-bold text-slate-900 dark:text-white font-mono">{resolvedRegistryNumber}</h4>
            </div>
            {isAuditVerified && (
              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                Audit Verified
              </span>
            )}
          </div>

          <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex justify-between border-b border-slate-200 dark:border-slate-700/60 pb-1.5">
              <span className="text-slate-500 dark:text-slate-400">Target Asset:</span>
              <span className="font-semibold text-right truncate max-w-[200px]">{propertyTitle || notOnFile}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 dark:border-slate-700/60 pb-1.5">
              <span className="text-slate-500 dark:text-slate-400">Issuing Registry:</span>
              <span className="font-semibold">{resolvedAuthority}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 dark:border-slate-700/60 pb-1.5">
              <span className="text-slate-500 dark:text-slate-400">Audited By:</span>
              <span className="font-semibold">{resolvedAuditedBy}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 dark:border-slate-700/60 pb-1.5">
              <span className="text-slate-500 dark:text-slate-400">Verification Date:</span>
              <span className="font-semibold">{resolvedVerifiedAt}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Evidence Reference:</span>
              <span className="font-mono text-emerald-700 dark:text-emerald-400">{resolvedDocumentRef}</span>
            </div>
          </div>

          {primaryEvidence?.notes && (
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 text-[11px] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
              <span className="font-semibold text-slate-900 dark:text-white block mb-0.5">Auditor Notes:</span>
              {primaryEvidence.notes}
            </div>
          )}

          {/* Evidence-Based Disclosure Notice */}
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-2">
            <span className="material-symbols-outlined text-amber-700 dark:text-amber-400 text-[18px] shrink-0 mt-0.5">info</span>
            <p className="text-[10px] text-amber-800 dark:text-amber-300 leading-relaxed">
              <strong>Evidence-Based Disclosure:</strong> This view only reflects registry evidence uploaded for this listing. Buyers are advised to engage independent legal counsel prior to closing.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
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
            const blob = new Blob([JSON.stringify(auditReport, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `DILAAL-AUDIT-DEED-${registryNumber.replace(/[^a-zA-Z0-9]/g, '') || 'UNFILED'}.json`;
            a.click();
            URL.revokeObjectURL(url);

            setIsDownloaded(true);
            setTimeout(() => {
              onClose();
            }, 1200);
          }}
          className={`w-full py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            isDownloaded
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">
            {isDownloaded ? 'task_alt' : 'download'}
          </span>
          <span>{isDownloaded ? 'Record Saved' : 'Download Record (.json)'}</span>
        </button>
      </div>
    </div>
  );
};
