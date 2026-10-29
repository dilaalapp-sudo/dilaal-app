import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, Linking, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { AppProvider, useApp, TabId } from './src/context/AppContext';
import { CallProvider } from './src/context/CallContext';
import { Header } from './src/components/Header';
import { BottomNav } from './src/components/BottomNav';
import { NotificationsDrawer } from './src/components/NotificationsDrawer';
import { Icon } from './src/components/Icon';
import { useColors } from './src/theme';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { ListingDetailsScreen } from './src/screens/ListingDetailsScreen';
import { PostListingScreen } from './src/screens/PostListingScreen';
import { BrokerProfileScreen } from './src/screens/BrokerProfileScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { DealTrackerScreen } from './src/screens/DealTrackerScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { AdminReviewerScreen } from './src/screens/AdminReviewerScreen';
import { SupportSafetyScreen } from './src/screens/SupportSafetyScreen';
import { LegalPrivacyScreen } from './src/screens/LegalPrivacyScreen';
import { ResetPasswordScreen } from './src/screens/ResetPasswordScreen';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { supabase } from './src/lib/supabase';

function MainAppContent() {
  const {
    currentScreen,
    setCurrentScreen,
    activeTab,
    setActiveTab,
    isDarkMode,
    setIsNotificationsOpen,
    authReady,
    currentUser,
    unreadByConversation,
    listings,
    openListingDetails,
  } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [pendingListingId, setPendingListingId] = useState<string | null>(null);

  const isStaff = currentUser?.role === 'reviewer' || currentUser?.role === 'admin';

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    if (tab === 'home') setCurrentScreen('home');
    else if (tab === 'search') setCurrentScreen('search');
    else if (tab === 'post') setCurrentScreen('post');
    else if (tab === 'chat') setCurrentScreen('chat');
    else if (tab === 'profile') setCurrentScreen('profile');
  };

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

  const unreadChatCount = Object.values(unreadByConversation).reduce((sum, n) => sum + n, 0);

  // The reviewer hub is server-gated too; do not render it for non-staff.
  useEffect(() => {
    if (currentScreen === 'admin' && !isStaff) {
      setCurrentScreen('profile');
    }
  }, [currentScreen, isStaff, setCurrentScreen]);

  // Password recovery and shared listing links both arrive as URLs.
  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      const hashIndex = url.indexOf('#');
      const queryIndex = url.indexOf('?');
      const raw =
        hashIndex >= 0
          ? url.slice(hashIndex + 1)
          : queryIndex >= 0
            ? url.slice(queryIndex + 1)
            : '';
      const params: Record<string, string> = {};
      raw.split('&').forEach((pair) => {
        const [key, value] = pair.split('=');
        if (key && value) params[key] = decodeURIComponent(value);
      });

      const listingMatch = url.match(/listing\/([^/?#&]+)/);
      const listingId = params.listing || (listingMatch ? decodeURIComponent(listingMatch[1]) : '');
      if (listingId) setPendingListingId(listingId);

      const accessToken = params.access_token;
      const refreshToken = params.refresh_token;
      if (!accessToken || !refreshToken) return;
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (!error) setCurrentScreen('reset-password');
    };

    void Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });
    return () => subscription.remove();
  }, []);

  // Open the shared asset once the catalog has it.
  useEffect(() => {
    if (!authReady || !pendingListingId) return;
    if (!listings.some((listing) => listing.id === pendingListingId)) {
      if (listings.length > 0) setPendingListingId(null);
      return;
    }
    openListingDetails(pendingListingId);
    setPendingListingId(null);
    setCurrentScreen('details');
  }, [authReady, listings, openListingDetails, pendingListingId, setCurrentScreen]);

  // Tapping a push notification lands on the asset or conversation it names.
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { listingId?: string; conversationId?: string }
        | undefined;
      if (data?.listingId) {
        setPendingListingId(String(data.listingId));
      } else if (data?.conversationId) {
        setActiveTab('chat');
        setCurrentScreen('chat');
      }
    });
    return () => subscription.remove();
  }, [setActiveTab, setCurrentScreen]);

  // Keep the native status bar legible in both themes.
  useEffect(() => {
    RNStatusBar.setBarStyle(isDarkMode ? 'light-content' : 'dark-content', true);
    RNStatusBar.setBackgroundColor(currentScreen === 'onboarding' ? '#003527' : colors.surface, true);
  }, [isDarkMode, colors.surface, currentScreen]);

  if (!authReady) {
    return (
      <View style={[styles.splash, { backgroundColor: colors.surface }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={[styles.splashLogo, { backgroundColor: colors.primary }]}>
          <Icon name="apartment" size={24} color={colors.onPrimary} />
        </View>
        <Icon name="autorenew" size={22} color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      <StatusBar style={currentScreen === 'onboarding' || isDarkMode ? 'light' : 'dark'} />

      {currentScreen !== 'onboarding' && currentScreen !== 'reset-password' && (
        <Header
          onHomeClick={() => handleTabChange('home')}
          onNotificationsClick={() => setIsNotificationsOpen(true)}
          showBack={isBackScreen}
          onBack={handleBack}
        />
      )}

      <NotificationsDrawer />

      <View style={[styles.main, { paddingBottom: currentScreen === 'onboarding' ? 0 : 0 }]}>
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
      </View>

      {currentScreen !== 'onboarding' && currentScreen !== 'reset-password' && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          unreadChatCount={unreadChatCount}
        />
      )}
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  // Browsers paint their own focus rectangle on top of our field styling,
  // which reads as a second box inside the input. The fields show focus with
  // their own border, so the native ring is redundant on web only.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const style = document.createElement('style');
    style.textContent = 'input:focus, textarea:focus { outline: none; }';
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);

  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <View style={styles.fontSplash}>
          <StatusBar style="dark" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AppProvider>
          <CallProvider>
            <MainAppContent />
          </CallProvider>
        </AppProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  main: { flex: 1, minHeight: 0 },
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  splashLogo: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSplash: { flex: 1, backgroundColor: '#faf8ff' },
});
