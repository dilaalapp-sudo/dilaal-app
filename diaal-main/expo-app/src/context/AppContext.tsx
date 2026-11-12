import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import type { User } from '@supabase/supabase-js';
import {
  PropertyListing,
  Broker,
  ChatMessage,
  EscrowDeal,
  Language,
  Currency,
  CountryCode,
  AreaUnit,
  UserRole,
  VerificationStatus,
  ReportCase,
  SupportTicket,
  SavedSearch,
  AuditLog,
  Milestone,
} from '../types';
import { SUPPORTED_COUNTRIES, EXCHANGE_RATES } from '../data/countries';
import { getTranslation } from '../i18n/translations';
import {
  supabase,
  checkSupabaseHealth,
  fetchSupabaseListings,
  readCachedListings,
  LISTING_PAGE_SIZE,
  fetchSupabaseBrokers,
  fetchSupabaseReports,
  fetchSupabaseAuditLogs,
  insertSupabaseListing,
  insertSupabaseReport,
  insertSupabaseAuditLog,
} from '../lib/supabase';
import {
  DEFAULT_MARKETPLACE_CATEGORIES,
  fetchMarketplaceCategories,
  type MarketplaceCategory,
} from '../lib/categories';
import {
  fetchFavoriteIds,
  addFavorite,
  removeFavorite,
  fetchSavedSearches,
  insertSavedSearch,
  deleteSavedSearchById,
  fetchNotifications,
  markNotificationsRead,
  reviewListing,
  resolveReportById,
  fetchUnreadConversations,
  markConversationRead,
  insertDeal,
  updateDeal,
  setDealMilestone,
  fetchLatestDeal,
  insertEvidence,
  type NotificationRow,
  type SavedSearchRow,
  type DealRow,
  type DealMilestoneRow,
} from '../lib/persistence';
import { getApiBase } from '../lib/apiBase';
import { registerPushToken } from '../lib/push';
import {
  getOrCreateConversation,
  fetchConversationMessages,
  sendChatMessage,
  subscribeConversation,
  updateOfferStatus,
  resolveListingBroker,
  fetchBrokerByOwner,
  ensureBrokerProfile,
} from '../lib/chat';

export interface SupabaseStatusState {
  connected: boolean;
  checking: boolean;
  projectRef: string;
  latencyMs?: number;
  lastChecked?: string;
  error?: string;
  realtimeActive?: boolean;
}

export type ScreenId =
  | 'onboarding'
  | 'home'
  | 'search'
  | 'details'
  | 'post'
  | 'broker'
  | 'chat'
  | 'deal'
  | 'profile'
  | 'admin'
  | 'safety'
  | 'legal'
  | 'reset-password';

export type TabId = 'home' | 'search' | 'post' | 'chat' | 'profile';

interface SearchFilterState {
  query: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  bedrooms: string;
  deedVerified: boolean;
  countryCode: CountryCode;
  location: string;
}

export interface AppNotification {
  id: string;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
}

const relativeTime = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

const mapNotificationRow = (row: NotificationRow): AppNotification => ({
  id: row.id,
  title: row.title || (row.kind.startsWith('chat') ? 'New message' : 'Update'),
  desc: row.body || '',
  time: relativeTime(row.created_at),
  unread: !row.read_at,
});

const mapSavedSearchRow = (row: SavedSearchRow): SavedSearch => ({
  id: row.id,
  name: row.name,
  query: row.query,
  category: row.category,
  minPrice: Number(row.min_price) || 0,
  maxPrice: row.max_price === null ? Number.POSITIVE_INFINITY : Number(row.max_price),
  countryCode: row.country_code as CountryCode,
  location: row.location,
  createdAt: String(row.created_at).slice(0, 10),
  notifyOnMatch: row.notify_on_match,
});

interface AppContextType {
  currentScreen: ScreenId;
  setCurrentScreen: (screen: ScreenId) => void;
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  currency: Currency;
  setCurrency: (curr: Currency) => void;
  toggleCurrency: () => void;
  selectedCountry: CountryCode;
  setSelectedCountry: (code: CountryCode) => void;
  areaUnit: AreaUnit;
  setAreaUnit: (unit: AreaUnit) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  toggleDarkMode: () => void;
  selectedListingId: string;
  setSelectedListingId: (id: string) => void;
  selectedBrokerId: string;
  setSelectedBrokerId: (id: string) => void;
  listings: PropertyListing[];
  hasMoreListings: boolean;
  loadingMoreListings: boolean;
  loadMoreListings: () => Promise<void>;
  categories: MarketplaceCategory[];
  favorites: Record<string, boolean>;
  toggleFavorite: (listingId: string) => void;
  brokers: Broker[];
  chatMessages: ChatMessage[];
  chatLoading: boolean;
  hasMoreMessages: boolean;
  loadingOlderMessages: boolean;
  loadOlderMessages: () => Promise<void>;
  sendMessage: (text: string) => void;
  sendVoiceNote: (
    duration?: string,
    audio?: { storagePath?: string; url?: string; size?: string; mimeType?: string }
  ) => void;
  sendAttachment: (
    title: string,
    type: 'pdf' | 'image',
    image: string,
    extra?: { storagePath?: string; mimeType?: string; size?: string }
  ) => void;
  acceptOffer: () => void;
  counterOffer: (newPrice: number, terms: string) => void;
  declineOffer: () => void;
  escrowDeal: EscrowDeal;
  payEscrowDeposit: (channel: 'mobile_money' | 'card' | 'bank_wire') => void;
  advanceDealMilestone: (evidenceNotes?: string) => void;
  addListing: (newListing: Partial<PropertyListing>) => void;
  updateListingVerification: (listingId: string, status: VerificationStatus, reviewerNotes: string) => void;
  reports: ReportCase[];
  submitReport: (
    report: Omit<ReportCase, 'id' | 'createdAt' | 'status'>
  ) => Promise<{ success: boolean; error?: string }>;
  resolveReport: (reportId: string, resolution: 'resolved' | 'dismissed') => void;
  supportTickets: SupportTicket[];
  createSupportTicket: (subject: string, category: SupportTicket['category'], message: string) => void;
  sendSupportReply: (ticketId: string, message: string) => void;
  savedSearches: SavedSearch[];
  saveCurrentSearch: (name: string) => void;
  deleteSavedSearch: (id: string) => void;
  auditLogs: AuditLog[];
  formatPrice: (usdPrice: number, compact?: boolean) => string;
  openListingDetails: (id: string) => void;
  openBrokerProfile: (id: string) => void;
  openChatWithBroker: (id: string, listingId?: string, initialOffer?: number, conversationId?: string) => void;
  notifications: AppNotification[];
  markNotificationsAsRead: () => void;
  unreadByConversation: Record<string, number>;
  markConversationAsRead: (conversationId: string) => void;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;
  searchFilter: SearchFilterState;
  setSearchFilter: React.Dispatch<React.SetStateAction<SearchFilterState>>;
  resetSearchFilter: () => void;
  currentUser: UserProfile;
  authUserId: string;
  myBrokerId: string;
  activeConversationId: string;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerWithEmail: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  authReady: boolean;
  deleteAccountData: () => Promise<{ success: boolean; error?: string }>;
  exportAccountData: () => Promise<string>;
  supabaseStatus: SupabaseStatusState;
  refreshFromSupabase: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  t: (key: string, fallback?: string) => string;
}

export interface UserProfile {
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  location?: string;
  kycStatus?: 'approved' | 'pending' | 'unverified';
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const EMPTY_ESCROW_DEAL: EscrowDeal = {
  id: '',
  dealNumber: '',
  assetId: '',
  assetTitle: '',
  assetImage: '',
  assetLocation: '',
  assetCategory: '',
  agreedPrice: 0,
  currency: 'USD',
  depositAmount: 0,
  depositPaid: false,
  brokerName: '',
  escrowOfficer: '',
  currentMilestoneId: 1,
  milestones: [],
  selectedPaymentChannel: 'mobile_money',
  paymentProviderName: '',
  isSandbox: true,
  sandboxNotice: '',
  disputeStatus: 'none',
};

const ESCROW_MILESTONES: Milestone[] = [
  {
    id: 1,
    title: 'Offer Accepted & Escrow Opened',
    titleSo: 'Aqbalidda Dalabka & Furista Escrow',
    subtitle: 'Deposit required to open custody',
    status: 'active',
    badge: 'Action Needed',
  },
  {
    id: 2,
    title: 'Title & Cadastral Verification',
    titleSo: 'Hubinta Mulkiyadda & Cabirka',
    subtitle: 'Reviewer audits the registry documents',
    status: 'pending',
  },
  {
    id: 3,
    title: 'Title Conveyance & Fund Release',
    titleSo: 'Kala Wareejinta Mulkiyadda & Bixinta Lacagta',
    subtitle: 'Funds released after transfer is registered',
    status: 'pending',
  },
];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const asUuidOrNull = (value?: string | null): string | null =>
  value && UUID_PATTERN.test(value) ? value : null;

const isPersistedDealId = (id: string): boolean => !!id && UUID_PATTERN.test(id);

const mapDealToEscrowDeal = (row: DealRow, milestoneRows: DealMilestoneRow[]): EscrowDeal => ({
  id: row.id,
  dealNumber: row.deal_number,
  assetId: row.listing_id || '',
  assetTitle: row.asset_title,
  assetImage: row.asset_image,
  assetLocation: row.asset_location,
  assetCategory: row.asset_category,
  agreedPrice: Number(row.agreed_price),
  currency: row.currency as Currency,
  depositAmount: Number(row.deposit_amount),
  depositPaid: row.deposit_paid,
  brokerName: '',
  escrowOfficer: '',
  currentMilestoneId: row.current_milestone,
  milestones: milestoneRows.length
    ? milestoneRows.map((rowMilestone) => {
        const template = ESCROW_MILESTONES.find((m) => m.id === rowMilestone.ordinal);
        return {
          id: rowMilestone.ordinal,
          title: template?.title || rowMilestone.title,
          titleSo: template?.titleSo || rowMilestone.title,
          subtitle: template?.subtitle || '',
          status: rowMilestone.status,
          badge: rowMilestone.status === 'active' ? 'In Progress' : undefined,
          requiredEvidence: template?.requiredEvidence,
          evidenceProvided: rowMilestone.status === 'completed',
          evidenceNotes: rowMilestone.notes || undefined,
          date: rowMilestone.completed_at
            ? new Date(rowMilestone.completed_at).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
              })
            : undefined,
        };
      })
    : ESCROW_MILESTONES.map((milestone) => ({ ...milestone })),
  selectedPaymentChannel:
    (row.payment_channel as EscrowDeal['selectedPaymentChannel']) || 'mobile_money',
  paymentProviderName: row.payment_provider || '',
  isSandbox: row.is_sandbox,
  sandboxNotice:
    'Sandbox pilot: no live funds are moved. Live custody requires a licensed financial partner.',
  disputeStatus: row.status === 'disputed' ? 'disputed' : 'none',
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('onboarding');
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [language, setLanguage] = useState<Language>('en');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('SO');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('sqm');
  const [userRole, setUserRole] = useState<UserRole>('guest');
  const [currentUser, setCurrentUser] = useState<UserProfile>({
    name: '',
    email: '',
    role: 'guest',
    kycStatus: 'unverified',
  });
  const [authReady, setAuthReady] = useState(false);
  const [authUserId, setAuthUserId] = useState<string>('');

  useEffect(() => {
    if (authUserId) void registerPushToken(authUserId);
  }, [authUserId]);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  const [selectedListingId, setSelectedListingId] = useState<string>('');
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>('');
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [hasMoreListings, setHasMoreListings] = useState(false);
  const [loadingMoreListings, setLoadingMoreListings] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void readCachedListings().then((cached) => {
      if (cancelled || !cached) return;
      setListings((prev) => (prev.length > 0 ? prev : cached));
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const [categories, setCategories] = useState<MarketplaceCategory[]>(DEFAULT_MARKETPLACE_CATEGORIES);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [escrowDeal, setEscrowDeal] = useState<EscrowDeal>(EMPTY_ESCROW_DEAL);
  const [reports, setReports] = useState<ReportCase[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [unreadByConversation, setUnreadByConversation] = useState<Record<string, number>>({});
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatusState>({
    connected: false,
    checking: true,
    projectRef: 'usrqtgobuylkhwblpjnb',
    realtimeActive: false,
  });

  // Trust the profiles row (server-controlled role, suspension flag) and fall
  // back to the auth metadata only when the profile lookup is unavailable.
  const applySessionUser = async (user: User): Promise<{ success: boolean; error?: string }> => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role, is_suspended')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.is_suspended) {
      await supabase.auth.signOut().catch(() => {});
      return {
        success: false,
        error: 'This account is suspended. Contact support for help.',
      };
    }

    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const email = user.email ?? '';
    const name =
      (typeof profile?.full_name === 'string' && profile.full_name.trim()) ||
      (typeof metadata.full_name === 'string' && metadata.full_name.trim()) ||
      (typeof metadata.name === 'string' && metadata.name.trim()) ||
      email.split('@')[0];

    const knownRoles: UserRole[] = ['buyer', 'seller', 'broker', 'reviewer', 'admin'];
    const profileRole =
      typeof profile?.role === 'string' && knownRoles.includes(profile.role as UserRole)
        ? (profile.role as UserRole)
        : undefined;
    // Role is server-owned (profiles row). Never trust client-set auth metadata.
    const resolvedRole = profileRole ?? 'buyer';

    setAuthUserId(user.id);
    setCurrentUser({
      email,
      name,
      role: resolvedRole,
      kycStatus:
        (metadata.kyc_status as 'approved' | 'pending' | 'unverified') || 'unverified',
    });
    setUserRole(resolvedRole);
    return { success: true };
  };

  const refreshCategories = async () => {
    const data = await fetchMarketplaceCategories();
    if (data) setCategories(data);
  };

  const refreshFromSupabase = async () => {
    setSupabaseStatus((prev) => ({ ...prev, checking: true }));

    void refreshCategories();

    try {
      // These four reads are independent — run them together so opening the
      // app (and the chat tab) does not wait on a 4-request waterfall.
      const [health, remoteListings, remoteBrokers, remoteReports, remoteAuditLogs] =
        await Promise.all([
          checkSupabaseHealth(),
          fetchSupabaseListings(),
          fetchSupabaseBrokers(),
          fetchSupabaseReports(),
          fetchSupabaseAuditLogs(),
        ]);

      const [remoteFavorites, remoteSearches, remoteNotifications, remoteUnread, remoteDeal] =
        await Promise.all([
          fetchFavoriteIds(),
          fetchSavedSearches(),
          fetchNotifications(),
          fetchUnreadConversations(),
          fetchLatestDeal(),
        ]);

      if (remoteFavorites) {
        setFavorites(remoteFavorites.reduce<Record<string, boolean>>((acc, id) => {
          acc[id] = true;
          return acc;
        }, {}));
      }
      if (remoteSearches) setSavedSearches(remoteSearches.map(mapSavedSearchRow));
      if (remoteNotifications) setNotifications(remoteNotifications.map(mapNotificationRow));
      if (remoteUnread) setUnreadByConversation(remoteUnread);
      if (remoteDeal && (remoteDeal.deal.status === 'pending' || remoteDeal.deal.status === 'active')) {
        setEscrowDeal((prev) =>
          prev.id ? prev : mapDealToEscrowDeal(remoteDeal.deal, remoteDeal.milestones)
        );
      }

      if (health.connected) {
        setSupabaseStatus({
          connected: true,
          checking: false,
          projectRef: health.projectRef,
          latencyMs: health.latencyMs,
          lastChecked: new Date().toLocaleTimeString(),
          realtimeActive: true,
        });
        setListings(remoteListings || []);
        setHasMoreListings((remoteListings?.length ?? 0) >= LISTING_PAGE_SIZE);
        setBrokers(remoteBrokers || []);
        setReports(remoteReports || []);
        setAuditLogs(remoteAuditLogs || []);
      } else {
        setSupabaseStatus({
          connected: false,
          checking: false,
          projectRef: 'usrqtgobuylkhwblpjnb',
          error: health.error,
        });
      }
    } catch (err: unknown) {
      setSupabaseStatus({
        connected: false,
        checking: false,
        projectRef: 'usrqtgobuylkhwblpjnb',
        error: err instanceof Error ? err.message : 'Connection failed',
      });
    }
  };

  const loadMoreListings = async () => {
    if (loadingMoreListings || !hasMoreListings) return;
    setLoadingMoreListings(true);
    const nextPage = await fetchSupabaseListings({ offset: listings.length });
    setLoadingMoreListings(false);
    if (!nextPage) return;
    if (nextPage.length < LISTING_PAGE_SIZE) setHasMoreListings(false);
    setListings((prev) => {
      const seen = new Set(prev.map((listing) => listing.id));
      return [...prev, ...nextPage.filter((listing) => !seen.has(listing.id))];
    });
  };

  useEffect(() => {
    // Subscribe to realtime database changes on listings
    const channel = supabase
      .channel('public-listings-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'listings' },
        () => {
          fetchSupabaseListings().then((data) => {
            setListings(data || []);
          });
        }
      )
      .subscribe();

    // Pick up catalog changes an admin made while the app was in the
    // background.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshFromSupabase();
    });

    return () => {
      appStateSub.remove();
      supabase.removeChannel(channel);
    };
  }, []);

  // Restore the persisted Supabase session so a signed-in user stays signed in
  // across reloads until they explicitly log out.
  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          const applied = await applySessionUser(data.session.user);
          if (!cancelled && applied.success) {
            setCurrentScreen('home');
            setActiveTab('home');
          }
        }
      } finally {
        if (!cancelled) {
          setAuthReady(true);
          // Load marketplace data only after the persisted session is
          // attached, otherwise RLS hides the user's own rows.
          refreshFromSupabase();
        }
      }
    };

    restoreSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        refreshFromSupabase();
      }
      if (event === 'SIGNED_OUT') {
        setAuthUserId('');
        setChatMessages([]);
        setUnreadByConversation({});
        setCurrentUser({ name: '', email: '', role: 'guest', kycStatus: 'unverified' });
        setUserRole('guest');
        setActiveTab('home');
        setCurrentScreen('onboarding');
      }
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const [searchFilter, setSearchFilter] = useState<SearchFilterState>({
    query: '',
    category: 'all',
    minPrice: 0,
    maxPrice: Number.POSITIVE_INFINITY,
    bedrooms: 'Any',
    deedVerified: false,
    countryCode: 'SO',
    location: '',
  });

  // Arabic runs right-to-left; React Native applies direction per Text node
  // (I18nManager RTL needs an app restart, so it is not toggled at runtime).

  const t = (key: string, fallback?: string): string => {
    return getTranslation(language, key, fallback);
  };

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  const toggleCurrency = () => {
    const sequence: Currency[] = ['USD', 'EUR', 'GBP', 'AED', 'KES', 'SOS', 'SLSH', 'TRY'];
    const idx = sequence.indexOf(currency);
    const next = sequence[(idx + 1) % sequence.length];
    setCurrency(next);
  };

  const resetSearchFilter = () => {
    setSearchFilter({
      query: '',
      category: 'all',
      minPrice: 0,
      maxPrice: Number.POSITIVE_INFINITY,
      bedrooms: 'Any',
      deedVerified: false,
      countryCode: selectedCountry,
      location: '',
    });
  };

  const formatPrice = (usdPrice: number, compact = false): string => {
    const rate = EXCHANGE_RATES[currency] || 1;
    const converted = usdPrice * rate;

    if (currency === 'USD') {
      if (compact && converted >= 1000000) return `$${(converted / 1000000).toFixed(1)}M`;
      if (compact && converted >= 1000) return `$${(converted / 1000).toFixed(0)}K`;
      return `$${Math.round(converted).toLocaleString('en-US')}`;
    }
    if (currency === 'EUR') {
      return `€${Math.round(converted).toLocaleString('en-US')}`;
    }
    if (currency === 'GBP') {
      return `£${Math.round(converted).toLocaleString('en-US')}`;
    }
    if (currency === 'AED') {
      return `AED ${Math.round(converted).toLocaleString('en-US')}`;
    }
    if (currency === 'KES') {
      return `KSh ${Math.round(converted).toLocaleString('en-US')}`;
    }
    if (currency === 'SOS') {
      if (compact && converted >= 1000000000) return `${(converted / 1000000000).toFixed(1)}B Sh.So`;
      if (compact && converted >= 1000000) return `${(converted / 1000000).toFixed(1)}M Sh.So`;
      return `${Math.round(converted).toLocaleString('en-US')} Sh.So`;
    }
    if (currency === 'SLSH') {
      if (compact && converted >= 1000000000) return `${(converted / 1000000000).toFixed(1)}B Sl.Sh`;
      if (compact && converted >= 1000000) return `${(converted / 1000000).toFixed(1)}M Sl.Sh`;
      return `${Math.round(converted).toLocaleString('en-US')} Sl.Sh`;
    }
    if (currency === 'TRY') {
      return `₺${Math.round(converted).toLocaleString('en-US')}`;
    }
    return `$${Math.round(usdPrice).toLocaleString('en-US')}`;
  };

  const toggleFavorite = (listingId: string) => {
    const next = !favorites[listingId];
    setFavorites((prev) => ({
      ...prev,
      [listingId]: next,
    }));
    if (!authUserId) return;
    const write = next
      ? addFavorite(authUserId, listingId)
      : removeFavorite(authUserId, listingId);
    void write.then((res) => {
      if (res.success || res.missing) return;
      setFavorites((prev) => ({ ...prev, [listingId]: !next }));
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          title: next ? 'Could not save this asset' : 'Could not remove from saved',
          desc: res.error || 'Check your connection and try again.',
          time: 'Just now',
          unread: true,
        },
        ...prev,
      ]);
    });
  };

  const openListingDetails = (id: string) => {
    setSelectedListingId(id);
    setCurrentScreen('details');
  };

  const openBrokerProfile = (id: string) => {
    setSelectedBrokerId(id);
    setCurrentScreen('broker');
  };

  // --- Persistent chat (real Supabase conversations + chat_messages) ---
  const seenMessageIds = useRef<Set<string>>(new Set());
  const activeConversationIdRef = useRef<string>('');
  const [activeConversationId, setActiveConversationState] = useState<string>('');
  const [chatLoading, setChatLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [myBrokerId, setMyBrokerId] = useState<string>('');

  const setActiveConversation = (id: string) => {
    activeConversationIdRef.current = id;
    setActiveConversationState(id);
    // Mark the message stream as loading in the same render that switches
    // conversations, so the empty state never flashes before history arrives.
    setChatLoading(Boolean(id));
  };

  const appendUnique = (msg: ChatMessage) => {
    if (seenMessageIds.current.has(msg.id)) return;
    seenMessageIds.current.add(msg.id);
    setChatMessages((prev) => [...prev, msg]);
  };

  const activeChatContext = () => {
    const listing = listings.find((l) => l.id === selectedListingId);
    return {
      listingId: listing?.id || selectedListingId || '',
      brokerId: listing?.brokerId || selectedBrokerId || null,
    };
  };

  // Insert into the active conversation. Falls back to an in-session message
  // when there is no signed-in user, no resolved broker/conversation, or the
  // write is rejected, so the UI never hard-fails.
  const postChatMessage = async (opts: {
    listingId: string;
    brokerId: string | null;
    body: string;
    offer?: ChatMessage['offer'];
    senderRole?: 'user' | 'broker' | 'system';
    attachment?: NonNullable<ChatMessage['attachments']>[number];
    isAudio?: boolean;
    audioDuration?: string;
    audioOrigin?: string;
  }) => {
    const senderRole = opts.senderRole ?? 'user';
    const tempId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const localMessage: ChatMessage = {
      id: tempId,
      sender: senderRole,
      senderName: currentUser.name || 'You',
      text: opts.body,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      offer: opts.offer,
      isAudio: opts.isAudio,
      audioDuration: opts.audioDuration,
      audioOrigin: opts.audioOrigin,
      attachments: opts.attachment ? [opts.attachment] : undefined,
    };

    // Render instantly; swap in the saved row once Supabase confirms it so a
    // slow mobile connection never makes the send feel stuck.
    appendUnique(localMessage);

    const conversationId = activeConversationIdRef.current;
    if (!conversationId) return;

    const inserted = await sendChatMessage({
      conversationId,
      listingId: opts.listingId || null,
      brokerId: opts.brokerId,
      sender: senderRole,
      senderName: currentUser.name || 'You',
      body: opts.body,
      offer: opts.offer,
      attachment: opts.attachment,
      isAudio: opts.isAudio,
      audioDuration: opts.audioDuration,
      audioOrigin: opts.audioOrigin,
    });
    if (inserted) {
      setChatMessages((prev) => prev.filter((m) => m.id !== tempId));
      appendUnique(inserted);
    }
  };

  // A listing's broker, falling back to the profile that owns the listing.
  const resolveBrokerForListing = async (
    listingId: string,
    inMemoryBrokerId?: string
  ): Promise<string | null> => {
    if (inMemoryBrokerId) return inMemoryBrokerId;
    const { brokerId, ownerId } = await resolveListingBroker(listingId);
    if (brokerId) return brokerId;
    if (ownerId) {
      const broker = await fetchBrokerByOwner(ownerId);
      return broker?.id ?? null;
    }
    return null;
  };

  // Resolve the signed-in user's own broker profile (used by the inbox).
  // Prefer the already-loaded broker list so the chat tab does not wait on an
  // extra round trip.
  const brokerLookupFor = useRef<string | null>(null);
  useEffect(() => {
    if (!authUserId) {
      brokerLookupFor.current = null;
      setMyBrokerId('');
      return;
    }
    const cached = brokers.find((b) => b.ownerId === authUserId);
    if (cached) {
      brokerLookupFor.current = authUserId;
      setMyBrokerId(cached.id);
      return;
    }
    if (brokerLookupFor.current === authUserId) return;
    let active = true;
    fetchBrokerByOwner(authUserId).then((broker) => {
      if (!active) return;
      brokerLookupFor.current = authUserId;
      setMyBrokerId(broker?.id || '');
    });
    return () => {
      active = false;
    };
  }, [authUserId, brokers]);

  // Load the active conversation and stream new messages.
  useEffect(() => {
    if (!activeConversationId) {
      setChatLoading(false);
      return;
    }
    let active = true;
    seenMessageIds.current = new Set();
    setChatLoading(true);
    (async () => {
      const msgs = await fetchConversationMessages(activeConversationId, { limit: 50 });
      if (!active) return;
      if (msgs) {
        seenMessageIds.current = new Set(msgs.map((m) => m.id));
        setChatMessages(msgs);
        setHasMoreMessages(msgs.length === 50);
      }
      setChatLoading(false);
    })();
    const unsubscribe = subscribeConversation(activeConversationId, (m) => {
      if (active) appendUnique(m);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [activeConversationId]);

  const loadOlderMessages = async () => {
    const conversationId = activeConversationIdRef.current;
    const oldest = chatMessages[0]?.sentAt;
    if (!conversationId || !oldest || loadingOlderMessages) return;
    setLoadingOlderMessages(true);
    const older = await fetchConversationMessages(conversationId, { before: oldest, limit: 50 });
    if (older) {
      const known = new Set(chatMessages.map((m) => m.id));
      const fresh = older.filter((m) => !known.has(m.id));
      fresh.forEach((m) => seenMessageIds.current.add(m.id));
      setChatMessages((prev) => [...fresh, ...prev]);
      setHasMoreMessages(older.length === 50);
    }
    setLoadingOlderMessages(false);
  };

  const openChatWithBroker = async (
    brokerId: string,
    listingId?: string,
    initialOffer?: number,
    knownConversationId?: string
  ) => {
    // Only trust an explicitly passed listing. Falling back to the last viewed
    // listing would attach a directory chat to an unrelated property.
    const resolvedListingId = listingId || '';
    // Reopening the conversation that is already active (e.g. after Back to
    // chats) keeps its loaded messages instead of resetting to a skeleton that
    // would never clear, since the id does not change.
    const reusingConversation =
      Boolean(knownConversationId) && knownConversationId === activeConversationIdRef.current;

    setSelectedBrokerId(brokerId);
    setSelectedListingId(resolvedListingId);
    // Open the chat view right away; the skeleton covers conversation lookup.
    setActiveTab('chat');
    setCurrentScreen('chat');

    if (!reusingConversation) {
      setActiveConversation('');
      seenMessageIds.current = new Set();
      setChatMessages([]);

      if (knownConversationId) {
        // Opened from an inbox row: the conversation is already known, so skip
        // the lookup/create round trip and start fetching messages right away.
        setActiveConversation(knownConversationId);
      } else if (authUserId) {
        setChatLoading(true);
        const listing = resolvedListingId
          ? listings.find((l) => l.id === resolvedListingId)
          : undefined;
        const realBrokerId = resolvedListingId
          ? await resolveBrokerForListing(resolvedListingId, listing?.brokerId || brokerId)
          : brokerId;
        if (realBrokerId) {
          const conversation = await getOrCreateConversation({
            listingId: resolvedListingId || null,
            brokerId: realBrokerId,
            buyerId: authUserId,
          });
          if (conversation) {
            setActiveConversation(conversation.id);
          } else {
            setChatLoading(false);
          }
        } else {
          setChatLoading(false);
        }
      }
    }

    if (initialOffer && resolvedListingId) {
      const listing =
        listings.find((l) => l.id === resolvedListingId) ||
        listings.find((l) => l.brokerId === brokerId);
      const originalPrice = listing && listing.price > 0 ? listing.price : initialOffer;
      const discountPercent =
        originalPrice > 0
          ? Math.max(0, Math.round(((originalPrice - initialOffer) / originalPrice) * 100))
          : 0;
      void postChatMessage({
        listingId: resolvedListingId,
        brokerId: listing?.brokerId || brokerId || null,
        body: `Submitted purchase inquiry for $${initialOffer.toLocaleString()} USD${
          listing ? ` on ${listing.title}` : ''
        }.`,
        senderRole: 'user',
        offer: {
          id: `off-${Date.now()}`,
          version: 1,
          assetSubject: listing?.title || 'Listing inquiry',
          proposedPrice: initialOffer,
          currency: 'USD',
          originalPrice,
          discountPercent,
          depositAmount: Math.round(initialOffer * 0.1),
          escrowTerms: '10% deposit held in trust pending deed audit',
          titleGuarantee: listing?.registryNumber || 'Registry record pending',
          expiryTime: '72 Hours',
          status: 'active',
        },
      });
    }
  };

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const ctx = activeChatContext();
    void postChatMessage({
      listingId: ctx.listingId,
      brokerId: ctx.brokerId,
      body: text.trim(),
      senderRole: 'user',
    });
  };

  const sendVoiceNote = (
    duration = '0:42',
    audio?: { storagePath?: string; url?: string; size?: string; mimeType?: string }
  ) => {
    const ctx = activeChatContext();
    void postChatMessage({
      listingId: ctx.listingId,
      brokerId: ctx.brokerId,
      body: 'Voice Memo (Audio Transmission)',
      senderRole: 'user',
      isAudio: true,
      audioDuration: duration,
      audioOrigin: 'Client Device',
      attachment: audio
        ? {
            id: `voice-${Date.now()}`,
            title: 'Voice Memo',
            type: 'audio',
            url: audio.url,
            storagePath: audio.storagePath,
            size: audio.size,
            mimeType: audio.mimeType ?? 'audio/m4a',
          }
        : undefined,
    });
  };

  const sendAttachment = (
    title: string,
    type: 'pdf' | 'image',
    image: string,
    extra?: { storagePath?: string; mimeType?: string; size?: string }
  ) => {
    const ctx = activeChatContext();
    void postChatMessage({
      listingId: ctx.listingId,
      brokerId: ctx.brokerId,
      body: `Attached Document: ${title}`,
      senderRole: 'user',
      attachment: {
        id: `f-${Date.now()}`,
        title,
        type,
        image,
        size: extra?.size,
        storagePath: extra?.storagePath,
        mimeType: extra?.mimeType,
      },
    });
  };

  const acceptOffer = () => {
    const acceptedOffer = [...chatMessages]
      .reverse()
      .find((msg) => msg.offer?.status === 'active')?.offer;

    setChatMessages((prev) =>
      prev.map((msg) =>
        msg.offer ? { ...msg, offer: { ...msg.offer, status: 'accepted' } } : msg
      )
    );

    if (!acceptedOffer) return;

    void updateOfferStatus(acceptedOffer.id, 'accepted');

    const listing = listings.find((l) => l.id === selectedListingId);
    const broker =
      brokers.find((b) => b.id === selectedBrokerId) ||
      brokers.find((b) => b.id === listing?.brokerId);
    const countryCode = listing?.countryCode || selectedCountry;
    const depositAmount =
      acceptedOffer.depositAmount || Math.round(acceptedOffer.proposedPrice * 0.1);

    const localDealId = `deal-${Date.now()}`;
    const nextDeal: EscrowDeal = {
      id: localDealId,
      dealNumber: `ESC-${countryCode}-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
      assetId: listing?.id || '',
      assetTitle: listing?.title || acceptedOffer.assetSubject,
      assetImage: listing?.image || '',
      assetLocation: [listing?.location, listing?.locationDetails].filter(Boolean).join(', '),
      assetCategory: listing?.category || '',
      agreedPrice: acceptedOffer.proposedPrice,
      currency: acceptedOffer.currency,
      depositAmount,
      depositPaid: false,
      brokerName: broker?.name || '',
      escrowOfficer: '',
      currentMilestoneId: 1,
      selectedPaymentChannel: 'mobile_money',
      paymentProviderName: '',
      isSandbox: true,
      sandboxNotice:
        'Sandbox pilot: no live funds are moved. Live custody requires a licensed financial partner.',
      disputeStatus: 'none',
      milestones: ESCROW_MILESTONES.map((milestone) => ({ ...milestone })),
    };
    setEscrowDeal(nextDeal);

    if (authUserId) {
      void insertDeal(
        authUserId,
        {
          deal_number: nextDeal.dealNumber,
          listing_id: asUuidOrNull(listing?.id),
          broker_id: asUuidOrNull(broker?.id),
          asset_title: nextDeal.assetTitle,
          asset_image: nextDeal.assetImage,
          asset_location: nextDeal.assetLocation,
          asset_category: nextDeal.assetCategory,
          agreed_price: nextDeal.agreedPrice,
          currency: nextDeal.currency,
          deposit_amount: nextDeal.depositAmount,
          deposit_paid: false,
          current_milestone: 1,
          payment_channel: 'mobile_money',
          payment_provider: '',
          is_sandbox: true,
        },
        ESCROW_MILESTONES.map((milestone, index) => ({
          ordinal: index + 1,
          title: milestone.title,
          status: milestone.status,
        }))
      ).then((result) => {
        if (result.success && result.id) {
          const dealId = result.id;
          setEscrowDeal((prev) => (prev.id === localDealId ? { ...prev, id: dealId } : prev));
        }
      });
    }
    void postChatMessage({
      listingId: selectedListingId,
      brokerId: listing?.brokerId || selectedBrokerId || null,
      body: `Offer accepted at $${acceptedOffer.proposedPrice.toLocaleString()} USD. Escrow deal opened.`,
      senderRole: 'system',
    });
    setActiveTab('home');
    setCurrentScreen('deal');
  };

  const counterOffer = (newPrice: number, terms: string) => {
    const listing = listings.find((l) => l.id === selectedListingId);
    const previousOffer = [...chatMessages].reverse().find((msg) => msg.offer)?.offer;
    if (previousOffer) void updateOfferStatus(previousOffer.id, 'countered');
    const originalPrice =
      previousOffer?.originalPrice || (listing && listing.price > 0 ? listing.price : newPrice);
    const discountPercent =
      originalPrice > 0
        ? Math.max(0, Math.round(((originalPrice - newPrice) / originalPrice) * 100))
        : 0;
    void postChatMessage({
      listingId: selectedListingId,
      brokerId: listing?.brokerId || selectedBrokerId || null,
      body: `Submitted counter-proposal of $${newPrice.toLocaleString()} USD. Note: ${terms}`,
      senderRole: 'user',
      offer: {
        id: `counter-off-${Date.now()}`,
        version: (previousOffer?.version || 1) + 1,
        assetSubject: listing?.title || previousOffer?.assetSubject || 'Listing inquiry',
        proposedPrice: newPrice,
        currency: 'USD',
        originalPrice,
        discountPercent,
        depositAmount: Math.round(newPrice * 0.1),
        escrowTerms: terms || '10% escrow deposit held in verified custody.',
        titleGuarantee:
          listing?.registryNumber || previousOffer?.titleGuarantee || 'Registry record pending',
        expiryTime: '48 Hours',
        status: 'active',
      },
    });
  };

  const declineOffer = () => {
    const declinedOffer = [...chatMessages].reverse().find((msg) => msg.offer)?.offer;
    if (declinedOffer) void updateOfferStatus(declinedOffer.id, 'declined');
    setChatMessages((prev) =>
      prev.map((msg) =>
        msg.offer ? { ...msg, offer: { ...msg.offer, status: 'declined' } } : msg
      )
    );
    const listing = listings.find((l) => l.id === selectedListingId);
    void postChatMessage({
      listingId: selectedListingId,
      brokerId: listing?.brokerId || selectedBrokerId || null,
      body: 'Offer declined.',
      senderRole: 'system',
    });
  };

  const payEscrowDeposit = (channel: 'mobile_money' | 'card' | 'bank_wire') => {
    setEscrowDeal((prev) => ({
      ...prev,
      depositPaid: true,
      selectedPaymentChannel: channel,
      currentMilestoneId: 2,
      milestones: prev.milestones.map((m) =>
        m.id === 1
          ? { ...m, status: 'completed', evidenceProvided: true }
          : m.id === 2
          ? { ...m, status: 'active', badge: 'Action Needed' }
          : m
      ),
    }));

    if (isPersistedDealId(escrowDeal.id)) {
      const dealId = escrowDeal.id;
      void updateDeal(dealId, {
        deposit_paid: true,
        payment_channel: channel,
        current_milestone: 2,
        status: 'active',
      });
      void setDealMilestone(dealId, 1, 'completed', 'Deposit recorded (sandbox).');
      void setDealMilestone(dealId, 2, 'active');
    }

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: 'Escrow Deposit Recorded (Sandbox)',
        desc: `Deposit transaction registered via ${channel}. Milestone 1 marked completed.`,
        time: 'Just now',
        unread: true,
      },
      ...prev,
    ]);
  };

  const advanceDealMilestone = (evidenceNotes = 'Audited document verified by compliance reviewer.') => {
    const previousMilestoneId = escrowDeal.currentMilestoneId;
    const nextMilestoneId = Math.min(previousMilestoneId + 1, 5);

    setEscrowDeal((prev) => {
      const nextId = nextMilestoneId;
      const updatedMilestones = prev.milestones.map((m) => {
        if (m.id === prev.currentMilestoneId) {
          return {
            ...m,
            status: 'completed' as const,
            evidenceProvided: true,
            evidenceNotes,
            date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
          };
        }
        if (m.id === nextId) {
          return { ...m, status: 'active' as const, badge: 'In Progress' };
        }
        return m;
      });

      return {
        ...prev,
        currentMilestoneId: nextId,
        milestones: updatedMilestones,
      };
    });

    if (isPersistedDealId(escrowDeal.id)) {
      const dealId = escrowDeal.id;
      void updateDeal(dealId, { current_milestone: nextMilestoneId });
      void setDealMilestone(dealId, previousMilestoneId, 'completed', evidenceNotes);
      if (nextMilestoneId !== previousMilestoneId) {
        void setDealMilestone(dealId, nextMilestoneId, 'active');
      }
    }

    // Record audit log
    const newLog: AuditLog = {
      id: `aud-${Date.now()}`,
      action: 'MILESTONE_ADVANCED',
      actorRole: userRole,
      actorEmail: 'compliance@dilaal.market',
      targetEntity: `Deal ${escrowDeal.dealNumber} - Milestone #${escrowDeal.currentMilestoneId}`,
      details: evidenceNotes,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const addListing = (newListingData: Partial<PropertyListing>) => {
    // Sellers get a broker profile provisioned for their own account so buyers
    // can reach them through a persisted conversation. The listing is shown
    // immediately and persisted in the background.
    const localId = `listing-${Date.now()}`;
    const initialBrokerId = newListingData.brokerId || selectedBrokerId || '';
    const fullListing: PropertyListing = {
      id: localId,
      title: newListingData.title || '',
      titleSo: newListingData.titleSo || '',
      titleAr: newListingData.titleAr,
      price: newListingData.price || 0,
      currency: newListingData.currency || 'USD',
      priceType: newListingData.priceType || 'sale',
      countryCode: newListingData.countryCode || selectedCountry,
      location: newListingData.location || '',
      locationDetails: newListingData.locationDetails || '',
      registryNumber: newListingData.registryNumber || '',
      beds: newListingData.beds,
      baths: newListingData.baths,
      area: newListingData.area || '',
      areaUnit: newListingData.areaUnit || areaUnit,
      garage: newListingData.garage,
      category: newListingData.category || 'house',
      categorySpecs: newListingData.categorySpecs,
      image: newListingData.image || '',
      gallery: newListingData.gallery || [],
      isVerified: false,
      verificationStatus: 'submitted',
      verificationEvidence: newListingData.verificationEvidence || [],
      verifiedLabel: 'Audit Submitted',
      brokerId: initialBrokerId,
      brokerName: newListingData.brokerName || currentUser.name || '',
      brokerAvatar: newListingData.brokerAvatar || '',
      brokerRating: newListingData.brokerRating || 0,
      brokerDeals: newListingData.brokerDeals || 0,
      lat: newListingData.lat ?? 0,
      lng: newListingData.lng ?? 0,
      description: newListingData.description || '',
      amenities: newListingData.amenities || [],
      isFavorite: false,
      tags: newListingData.tags || [],
      moderationStatus: 'published',
      ownerId: authUserId || undefined,
      createdAt: new Date().toISOString(),
    };

    setListings((prev) => [fullListing, ...prev]);

    // Persist in the background: provision the seller's broker profile, then
    // insert the listing itself so it has a real id to key conversations on.
    void (async () => {
      let brokerId = initialBrokerId;
      let brokerName = fullListing.brokerName;
      if (authUserId) {
        try {
          const broker = await ensureBrokerProfile(
            authUserId,
            currentUser.name || 'Verified Seller'
          );
          if (broker) {
            brokerId = broker.id;
            brokerName = broker.name || brokerName;
            setMyBrokerId(broker.id);
          }
        } catch (err) {
          console.warn('[DILAAL] broker provisioning failed:', err);
        }
      }

      const listingToPersist: PropertyListing =
        brokerId && brokerId !== initialBrokerId
          ? { ...fullListing, brokerId, brokerName }
          : fullListing;

      if (listingToPersist !== fullListing) {
        setListings((prev) => prev.map((l) => (l.id === localId ? listingToPersist : l)));
      }

      const res = await insertSupabaseListing(listingToPersist);
      if (res.success && res.data) {
        setListings((prev) => [res.data!, ...prev.filter((l) => l.id !== localId)]);

        if (authUserId) {
          const persisted = res.data;
          (listingToPersist.verificationEvidence ?? []).forEach((doc) => {
            if (!doc.documentPath) return;
            void insertEvidence({
              listingId: persisted.id,
              brokerId: persisted.brokerId,
              uploadedBy: authUserId,
              evidenceType: doc.evidenceType,
              documentRef: doc.documentRef,
              documentPath: doc.documentPath,
              mimeType: doc.mimeType ?? null,
              fileSize: doc.fileSize ?? null,
              issuerAuthority: doc.issuerAuthority,
              registryNumber: doc.registryNumber ?? null,
            });
          });
        }
        return;
      }

      console.warn('[DILAAL] listing publish failed:', res.error);
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          title: 'Listing could not be published',
          desc:
            res.error ||
            'The listing was saved locally only. Sign in again and retry to publish it.',
          time: 'Just now',
          unread: true,
        },
        ...prev,
      ]);
    })();

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: 'Listing Submitted for Review',
        desc: `"${fullListing.title}" submitted. Our compliance team will audit the title documents.`,
        time: 'Just now',
        unread: true,
      },
      ...prev,
    ]);
  };

  const updateListingVerification = (
    listingId: string,
    status: VerificationStatus,
    reviewerNotes: string
  ) => {
    setListings((prev) =>
      prev.map((item) => {
        if (item.id === listingId) {
          const isApproved = status === 'approved';
          return {
            ...item,
            verificationStatus: status,
            isVerified: isApproved,
            moderationStatus: isApproved ? 'published' : status === 'rejected' ? 'flagged' : 'under_review',
            verifiedLabel: isApproved ? `Deed Verified (${item.registryNumber})` : `Status: ${status}`,
            verificationEvidence: [
              ...(item.verificationEvidence || []),
              {
                evidenceType: 'title_deed',
                documentRef: 'AUDIT-DECISION.pdf',
                issuerAuthority: SUPPORTED_COUNTRIES[item.countryCode || 'SO'].registryAuthority,
                verifiedBy: 'Compliance Reviewer',
                verifiedAt: new Date().toISOString().split('T')[0],
                notes: reviewerNotes,
                status,
              },
            ],
          };
        }
        return item;
      })
    );

    const log: AuditLog = {
      id: `aud-${Date.now()}`,
      action: `VERIFICATION_${status.toUpperCase()}`,
      actorRole: userRole,
      actorEmail: 'auditor@dilaal.market',
      targetEntity: `Listing ${listingId}`,
      details: reviewerNotes,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);

    // Record in Supabase audit_logs
    insertSupabaseAuditLog(log).catch(() => {});

    const rpcStatuses: VerificationStatus[] = [
      'in_review',
      'more_info_required',
      'approved',
      'rejected',
      'revoked',
    ];
    if (authUserId && rpcStatuses.includes(status)) {
      void reviewListing(listingId, status, reviewerNotes).then((res) => {
        if (res.success || res.missing) return;
        setNotifications((prev) => [
          {
            id: `notif-${Date.now()}`,
            title: 'Verification decision not saved',
            desc: res.error || 'Check your connection and try again.',
            time: 'Just now',
            unread: true,
          },
          ...prev,
        ]);
        void fetchSupabaseListings().then((data) => {
          if (data) setListings(data);
        });
      });
    }
  };

  const submitReport = async (
    report: Omit<ReportCase, 'id' | 'createdAt' | 'status'>
  ): Promise<{ success: boolean; error?: string }> => {
    const newCase: ReportCase = {
      id: `rep-${Date.now()}`,
      ...report,
      status: 'pending',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setReports((prev) => [newCase, ...prev]);

    const res = await insertSupabaseReport(report);
    if (res.id) {
      setReports((prev) =>
        prev.map((r) => (r.id === newCase.id ? { ...r, id: res.id as string } : r))
      );
    }
    if (!res.success) {
      setReports((prev) => prev.filter((r) => r.id !== newCase.id));
      return { success: false, error: res.error || 'Report could not be submitted.' };
    }

    if (!authUserId) {
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          title: 'Report Received',
          desc: `Your report regarding "${report.targetTitle}" has been queued for investigation.`,
          time: 'Just now',
          unread: true,
        },
        ...prev,
      ]);
    }
    return { success: true };
  };

  const resolveReport = (reportId: string, resolution: 'resolved' | 'dismissed') => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: resolution } : r))
    );
    if (!authUserId || reportId.startsWith('rep-')) return;
    void resolveReportById(reportId, resolution, '').then((res) => {
      if (res.success || res.missing) return;
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: 'pending' } : r))
      );
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          title: 'Report update failed',
          desc: res.error || 'Check your connection and try again.',
          time: 'Just now',
          unread: true,
        },
        ...prev,
      ]);
    });
  };

  const createSupportTicket = (
    subject: string,
    category: SupportTicket['category'],
    message: string
  ) => {
    const newTicket: SupportTicket = {
      id: `sup-${Date.now()}`,
      subject,
      category,
      priority: 'medium',
      status: 'open',
      createdAt: new Date().toISOString().split('T')[0],
      messages: [
        {
          sender: 'user',
          text: message,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    };
    setSupportTickets((prev) => [newTicket, ...prev]);
  };

  const sendSupportReply = (ticketId: string, message: string) => {
    setSupportTickets((prev) =>
      prev.map((ticket) => {
        if (ticket.id === ticketId) {
          return {
            ...ticket,
            messages: [
              ...ticket.messages,
              {
                sender: 'user',
                text: message,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ],
          };
        }
        return ticket;
      })
    );
  };

  const saveCurrentSearch = (name: string) => {
    const newSearch: SavedSearch = {
      id: `ss-${Date.now()}`,
      name: name || `Search in ${searchFilter.countryCode}`,
      query: searchFilter.query,
      category: searchFilter.category,
      minPrice: searchFilter.minPrice,
      maxPrice: searchFilter.maxPrice,
      countryCode: searchFilter.countryCode,
      location: searchFilter.location,
      createdAt: new Date().toISOString().split('T')[0],
      notifyOnMatch: true,
    };
    setSavedSearches((prev) => [newSearch, ...prev]);
    if (!authUserId) return;
    void insertSavedSearch(authUserId, {
      name: newSearch.name,
      query: newSearch.query,
      category: newSearch.category,
      min_price: newSearch.minPrice,
      max_price: Number.isFinite(newSearch.maxPrice) ? newSearch.maxPrice : null,
      country_code: newSearch.countryCode,
      location: newSearch.location,
      notify_on_match: newSearch.notifyOnMatch,
    }).then((res) => {
      setSavedSearches((prev) =>
        prev.map((s) => (s.id === newSearch.id && res.row ? mapSavedSearchRow(res.row) : s))
      );
      if (res.success || res.missing) return;
      setSavedSearches((prev) => prev.filter((s) => s.id !== newSearch.id));
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          title: 'Search could not be saved',
          desc: res.error || 'Check your connection and try again.',
          time: 'Just now',
          unread: true,
        },
        ...prev,
      ]);
    });
  };

  const deleteSavedSearch = (id: string) => {
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
    if (!authUserId || id.startsWith('ss-')) return;
    void deleteSavedSearchById(id);
  };

  const deleteAccountData = async (): Promise<{ success: boolean; error?: string }> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: false, error: 'Sign in before deleting your account.' };
    try {
      const response = await fetch(`${await getApiBase()}/api/account/purge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ confirmation: 'DELETE' }),
      });
      const payload = (await response.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!response.ok || !payload.success) {
        return { success: false, error: payload.error || 'Could not delete the account. Please try again.' };
      }
    } catch {
      return { success: false, error: 'Could not reach the server. Your account was not deleted.' };
    }

    await supabase.auth.signOut().catch(() => {});
    setFavorites({});
    setUserRole('guest');
    setAuthUserId('');
    setCurrentUser({ name: '', email: '', role: 'guest', kycStatus: 'unverified' });
    setChatMessages([]);
    setReports([]);
    setSupportTickets([]);
    setNotifications([]);
    return { success: true };
  };

  const exportAccountData = async (): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id ?? authUserId;
    const base = {
      exportTimestamp: new Date().toISOString(),
      userId: uid,
      email: session?.user?.email ?? '',
      userRole,
      language,
      currency,
    };
    if (!uid) {
      return JSON.stringify({ ...base, favorites, savedSearches, supportTickets, reportsSubmitted: reports }, null, 2);
    }
    const [profile, listings, reportRows, conversations, tickets, searches, favs] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
      supabase.from('listings').select('*').eq('owner_id', uid),
      supabase.from('reports').select('*').eq('reporter_id', uid),
      supabase.from('conversations').select('*').eq('buyer_id', uid),
      supabase.from('support_tickets').select('*').eq('user_id', uid),
      supabase.from('saved_searches').select('*').eq('user_id', uid),
      supabase.from('favorites').select('*').eq('user_id', uid),
    ]);
    return JSON.stringify(
      {
        ...base,
        profile: profile.data ?? null,
        listings: listings.data ?? [],
        reports: reportRows.data ?? [],
        conversations: conversations.data ?? [],
        supportTickets: tickets.data ?? [],
        savedSearches: searches.data ?? [],
        favorites: favs.data ?? [],
      },
      null,
      2
    );
  };

  const markNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    if (!authUserId) return;
    void markNotificationsRead();
  };

  const markConversationAsRead = (conversationId: string) => {
    if (!conversationId) return;
    setUnreadByConversation((prev) => {
      if (!prev[conversationId]) return prev;
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });
    if (!authUserId) return;
    void markConversationRead(conversationId);
  };

  const loginWithEmail = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      let { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      // Email confirmation is disabled for this product. Accounts created
      // before that policy existed are confirmed on the fly, then sign-in is
      // retried once so users never see a "confirm your email" message.
      if (error && /email not confirmed/i.test(error.message)) {
        const response = await fetch(`${await getApiBase()}/api/auth/confirm-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password }),
        });
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          return {
            success: false,
            error: payload.error || 'Could not prepare this account for sign-in. Please try again.',
          };
        }
        ({ data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        }));
      }

      if (error || !data.user) {
        const message = error?.message ?? '';
        if (/email not confirmed/i.test(message)) {
          return {
            success: false,
            error: 'This account could not be prepared for sign-in. Please try again.',
          };
        }
        if (/invalid login credentials|invalid credentials/i.test(message)) {
          return {
            success: false,
            error:
              'Incorrect email or password. Create an account first if you have not signed up.',
          };
        }
        return { success: false, error: message || 'Sign-in failed. Please try again.' };
      }

      return await applySessionUser(data.user);
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Sign-in failed. Please try again.',
      };
    }
  };

  const registerWithEmail = async (
    email: string,
    password: string,
    name: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // The server creates an already-confirmed account, so the user can
      // immediately sign in with the same email and password. Registration
      // itself does not sign anyone in.
      const response = await fetch(`${await getApiBase()}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          fullName: name,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        const message = payload.error || `Registration failed (${response.status}).`;
        if (/already exists/i.test(message)) {
          return {
            success: false,
            error: 'An account with this email already exists. Sign in instead.',
          };
        }
        return { success: false, error: message };
      }

      return { success: true };
    } catch {
      return {
        success: false,
        error: 'Could not reach the server. Check your connection and try again.',
      };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setCurrentUser({ name: '', email: '', role: 'guest', kycStatus: 'unverified' });
    setAuthUserId('');
    setChatMessages([]);
    seenMessageIds.current = new Set();
    activeConversationIdRef.current = '';
    setActiveConversationState('');
    setMyBrokerId('');
    setUserRole('guest');
    setActiveTab('home');
    setCurrentScreen('onboarding');
  };

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        setCurrentScreen,
        activeTab,
        setActiveTab,
        language,
        setLanguage,
        currency,
        setCurrency,
        toggleCurrency,
        selectedCountry,
        setSelectedCountry,
        areaUnit,
        setAreaUnit,
        userRole,
        setUserRole,
        currentUser,
        authUserId,
        myBrokerId,
        activeConversationId,
        setCurrentUser,
        loginWithEmail,
        registerWithEmail,
        logout,
        authReady,
        isDarkMode,
        setIsDarkMode,
        toggleDarkMode,
        selectedListingId,
        setSelectedListingId,
        selectedBrokerId,
        setSelectedBrokerId,
        listings,
        categories,
        favorites,
        toggleFavorite,
        brokers,
        chatMessages,
        chatLoading,
        hasMoreMessages,
        loadingOlderMessages,
        loadOlderMessages,
        sendMessage,
        sendVoiceNote,
        sendAttachment,
        acceptOffer,
        counterOffer,
        declineOffer,
        escrowDeal,
        payEscrowDeposit,
        advanceDealMilestone,
        addListing,
        updateListingVerification,
        reports,
        submitReport,
        resolveReport,
        supportTickets,
        createSupportTicket,
        sendSupportReply,
        savedSearches,
        saveCurrentSearch,
        deleteSavedSearch,
        auditLogs,
        formatPrice,
        openListingDetails,
        openBrokerProfile,
        openChatWithBroker,
        notifications,
        markNotificationsAsRead,
        unreadByConversation,
        markConversationAsRead,
        isNotificationsOpen,
        setIsNotificationsOpen,
        searchFilter,
        setSearchFilter,
        resetSearchFilter,
        deleteAccountData,
        exportAccountData,
        supabaseStatus,
        refreshFromSupabase,
        refreshCategories,
        hasMoreListings,
        loadingMoreListings,
        loadMoreListings,
        t,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
