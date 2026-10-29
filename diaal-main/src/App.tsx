import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppProvider, useApp, TabId } from './context/AppContext';
import { CallProvider } from './context/CallContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { HomeScreen } from './screens/HomeScreen';
import { SearchScreen } from './screens/SearchScreen';
import { ListingDetailsScreen } from './screens/ListingDetailsScreen';
import { PostListingScreen } from './screens/PostListingScreen';
import { BrokerProfileScreen } from './screens/BrokerProfileScreen';
import { ChatScreen } from './screens/ChatScreen';
import { DealTrackerScreen } from './screens/DealTrackerScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { AdminReviewerScreen } from './screens/AdminReviewerScreen';
import { SupportSafetyScreen } from './screens/SupportSafetyScreen';
import { LegalPrivacyScreen } from './screens/LegalPrivacyScreen';
import { ResetPasswordScreen } from './screens/ResetPasswordScreen';
import { ErrorBoundary } from './components/ErrorBoundary';

function MainAppContent() {
  const {
    currentScreen,
    setCurrentScreen,
    activeTab,
    setActiveTab,
    isDarkMode,
    setIsNotificationsOpen,
    notifications,
    authReady,
    currentUser,
    unreadByConversation,
    listings,
    openListingDetails,
  } = useApp();

  // Shared links carry ?listing=<id>; open that asset once the catalog loads.
  const pendingListingId = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    pendingListingId.current = params.get('listing');
  }, []);

  useEffect(() => {
    if (!authReady || !pendingListingId.current) return;
    const id = pendingListingId.current;
    if (!listings.some((listing) => listing.id === id)) {
      if (listings.length > 0) pendingListingId.current = null;
      return;
    }
    pendingListingId.current = null;
    openListingDetails(id);
    setCurrentScreen('details');
  }, [authReady, listings, openListingDetails, setCurrentScreen]);

  const isStaff = currentUser?.role === 'reviewer' || currentUser?.role === 'admin';

  // Handle Tab Switch
  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    if (tab === 'home') setCurrentScreen('home');
    else if (tab === 'search') setCurrentScreen('search');
    else if (tab === 'post') setCurrentScreen('post');
    else if (tab === 'chat') setCurrentScreen('chat');
    else if (tab === 'profile') setCurrentScreen('profile');
  };

  // Back button handling
  const isBackScreen = ['details', 'broker', 'deal', 'admin', 'safety', 'legal'].includes(
    currentScreen
  );

  const handleBack = () => {
    if (currentScreen === 'details') {
      setCurrentScreen(activeTab === 'search' ? 'search' : 'home');
    } else if (currentScreen === 'broker') {
      setCurrentScreen('home');
    } else if (currentScreen === 'deal') {
      setCurrentScreen('chat');
    } else if (['admin', 'safety', 'legal'].includes(currentScreen)) {
      setCurrentScreen('profile');
    } else {
      setCurrentScreen('home');
    }
  };

  // Sync dark mode class on document and body
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  const unreadChatCount = Object.values(unreadByConversation).reduce((sum, n) => sum + n, 0);

  // The reviewer hub is server-gated too, but a stale URL/deep link should not
  // even render the queue for a non-staff account.
  useEffect(() => {
    if (currentScreen === 'admin' && !isStaff) {
      setCurrentScreen('profile');
    }
  }, [currentScreen, isStaff, setCurrentScreen]);

  // Wait for the persisted Supabase session check before choosing between the
  // onboarding screen and the marketplace, so signed-in users are not asked
  // to sign in again on every reload.
  if (!authReady) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-surface text-on-surface">
        <div className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-md">
          <span className="material-symbols-outlined text-[24px]">apartment</span>
        </div>
        <span className="material-symbols-outlined animate-spin text-primary text-[22px]">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 h-full w-full bg-surface font-sans text-on-surface flex flex-col overflow-hidden ${
        isDarkMode ? 'dark' : ''
      }`}
    >
      {/* Top Header (Shown on all screens except onboarding and recovery) */}
      {currentScreen !== 'onboarding' && currentScreen !== 'reset-password' && (
        <Header
          onHomeClick={() => handleTabChange('home')}
          onNotificationsClick={() => setIsNotificationsOpen(true)}
          showBack={isBackScreen}
          onBack={handleBack}
        />
      )}

      {/* Notifications Drawer */}
      <NotificationsDrawer />

      {/* Main Screen Views with Animated Transition */}
      <main
        className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden relative overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.18,
              ease: 'easeInOut',
            }}
            className="flex-1 flex flex-col w-full min-h-full"
          >
            {currentScreen === 'onboarding' && <OnboardingScreen />}
            {currentScreen === 'home' && <HomeScreen />}
            {currentScreen === 'search' && <SearchScreen />}
            {currentScreen === 'details' && <ListingDetailsScreen />}
            {currentScreen === 'post' && <PostListingScreen />}
            {currentScreen === 'broker' && <BrokerProfileScreen />}
            {currentScreen === 'chat' && <ChatScreen />}
            {currentScreen === 'deal' && <DealTrackerScreen />}
            {currentScreen === 'profile' && <ProfileScreen />}
            {currentScreen === 'admin' && isStaff && <AdminReviewerScreen />}
            {currentScreen === 'safety' && <SupportSafetyScreen />}
            {currentScreen === 'legal' && <LegalPrivacyScreen />}
            {currentScreen === 'reset-password' && <ResetPasswordScreen />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom 5-Tab Navigation - Always visible except onboarding and recovery */}
      {currentScreen !== 'onboarding' && currentScreen !== 'reset-password' && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          unreadChatCount={unreadChatCount}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <CallProvider>
          <MainAppContent />
        </CallProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}
