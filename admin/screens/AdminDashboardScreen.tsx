import React, { useCallback, useEffect, useState } from 'react';
import { AdminStatCard } from '../components/AdminStatCard';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { adminJson } from '../lib/adminApi';

/** GET /api/admin/stats response (camelCase — see server.ts). */
interface DashboardStats {
  totalUsers: number;
  totalListings: number;
  listingsPending: number;
  listingsPublished: number;
  listingsFlaggedRemoved: number;
  totalBusinesses: number;
  pendingBusinessVerification: number;
  recentListings: { id: string; title: string; moderationStatus: string; createdAt: string }[];
  recentUsers: { id: string; name: string | null; role: string; createdAt: string }[];
  generatedAt: string;
}

const MODERATION_SEGMENTS = [
  { key: 'listingsPublished', label: 'Published', color: 'bg-success' },
  { key: 'listingsPending', label: 'Under review', color: 'bg-pending' },
  { key: 'listingsFlaggedRemoved', label: 'Flagged / Removed', color: 'bg-error' },
] as const;

export const AdminDashboardScreen: React.FC<{ onNavigate?: (screen: string) => void }> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setStats(await adminJson<DashboardStats>('/api/admin/stats'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statistics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-[76px] sm:h-28 rounded-2xl bg-surface-container animate-pulse" />
          ))}
        </div>
        <LoadingSkeleton height="320" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="material-symbols-outlined text-[40px] text-outline mb-3">cloud_off</span>
        <p className="text-sm text-on-surface-variant">{error ?? 'No data available.'}</p>
        <button onClick={load} className="mt-4 px-4 py-2 rounded-xl text-sm font-bold bg-primary text-on-primary hover:bg-primary/90">
          Retry
        </button>
      </div>
    );
  }

  const moderationTotal = Math.max(1, stats.listingsPublished + stats.listingsPending + stats.listingsFlaggedRemoved);
  const pct = (n: number) => `${Math.round((n / moderationTotal) * 100)}%`;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <AdminStatCard title="Total Users" value={stats.totalUsers} icon="people" onClick={() => onNavigate?.('users')} />
        <AdminStatCard title="Total Listings" value={stats.totalListings} icon="inventory" onClick={() => onNavigate?.('listings')} />
        <AdminStatCard title="Pending Approvals" value={stats.listingsPending} icon="pending_actions" onClick={() => onNavigate?.('listings')} />
        <AdminStatCard title="Published" value={stats.listingsPublished} icon="verified" onClick={() => onNavigate?.('listings')} />
        <AdminStatCard title="Businesses" value={stats.totalBusinesses} icon="storefront" onClick={() => onNavigate?.('businesses')} />
        <AdminStatCard title="Pending Verifications" value={stats.pendingBusinessVerification} icon="badge" onClick={() => onNavigate?.('businesses')} />
        <AdminStatCard title="Flagged / Removed" value={stats.listingsFlaggedRemoved} icon="report" onClick={() => onNavigate?.('listings')} />
        <AdminStatCard title="Admin Actions (24h)" value="—" icon="history" subtitle="See Audit Logs" onClick={() => onNavigate?.('audit-logs')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Moderation breakdown chart (real data, pure CSS — no chart dependency) */}
        <div className="bg-surface-container rounded-2xl border border-outline-variant/25 p-5">
          <h3 className="text-sm font-bold text-on-surface mb-4">Listing Moderation Breakdown</h3>
          <div className="flex h-4 rounded-full overflow-hidden mb-4 bg-surface-container-high">
            {MODERATION_SEGMENTS.map((seg) => {
              const value = stats[seg.key];
              if (value <= 0) return null;
              return <div key={seg.key} className={`${seg.color} transition-all`} style={{ width: pct(value) }} title={`${seg.label}: ${value}`} />;
            })}
          </div>
          <div className="space-y-2">
            {MODERATION_SEGMENTS.map((seg) => (
              <div key={seg.key} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-on-surface-variant">
                  <span className={`w-2.5 h-2.5 rounded-sm ${seg.color}`} />
                  {seg.label}
                </span>
                <span className="font-bold text-on-surface">
                  {stats[seg.key]} <span className="text-outline font-medium">({pct(stats[seg.key])})</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent users */}
        <div className="bg-surface-container rounded-2xl border border-outline-variant/25 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-on-surface">Newest Users</h3>
            <button onClick={() => onNavigate?.('users')} className="text-xs font-bold text-primary hover:underline">
              View all
            </button>
          </div>
          {stats.recentUsers.length === 0 ? (
            <p className="text-xs text-outline py-6 text-center">No users yet.</p>
          ) : (
            <div className="divide-y divide-outline-variant/10">
              {stats.recentUsers.slice(0, 6).map((u) => (
                <div key={u.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-on-surface truncate">{u.name ?? 'Unnamed'}</p>
                    <p className="text-[10px] text-outline">{new Date(u.createdAt).toLocaleDateString()}</p>
                  </div>
                  <StatusBadge status={u.role} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent listings */}
      <div className="bg-surface-container rounded-2xl border border-outline-variant/25 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-on-surface">Recent Listings</h3>
          <button onClick={() => onNavigate?.('listings')} className="text-xs font-bold text-primary hover:underline">
            Moderate →
          </button>
        </div>
        {stats.recentListings.length === 0 ? (
          <p className="text-xs text-outline py-6 text-center">No listings yet.</p>
        ) : (
          <div className="divide-y divide-outline-variant/10">
            {stats.recentListings.slice(0, 6).map((l) => (
              <div key={l.id} className="flex items-center justify-between py-2.5 gap-3">
                <p className="text-xs font-semibold text-on-surface truncate">{l.title}</p>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={l.moderationStatus} />
                  <span className="text-[10px] text-outline hidden sm:inline">{new Date(l.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

