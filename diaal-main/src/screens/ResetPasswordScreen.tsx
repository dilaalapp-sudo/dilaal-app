import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';

export const ResetPasswordScreen: React.FC = () => {
  const { t, setCurrentScreen, setActiveTab } = useApp();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="min-h-full w-full bg-surface text-on-surface flex flex-col">
      <header className="w-full border-b border-outline-variant/20">
        <div className="mx-auto w-full max-w-[560px] px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] bg-primary text-on-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">apartment</span>
          </div>
          <div className="min-w-0">
            <p className="text-[19px] font-extrabold tracking-wide leading-tight">DILAAL</p>
            <p className="text-[9.5px] text-on-surface-variant truncate">
              {t('appTagline', 'Real Estate & Asset Marketplace')}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-6">
        <div className="w-full max-w-[440px] rounded-3xl bg-surface-container-lowest border border-outline-variant/40 shadow-xl p-5 sm:p-7 flex flex-col gap-5">
          {isDone ? (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[30px]">lock_reset</span>
              </div>
              <h1 className="text-xl font-extrabold">{t('passwordUpdated', 'Password updated.')}</h1>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {t('resetPasswordSubtitle', 'Choose a new password for your DILAAL account.')}
              </p>
              <button
                type="button"
                onClick={continueToApp}
                className="w-full mt-1 py-3.5 rounded-2xl bg-primary text-on-primary text-sm font-bold shadow-md cursor-pointer hover:bg-primary/95 transition-colors"
              >
                {t('navHome', 'Home')}
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <h1 className="text-[22px] font-extrabold tracking-tight">
                  {t('resetPasswordTitle', 'Reset Password')}
                </h1>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {t('resetPasswordSubtitle', 'Choose a new password for your DILAAL account.')}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-on-surface-variant">
                    {t('newPassword', 'New password')}
                  </span>
                  <div className="flex items-center gap-2 rounded-2xl bg-surface-container-low border border-transparent focus-within:border-primary px-3.5 h-[50px]">
                    <span className="material-symbols-outlined text-[18px] text-outline">lock</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      className="w-full bg-transparent text-sm font-semibold focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="text-outline cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-on-surface-variant">
                    {t('confirmNewPassword', 'Confirm new password')}
                  </span>
                  <div className="flex items-center gap-2 rounded-2xl bg-surface-container-low border border-transparent focus-within:border-primary px-3.5 h-[50px]">
                    <span className="material-symbols-outlined text-[18px] text-outline">lock_reset</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      className="w-full bg-transparent text-sm font-semibold focus:outline-none"
                    />
                  </div>
                </label>

                {error && (
                  <p className="flex items-start gap-1.5 text-[11px] font-semibold text-error">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    <span>{error}</span>
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-3.5 rounded-2xl bg-primary text-on-primary text-sm font-bold shadow-md cursor-pointer hover:bg-primary/95 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <span className="material-symbols-outlined text-[18px] animate-spin">
                      progress_activity
                    </span>
                  ) : (
                    t('updatePassword', 'Update Password')
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentScreen('onboarding')}
                  className="text-[11px] font-bold text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  {t('backToSignIn', 'Back to sign in')}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
};
