import React, { useCallback, useEffect, useState } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSkeletonText } from '../components/LoadingSkeleton';
import { AdminDataTable } from '../components/AdminDataTable';
import { toolbarClass, toolbarButtonClass, rowButtonClass } from '../components/AdminToolbar';
import { adminJson, adminFetch, apiErrorMessage } from '../lib/adminApi';
import { useToast } from '../context/ToastContext';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string | null;
}

interface CategoryDraft {
  id: string | null;
  name: string;
  slug: string;
  description: string;
  sortOrder: string;
}

const EMPTY_DRAFT: CategoryDraft = { id: null, name: '', slug: '', description: '', sortOrder: '0' };

export const AdminCategoriesScreen: React.FC = () => {
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<CategoryDraft | null>(null);
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  const [pendingToggle, setPendingToggle] = useState<Category | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminJson<{ categories: Category[] }>('/api/admin/categories');
      setCategories(res.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setDraft({ ...EMPTY_DRAFT });
    setDraftError(null);
  };

  const openEdit = (c: Category) => {
    setDraft({ id: c.id, name: c.name, slug: c.slug, description: c.description ?? '', sortOrder: String(c.sortOrder) });
    setDraftError(null);
  };

  const saveDraft = async () => {
    if (!draft) return;
    if (!draft.name.trim() || !draft.slug.trim()) {
      setDraftError('Name and slug are required.');
      return;
    }
    setDraftBusy(true);
    setDraftError(null);
    try {
      const payload = {
        name: draft.name.trim(),
        slug: draft.slug.trim(),
        description: draft.description.trim() || undefined,
        sortOrder: Number(draft.sortOrder) || 0,
      };
      const res = draft.id
        ? await adminFetch(`/api/admin/categories/${draft.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        : await adminFetch('/api/admin/categories', { method: 'POST', body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to save the category.'));
      toast.success(draft.id ? 'Category updated.' : 'Category created.');
      setDraft(null);
      await load();
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Failed to save the category.');
    } finally {
      setDraftBusy(false);
    }
  };

  const setActive = async (c: Category, isActive: boolean) => {
    setConfirmBusy(true);
    try {
      const res = await adminFetch(`/api/admin/categories/${c.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: isActive }),
      });
      if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to update the category.'));
      toast.success(`"${c.name}" ${isActive ? 'activated' : 'deactivated'}.`);
      setPendingToggle(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update the category.');
    } finally {
      setConfirmBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <LoadingSkeletonText lines={5} />
      </div>
    );
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

  return (
    <div>
      <div className="flex flex-col gap-4">
        <div className={toolbarClass}>
          <button onClick={openCreate} className={toolbarButtonClass}>
            + Create Category
          </button>
        </div>

        <AdminDataTable
          data={categories}
          minWidth="640px"
          emptyIcon="category"
          emptyMessage="No categories found."
          columns={[
            {
              key: 'name',
              label: 'Name',
              render: (c: Category) => (
                <div>
                  <div className="font-semibold text-on-surface">{c.name}</div>
                  <div className="text-xs text-outline">
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '-'}
                  </div>
                </div>
              ),
            },
            { key: 'slug', label: 'Slug', render: (c: Category) => <span className="font-mono text-xs">{c.slug}</span> },
            { key: 'sortOrder', label: 'Sort', render: (c: Category) => c.sortOrder },
            {
              key: 'status',
              label: 'Status',
              render: (c: Category) => <StatusBadge status={c.isActive ? 'active' : 'suspended'} />,
            },
          ]}
          actions={(c: Category) => (
            <>
              <button onClick={() => openEdit(c)} className={rowButtonClass}>
                Edit
              </button>
              <button onClick={() => setPendingToggle(c)} className={rowButtonClass}>
                {c.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </>
          )}
        />
      </div>

      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface rounded-2xl border border-outline-variant/25 shadow-xl">
            <div className="px-5 py-4 border-b border-outline-variant/25">
              <h3 className="text-sm font-bold text-on-surface">{draft.id ? 'Edit Category' : 'Create Category'}</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-outline uppercase mb-1.5">Name</label>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. Houses & Villas"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-outline-variant bg-surface text-on-surface outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-outline uppercase mb-1.5">Slug</label>
                <input
                  value={draft.slug}
                  onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                  placeholder="e.g. houses"
                  className="w-full px-3 py-2.5 text-sm font-mono rounded-xl border border-outline-variant bg-surface text-on-surface outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-outline uppercase mb-1.5">Description</label>
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-outline-variant bg-surface text-on-surface outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-outline uppercase mb-1.5">Sort Order</label>
                <input
                  type="number"
                  value={draft.sortOrder}
                  onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-outline-variant bg-surface text-on-surface outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              {draftError && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-error-container/20 border border-error/30 text-xs text-error">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {draftError}
                </div>
              )}
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-outline-variant/25">
              <button
                onClick={() => setDraft(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-outline hover:bg-surface-container-high"
              >
                Cancel
              </button>
              <button
                onClick={saveDraft}
                disabled={draftBusy}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-50"
              >
                {draftBusy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-surface rounded-2xl border border-outline-variant/25 shadow-xl p-5">
            <h3 className={`text-sm font-bold ${pendingToggle.isActive ? 'text-error' : 'text-on-surface'}`}>
              {pendingToggle.isActive ? 'Deactivate Category?' : 'Activate Category?'}
            </h3>
            <p className="text-xs text-outline mt-2">
              {pendingToggle.isActive
                ? `"${pendingToggle.name}" will be hidden from new listings. Existing listings keep their relationship.`
                : `"${pendingToggle.name}" will be available for new listings again.`}
            </p>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setPendingToggle(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-outline hover:bg-surface-container-high"
              >
                Cancel
              </button>
              <button
                onClick={() => setActive(pendingToggle, !pendingToggle.isActive)}
                disabled={confirmBusy}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-on-primary hover:opacity-90 disabled:opacity-50 ${
                  pendingToggle.isActive ? 'bg-error' : 'bg-success'
                }`}
              >
                {confirmBusy ? 'Saving…' : pendingToggle.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};