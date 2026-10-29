import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

const deriveAuditReference = (dealNumber: string, assetId: string, agreedPrice: number, depositAmount: number): string => {
  const input = `${dealNumber}|${assetId}|${agreedPrice}|${depositAmount}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `AUD-${hash.toString(16).toUpperCase().padStart(8, '0')}`;
};

export const DealTrackerScreen: React.FC = () => {
  const {
    escrowDeal,
    payEscrowDeposit,
    advanceDealMilestone,
    setCurrentScreen,
    formatPrice,
    t,
  } = useApp();

  const [selectedChannel, setSelectedChannel] = useState<'mobile_money' | 'card' | 'bank_wire'>('mobile_money');
  const [mobilePhone, setMobilePhone] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSelectChannel = (channel: 'mobile_money' | 'card' | 'bank_wire') => {
    setSelectedChannel(channel);
    setPaymentError(null);
  };

  const handlePay = () => {
    setPaymentError(null);

    if (selectedChannel === 'mobile_money' && mobilePhone.replace(/\D/g, '').length < 7) {
      setPaymentError(t('enterMobileNumber', 'Enter the mobile money number that will receive the payment request.'));
      return;
    }
    if (selectedChannel === 'card' && cardNumber.replace(/\D/g, '').length < 12) {
      setPaymentError(t('enterCardNumber', 'Enter a valid card number.'));
      return;
    }

    setIsPaying(true);
    setTimeout(() => {
      setIsPaying(false);
      payEscrowDeposit(selectedChannel);
      setIsSuccessModalOpen(true);
    }, 1000);
  };

  const hasActiveDeal = Boolean(escrowDeal && escrowDeal.dealNumber && escrowDeal.dealNumber.trim() !== '');
  const completedMilestones = escrowDeal.milestones.filter((m) => m.status === 'completed').length;
  const totalMilestones = escrowDeal.milestones.length;
  const depositPercent =
    escrowDeal.agreedPrice > 0
      ? Math.round((escrowDeal.depositAmount / escrowDeal.agreedPrice) * 100)
      : null;
  const auditReference = deriveAuditReference(
    escrowDeal.dealNumber,
    escrowDeal.assetId,
    escrowDeal.agreedPrice,
    escrowDeal.depositAmount
  );

  if (!hasActiveDeal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-outline mb-4 shadow-sm">
          <span className="material-symbols-outlined text-3xl">gavel</span>
        </div>
        <h3 className="text-base font-bold text-on-surface">{t('noActiveEscrowTitle', 'No Active Escrow Transactions')}</h3>
        <p className="text-xs text-on-surface-variant max-w-sm mt-1.5 mb-6 leading-relaxed">
          {t('noActiveEscrowDesc', 'When a seller accepts your offer, deal milestones and payment status will appear here.')}
        </p>
        <button
          onClick={() => setCurrentScreen('home')}
          className="px-5 py-2.5 bg-primary text-on-primary text-xs font-bold rounded-2xl shadow-sm hover:bg-primary-container transition-colors cursor-pointer"
        >
          {t('exploreVerifiedListings', 'Explore Listings')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full bg-surface font-sans text-on-surface pb-32">
      <div className="max-w-2xl mx-auto w-full pb-10">
        {/* Deal Header Banner */}
        <div className="px-3.5 sm:px-gutter pt-3 pb-2">
          <div className="flex items-center justify-between gap-2 bg-surface-container-high px-3 sm:px-space-md py-2.5 rounded-2xl shadow-sm border border-outline-variant/20">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary-container animate-pulse flex-shrink-0"></span>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">
                  {t('activeDeals', 'Live Transaction')}
                </span>
                <span className="text-sm sm:text-base font-bold text-on-surface truncate">{t('dealTrackerTitle', 'Deal Tracker')}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-surface-container-lowest px-2.5 sm:px-3 py-1.5 rounded-full shadow-xs flex-shrink-0 border border-outline-variant/15">
              <span className="material-symbols-outlined text-primary text-[15px] sm:text-[16px]">verified</span>
              <span className="text-xs font-bold text-primary font-mono">{escrowDeal.dealNumber}</span>
            </div>
          </div>
        </div>

        {/* Property Overview Card */}
        <div className="px-3.5 sm:px-gutter my-2.5">
          <div className="bg-surface-container-lowest rounded-2xl p-3 sm:p-4 shadow-sm border border-outline-variant/20 flex flex-col gap-3">
            <div className="flex gap-3 items-start">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden flex-shrink-0 shadow-inner bg-surface-container flex items-center justify-center">
                {escrowDeal.assetImage ? (
                  <img
                    alt={escrowDeal.assetTitle}
                    className="w-full h-full object-cover"
                    src={escrowDeal.assetImage}
                  />
                ) : (
                  <span className="material-symbols-outlined text-outline text-3xl">apartment</span>
                )}
                {escrowDeal.assetLocation && (
                  <span className="absolute bottom-1 left-1 bg-primary/90 text-on-primary text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                    {escrowDeal.assetLocation}
                  </span>
                )}
              </div>

              <div className="flex flex-col justify-between flex-1 min-w-0">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-bold tracking-wide uppercase">
                      {escrowDeal.assetCategory}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold">
                      {t('underEscrow', 'Under Escrow')}
                    </span>
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-on-surface truncate">{escrowDeal.assetTitle}</h2>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-lg sm:text-xl font-bold text-primary">
                      {formatPrice(escrowDeal.agreedPrice)}
                    </span>
                    <span className="text-[11px] sm:text-xs text-on-surface-variant font-medium">
                      {t('agreedUsd', 'Agreed USD')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/15">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center flex-shrink-0 shadow-xs">
                  <span className="material-symbols-outlined text-[18px]">real_estate_agent</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] text-on-surface-variant">{t('brokerDilaalLabel', 'Broker / Dilaal')}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-on-surface truncate">
                      {escrowDeal.brokerName}
                    </span>
                    <span
                      className="material-symbols-outlined text-secondary text-[14px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      stars
                    </span>
                  </div>
                </div>
              </div>

              {escrowDeal.escrowOfficer && (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-surface-container-highest text-primary flex items-center justify-center flex-shrink-0 shadow-xs">
                    <span className="material-symbols-outlined text-[18px]">gavel</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-on-surface-variant">{t('escrowOfficerLabel', 'Escrow Officer')}</span>
                    <span className="text-xs font-bold text-on-surface truncate">
                      {escrowDeal.escrowOfficer}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sandbox Demonstration Banner & Legal Notice */}
        {escrowDeal.isSandbox && (
          <div className="px-3.5 sm:px-gutter my-2">
            <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 p-3 sm:p-space-md rounded-2xl shadow-sm flex items-start gap-2.5 border border-amber-200 dark:border-amber-800/60">
              <span
                className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[22px] sm:text-[24px] flex-shrink-0"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                science
              </span>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-100">
                    {t('sandboxTrackerTitle', 'Escrow Transaction Tracker (Sandbox Pilot)')}
                  </span>
                  <span className="text-[10px] bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 px-1.5 py-0.5 rounded font-bold">
                    {t('demoMode', 'Demo Mode')}
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                  <strong>{t('operationalDisclosure', 'Operational Disclosure:')}</strong>{' '}
                  {escrowDeal.sandboxNotice ||
                    t(
                      'sandboxFallbackNotice',
                      'This workflow demonstrates the multi-step closing process. Live fund custody requires integration with a licensed bank or authorized escrow trust in the relevant jurisdiction.'
                    )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Milestones Tracker */}
        <div className="px-3.5 sm:px-gutter mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-on-surface">{t('milestonesTitle', 'Milestones (Daba-galka)')}</h3>
            <span className="text-xs text-primary font-bold bg-primary-fixed px-2.5 py-1 rounded-full">
              {completedMilestones} of {totalMilestones} {t('completedLabel', 'Completed')}
            </span>
          </div>

          <div className="relative flex flex-col gap-4">
            <div className="absolute left-[19px] top-4 bottom-8 w-[2px] bg-primary-fixed"></div>

            {escrowDeal.milestones.map((m, index) => {
              const isCurrent = m.id === escrowDeal.currentMilestoneId;
              const isCompleted = m.status === 'completed';

              if (index === 0) {
                // First milestone: escrow deposit payment card
                return (
                  <div key={m.id} className="relative flex items-start gap-3">
                    <div
                      className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-lg flex-shrink-0 ${
                        isCompleted
                          ? 'bg-primary-container text-on-primary'
                          : 'bg-secondary-container text-on-secondary-container animate-bounce'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[22px]">
                        {isCompleted ? 'check' : 'account_balance_wallet'}
                      </span>
                    </div>

                    <div className="flex-1 bg-surface-container-lowest rounded-2xl p-space-md shadow-md border border-outline-variant/25 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full bg-secondary-container animate-ping"></span>
                          <span className="text-[11px] uppercase font-bold text-secondary">
                            {isCompleted ? 'Completed' : 'Active Milestone'}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            isCompleted
                              ? 'bg-primary-fixed text-primary'
                              : 'bg-secondary-fixed text-on-secondary-fixed'
                          }`}
                        >
                          {isCompleted ? 'Paid & Escrowed' : 'Action Needed'}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-on-surface">{m.title}</h4>
                      <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                        {depositPercent !== null
                          ? t('initialPercentDownPayment', 'Initial {percent}% Down Payment').replace(
                              '{percent}',
                              String(depositPercent)
                            )
                          : t('initialEscrowDeposit', 'Initial Escrow Deposit')}{' '}
                        (
                        <strong className="text-primary font-bold">
                          {formatPrice(escrowDeal.depositAmount)}
                        </strong>
                        ) {t('escrowHeldCopy', 'held securely in multi-signature escrow until title transfer.')}
                      </p>

                      {!escrowDeal.depositPaid ? (
                        <>
                          <div className="mt-3 flex flex-col gap-2">
                            <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider">
                              Select Payment Channel
                            </label>

                            {/* Mobile Money */}
                            <div
                              onClick={() => handleSelectChannel('mobile_money')}
                              className={`flex flex-col p-3 rounded-xl border transition-all cursor-pointer ${
                                selectedChannel === 'mobile_money'
                                  ? 'bg-primary/5 border-primary shadow-xs'
                                  : 'bg-surface-container-lowest border-outline-variant/20 hover:bg-surface-container-low'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center flex-shrink-0 shadow-xs">
                                    <span className="material-symbols-outlined text-[20px]">
                                      phone_android
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-on-surface">
                                      Mobile Money Instant
                                    </span>
                                    <span className="text-[10px] text-on-surface-variant">
                                      Hormuud EVC Plus • Telesom Zaad • Sahal
                                    </span>
                                  </div>
                                </div>
                                <div
                                  className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                    selectedChannel === 'mobile_money'
                                      ? 'bg-primary text-on-primary'
                                      : 'bg-surface-container-highest text-transparent'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[14px]">check</span>
                                </div>
                              </div>
                              {selectedChannel === 'mobile_money' && (
                                <div className="mt-2 pt-2 border-t border-primary/20 flex items-center gap-2">
                                  <span className="text-[10px] text-outline">{t('merchantPush', 'Merchant Push:')}</span>
                                  <input
                                    type="tel"
                                    value={mobilePhone}
                                    onChange={(e) => {
                                      setMobilePhone(e.target.value);
                                      setPaymentError(null);
                                    }}
                                    placeholder={t('mobileNumberPlaceholder', 'Enter mobile number')}
                                    className="bg-surface-container text-xs font-bold text-primary px-2 py-1 rounded-lg outline-none flex-1 font-mono"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Diaspora Global Card */}
                            <div
                              onClick={() => handleSelectChannel('card')}
                              className={`flex flex-col p-3 rounded-xl border transition-all cursor-pointer ${
                                selectedChannel === 'card'
                                  ? 'bg-primary/5 border-primary shadow-xs'
                                  : 'bg-surface-container-lowest border-outline-variant/20 hover:bg-surface-container-low'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-surface-container-high text-on-surface flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-[20px]">
                                      credit_card
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-on-surface">
                                      Diaspora Global Card
                                    </span>
                                    <span className="text-[10px] text-on-surface-variant">
                                      Visa • Mastercard • Apple Pay (Instant)
                                    </span>
                                  </div>
                                </div>
                                <div
                                  className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                    selectedChannel === 'card'
                                      ? 'bg-primary text-on-primary'
                                      : 'bg-surface-container-highest text-transparent'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[14px]">check</span>
                                </div>
                              </div>
                              {selectedChannel === 'card' && (
                                <div className="mt-2 pt-2 border-t border-primary/20 flex items-center gap-2">
                                  <span className="text-[10px] text-outline">{t('cardNumberLabel', 'Card:')}</span>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={cardNumber}
                                    onChange={(e) => {
                                      setCardNumber(e.target.value);
                                      setPaymentError(null);
                                    }}
                                    placeholder={t('cardNumberPlaceholder', 'Enter card number')}
                                    className="bg-surface-container text-xs font-bold text-primary px-2 py-1 rounded-lg outline-none flex-1 font-mono"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Bank Wire */}
                            <div
                              onClick={() => handleSelectChannel('bank_wire')}
                              className={`flex flex-col p-3 rounded-xl border transition-all cursor-pointer ${
                                selectedChannel === 'bank_wire'
                                  ? 'bg-primary/5 border-primary shadow-xs'
                                  : 'bg-surface-container-lowest border-outline-variant/20 hover:bg-surface-container-low'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-surface-container-high text-on-surface flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-[20px]">
                                      account_balance
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-on-surface">
                                      Bank Wire / Remittance
                                    </span>
                                    <span className="text-[10px] text-on-surface-variant">
                                      Dahabshiil • IBS Bank • Salaam Somali
                                    </span>
                                  </div>
                                </div>
                                <div
                                  className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                    selectedChannel === 'bank_wire'
                                      ? 'bg-primary text-on-primary'
                                      : 'bg-surface-container-highest text-transparent'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[14px]">check</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-2">
                            {paymentError && (
                              <div className="mb-2 p-2.5 rounded-xl bg-error-container text-on-error-container text-[11px] font-semibold flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-sm">error</span>
                                <span>{paymentError}</span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={handlePay}
                              disabled={isPaying}
                              className="w-full bg-primary-container hover:bg-tertiary-container text-on-primary py-3.5 px-4 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
                            >
                              {isPaying ? (
                                <span className="material-symbols-outlined text-lg animate-spin">
                                  progress_activity
                                </span>
                              ) : (
                                <>
                                  <span className="material-symbols-outlined text-[20px]">verified_user</span>
                                  <span>
                                    {t('paySecurelyToEscrow', 'Pay {amount} Securely to Escrow').replace(
                                      '{amount}',
                                      formatPrice(escrowDeal.depositAmount)
                                    )}
                                  </span>
                                </>
                              )}
                            </button>
                            <p className="text-[11px] text-center text-on-surface-variant mt-2 font-medium">
                              {t('securePaymentNotice', 'Bixi Lacagta Ammaanka • Sandbox payment session')}
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="mt-3 flex flex-col gap-2">
                          <div className="p-3 rounded-xl bg-primary-fixed/30 border border-primary-fixed flex items-center justify-between text-primary text-xs font-bold">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-base">task_alt</span>
                              <span>
                                {t('depositLockedInEscrow', 'Deposit {amount} Locked in Escrow').replace(
                                  '{amount}',
                                  formatPrice(escrowDeal.depositAmount)
                                )}
                              </span>
                            </div>
                            <button
                              onClick={() => setIsReceiptModalOpen(true)}
                              className="px-2.5 py-1 rounded-lg bg-primary text-on-primary text-[11px] font-bold cursor-pointer hover:bg-surface-tint"
                            >
                              {t('receipt', 'Receipt')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // Standard Milestones
              return (
                <div
                  key={m.id}
                  className={`relative flex items-start gap-3 ${!isCompleted && !isCurrent ? 'opacity-60' : ''}`}
                >
                  <div
                    className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shadow flex-shrink-0 ${
                      isCompleted
                        ? 'bg-primary-container text-on-primary'
                        : isCurrent
                        ? 'bg-secondary-container text-on-secondary-container'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {isCompleted ? 'check' : isCurrent ? 'workspace_premium' : 'lock'}
                    </span>
                  </div>

                  <div className="flex-1 bg-surface-container-lowest border border-outline-variant/20 p-3 rounded-xl shadow-xs flex items-center justify-between min-w-0">
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-on-surface truncate">{m.title}</h4>
                      <p className="text-[11px] text-on-surface-variant">{m.subtitle}</p>
                      {isCurrent && escrowDeal.depositPaid && !isCompleted && index < totalMilestones - 1 && (
                        <button
                          onClick={() =>
                            advanceDealMilestone(t('milestoneAdvancedByUser', 'Milestone marked advanced by the user.'))
                          }
                          className="mt-2 px-2.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-primary text-[10px] font-bold rounded-lg cursor-pointer"
                        >
                          {t('advanceStage', 'Advance to Next Stage')}
                        </button>
                      )}
                    </div>
                    {m.date ? (
                      <span className="text-[10px] font-semibold text-on-surface-variant bg-surface-container px-2 py-1 rounded-md flex-shrink-0">
                        {m.date}
                      </span>
                    ) : m.badge ? (
                      <span className="text-[10px] font-bold text-primary bg-primary-fixed px-2 py-1 rounded-md flex-shrink-0">
                        {m.badge}
                      </span>
                    ) : (
                      <span className="text-[10px] text-on-surface-variant bg-surface-container-highest px-2 py-1 rounded-md flex-shrink-0">
                        {isCompleted ? 'Done' : 'Pending'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Need Help with Escrow Banner */}
        <div className="px-gutter mt-6">
          <div className="bg-surface-container-low p-4 rounded-2xl flex items-center justify-between gap-3 shadow-xs border border-outline-variant/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-container-lowest text-primary flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[22px]">contact_support</span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-on-surface">{t('needHelpWithEscrow', 'Need Help with Escrow?')}</h4>
                <p className="text-[11px] text-on-surface-variant">
                  {t('supportTeamHelp', 'Contact the support team for help with this transaction.')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setCurrentScreen('safety')}
              className="bg-surface-container-lowest hover:bg-surface text-primary px-3 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 shrink-0 border border-outline-variant/20 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">contact_support</span>
              <span>{t('support', 'Support')}</span>
            </button>
          </div>
        </div>

        {/* Payment Confirmation Modal */}
        {isSuccessModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
            <div className="bg-surface-container-lowest rounded-3xl max-w-sm w-full p-6 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200 border border-outline-variant/20">
              <div className="w-14 h-14 rounded-full bg-primary-fixed text-primary flex items-center justify-center mb-3 shadow-inner">
                <span className="material-symbols-outlined text-[32px]">task_alt</span>
              </div>
              <h3 className="text-base font-bold text-on-surface">{t('escrowDepositRecorded', 'Escrow Deposit Recorded')}</h3>
              <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                {t('depositSessionRecorded', 'A sandbox deposit session for {amount} has been recorded for this deal. Selected channel: {channel}.').replace(
                  '{amount}',
                  formatPrice(escrowDeal.depositAmount)
                ).replace('{channel}', selectedChannel.replace('_', ' '))}
              </p>

              <div className="w-full bg-surface-container-low p-3 rounded-xl my-4 flex items-center justify-between border border-outline-variant/15">
                <span className="text-[11px] text-on-surface-variant font-medium">{t('dealReference', 'Deal Reference')}</span>
                <span className="text-xs text-primary font-bold font-mono">{escrowDeal.dealNumber}</span>
              </div>

              <div className="w-full grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIsSuccessModalOpen(false)}
                  className="py-3 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold rounded-xl cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setIsSuccessModalOpen(false);
                    setIsReceiptModalOpen(true);
                  }}
                  className="py-3 bg-primary-container text-on-primary text-xs font-bold rounded-xl shadow cursor-pointer hover:bg-tertiary-container"
                >
                  View Receipt
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Escrow Receipt Modal */}
        {isReceiptModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center px-4">
            <div className="bg-surface-container-lowest rounded-3xl max-w-md w-full p-6 shadow-2xl border border-outline-variant/30 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                <div>
                  <h3 className="text-sm font-bold text-on-surface">{t('escrowReceiptTitle', 'Escrow Deposit Receipt')}</h3>
                  <span className="text-[10px] text-outline font-mono">#{escrowDeal.dealNumber}</span>
                </div>
                <button
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-outline cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container-low border border-primary/20 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-outline">{t('escrowDepositLabel', 'Escrow Deposit:')}</span>
                  <span className="font-bold text-primary text-sm">{formatPrice(escrowDeal.depositAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-outline">{t('agreedPropertyValue', 'Agreed Property Value:')}</span>
                  <span className="font-bold">{formatPrice(escrowDeal.agreedPrice)}</span>
                </div>
                {escrowDeal.escrowOfficer && (
                  <div className="flex justify-between">
                    <span className="text-outline">{t('escrowOfficerLabel', 'Escrow Officer')}:</span>
                    <span className="font-bold">{escrowDeal.escrowOfficer}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-outline">{t('statusLabel', 'Status:')}</span>
                  <span className="font-bold text-secondary">
                    {t('depositLoggedStatus', 'Deposit Logged')}
                    {escrowDeal.isSandbox ? ` • ${t('sandboxState', 'Sandbox State')}` : ''}
                    {` • ${t('milestoneStatus', 'Milestone {current} of {total}')}`
                      .replace('{current}', String(escrowDeal.currentMilestoneId))
                      .replace('{total}', String(totalMilestones))}
                  </span>
                </div>
              </div>

              {escrowDeal.isSandbox && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-[11px] text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/40 leading-relaxed">
                  <strong>{t('sandboxPilotDisclosure', 'Sandbox Pilot Disclosure:')}</strong>{' '}
                  {escrowDeal.sandboxNotice ||
                    t(
                      'sandboxFallbackNotice',
                      'This workflow demonstrates the multi-step closing process. Live fund custody requires integration with a licensed bank or authorized escrow trust in the relevant jurisdiction.'
                    )}
                </div>
              )}

              <button
                onClick={() => {
                  const receiptData = {
                    title: 'DILAAL Escrow Transaction Summary',
                    reference: escrowDeal.dealNumber,
                    dealNumber: escrowDeal.dealNumber,
                    assetTitle: escrowDeal.assetTitle,
                    agreedPrice: escrowDeal.agreedPrice,
                    depositAmount: escrowDeal.depositAmount,
                    currentMilestoneId: escrowDeal.currentMilestoneId,
                    selectedChannel: escrowDeal.selectedPaymentChannel,
                    depositPaid: escrowDeal.depositPaid,
                    mode: escrowDeal.isSandbox ? 'Sandbox' : 'Standard',
                    timestamp: new Date().toISOString(),
                    auditReference: auditReference,
                    disclaimer:
                      escrowDeal.sandboxNotice ||
                      'This receipt reflects the current recorded deal state.',
                  };
                  const blob = new Blob([JSON.stringify(receiptData, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `DILAAL-ESCROW-RECEIPT-${escrowDeal.dealNumber.replace(/[^a-zA-Z0-9]/g, '')}.json`;
                  a.click();
                  URL.revokeObjectURL(url);

                  setToastMessage(t('escrowSummaryDownloaded', 'Escrow summary record downloaded.'));
                  setIsReceiptModalOpen(false);
                  setTimeout(() => setToastMessage(null), 2500);
                }}
                className="w-full py-3 bg-primary-container text-on-primary text-xs font-bold rounded-xl shadow cursor-pointer hover:bg-tertiary-container transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">download</span>
                <span>{t('downloadEscrowSummary', 'Download Escrow Summary (.json)')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Floating Toast */}
        {toastMessage && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-primary text-on-primary rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom duration-200">
            <span className="material-symbols-outlined text-base text-tertiary-fixed">receipt_long</span>
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
