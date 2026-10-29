import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { useApp } from '../context/AppContext';
import { Language } from '../types';
import { Icon } from '../components/Icon';
import { supabase } from '../lib/supabase';
import { useColors, typography, shadow } from '../theme';

const COPY = {
  so: {
    brandTag: 'Suuqa Hantida & Dilaaliinta',
    welcomeTitle: 'Ku Soo Dhawoow DILAAL',
    welcomeSub: 'Geli email-kaaga iyo furahaaga sirta ah si aad u gasho koontadaada.',
    tabSignIn: 'Gal Koontadaada',
    tabSignUp: 'Sameyso Koonto Cusub',
    fullNameLabel: 'Magacaaga Oo Buuxa',
    fullNamePlaceholder: 'Geli magacaaga oo buuxa',
    emailLabel: 'Cinwaanka Email-ka',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'Furaha Sirta ah',
    passwordPlaceholder: 'Geli furahaaga sirta ah',
    confirmPasswordLabel: 'Xaqiiji Furaha Sirta ah',
    confirmPasswordPlaceholder: 'Mar kale geli furaha sirta ah',
    passwordStrengthWeak: 'Furaha wuu daciifsan yahay (ugu yaraan 6 xaraf)',
    passwordStrengthMedium: 'Furaha wuu dhexdhexaad yahay',
    passwordStrengthStrong: 'Furaha waa mid adag oo sugan',
    rememberMe: 'I xusuuso qalabkan',
    forgotPassword: 'Ma ilowday furaha sirta ah?',
    signInBtn: 'Gal Koontadaada (Email Sign In)',
    signUpBtn: 'Diiwaangeli Koontada Cusub',
    signingIn: 'Hubinaya xogtaada...',
    signingUp: 'Abuuraya koontadaada...',
    signUpSuccess: 'Koontada si guul leh ayaa loo abuuray. Ku gal email-kaaga iyo furahaaga sirta ah.',
    termsAgreement: 'Waxaan oggolaaday Shuruudaha Adeegga DILAAL & Siyaasadda Xogta.',
    forgotModalTitle: 'Dib u helidda Furaha Sirta ah',
    forgotModalDesc: 'Geli cinwaankaaga email-ka si loogu diro tilmaamaha dib-u-dejinta furaha.',
    forgotModalBtn: 'Dir Xiriiriyaha Dib-u-Dejinta',
    forgotModalSuccess:
      'Codsiga dib-u-dejinta furaha waa la diiwaangeliyay. Haddii koonto ku xiran tahay email-kan, tilmaamaha dib-u-dejinta waa la diri doonaa.',
    close: 'Xir',
  },
  en: {
    brandTag: 'Real Estate & Brokerage Marketplace',
    welcomeTitle: 'Sign In to DILAAL',
    welcomeSub: 'Enter your email and password to access your DILAAL account.',
    tabSignIn: 'Sign In',
    tabSignUp: 'Create Account',
    fullNameLabel: 'Full Legal Name',
    fullNamePlaceholder: 'Enter your full name',
    emailLabel: 'Email Address',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    confirmPasswordLabel: 'Confirm Password',
    confirmPasswordPlaceholder: 'Re-enter your password',
    passwordStrengthWeak: 'Weak password (minimum 6 characters)',
    passwordStrengthMedium: 'Medium strength password',
    passwordStrengthStrong: 'Strong password',
    rememberMe: 'Remember this device',
    forgotPassword: 'Forgot password?',
    signInBtn: 'Sign In with Email',
    signUpBtn: 'Create Account',
    signingIn: 'Authenticating credentials...',
    signingUp: 'Creating account & profile...',
    signUpSuccess: 'Account created successfully. Sign in with your email and password.',
    termsAgreement: 'I accept the DILAAL Terms of Service & Data Policy.',
    forgotModalTitle: 'Reset Your Password',
    forgotModalDesc:
      'Enter your registered email address and we will send password reset instructions if an account exists.',
    forgotModalBtn: 'Send Reset Link',
    forgotModalSuccess:
      'Password reset request recorded. If an account exists for this email, reset instructions will be sent.',
    close: 'Close',
  },
  ar: {
    brandTag: 'سوق العقارات والوساطة',
    welcomeTitle: 'تسجيل الدخول إلى دلال',
    welcomeSub: 'أدخل بريدك الإلكتروني وكلمة المرور للوصول إلى حسابك في دلال.',
    tabSignIn: 'تسجيل الدخول',
    tabSignUp: 'إنشاء حساب جديد',
    fullNameLabel: 'الاسم القانوني الكامل',
    fullNamePlaceholder: 'أدخل اسمك الكامل',
    emailLabel: 'البريد الإلكتروني',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'كلمة المرور',
    passwordPlaceholder: 'أدخل كلمة المرور',
    confirmPasswordLabel: 'تأكيد كلمة المرور',
    confirmPasswordPlaceholder: 'أعد إدخال كلمة المرور',
    passwordStrengthWeak: 'كلمة المرور ضعيفة (6 أحرف على الأقل)',
    passwordStrengthMedium: 'كلمة مرور مقبولة',
    passwordStrengthStrong: 'كلمة مرور قوية',
    rememberMe: 'تذكر هذا الجهاز',
    forgotPassword: 'نسيت كلمة المرور؟',
    signInBtn: 'تسجيل الدخول بالبريد الإلكتروني',
    signUpBtn: 'إنشاء حساب',
    signingIn: 'جارٍ التحقق من الهوية...',
    signingUp: 'جارٍ إنشاء الحساب...',
    signUpSuccess: 'تم إنشاء الحساب بنجاح. سجّل الدخول ببريدك الإلكتروني وكلمة المرور.',
    termsAgreement: 'أوافق على شروط خدمة دلال وسياسة البيانات.',
    forgotModalTitle: 'استعادة كلمة المرور',
    forgotModalDesc:
      'أدخل بريدك الإلكتروني المسجل وسنرسل تعليمات الاستعادة إذا كان هناك حساب مرتبط به.',
    forgotModalBtn: 'إرسال رابط الاستعادة',
    forgotModalSuccess:
      'تم تسجيل طلب استعادة كلمة المرور. إذا كان هناك حساب مرتبط بهذا البريد، فستُرسل تعليمات الاستعادة.',
    close: 'إغلاق',
  },
} as const;

export const OnboardingScreen: React.FC = () => {
  const {
    language,
    setLanguage,
    setCurrentScreen,
    setActiveTab,
    loginWithEmail,
    registerWithEmail,
    isDarkMode,
    toggleDarkMode,
  } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const isTablet = Math.min(width, height) >= 600;
  const isCompact = width < 360;
  const isNarrow = width < 380;
  const isTight = width < 420;
  const isShort = height < 640;
  const gutter = isTablet ? 32 : isCompact ? 12 : 16;
  const cardMaxWidth = isTablet ? 480 : 460;
  const cardPadding = isTablet ? 28 : isCompact ? 18 : 20;
  const fieldHeight = isTablet ? 54 : 50;

  const t = COPY[language];
  const isRtl = language === 'ar';

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordSubmitted, setForgotPasswordSubmitted] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3000);
  };

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: '', color: colors.outlineVariant };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass) || /[A-Z]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, text: t.passwordStrengthWeak, color: '#f43f5e' };
    if (score <= 3) return { score: 2, text: t.passwordStrengthMedium, color: '#f59e0b' };
    return { score: 3, text: t.passwordStrengthStrong, color: '#10b981' };
  };

  const strength = getPasswordStrength(password);

  const handleEmailSignIn = async () => {
    setAuthError(null);
    setAuthNotice(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) return setAuthError('Please enter your email address.');
    if (!password) return setAuthError('Please enter your password.');
    if (password.length < 6) return setAuthError('Password must be at least 6 characters long.');

    setIsLoading(true);
    try {
      const result = await loginWithEmail(cleanEmail, password);
      if (result.success) {
        showToast('Authentication confirmed. Welcome to DILAAL!');
        setTimeout(() => {
          setCurrentScreen('home');
          setActiveTab('home');
        }, 500);
      } else {
        setAuthError(result.error || 'Failed to authenticate. Please check your credentials.');
      }
    } catch {
      setAuthError('An unexpected authentication error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async () => {
    setAuthError(null);
    setAuthNotice(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim();

    if (!cleanName) return setAuthError('Please enter your full legal name.');
    if (!cleanEmail) return setAuthError('Please enter a valid email address.');
    if (!password || password.length < 6)
      return setAuthError('Password must be at least 6 characters long.');
    if (password !== confirmPassword)
      return setAuthError('Passwords do not match. Please verify both entries.');
    if (!agreeTerms) return setAuthError('Please accept the DILAAL Terms of Service and Data Policy.');

    setIsLoading(true);
    try {
      const result = await registerWithEmail(cleanEmail, password, cleanName);
      if (result.success) {
        setAuthNotice(t.signUpSuccess);
        setAuthMode('signin');
        setPassword('');
        setConfirmPassword('');
      } else {
        setAuthError(result.error || 'Registration failed. Please try again.');
      }
    } catch {
      setAuthError('An error occurred during account creation.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async () => {
    if (!forgotPasswordEmail.trim()) {
      setForgotError('Please enter your registered email address.');
      return;
    }
    setForgotError(null);
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail.trim(), {
      redirectTo: Linking.createURL('reset-password'),
    });
    setIsLoading(false);
    if (error) {
      setForgotError(error.message);
      return;
    }
    setForgotPasswordSubmitted(true);
    showToast(t.forgotModalSuccess);
  };

  const fieldBox = (name: string) => [
    styles.inputBox,
    { backgroundColor: colors.surfaceContainerLow, borderColor: 'transparent', height: fieldHeight },
    focusedField === name && {
      backgroundColor: colors.surfaceContainerLowest,
      borderColor: colors.primary,
    },
  ];
  const fieldIcon = (name: string) =>
    focusedField === name ? colors.primary : colors.outline;

  return (
    <View style={[styles.root, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      {/* Top nav */}
      <View style={[styles.topNav, { borderBottomColor: colors.outlineVariant + '33' }]}>
        <View
          style={[
            styles.navInner,
            {
              paddingHorizontal: gutter,
              paddingTop: isTablet ? 20 : isShort ? 10 : 16,
              paddingBottom: isTablet ? 20 : isShort ? 12 : 16,
            },
          ]}
        >
          <View style={[styles.brandRow, isRtl && { flexDirection: 'row-reverse' }]}>
            <View
              style={[
                styles.brandLogo,
                isTablet && { width: 44, height: 44, borderRadius: 15 },
                { backgroundColor: colors.primary },
              ]}
            >
              <Icon name="apartment" size={isTablet ? 24 : 22} color={colors.onPrimary} />
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text
                style={[styles.brandName, isTablet && { fontSize: 21 }, { color: colors.onSurface }]}
                numberOfLines={1}
              >
                DILAAL
              </Text>
              {!isNarrow && (
                <Text
                  style={[
                    styles.brandTag,
                    isTablet && { fontSize: 11, maxWidth: 240 },
                    !isTablet && isTight && { fontSize: 9 },
                    { color: colors.onSurfaceVariant },
                  ]}
                  numberOfLines={1}
                >
                  {t.brandTag}
                </Text>
              )}
            </View>
          </View>

          <View style={[styles.topControls, isTight && !isTablet && { gap: 6 }]}>
            <View style={[styles.langPill, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant + '4D' }]}>
              {(['en', 'so', 'ar'] as Language[]).map((lng) => (
                <Pressable
                  key={lng}
                  onPress={() => setLanguage(lng)}
                  style={[
                    styles.langBtn,
                    isTight && !isTablet && { paddingHorizontal: 6 },
                    language === lng && { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.langText,
                      { color: language === lng ? colors.onPrimary : colors.onSurfaceVariant },
                    ]}
                  >
                    {lng === 'en' ? 'EN' : lng === 'so' ? 'SO' : 'عربي'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={toggleDarkMode}
              style={[
                styles.themeBtn,
                isTight && !isTablet && { width: 32, height: 32, borderRadius: 10 },
                { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant + '4D' },
              ]}
            >
              <Icon name={isDarkMode ? 'light_mode' : 'dark_mode'} size={18} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingHorizontal: gutter,
              paddingTop: isTablet ? 32 : isShort ? 16 : 24,
              paddingBottom: Math.max(insets.bottom, isTablet ? 24 : 12) + (isTablet ? 24 : 16),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surfaceContainerLowest,
                borderColor: colors.outlineVariant + '40',
                maxWidth: cardMaxWidth,
                padding: cardPadding,
                gap: isTablet ? 20 : 18,
                borderRadius: isTablet ? 30 : 26,
              },
              shadow.floating,
            ]}
          >
            <View style={styles.cardHeader}>
              <Text
                style={[
                  styles.title,
                  isTablet && { fontSize: 28 },
                  isCompact && { fontSize: 22 },
                  { color: colors.onSurface },
                ]}
              >
                {authMode === 'signin' ? t.welcomeTitle : t.tabSignUp}
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  isTablet && { fontSize: 13, lineHeight: 20 },
                  { color: colors.onSurfaceVariant },
                ]}
              >
                {authMode === 'signin' ? t.welcomeSub : t.brandTag}
              </Text>
            </View>

            {/* Mode toggle */}
            <View style={[styles.modeToggle, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant + '4D' }]}>
              <Pressable
                onPress={() => {
                  setAuthMode('signin');
                  setAuthError(null);
                  setAuthNotice(null);
                }}
                style={[styles.modeBtn, authMode === 'signin' && { backgroundColor: colors.primary }]}
              >
                <Icon name="login" size={16} color={authMode === 'signin' ? colors.onPrimary : colors.onSurfaceVariant} />
                <Text style={[styles.modeText, { color: authMode === 'signin' ? colors.onPrimary : colors.onSurfaceVariant }]}>
                  {t.tabSignIn}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setAuthMode('signup');
                  setAuthError(null);
                  setAuthNotice(null);
                }}
                style={[styles.modeBtn, authMode === 'signup' && { backgroundColor: colors.primary }]}
              >
                <Icon name="person_add" size={16} color={authMode === 'signup' ? colors.onPrimary : colors.onSurfaceVariant} />
                <Text style={[styles.modeText, { color: authMode === 'signup' ? colors.onPrimary : colors.onSurfaceVariant }]}>
                  {t.tabSignUp}
                </Text>
              </Pressable>
            </View>

            {!!authNotice && (
              <View style={styles.noticeBox}>
                <Icon name="check_circle" size={18} color="#047857" />
                <Text style={styles.noticeText}>{authNotice}</Text>
              </View>
            )}

            {!!authError && (
              <View style={[styles.errorBox, { backgroundColor: colors.errorContainer, borderColor: colors.error + '4D' }]}>
                <Icon name="error" size={18} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.onErrorContainer }]}>{authError}</Text>
              </View>
            )}

            {authMode === 'signin' ? (
              <View style={{ gap: 14 }}>
                <View style={{ gap: 7 }}>
                  <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>{t.emailLabel}</Text>
                  <View style={fieldBox('signin-email')}>
                    <Icon name="mail" size={18} color={fieldIcon('signin-email')} />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder={t.emailPlaceholder}
                      placeholderTextColor={colors.outline}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      onFocus={() => setFocusedField('signin-email')}
                      onBlur={() => setFocusedField(null)}
                      style={[styles.input, { color: colors.onSurface }]}
                    />
                    {!!email && (
                      <Pressable
                        onPress={() => setEmail('')}
                        hitSlop={8}
                        style={styles.trailingBtn}
                        accessibilityRole="button"
                        accessibilityLabel="Clear email"
                      >
                        <Icon name="close" size={15} color={colors.onSurfaceVariant} />
                      </Pressable>
                    )}
                  </View>
                </View>

                <View style={{ gap: 7 }}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>{t.passwordLabel}</Text>
                    <Pressable
                      onPress={() => {
                        setForgotPasswordEmail(email);
                        setIsForgotPasswordOpen(true);
                      }}
                      hitSlop={8}
                    >
                      <Text style={[styles.link, { color: colors.primary }]}>{t.forgotPassword}</Text>
                    </Pressable>
                  </View>
                  <View style={fieldBox('signin-password')}>
                    <Icon name="lock" size={18} color={fieldIcon('signin-password')} />
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder={t.passwordPlaceholder}
                      placeholderTextColor={colors.outline}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      onFocus={() => setFocusedField('signin-password')}
                      onBlur={() => setFocusedField(null)}
                      style={[styles.input, { color: colors.onSurface }]}
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={8}
                      style={styles.trailingBtn}
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <Icon
                        name={showPassword ? 'visibility_off' : 'visibility'}
                        size={17}
                        color={focusedField === 'signin-password' ? colors.primary : colors.onSurfaceVariant}
                      />
                    </Pressable>
                  </View>
                </View>

                <Pressable style={styles.checkRow} onPress={() => setRememberMe(!rememberMe)}>
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: rememberMe ? colors.primary : colors.outlineVariant },
                      rememberMe && { backgroundColor: colors.primary },
                    ]}
                  >
                    {rememberMe && <Icon name="check" size={12} color={colors.onPrimary} />}
                  </View>
                  <Text style={[styles.checkText, { color: colors.onSurfaceVariant }]}>{t.rememberMe}</Text>
                </Pressable>

                <Pressable
                  onPress={handleEmailSignIn}
                  disabled={isLoading}
                  style={[
                    styles.cta,
                    isTablet && { paddingVertical: 16 },
                    { backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 },
                  ]}
                >
                  {isLoading ? (
                    <>
                      <ActivityIndicator size="small" color={colors.onPrimary} />
                      <Text style={[styles.ctaText, { color: colors.onPrimary }]}>{t.signingIn}</Text>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.ctaText, { color: colors.onPrimary }]}>{t.signInBtn}</Text>
                      <Icon name="arrow_forward" size={18} color={colors.onPrimary} />
                    </>
                  )}
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                <View style={{ gap: 7 }}>
                  <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>{t.fullNameLabel}</Text>
                  <View style={fieldBox('signup-name')}>
                    <Icon name="badge" size={18} color={fieldIcon('signup-name')} />
                    <TextInput
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder={t.fullNamePlaceholder}
                      placeholderTextColor={colors.outline}
                      autoComplete="name"
                      onFocus={() => setFocusedField('signup-name')}
                      onBlur={() => setFocusedField(null)}
                      style={[styles.input, { color: colors.onSurface }]}
                    />
                  </View>
                </View>

                <View style={{ gap: 7 }}>
                  <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>{t.emailLabel}</Text>
                  <View style={fieldBox('signup-email')}>
                    <Icon name="mail" size={18} color={fieldIcon('signup-email')} />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder={t.emailPlaceholder}
                      placeholderTextColor={colors.outline}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      onFocus={() => setFocusedField('signup-email')}
                      onBlur={() => setFocusedField(null)}
                      style={[styles.input, { color: colors.onSurface }]}
                    />
                  </View>
                </View>

                <View style={{ gap: 7 }}>
                  <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>{t.passwordLabel}</Text>
                  <View style={fieldBox('signup-password')}>
                    <Icon name="lock" size={18} color={fieldIcon('signup-password')} />
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder={t.passwordPlaceholder}
                      placeholderTextColor={colors.outline}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      onFocus={() => setFocusedField('signup-password')}
                      onBlur={() => setFocusedField(null)}
                      style={[styles.input, { color: colors.onSurface }]}
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={8}
                      style={styles.trailingBtn}
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <Icon
                        name={showPassword ? 'visibility_off' : 'visibility'}
                        size={17}
                        color={focusedField === 'signup-password' ? colors.primary : colors.onSurfaceVariant}
                      />
                    </Pressable>
                  </View>
                  {!!password && (
                    <View style={{ gap: 4, marginTop: 2 }}>
                      <View style={[styles.strengthTrack, { backgroundColor: colors.surfaceContainer }]}>
                        <View
                          style={[
                            styles.strengthFill,
                            { width: `${(strength.score / 3) * 100}%`, backgroundColor: strength.color },
                          ]}
                        />
                      </View>
                      <Text style={[styles.strengthText, { color: colors.onSurfaceVariant }]}>{strength.text}</Text>
                    </View>
                  )}
                </View>

                <View style={{ gap: 7 }}>
                  <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>{t.confirmPasswordLabel}</Text>
                  <View style={fieldBox('signup-confirm')}>
                    <Icon name="lock_reset" size={18} color={fieldIcon('signup-confirm')} />
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder={t.confirmPasswordPlaceholder}
                      placeholderTextColor={colors.outline}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      onFocus={() => setFocusedField('signup-confirm')}
                      onBlur={() => setFocusedField(null)}
                      style={[styles.input, { color: colors.onSurface }]}
                    />
                    <Pressable
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      hitSlop={8}
                      style={styles.trailingBtn}
                      accessibilityRole="button"
                      accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      <Icon
                        name={showConfirmPassword ? 'visibility_off' : 'visibility'}
                        size={17}
                        color={focusedField === 'signup-confirm' ? colors.primary : colors.onSurfaceVariant}
                      />
                    </Pressable>
                  </View>
                  {!!confirmPassword && password !== confirmPassword && (
                    <Text style={[styles.strengthText, { color: colors.error }]}>Passwords do not match</Text>
                  )}
                </View>

                <Pressable style={styles.termsRow} onPress={() => setAgreeTerms(!agreeTerms)}>
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: agreeTerms ? colors.primary : colors.outlineVariant },
                      agreeTerms && { backgroundColor: colors.primary },
                    ]}
                  >
                    {agreeTerms && <Icon name="check" size={12} color={colors.onPrimary} />}
                  </View>
                  <Text style={[styles.checkText, { color: colors.onSurfaceVariant }]}>{t.termsAgreement}</Text>
                </Pressable>

                <Pressable
                  onPress={handleEmailSignUp}
                  disabled={isLoading}
                  style={[
                    styles.cta,
                    isTablet && { paddingVertical: 16 },
                    { backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 },
                  ]}
                >
                  {isLoading ? (
                    <>
                      <ActivityIndicator size="small" color={colors.onPrimary} />
                      <Text style={[styles.ctaText, { color: colors.onPrimary }]}>{t.signingUp}</Text>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.ctaText, { color: colors.onPrimary }]}>{t.signUpBtn}</Text>
                      <Icon name="verified_user" size={18} color={colors.onPrimary} />
                    </>
                  )}
                </Pressable>
              </View>
            )}
          </View>

          <Text style={[styles.footer, isTablet && { fontSize: 11 }, { color: colors.onSurfaceVariant }]}>
            © 2026 DILAAL. All rights reserved.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot password */}
      <Modal visible={isForgotPasswordOpen} transparent animationType="fade" onRequestClose={() => setIsForgotPasswordOpen(false)}>
        <View style={[styles.modalOverlay, isTablet && { padding: 32 }]}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surfaceContainerLowest,
                borderColor: colors.outlineVariant + '4D',
                maxWidth: isTablet ? 440 : 400,
                padding: isTablet ? 24 : 20,
              },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.outlineVariant + '33' }]}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIcon, { backgroundColor: colors.primaryFixed }]}>
                  <Icon name="lock_reset" size={20} color={colors.onPrimaryFixed} />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.onSurface }]}>{t.forgotModalTitle}</Text>
                  <Text style={[styles.modalSub, { color: colors.onSurfaceVariant }]}>Account Recovery</Text>
                </View>
              </View>
              <Pressable
                onPress={() => {
                  setIsForgotPasswordOpen(false);
                  setForgotPasswordSubmitted(false);
                  setForgotError(null);
                }}
                style={[styles.modalClose, { backgroundColor: colors.surfaceContainer }]}
              >
                <Icon name="close" size={14} color={colors.outline} />
              </Pressable>
            </View>

            {!forgotPasswordSubmitted ? (
              <View style={{ gap: 14 }}>
                <Text style={[styles.modalDesc, { color: colors.onSurfaceVariant }]}>{t.forgotModalDesc}</Text>
                <View style={fieldBox('forgot-email')}>
                  <Icon name="mail" size={18} color={fieldIcon('forgot-email')} />
                  <TextInput
                    value={forgotPasswordEmail}
                    onChangeText={(value) => {
                      setForgotPasswordEmail(value);
                      if (forgotError) setForgotError(null);
                    }}
                    placeholder={t.emailPlaceholder}
                    placeholderTextColor={colors.outline}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onFocus={() => setFocusedField('forgot-email')}
                    onBlur={() => setFocusedField(null)}
                    style={[styles.input, { color: colors.onSurface }]}
                  />
                </View>
                {forgotError ? (
                  <Text style={[styles.modalSub, { color: colors.error }]}>{forgotError}</Text>
                ) : null}
                <Pressable
                  onPress={handleForgotPasswordSubmit}
                  disabled={isLoading}
                  style={[styles.modalCta, { backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 }]}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.onPrimary} />
                  ) : (
                    <Text style={[styles.ctaText, { color: colors.onPrimary }]}>{t.forgotModalBtn}</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <View style={styles.forgotSuccess}>
                <View style={styles.forgotSuccessIcon}>
                  <Icon name="mark_email_read" size={28} color="#059669" />
                </View>
                <Text style={[styles.forgotSuccessText, { color: colors.onSurface }]}>{t.forgotModalSuccess}</Text>
                <Pressable
                  onPress={() => {
                    setIsForgotPasswordOpen(false);
                    setForgotPasswordSubmitted(false);
                  }}
                  style={[styles.modalCta, { backgroundColor: colors.surfaceContainer }]}
                >
                  <Text style={[styles.ctaText, { color: colors.onSurface }]}>{t.close}</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {!!toastMessage && (
        <View style={[styles.toast, { bottom: insets.bottom + 24 }]}>
          <Icon name="check_circle" size={16} color="#34d399" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  topNav: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navInner: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  brandLogo: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 19, fontFamily: typography.extrabold, letterSpacing: 0.5 },
  brandTag: { fontSize: 9.5, marginTop: 2, maxWidth: 180 },
  topControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  langPill: { flexDirection: 'row', padding: 3, borderRadius: 10, borderWidth: 1 },
  langBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7 },
  langText: { fontSize: 11, fontFamily: typography.bold },
  themeBtn: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', gap: 14 },
  card: { width: '100%', alignSelf: 'center', borderWidth: 1 },
  cardHeader: { gap: 8 },
  title: { fontSize: 25, fontFamily: typography.extrabold, letterSpacing: -0.6 },
  subtitle: { fontSize: 12, lineHeight: 19 },
  modeToggle: { flexDirection: 'row', padding: 4, borderRadius: 14, borderWidth: 1, gap: 4 },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 11 },
  modeText: { fontSize: 11, fontFamily: typography.bold },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
  },
  noticeText: { flex: 1, fontSize: 11, fontFamily: typography.semibold, color: '#047857', lineHeight: 16 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 14, borderWidth: 1 },
  errorText: { flex: 1, fontSize: 11, fontFamily: typography.semibold, lineHeight: 16 },
  label: { fontSize: 11.5, fontFamily: typography.semibold, letterSpacing: 0.3 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { fontSize: 11.5, fontFamily: typography.bold },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 13,
    height: 50,
    borderRadius: 15,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 13.5, fontFamily: typography.medium, paddingVertical: 0 },
  trailingBtn: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 17, height: 17, borderRadius: 5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  checkText: { fontSize: 11, flexShrink: 1, lineHeight: 16 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 15,
    ...shadow.card,
  },
  ctaText: { fontSize: 14, fontFamily: typography.bold },
  strengthTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 2 },
  strengthText: { fontSize: 10, fontFamily: typography.semibold },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingTop: 2 },
  footer: { textAlign: 'center', fontSize: 10.5, letterSpacing: 0.2, paddingVertical: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: { width: '100%', maxWidth: 400, borderRadius: 24, borderWidth: 1, padding: 20, gap: 16, ...shadow.floating },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  modalIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 14, fontFamily: typography.bold },
  modalSub: { fontSize: 10, marginTop: 1 },
  modalClose: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalDesc: { fontSize: 12, lineHeight: 18 },
  modalCta: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  forgotSuccess: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  forgotSuccessIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(16,185,129,0.2)', alignItems: 'center', justifyContent: 'center' },
  forgotSuccessText: { fontSize: 12, fontFamily: typography.semibold, textAlign: 'center', lineHeight: 18 },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(15,23,42,0.92)',
    ...shadow.floating,
  },
  toastText: { color: '#ffffff', fontSize: 12, fontFamily: typography.bold, maxWidth: 280 },
});
