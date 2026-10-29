import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

interface MatchmakerModalProps {
  onClose: () => void;
}

const CITY_COUNTRY: Record<string, string> = {
  Mogadishu: 'SO',
  Hargeisa: 'SO',
  Garowe: 'SO',
};

const ASSET_CATEGORIES: Record<string, string[]> = {
  villa: ['house', 'rental'],
  land: ['land'],
  cars: ['car'],
};

const BUDGET_BOUNDS: Record<string, [number, number]> = {
  '<$50k': [0, 50000],
  '$100k - $250k': [100000, 250000],
  '$250k+': [250000, Number.POSITIVE_INFINITY],
};

export const MatchmakerModal: React.FC<MatchmakerModalProps> = ({ onClose }) => {
  const { brokers, listings, openBrokerProfile, openChatWithBroker, t } = useApp();
  const [targetCity, setTargetCity] = useState('Mogadishu');
  const [assetType, setAssetType] = useState('villa');
  const [budgetRange, setBudgetRange] = useState('$100k - $250k');
  const [matched, setMatched] = useState(false);

  const cityCountry = CITY_COUNTRY[targetCity];
  const categorySet = ASSET_CATEGORIES[assetType] || [];
  const [minBudget, maxBudget] = BUDGET_BOUNDS[budgetRange] || [0, Number.POSITIVE_INFINITY];

  const matchingBrokers = brokers.filter((broker) => {
    const regionMatch =
      !cityCountry ||
      broker.countryCode === cityCountry ||
      (broker.coverage || '').toLowerCase().includes(targetCity.toLowerCase()) ||
      (broker.diasporaCoverage || '').toLowerCase().includes(targetCity.toLowerCase());
    if (!regionMatch) return false;

    const brokerListings = listings.filter((listing) => listing.brokerId === broker.id);
    if (brokerListings.length === 0) return true;

    const assetMatch = brokerListings.some((listing) => categorySet.includes(listing.category));
    const budgetMatch = brokerListings.some(
      (listing) => listing.price >= minBudget && listing.price <= maxBudget
    );
    return assetMatch && budgetMatch;
  });

  const handleMatch = () => {
    setMatched(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md max-h-[88vh] overflow-y-auto bg-surface-container-lowest rounded-3xl p-5 sm:p-6 shadow-2xl border border-outline-variant/30 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-2 border-b border-surface-container">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
              <span className="material-symbols-outlined text-[20px]">verified_user</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-on-surface">{t('matchmakerTitle', 'Diaspora Dilaal Matchmaker')}</h3>
              <p className="text-[10px] text-outline">{t('matchmakerSub', 'Match with a licensed homeland broker')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-outline cursor-pointer hover:bg-surface-container-high"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {!matched ? (
          <div className="flex flex-col gap-3">
            {/* City */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface">{t('homelandRegion', 'Homeland Region / City')}</label>
              <div className="grid grid-cols-3 gap-2">
                {['Mogadishu', 'Hargeisa', 'Garowe'].map((city) => (
                  <button
                    key={city}
                    onClick={() => setTargetCity(city)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      targetCity === city
                        ? 'bg-primary-container text-on-primary'
                        : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>

            {/* Asset Type */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface">{t('assetCategory', 'Asset Category')}</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'villa', label: t('housesAndVillas', 'Houses & Villas') },
                  { id: 'land', label: t('landAndPlots', 'Land & Boos') },
                  { id: 'cars', label: t('cars', 'Vehicles') },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setAssetType(item.id)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      assetType === item.id
                        ? 'bg-primary-container text-on-primary'
                        : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Budget */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface">{t('targetInvestmentTier', 'Target Investment Tier')}</label>
              <div className="grid grid-cols-3 gap-2">
                {['<$50k', '$100k - $250k', '$250k+'].map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setBudgetRange(tier)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      budgetRange === tier
                        ? 'bg-secondary-container text-on-secondary-container'
                        : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleMatch}
              className="mt-2 w-full py-3.5 bg-primary-container hover:bg-tertiary-container text-on-primary text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
            >
              <span>{t('findBrokerAction', 'Find a Matching Broker')}</span>
              <span className="material-symbols-outlined text-[16px] rtl:rotate-180">arrow_forward</span>
            </button>
          </div>
        ) : matchingBrokers.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col gap-4 text-center items-center py-4">
            <div className="w-16 h-16 rounded-full bg-surface-container text-outline flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[32px]">search_off</span>
            </div>
            <div>
              <h4 className="text-base font-bold text-on-surface">{t('noBrokerMatch', 'No brokers match yet')}</h4>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                {t('noBrokerMatchDesc', 'No registered broker matches this city, asset type, and budget. Try adjusting your filters or browse the marketplace.')}
              </p>
            </div>
            <div className="w-full grid grid-cols-2 gap-2">
              <button
                onClick={() => setMatched(false)}
                className="py-3 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold rounded-xl cursor-pointer"
              >
                {t('adjustFilters', 'Adjust Filters')}
              </button>
              <button
                onClick={onClose}
                className="py-3 bg-primary-container text-on-primary text-xs font-bold rounded-xl shadow cursor-pointer hover:bg-tertiary-container"
              >
                {t('close', 'Close')}
              </button>
            </div>
          </div>
        ) : (
          /* Real broker results */
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">
                {t('matchingBrokers', 'Matching Brokers')} ({matchingBrokers.length})
              </span>
              <button
                onClick={() => setMatched(false)}
                className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
              >
                {t('adjustFilters', 'Adjust Filters')}
              </button>
            </div>

            {matchingBrokers.map((broker) => (
              <div
                key={broker.id}
                className="w-full p-3 rounded-2xl bg-surface-container-low border border-outline-variant/15 flex flex-col gap-2.5"
              >
                <div className="flex items-center gap-2.5">
                  {broker.avatar ? (
                    <img
                      alt={broker.name}
                      className="w-11 h-11 rounded-full object-cover shrink-0"
                      src={broker.avatar}
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-surface-container-high text-outline flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[22px]">person</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-on-surface truncate">{broker.name}</h4>
                    <p className="text-[11px] text-on-surface-variant truncate">{broker.title}</p>
                  </div>
                </div>

                <div className="text-[11px] text-on-surface-variant space-y-1">
                  {(broker.coverage || broker.diasporaCoverage) && (
                    <div className="flex justify-between gap-2">
                      <span className="text-outline">{t('coverage', 'Coverage')}:</span>
                      <span className="font-semibold text-on-surface text-right truncate">
                        {[broker.coverage, broker.diasporaCoverage].filter(Boolean).join(' • ')}
                      </span>
                    </div>
                  )}
                  {broker.licenseNumber && (
                    <div className="flex justify-between gap-2">
                      <span className="text-outline">{t('licenseNumber', 'License')}:</span>
                      <span className="font-bold text-on-surface">{broker.licenseNumber}</span>
                    </div>
                  )}
                  {(broker.rating > 0 || broker.reviewsCount > 0) && (
                    <div className="flex justify-between gap-2">
                      <span className="text-outline">{t('rating', 'Rating')}:</span>
                      <span className="font-bold text-on-surface">
                        {broker.rating} ({broker.reviewsCount} {t('reviews', 'reviews')})
                      </span>
                    </div>
                  )}
                  {broker.responseTime && (
                    <div className="flex justify-between gap-2">
                      <span className="text-outline">{t('responseTime', 'Response Time')}:</span>
                      <span className="font-bold text-on-surface">{broker.responseTime}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      onClose();
                      openBrokerProfile(broker.id);
                    }}
                    className="py-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold rounded-xl cursor-pointer"
                  >
                    {t('viewFullProfile', 'View Full Profile')}
                  </button>
                  <button
                    onClick={() => {
                      onClose();
                      openChatWithBroker(broker.id);
                    }}
                    className="py-2.5 bg-primary-container text-on-primary text-xs font-bold rounded-xl shadow cursor-pointer hover:bg-tertiary-container"
                  >
                    {t('startDirectChat', 'Start Direct Chat')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
