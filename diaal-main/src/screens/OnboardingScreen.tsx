import React, { useState } from 'react';
import { Language, UserRole } from '../types';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import heroImg from '../assets/images/login_hero_coastal_1792665320641.jpg';

interface OnboardingScreenProps {
  onLoginSuccess?: () => void;
  onGoToBroker?: () => void;
  language?: Language;
  onLanguageChange?: (lang: Language) => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = (props) => {
  const {
    language: appLanguage,
    setLanguage: setAppLanguage,
    setCurrentScreen,
    setActiveTab,
    loginWithEmail,
    registerWithEmail,
    isDarkMode,
    toggleDarkMode,
  } = useApp();

  const language = props.language ?? appLanguage;
  const setLanguage = (lang: Language) => {
    props.onLanguageChange?.(lang);
    setAppLanguage(lang);
  };

  const isRtl = language === 'ar';

  // Navigation callback
  const handleLoginSuccess = () => {
    if (props.onLoginSuccess) {
      props.onLoginSuccess();
    } else {
      setCurrentScreen('home');
      setActiveTab('home');
    }
  };

  // Auth Modes: 'signin' | 'signup'
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // Email & Password Auth State
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

  // Forgot password modal
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordSubmitted, setForgotPasswordSubmitted] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Common UI states
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3000);
  };

  // Trilingual copy matrix
  const t = {
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
      roleLabel: 'Dooro Doorkaaga Suuqa',
      roleBuyer: 'Iibsade / Maalgashade',
      roleSeller: 'Mulkiile Hantiile',
      roleBroker: 'Dilaal Shatiyaysan',
      roleReviewer: 'Kormeere Qaanuunka',
      termsAgreement: 'Waxaan oggolaaday Shuruudaha Adeegga DILAAL & Siyaasadda Xogta.',
      altExploreGuest: 'Ku sii wad Marti ahaan (Explore as Guest)',
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
      roleLabel: 'Select Your Marketplace Role',
      roleBuyer: 'Buyer / Investor',
      roleSeller: 'Property Owner / Seller',
      roleBroker: 'Dilaal Broker',
      roleReviewer: 'Cadastre Reviewer',
      termsAgreement: 'I accept the DILAAL Terms of Service & Data Policy.',
      altExploreGuest: 'Continue as Guest (Explore Marketplace)',
      forgotModalTitle: 'Reset Your Password',
      forgotModalDesc: 'Enter your registered email address and we will send password reset instructions if an account exists.',
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
      roleLabel: 'اختر دورك في المنصة',
      roleBuyer: 'مشتري / مستثمر',
      roleSeller: 'مالك عقار / بائع',
      roleBroker: 'وسيط عقاري',
      roleReviewer: 'مراجع السجل العقاري',
      termsAgreement: 'أوافق على شروط خدمة دلال وسياسة البيانات.',
      altExploreGuest: 'المتابعة كزائر (تصفح المنصة)',
      forgotModalTitle: 'استعادة كلمة المرور',
      forgotModalDesc: 'أدخل بريدك الإلكتروني المسجل وسنرسل تعليمات الاستعادة إذا كان هناك حساب مرتبط به.',
      forgotModalBtn: 'إرسال رابط الاستعادة',
      forgotModalSuccess:
        'تم تسجيل طلب استعادة كلمة المرور. إذا كان هناك حساب مرتبط بهذا البريد، فستُرسل تعليمات الاستعادة.',
      close: 'إغلاق',
    },
  }[language];

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: '', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass) || /[A-Z]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, text: t.passwordStrengthWeak, color: 'bg-rose-500' };
    if (score <= 3) return { score: 2, text: t.passwordStrengthMedium, color: 'bg-amber-500' };
    return { score: 3, text: t.passwordStrengthStrong, color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(password);

  // Submit Sign In with Email & Password
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthNotice(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setAuthError('Please enter your email address.');
      return;
    }
    if (!password) {
      setAuthError('Please enter your password.');
      return;
    }
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await loginWithEmail(cleanEmail, password);
      if (result.success) {
        showToast('Authentication confirmed. Welcome to DILAAL!');
        setTimeout(() => {
          handleLoginSuccess();
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

  // Submit Sign Up / Registration with Email & Password
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthNotice(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      setAuthError('Please enter your full legal name.');
      return;
    }
    if (!cleanEmail) {
      setAuthError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match. Please verify both entries.');
      return;
    }
    if (!agreeTerms) {
      setAuthError('Please accept the DILAAL Terms of Service and Data Policy.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await registerWithEmail(cleanEmail, password, cleanName);
      if (result.success) {
        // Registration never signs the user in: send them to the sign-in form
        // with their email prefilled.
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

  // Forgot password submit
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordEmail.trim()) {
      showToast('Please enter your registered email address.');
      return;
    }
    setIsLoading(true);
    setForgotError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail.trim(), {
      redirectTo: `${window.location.origin}/`,
    });
    setIsLoading(false);
    if (error) {
      setForgotError('Could not send the reset link. Check your connection and try again.');
      return;
    }
    setForgotPasswordSubmitted(true);
    showToast(t.forgotModalSuccess);
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-full w-full bg-surface text-on-surface flex flex-col justify-between overflow-x-hidden"
    >
      {/* Top Navbar */}
      <header className="w-full bg-surface/90 backdrop-blur-md border-b border-outline-variant/20 sticky top-0 z-30 px-4 py-3 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-sm ring-1 ring-primary-container">
            <span className="material-symbols-outlined text-[20px]">apartment</span>
          </div>
          <div>
            <span className="font-black text-lg tracking-wider text-on-surface">DILAAL</span>
            <p className="text-[10px] text-on-surface-variant hidden xs:block">{t.brandTag}</p>
          </div>
        </div>

        {/* Top Controls: Language Switcher & Dark Mode */}
        <div className="flex items-center gap-2">
          {/* Trilingual Pill */}
          <div className="flex items-center rounded-xl bg-surface-container-low p-1 border border-outline-variant/30 text-xs font-bold">
            {(['en', 'so', 'ar'] as Language[]).map((lng) => (
              <button
                key={lng}
                type="button"
                onClick={() => setLanguage(lng)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs ${
                  language === lng
                    ? 'bg-primary text-on-primary shadow-xs font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {lng === 'en' ? 'EN' : lng === 'so' ? 'SO' : 'عربي'}
              </button>
            ))}
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleDarkMode}
            aria-label="Toggle Dark Mode"
            className="w-8 h-8 rounded-xl bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer border border-outline-variant/30"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isDarkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Split Grid */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* LEFT COLUMN: Hero Image (Large screens) */}
        <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col gap-6 pr-4">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-outline-variant/30 aspect-[16/10] group">
            <img
              src={heroImg}
              alt="Coastal real estate"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
          </div>
        </div>

        {/* RIGHT COLUMN: Pure Email & Password Login / Register Center */}
        <div className="lg:col-span-6 xl:col-span-5 w-full flex flex-col justify-center">
          <div className="w-full bg-surface-container-lowest rounded-3xl p-6 sm:p-8 shadow-xl border border-outline-variant/25 flex flex-col gap-5">
            {/* Form Header */}
            <div className="flex flex-col gap-1 text-center sm:text-start">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                {authMode === 'signin' ? t.welcomeTitle : t.tabSignUp}
              </h1>
              <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                {authMode === 'signin' ? t.welcomeSub : t.brandTag}
              </p>
            </div>

            {/* Auth Mode Toggle: Sign In vs Sign Up */}
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-surface-container-low border border-outline-variant/30 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setAuthError(null);
                  setAuthNotice(null);
                }}
                className={`py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  authMode === 'signin'
                    ? 'bg-primary text-on-primary shadow-xs font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">login</span>
                <span>{t.tabSignIn}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setAuthError(null);
                  setAuthNotice(null);
                }}
                className={`py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  authMode === 'signup'
                    ? 'bg-primary text-on-primary shadow-xs font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">person_add</span>
                <span>{t.tabSignUp}</span>
              </button>
            </div>

            {/* Inline Success Notice */}
            {authNotice && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>{authNotice}</span>
              </div>
            )}

            {/* Inline Error Message */}
            {authError && (
              <div className="p-3 rounded-2xl bg-error-container text-on-error-container border border-error/30 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
                <span className="material-symbols-outlined text-[18px] text-error">error</span>
                <span>{authError}</span>
              </div>
            )}

            {/* EMAIL & PASSWORD AUTH FORMS */}
            <div className="flex flex-col gap-4">
              {authMode === 'signin' ? (
                /* ================= SIGN IN FORM ================= */
                <form onSubmit={handleEmailSignIn} className="flex flex-col gap-4">
                  {/* Email Field */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-on-surface">
                      {t.emailLabel}
                    </label>
                    <div className="flex items-center px-3.5 py-3 rounded-2xl bg-surface-container-low border border-outline-variant/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                      <span className="material-symbols-outlined text-outline text-[18px] mr-2">mail</span>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t.emailPlaceholder}
                        autoComplete="email"
                        className="w-full bg-transparent text-sm font-semibold text-on-surface placeholder:text-outline focus:outline-none"
                      />
                      {email && (
                        <button
                          type="button"
                          onClick={() => setEmail('')}
                          className="text-outline hover:text-on-surface cursor-pointer ml-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">clear</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-on-surface">
                        {t.passwordLabel}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotPasswordEmail(email);
                          setIsForgotPasswordOpen(true);
                        }}
                        className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                      >
                        {t.forgotPassword}
                      </button>
                    </div>
                    <div className="flex items-center px-3.5 py-3 rounded-2xl bg-surface-container-low border border-outline-variant/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                      <span className="material-symbols-outlined text-outline text-[18px] mr-2">lock</span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t.passwordPlaceholder}
                        autoComplete="current-password"
                        className="w-full bg-transparent text-sm font-semibold text-on-surface placeholder:text-outline focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label="Toggle password view"
                        className="text-outline hover:text-on-surface transition-colors ml-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Remember Device */}
                  <div className="flex items-center justify-between pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
                      />
                      <span className="text-xs text-on-surface-variant font-medium">
                        {t.rememberMe}
                      </span>
                    </label>
                  </div>

                  {/* Sign In CTA */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-4 rounded-2xl bg-primary hover:bg-primary/95 text-on-primary font-bold text-sm shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-1"
                  >
                    {isLoading ? (
                      <>
                        <span className="material-symbols-outlined text-[18px] animate-spin">
                          progress_activity
                        </span>
                        <span>{t.signingIn}</span>
                      </>
                    ) : (
                      <>
                        <span>{t.signInBtn}</span>
                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* ================= SIGN UP / REGISTER FORM ================= */
                <form onSubmit={handleEmailSignUp} className="flex flex-col gap-4">
                  {/* Full Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-on-surface">
                      {t.fullNameLabel}
                    </label>
                    <div className="flex items-center px-3.5 py-3 rounded-2xl bg-surface-container-low border border-outline-variant/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                      <span className="material-symbols-outlined text-outline text-[18px] mr-2">badge</span>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={t.fullNamePlaceholder}
                        autoComplete="name"
                        className="w-full bg-transparent text-sm font-semibold text-on-surface placeholder:text-outline focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Email Field */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-on-surface">
                      {t.emailLabel}
                    </label>
                    <div className="flex items-center px-3.5 py-3 rounded-2xl bg-surface-container-low border border-outline-variant/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                      <span className="material-symbols-outlined text-outline text-[18px] mr-2">mail</span>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t.emailPlaceholder}
                        autoComplete="email"
                        className="w-full bg-transparent text-sm font-semibold text-on-surface placeholder:text-outline focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Password Field with Strength Bar */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-on-surface">
                      {t.passwordLabel}
                    </label>
                    <div className="flex items-center px-3.5 py-3 rounded-2xl bg-surface-container-low border border-outline-variant/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                      <span className="material-symbols-outlined text-outline text-[18px] mr-2">lock</span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t.passwordPlaceholder}
                        autoComplete="new-password"
                        className="w-full bg-transparent text-sm font-semibold text-on-surface placeholder:text-outline focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label="Toggle password view"
                        className="text-outline hover:text-on-surface transition-colors ml-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {password && (
                      <div className="flex flex-col gap-1 mt-1">
                        <div className="flex items-center gap-1.5">
                          <div className="h-1 flex-1 rounded-full bg-surface-container overflow-hidden">
                            <div
                              className={`h-full ${strength.color} transition-all duration-300`}
                              style={{ width: `${(strength.score / 3) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-on-surface-variant">
                          {strength.text}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password Field */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-on-surface">
                      {t.confirmPasswordLabel}
                    </label>
                    <div className="flex items-center px-3.5 py-3 rounded-2xl bg-surface-container-low border border-outline-variant/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                      <span className="material-symbols-outlined text-outline text-[18px] mr-2">lock_reset</span>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t.confirmPasswordPlaceholder}
                        autoComplete="new-password"
                        className="w-full bg-transparent text-sm font-semibold text-on-surface placeholder:text-outline focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label="Toggle confirm password view"
                        className="text-outline hover:text-on-surface transition-colors ml-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showConfirmPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <span className="text-[10px] font-semibold text-error">
                        Passwords do not match
                      </span>
                    )}
                  </div>

                  {/* Terms Agreement Checkbox */}
                  <label className="flex items-start gap-2 pt-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
                    />
                    <span className="text-xs text-on-surface-variant leading-relaxed">
                      {t.termsAgreement}
                    </span>
                  </label>

                  {/* Create Account CTA */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-4 rounded-2xl bg-primary hover:bg-primary/95 text-on-primary font-bold text-sm shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-1"
                  >
                    {isLoading ? (
                      <>
                        <span className="material-symbols-outlined text-[18px] animate-spin">
                          progress_activity
                        </span>
                        <span>{t.signingUp}</span>
                      </>
                    ) : (
                      <>
                        <span>{t.signUpBtn}</span>
                        <span className="material-symbols-outlined text-[18px]">verified_user</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer Legal */}
      <footer className="w-full py-4 px-6 border-t border-outline-variant/20 bg-surface/80 text-center text-[11px] text-on-surface-variant flex items-center justify-center max-w-7xl mx-auto">
        <span>© 2026 DILAAL. All rights reserved.</span>
      </footer>

      {/* Forgot Password Modal */}
      {isForgotPasswordOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-3xl p-6 shadow-2xl border border-outline-variant/30 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">lock_reset</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-on-surface">{t.forgotModalTitle}</h3>
                  <p className="text-[10px] text-on-surface-variant">Account Recovery</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsForgotPasswordOpen(false);
                  setForgotPasswordSubmitted(false);
                }}
                className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-outline cursor-pointer hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {!forgotPasswordSubmitted ? (
              <form onSubmit={handleForgotPasswordSubmit} className="flex flex-col gap-4">
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {t.forgotModalDesc}
                </p>
                <div className="flex items-center px-3.5 py-3 rounded-2xl bg-surface-container-low border border-outline-variant/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                  <span className="material-symbols-outlined text-outline text-[18px] mr-2">mail</span>
                  <input
                    type="email"
                    required
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    placeholder={t.emailPlaceholder}
                    className="w-full bg-transparent text-sm font-semibold text-on-surface focus:outline-none"
                  />
                </div>
                {forgotError && (
                  <p className="flex items-start gap-1.5 text-[11px] font-semibold text-error">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    <span>{forgotError}</span>
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary/95 text-on-primary font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {isLoading ? (
                    <span className="material-symbols-outlined text-[18px] animate-spin">
                      progress_activity
                    </span>
                  ) : (
                    <span>{t.forgotModalBtn}</span>
                  )}
                </button>
              </form>
            ) : (
              <div className="flex flex-col items-center text-center gap-3 py-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[28px]">mark_email_read</span>
                </div>
                <p className="text-xs font-semibold text-on-surface leading-relaxed">
                  {t.forgotModalSuccess}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPasswordOpen(false);
                    setForgotPasswordSubmitted(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface cursor-pointer mt-1"
                >
                  {t.close}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-900 text-xs font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 border border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <span className="material-symbols-outlined text-[16px] text-emerald-400 dark:text-emerald-600">
            check_circle
          </span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
