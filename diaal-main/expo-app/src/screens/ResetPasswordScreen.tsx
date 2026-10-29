import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { Icon } from '../components/Icon';
import { useColors, typography, shadow } from '../theme';

export const ResetPasswordScreen: React.FC = () => {
  const { t, setCurrentScreen, setActiveTab } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (password.length < 8) {
      setError(t('passwordTooShort', 'Use at least 8 characters.'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('passwordMismatch', 'Passwords do not match.'));
      return;
    }
    setError(null);
    setIsSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setIsDone(true);
  };

  const continueToApp = () => {
    setCurrentScreen('home');
    setActiveTab('home');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View
        style={{
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.outlineVariant + '33',
          paddingTop: insets.top + 14,
          paddingBottom: 14,
          paddingHorizontal: 16,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.primary,
            }}
          >
            <Icon name="apartment" size={22} color={colors.onPrimary} />
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text
              style={{
                fontSize: 19,
                fontFamily: typography.extrabold,
                letterSpacing: 0.5,
                color: colors.onSurface,
              }}
            >
              DILAAL
            </Text>
            <Text
              numberOfLines={1}
              style={{ fontSize: 9.5, marginTop: 2, color: colors.onSurfaceVariant }}
            >
              {t('appTagline', 'Real Estate & Asset Marketplace')}
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            padding: 16,
            paddingBottom: Math.max(insets.bottom, 16) + 16,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              {
                width: '100%',
                maxWidth: 460,
                alignSelf: 'center',
                borderRadius: 26,
                borderWidth: 1,
                borderColor: colors.outlineVariant + '40',
                backgroundColor: colors.surfaceContainerLowest,
                padding: 20,
                gap: 18,
              },
              shadow.floating,
            ]}
          >
            {isDone ? (
              <View style={{ alignItems: 'center', gap: 12, paddingVertical: 12 }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.primary + '1A',
                  }}
                >
                  <Icon name="lock_reset" size={30} color={colors.primary} />
                </View>
                <Text
                  style={{
                    fontSize: 22,
                    fontFamily: typography.extrabold,
                    textAlign: 'center',
                    color: colors.onSurface,
                  }}
                >
                  {t('passwordUpdated', 'Password updated.')}
                </Text>
                <Pressable
                  onPress={continueToApp}
                  style={{
                    width: '100%',
                    paddingVertical: 15,
                    borderRadius: 15,
                    alignItems: 'center',
                    backgroundColor: colors.primary,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: typography.bold,
                      color: colors.onPrimary,
                    }}
                  >
                    {t('navHome', 'Home')}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={{ gap: 6 }}>
                  <Text
                    style={{
                      fontSize: 22,
                      fontFamily: typography.extrabold,
                      letterSpacing: -0.5,
                      color: colors.onSurface,
                    }}
                  >
                    {t('resetPasswordTitle', 'Reset Password')}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      lineHeight: 18,
                      color: colors.onSurfaceVariant,
                    }}
                  >
                    {t('resetPasswordSubtitle', 'Choose a new password for your DILAAL account.')}
                  </Text>
                </View>

                <View style={{ gap: 6 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontFamily: typography.bold,
                      color: colors.onSurfaceVariant,
                    }}
                  >
                    {t('newPassword', 'New password')}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      height: 50,
                      borderRadius: 15,
                      paddingHorizontal: 14,
                      backgroundColor: colors.surfaceContainerLow,
                    }}
                  >
                    <Icon name="lock" size={18} color={colors.outline} />
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoComplete="new-password"
                      placeholder={t('newPassword', 'New password')}
                      placeholderTextColor={colors.outline}
                      style={{
                        flex: 1,
                        fontSize: 14,
                        fontFamily: typography.semibold,
                        color: colors.onSurface,
                      }}
                    />
                    <Pressable
                      onPress={() => setShowPassword((value) => !value)}
                      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <Icon
                        name={showPassword ? 'visibility_off' : 'visibility'}
                        size={18}
                        color={colors.outline}
                      />
                    </Pressable>
                  </View>
                </View>

                <View style={{ gap: 6 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontFamily: typography.bold,
                      color: colors.onSurfaceVariant,
                    }}
                  >
                    {t('confirmNewPassword', 'Confirm new password')}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      height: 50,
                      borderRadius: 15,
                      paddingHorizontal: 14,
                      backgroundColor: colors.surfaceContainerLow,
                    }}
                  >
                    <Icon name="lock_reset" size={18} color={colors.outline} />
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoComplete="new-password"
                      placeholder={t('confirmNewPassword', 'Confirm new password')}
                      placeholderTextColor={colors.outline}
                      style={{
                        flex: 1,
                        fontSize: 14,
                        fontFamily: typography.semibold,
                        color: colors.onSurface,
                      }}
                    />
                  </View>
                </View>

                {error && (
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                    <Icon name="error" size={14} color={colors.error} />
                    <Text
                      style={{
                        flexShrink: 1,
                        fontSize: 11,
                        fontFamily: typography.semibold,
                        color: colors.error,
                      }}
                    >
                      {error}
                    </Text>
                  </View>
                )}

                <Pressable
                  onPress={handleSubmit}
                  disabled={isSaving}
                  style={{
                    paddingVertical: 15,
                    borderRadius: 15,
                    alignItems: 'center',
                    backgroundColor: colors.primary,
                    opacity: isSaving ? 0.7 : 1,
                  }}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color={colors.onPrimary} />
                  ) : (
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: typography.bold,
                        color: colors.onPrimary,
                      }}
                    >
                      {t('updatePassword', 'Update Password')}
                    </Text>
                  )}
                </Pressable>

                <Pressable onPress={() => setCurrentScreen('onboarding')} style={{ alignSelf: 'center' }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontFamily: typography.bold,
                      color: colors.onSurfaceVariant,
                    }}
                  >
                    {t('backToSignIn', 'Back to sign in')}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};
