import React, { useCallback, useEffect, useState } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { AdminDataTable } from '../components/AdminDataTable';
import {
  toolbarClass,
  toolbarSearchClass,
  toolbarSelectClass,
  toolbarButtonClass,
  rowButtonClass,
  rowButtonDangerClass,
} from '../components/AdminToolbar';
import { adminJson, adminFetch, apiErrorMessage } from '../lib/adminApi';
import { useToast } from '../context/ToastContext';

interface BrokerRow {
  id: string;
  name: string;
  title: string;
  titleSo: string;
  avatar: string | null;
  rating: number;
  reviewsCount: number;
  deals: number;
  trustScore: number;
  tier: string | null;
  responseTime: string | null;
  licenseNumber: string | null;
  licenseAuthority: string | null;
  verificationStatus: string;
  languages: string[];
  coverage: string | null;
  countryCode: string | null;
  diasporaCoverage: string | null;
  isOnline: boolean;
  ownerId: string | null;
  createdAt: string;
}

interface BrokersResponse {
  brokers: BrokerRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const STATUS_OPTIONS = [
  'not_submitted',
  'submitted',
  'in_review',
  'more_info_required',
  'approved',
  'rejected',
  'expired',
  'revoked',
] as const;

const COUNTRY_OPTIONS = [
  { value: 'SO', label: 'Somalia' },
  { value: 'KE', label: 'Kenya' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
  { value: 'TR', label: 'Turkey' },
];

interface FormState {
  name: string;
  title: string;
  titleSo: string;
  avatar: string;
  licenseNumber: string;
  licenseAuthority: string;
  coverage: string;
  diasporaCoverage: string;
  countryCode: string;
  verificationStatus: string;
  languages: string;
  rating: string;
  reviewsCount: string;
  deals: string;
  trustScore: string;
  responseTime: string;
  tier: string;
  isOnline: boolean;
  ownerEmail: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  title: '',
  titleSo: '',
  avatar: '',
  licenseNumber: '',
  licenseAuthority: '',
  coverage: '',
  diasporaCoverage: '',
  countryCode: 'SO',
  verificationStatus: 'submitted',
  languages: '',
  rating: '0',
  reviewsCount: '0',
  deals: '0',
  trustScore: '0',
  responseTime: '',
  tier: '',
  isOnline: true,
  ownerEmail: '',
};

const formFromBroker = (b: BrokerRow): FormState => ({
  name: b.name ?? '',
  title: b.title ?? '',
  titleSo: b.titleSo ?? '',
  avatar: b.avatar ?? '',
  licenseNumber: b.licenseNumber ?? '',
  licenseAuthority: b.licenseAuthority ?? '',
  coverage: b.coverage ?? '',
  diasporaCoverage: b.diasporaCoverage ?? '',
  countryCode: b.countryCode ?? 'SO',
  verificationStatus: b.verificationStatus ?? 'submitted',
  languages: (b.languages ?? []).join(', '),
  rating: String(b.rating ?? 0),
  reviewsCount: String(b.reviewsCount ?? 0),
  deals: String(b.deals ?? 0),
  trustScore: String(b.trustScore ?? 0),
  responseTime: b.responseTime ?? '',
  tier: b.tier ?? '',
  isOnline: Boolean(b.isOnline),
  ownerEmail: '',
});

const inputClass =
  'w-full px-3 py-2 text-sm rounded-xl border border-outline-variant/40 bg-surface text-on-surface outline-none focus:ring-2 focus:ring-primary/50';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="flex flex-col gap-1">
    <span className="text-[10px] font-bold text-outline uppercase tracking-wide">{label}</span>
    {children}
  </label>
);

export const AdminBrokersScreen: React.FC = () => {
  const toast = useToast();
  const [data, setData] = useState<BrokersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<BrokerRow | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<BrokerRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);
      setData(await adminJson<BrokersResponse>(`/api/admin/brokers?${params}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load brokers.');
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEdit = (b: BrokerRow) => {
    setEditing(b);
    setForm(formFromBroker(b));
    setFormError(null);
    setIsFormOpen(true);
  };

  const set = (key: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    if (!form.name.trim()) {
      setFormError('Broker name is required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        title: form.title.trim(),
        titleSo: form.titleSo.trim(),
        avatar: form.avatar.trim(),
        licenseNumber: form.licenseNumber.trim(),
        licenseAuthority: form.licenseAuthority.trim(),
        coverage: form.coverage.trim(),
        diasporaCoverage: form.diasporaCoverage.trim(),
        countryCode: form.countryCode,
        verificationStatus: form.verificationStatus,
        languages: form.languages,
        rating: form.rating,
        reviewsCount: form.reviewsCount,
        deals: form.deals,
        trustScore: form.trustScore,
        responseTime: form.responseTime.trim(),
        tier: form.tier.trim(),
        isOnline: form.isOnline,
      };
      // Blank means "leave the current account link untouched" when editing.
      if (!editing || form.ownerEmail.trim()) {
        payload.ownerEmail = form.ownerEmail.trim();
      }

      const res = await adminFetch(
        editing ? `/api/admin/brokers/${editing.id}` : '/api/admin/brokers',
        { method: editing ? 'PUT' : 'POST', body: JSON.stringify(payload) }
      );
      if (!res.ok) throw new Error(await apiErrorMessage(res, 'Save failed.'));
      toast.success(editing ? `Updated ${payload.name}.` : `Added ${payload.name} to the directory.`);
      setIsFormOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setActionBusy(true);
    setDeleteError(null);
    try {
      const res = await adminFetch(`/api/admin/brokers/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await apiErrorMessage(res, 'Delete failed.'));
      toast.success(`Deleted ${deleteTarget.name}.`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className={toolbarClass}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search brokers by name…"
          aria-label="Search brokers"
          className={toolbarSearchClass}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by verification status"
          className={toolbarSelectClass}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <button onClick={openCreate} className={toolbarButtonClass}>
          + Add Broker
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-error-container/20 border border-error/30 text-sm text-error">
          <span className="material-symbols-outlined text-lg">error</span>
          {error}
        </div>
      )}

      <AdminDataTable
        data={data?.brokers ?? []}
        loading={loading}
        minWidth="880px"
        emptyIcon="badge"
        emptyMessage="No brokers yet. Add one to populate the Dilaalo Directory."
        columns={[
          {
            key: 'broker',
            label: 'Broker',
            render: (b: BrokerRow) => (
              <div className="flex items-center gap-2.5 min-w-0">
                {b.avatar ? (
                  <img src={b.avatar} alt={b.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                    {b.name.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-on-surface truncate">{b.name}</p>
                  <p className="text-[10px] text-outline truncate">
                    {b.title}
                    {b.ownerId ? ' • linked account' : ' • directory only'}
                  </p>
                </div>
              </div>
            ),
          },
          {
            key: 'license',
            label: 'License',
            render: (b: BrokerRow) => (
              <div className="text-xs text-on-surface-variant">
                <p className="truncate max-w-[140px]">{b.licenseNumber || '—'}</p>
                <p className="text-[10px] text-outline truncate max-w-[140px]">{b.licenseAuthority || ''}</p>
              </div>
            ),
          },
          {
            key: 'coverage',
            label: 'Coverage',
            render: (b: BrokerRow) => (
              <div className="text-xs text-on-surface-variant max-w-[160px]">
                <p className="truncate">{b.coverage || '—'}</p>
                <p className="text-[10px] text-outline truncate">{b.diasporaCoverage || ''}</p>
              </div>
            ),
          },
          { key: 'country', label: 'Country', render: (b: BrokerRow) => <span className="text-xs">{b.countryCode || '—'}</span> },
          {
            key: 'status',
            label: 'Status',
            render: (b: BrokerRow) => <StatusBadge status={b.verificationStatus} />,
          },
          {
            key: 'online',
            label: 'Online',
            render: (b: BrokerRow) => (
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${b.isOnline ? 'text-success' : 'text-outline'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${b.isOnline ? 'bg-success' : 'bg-outline'}`} />
                {b.isOnline ? 'Online' : 'Offline'}
              </span>
            ),
          },
        ]}
        actions={(b: BrokerRow) => (
          <>
            <button onClick={() => openEdit(b)} className={rowButtonClass}>
              Edit
            </button>
            <button
              onClick={() => {
                setDeleteTarget(b);
                setDeleteError(null);
              }}
              className={rowButtonDangerClass}
            >
              Delete
            </button>
          </>
        )}
        footer={
          data && (
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPageChange={setPage} busy={loading} />
          )
        }
      />

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-surface rounded-2xl border border-outline-variant/25 shadow-xl max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-outline-variant/25">
              <h3 className="text-sm font-bold text-on-surface">{editing ? 'Edit Broker' : 'Add Broker'}</h3>
              <p className="text-xs text-outline mt-1">
                {editing
                  ? 'Changes appear in the app Dilaalo Directory.'
                  : 'New cards appear in the app Dilaalo Directory immediately.'}
              </p>
            </div>

            <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Name *">
                <input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Ahmed Ali" />
              </Field>
              <Field label="Professional title">
                <input className={inputClass} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Licensed Land Broker" />
              </Field>
              <Field label="Title (Somali)">
                <input className={inputClass} value={form.titleSo} onChange={(e) => set('titleSo', e.target.value)} placeholder="e.g. Dilaali Dhul" />
              </Field>
              <Field label="Avatar image URL">
                <input className={inputClass} value={form.avatar} onChange={(e) => set('avatar', e.target.value)} placeholder="https://..." />
              </Field>
              <Field label="License number">
                <input className={inputClass} value={form.licenseNumber} onChange={(e) => set('licenseNumber', e.target.value)} />
              </Field>
              <Field label="License authority">
                <input className={inputClass} value={form.licenseAuthority} onChange={(e) => set('licenseAuthority', e.target.value)} />
              </Field>
              <Field label="Coverage (areas)">
                <input className={inputClass} value={form.coverage} onChange={(e) => set('coverage', e.target.value)} placeholder="e.g. Hodhan, Wadajir" />
              </Field>
              <Field label="Diaspora coverage">
                <input className={inputClass} value={form.diasporaCoverage} onChange={(e) => set('diasporaCoverage', e.target.value)} placeholder="e.g. UK, USA, UAE" />
              </Field>
              <Field label="Country">
                <select className={inputClass} value={form.countryCode} onChange={(e) => set('countryCode', e.target.value)}>
                  {COUNTRY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Verification status">
                <select className={inputClass} value={form.verificationStatus} onChange={(e) => set('verificationStatus', e.target.value)}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </Field>
              <Field label="Languages (comma separated)">
                <input className={inputClass} value={form.languages} onChange={(e) => set('languages', e.target.value)} placeholder="Somali, Arabic, English" />
              </Field>
              <Field label="Response time">
                <input className={inputClass} value={form.responseTime} onChange={(e) => set('responseTime', e.target.value)} placeholder="e.g. ~15 min" />
              </Field>
              <Field label="Rating (0-5)">
                <input className={inputClass} type="number" min={0} max={5} step="0.1" value={form.rating} onChange={(e) => set('rating', e.target.value)} />
              </Field>
              <Field label="Reviews">
                <input className={inputClass} type="number" min={0} value={form.reviewsCount} onChange={(e) => set('reviewsCount', e.target.value)} />
              </Field>
              <Field label="Closed deals">
                <input className={inputClass} type="number" min={0} value={form.deals} onChange={(e) => set('deals', e.target.value)} />
              </Field>
              <Field label="Trust score (0-100)">
                <input className={inputClass} type="number" min={0} max={100} value={form.trustScore} onChange={(e) => set('trustScore', e.target.value)} />
              </Field>
              <Field label="Tier">
                <input className={inputClass} value={form.tier} onChange={(e) => set('tier', e.target.value)} placeholder="e.g. Gold" />
              </Field>
              <Field label={editing ? 'Linked account email (blank = keep)' : 'Linked account email (optional)'}>
                <input
                  className={inputClass}
                  value={form.ownerEmail}
                  onChange={(e) => set('ownerEmail', e.target.value)}
                  placeholder="seller@example.com"
                />
              </Field>
              <label className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant sm:col-span-2">
                <input type="checkbox" checked={form.isOnline} onChange={(e) => set('isOnline', e.target.checked)} />
                Show as online now
              </label>
              <p className="text-[10px] text-outline sm:col-span-2">
                Linking an existing account lets that user receive and reply to buyer messages from the app Chat tab.
              </p>
            </div>

            {formError && (
              <div className="mx-5 mb-1 flex items-center gap-2 p-2.5 rounded-lg bg-error-container/20 border border-error/30 text-xs text-error">
                <span className="material-symbols-outlined text-sm">error</span>
                {formError}
              </div>
            )}

            <div className="flex gap-2 px-5 py-4 border-t border-outline-variant/25">
              <button
                onClick={() => setIsFormOpen(false)}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-outline hover:bg-surface-container-high"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-primary text-on-primary hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Broker'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface rounded-2xl border border-outline-variant/25 shadow-xl">
            <div className="px-5 py-4 border-b border-outline-variant/25">
              <h3 className="text-sm font-bold text-error">Delete Broker?</h3>
              <p className="text-xs text-outline mt-1">
                {deleteTarget.name} will be removed from the Dilaalo Directory. This cannot be undone.
              </p>
            </div>
            <div className="p-5">
              {deleteError && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-error-container/20 border border-error/30 text-xs text-error">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {deleteError}
                </div>
              )}
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-outline-variant/25">
              <button
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError(null);
                }}
                disabled={actionBusy}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-outline hover:bg-surface-container-high"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={actionBusy}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-error hover:opacity-90 disabled:opacity-50"
              >
                {actionBusy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
