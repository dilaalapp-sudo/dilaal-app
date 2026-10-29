import React, { useCallback, useEffect, useState } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { adminJson, adminFetch, apiErrorMessage } from '../lib/adminApi';
import { useToast } from '../context/ToastContext';

interface ListingDetail {
  id: string;
  appRef: string | null;
  title: string;
  price: number;
  currency: string;
  priceType: string;
  category: string;
  image: string | null;
  gallery: string[] | null;
  location: string | null;
  locationDetails: string | null;
  description: string | null;
  moderationStatus: string;
  verificationStatus: string;
  reportsCount: number;
  createdAt: string;
  updatedAt: string | null;
  ownerId: string;
  ownerName: string;
  ownerEmail: string | null;
  brokerId: string | null;
}

type ModerationAction = 'approve' | 'reject' | 'flag' | 'remove';

const ACTION_META: Record<ModerationAction, { label: string; danger: boolean; reasonRequired: boolean }> = {
  approve: { label: 'Approve & Publish', danger: false, reasonRequired: false },
  reject: { label: 'Reject', danger: true, reasonRequired: true },
  flag: { label: 'Flag', danger: true, reasonRequired: false },
  remove: { label: 'Remove', danger: true, reasonRequired: true },
};

export const AdminListingDetailScreen: React.FC<{ listingId: string; onBack?: () => void }> = ({ listingId, onBack }) => {
  const toast = useToast();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pendingAction, setPendingAction] = useState<ModerationAction | null>(null);
  const [reason, setReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminJson<{ listing: ListingDetail }>(`/api/admin/listings/${listingId}`);
      setListing(res.listing);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the listing.');
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    load();
  }, [load]);

  const openAction = (action: ModerationAction) => {
    setPendingAction(action);
    setReason('');
    setActionError(null);
  };

  const confirmAction = async () => {
    if (!pendingAction || !listing) return;
    if (ACTION_META[pendingAction].reasonRequired && !reason.trim()) {
      setActionError('A reason is required for this action.');
      return;
    }
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await adminFetch(`/api/admin/listings/${listing.id}/moderate`, {
        method: 'POST',
        body: JSON.stringify({ action: pendingAction, reason: reason.trim() || undefined }),
      });
      if (!res.ok) throw new Error(await apiErrorMessage(res, 'Moderation failed.'));
      toast.success(`Listing ${pendingAction}d successfully.`);
      setPendingAction(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Moderation failed.');
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton height="480" />;
  }

  if (error) {
    return (
      <div className="p-4 text-center text-error">
        {error}
        <button onClick={load} className="mt-2 px-3 py-1.5 text-sm font-bold bg-primary text-on-primary rounded-xl hover:bg-primary/90">
          Retry
        </button>
      </div>
    );
  }

  if (!listing || !onBack) return null;
  return (
    <div className="p-4">
      <div className="flex items-end gap-3">
        <button
          onClick={onBack}
          className="px-4 py-2.5 text-sm font-bold bg-primary text-on-primary rounded-xl hover:bg-primary/90"
        >
          Back to Listings
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-container rounded-2xl border border-outline-variant/25 p-5">
          <div className="flex items-center gap-3 mb-4">
            {listing.image ? (
              <img src={listing.image} alt={listing.title} className="w-16 h-16 rounded-xl object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-surface-container-high flex items-center justify-center">
                <span className="material-symbols-outlined text-outline">house</span>
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-on-surface">{listing.title}</h2>
              <p className="text-xs text-outline">{listing.category}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-outline">Price</span>
              <span className="text-on-surface font-medium">{listing.price.toLocaleString()} {listing.currency}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-outline">Type</span>
              <span className="text-on-surface font-medium">{listing.priceType}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-outline">Location</span>
              <span className="text-on-surface font-medium">{listing.location ?? '-'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-outline">Moderation</span>
              <StatusBadge status={listing.moderationStatus} />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-outline">Verification</span>
              <StatusBadge status={listing.verificationStatus} />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-outline">Reports</span>
              <span className="text-on-surface font-medium">{listing.reportsCount}</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-container rounded-2xl border border-outline-variant/25 p-5">
          <h3 className="text-sm font-bold text-on-surface mb-3">Owner</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-outline">Name</span>
              <span className="text-on-surface">{listing.ownerName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-outline">Email</span>
              <span className="text-on-surface">{listing.ownerEmail ?? '-'}</span>
            </div>
          </div>

          {listing.brokerId && (
            <div className="mt-4 pt-4 border-t border-outline-variant/25">
              <h3 className="text-sm font-bold text-on-surface mb-3">Broker</h3>
              <div className="text-sm text-on-surface">Broker ID: {listing.brokerId}</div>
            </div>
          )}
        </div>
      </div>

      {listing.description && (
        <div className="mt-6 bg-surface-container rounded-2xl border border-outline-variant/25 p-5">
          <h3 className="text-sm font-bold text-on-surface mb-3">Description</h3>
          <p className="text-sm text-outline">{listing.description}</p>
        </div>
      )}

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => openAction('approve')}
          disabled={listing.moderationStatus === 'approved'}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-success text-on-success hover:opacity-90 disabled:opacity-40"
        >
          Approve & Publish
        </button>
        <button
          onClick={() => openAction('reject')}
          disabled={listing.moderationStatus === 'rejected'}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-error text-on-error hover:opacity-90 disabled:opacity-40"
        >
          Reject (requires reason)
        </button>
        <button
          onClick={() => openAction('flag')}
          disabled={listing.moderationStatus === 'flagged'}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-outline-variant/40 text-outline hover:bg-surface-container-high disabled:opacity-40"
        >
          Flag for Review
        </button>
        <button
          onClick={() => openAction('remove')}
          disabled={listing.moderationStatus === 'removed'}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-outline-variant/40 text-outline hover:bg-surface-container-high disabled:opacity-40"
        >
          Remove (requires reason)
        </button>
      </div>

      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface rounded-2xl border border-outline-variant/25 shadow-xl">
            <div className="px-5 py-4 border-b border-outline-variant/25">
              <h3 className={`text-sm font-bold ${ACTION_META[pendingAction].danger ? 'text-error' : 'text-on-surface'}`}>
                {ACTION_META[pendingAction].label}?
              </h3>
              <p className="text-xs text-outline mt-1">"{listing.title}"</p>
            </div>
            <div className="p-5">
              <label className="block text-[11px] font-bold text-outline uppercase mb-1.5">
                Reason {ACTION_META[pendingAction].reasonRequired ? '*' : '(optional)'}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Recorded in the audit log."
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-outline-variant bg-surface text-on-surface outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
              {actionError && (
                <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg bg-error-container/20 border border-error/30 text-xs text-error">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {actionError}
                </div>
              )}
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-outline-variant/25">
              <button
                onClick={() => setPendingAction(null)}
                disabled={actionBusy}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-outline hover:bg-surface-container-high"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                disabled={actionBusy || (ACTION_META[pendingAction].reasonRequired && !reason.trim())}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 ${
                  ACTION_META[pendingAction].danger ? 'bg-error hover:opacity-90' : 'bg-success hover:opacity-90'
                }`}
              >
                {actionBusy ? 'Applying…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};