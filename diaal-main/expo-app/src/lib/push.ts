import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Expo Go cannot receive remote push (SDK 53+), so registration only runs in
// development/production builds. Failures never block sign-in.
export async function registerPushToken(userId: string): Promise<void> {
  if (!userId || Constants.appOwnership === 'expo') return;
  try {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('dilaal-messages', {
        name: 'Messages & calls',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const projectId =
      (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ??
      Constants.easConfig?.projectId;
    if (!projectId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) {
      console.warn('[DILAAL] push skipped: replace extra.eas.projectId in app.json with your EAS project UUID.');
      return;
    }
    const token = await Notifications.getExpoPushTokenAsync({ projectId });

    await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        expo_token: token.data,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,expo_token' }
    );
  } catch (err) {
    console.warn('[DILAAL] push registration failed:', err);
  }
}
