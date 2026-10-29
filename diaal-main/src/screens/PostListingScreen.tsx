import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { categoryPresentation } from '../lib/categories';
import { SUPPORTED_COUNTRIES } from '../data/countries';
import { uploadListingPhoto, uploadVerificationDoc } from '../lib/storage';
import { CountryCode } from '../types';

const parseOptionalNumber = (value: string): number | undefined => {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const PostListingScreen: React.FC = () => {
  const { addListing, categories, setCurrentScreen, setActiveTab, selectedCountry, formatPrice, authUserId, t } = useApp();

  const [currentStep, setCurrentStep] = useState(1);
  const [category, setCategory] = useState('');

  useEffect(() => {
    if (categories.length === 0) return;
    if (!categories.some((item) => item.slug === category)) {
      setCategory(categories[0].slug);
    }
  }, [categories, category]);

  const selectedCategory = categories.find((item) => item.slug === category);
  const selectedCategoryName = selectedCategory?.name ?? category;
  const [sellingModel, setSellingModel] = useState<'broker' | 'direct'>('broker');

  // Common listing fields start empty; only user input is submitted.
  const [title, setTitle] = useState('');
  const [transactionType, setTransactionType] = useState<'sale' | 'rent'>('sale');
  const [price, setPrice] = useState('');
  const [listingCountry, setListingCountry] = useState<CountryCode>(selectedCountry);
  const [areaSize, setAreaSize] = useState('');
  const [locationName, setLocationName] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [description, setDescription] = useState('');
  const [docName, setDocName] = useState('');
  const [docPath, setDocPath] = useState('');
  const [docMime, setDocMime] = useState('');
  const [docSize, setDocSize] = useState('');
  const [docUploading, setDocUploading] = useState(false);
  const [registryNumber, setRegistryNumber] = useState('');
  const [authorityName, setAuthorityName] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);

  // Category-Specific Detail Fields:
  // House / Villa
  const [beds, setBeds] = useState('');
  const [baths, setBaths] = useState('');
  const [floors, setFloors] = useState('');
  const [garage, setGarage] = useState('');
  const [waterSource, setWaterSource] = useState('');
  const [powerSource, setPowerSource] = useState('');

  // Land / Plots
  const [plotDimensions, setPlotDimensions] = useState('');
  const [zoning, setZoning] = useState('');
  const [beaconsStatus, setBeaconsStatus] = useState('');
  const [boundaryFencing, setBoundaryFencing] = useState('');
  const [roadAccess, setRoadAccess] = useState('');
  const [topography, setTopography] = useState('');

  // Vehicle / Auto
  const [makeModel, setMakeModel] = useState('');
  const [carYear, setCarYear] = useState('');
  const [mileage, setMileage] = useState('');
  const [transmission, setTransmission] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [driveType, setDriveType] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [customsStatus, setCustomsStatus] = useState('');
  const [carCondition, setCarCondition] = useState('');

  // Rental Unit
  const [rentalBeds, setRentalBeds] = useState('');
  const [rentalBaths, setRentalBaths] = useState('');
  const [furnishing, setFurnishing] = useState('');
  const [floorLevel, setFloorLevel] = useState('');
  const [leaseTerm, setLeaseTerm] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [utilitiesPolicy, setUtilitiesPolicy] = useState('');
  const [rentalPower, setRentalPower] = useState('');

  // Commercial Property
  const [commercialType, setCommercialType] = useState('');
  const [commercialFloors, setCommercialFloors] = useState('');
  const [parkingBays, setParkingBays] = useState('');
  const [powerGenerator, setPowerGenerator] = useState('');
  const [streetFrontage, setStreetFrontage] = useState('');
  const [safetyCompliance, setSafetyCompliance] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const resetCategoryFields = () => {
    setAreaSize('');
    setDocName('');
    setDocPath('');
    setDocMime('');
    setDocSize('');
    setRegistryNumber('');
    setAuthorityName('');

    setBeds('');
    setBaths('');
    setFloors('');
    setGarage('');
    setWaterSource('');
    setPowerSource('');

    setPlotDimensions('');
    setZoning('');
    setBeaconsStatus('');
    setBoundaryFencing('');
    setRoadAccess('');
    setTopography('');

    setMakeModel('');
    setCarYear('');
    setMileage('');
    setTransmission('');
    setFuelType('');
    setDriveType('');
    setPlateNumber('');
    setCustomsStatus('');
    setCarCondition('');

    setRentalBeds('');
    setRentalBaths('');
    setFurnishing('');
    setFloorLevel('');
    setLeaseTerm('');
    setSecurityDeposit('');
    setUtilitiesPolicy('');
    setRentalPower('');

    setCommercialType('');
    setCommercialFloors('');
    setParkingBays('');
    setPowerGenerator('');
    setStreetFrontage('');
    setSafetyCompliance('');
  };

  // Switch category and clear only the category-specific fields.
  const handleSelectCategory = (newCat: string) => {
    if (newCat === category) return;
    setCategory(newCat);
    resetCategoryFields();
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    if (!authUserId) {
      setValidationError('Sign in again before uploading photos.');
      return;
    }

    setIsUploadingPhotos(true);
    setValidationError(null);
    const results = await Promise.all(files.map((file) => uploadListingPhoto(file, authUserId)));
    setIsUploadingPhotos(false);

    const urls = results.map((r) => r.url).filter((url): url is string => Boolean(url));
    if (urls.length > 0) setPhotos((prev) => [...prev, ...urls]);

    const failed = results.find((r) => r.error);
    if (failed) {
      setValidationError(
        urls.length > 0
          ? `Some photos could not be uploaded (${failed.error}).`
          : failed.error || 'Photos could not be uploaded. Please try again.'
      );
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setDocName(file.name);
    setDocPath('');
    setDocMime('');
    setDocSize('');
    setValidationError(null);
    if (!authUserId) {
      setValidationError('Sign in again before uploading documents.');
      return;
    }

    setDocUploading(true);
    const result = await uploadVerificationDoc(file, authUserId);
    setDocUploading(false);
    if (result.error) {
      setValidationError(result.error);
      return;
    }
    setDocPath(result.path || '');
    setDocMime(file.type || '');
    setDocSize(result.size || '');
  };

  const validateCurrentStep = (): boolean => {
    setValidationError(null);

    if (currentStep === 1) {
      if (!category) {
        setValidationError('Please select an asset category.');
        return false;
      }
    } else if (currentStep === 2) {
      if (!title.trim() || title.trim().length < 5) {
        setValidationError('Listing headline must be at least 5 characters long.');
        return false;
      }
      const numPrice = Number(price);
      if (!price.trim() || isNaN(numPrice) || numPrice <= 0) {
        setValidationError('Please specify a valid price greater than 0.');
        return false;
      }
      if (category === 'car' && !makeModel.trim()) {
        setValidationError('Please specify vehicle make and model.');
        return false;
      }
    } else if (currentStep === 3) {
      if (!locationName.trim()) {
        setValidationError('Please enter a city or municipal district.');
        return false;
      }
    } else if (currentStep === 4) {
      if (photos.length === 0) {
        setValidationError('Please include at least one photo of the asset.');
        return false;
      }
    } else if (currentStep === 5) {
      if (!docName.trim() || !registryNumber.trim()) {
        setValidationError('Please provide official registration number and document reference.');
        return false;
      }
    }

    return true;
  };

  const scrollToValidationError = () => {
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, 5));
    } else {
      scrollToValidationError();
    }
  };

  const handlePrevStep = () => {
    setValidationError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Top-left back: previous step, or leave the wizard from step 1.
  const handleBack = () => {
    if (currentStep > 1) {
      handlePrevStep();
      return;
    }
    setActiveTab('home');
    setCurrentScreen('home');
  };

  const buildCategorySpecs = (): Record<string, string> => {
    const specs: Record<string, string> = {};
    const put = (key: string, value: string) => {
      if (value.trim()) specs[key] = value.trim();
    };

    if (category === 'house') {
      put('floorLevel', floors);
      put('garage', garage);
      put('waterSource', waterSource);
      put('powerBackup', powerSource);
    } else if (category === 'land') {
      put('plotDimensions', plotDimensions);
      put('zoning', zoning);
      put('beaconsStatus', beaconsStatus);
      put('boundaryFencing', boundaryFencing);
      put('roadAccess', roadAccess);
      put('topography', topography);
    } else if (category === 'car') {
      put('makeModel', makeModel);
      put('year', carYear);
      put('mileage', mileage);
      put('transmission', transmission);
      put('fuelType', fuelType);
      put('driveType', driveType);
      put('plateNumber', plateNumber);
      put('customsStatus', customsStatus);
      put('condition', carCondition);
    } else if (category === 'rental') {
      put('furnishing', furnishing);
      put('floorLevel', floorLevel);
      put('leaseTerm', leaseTerm);
      put('securityDeposit', securityDeposit);
      put('utilitiesPolicy', utilitiesPolicy);
      put('powerBackup', rentalPower);
    } else if (category === 'commercial') {
      put('commercialType', commercialType);
      put('stories', commercialFloors);
      put('parkingBays', parkingBays);
      put('generatorCapacity', powerGenerator);
      put('streetFrontage', streetFrontage);
      put('safetyCompliance', safetyCompliance);
    }

    return specs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCurrentStep()) {
      scrollToValidationError();
      return;
    }
    if (!authUserId) {
      setValidationError(
        'You need to be signed in to publish a listing. Open the Profile tab, sign in, then submit again.'
      );
      scrollToValidationError();
      return;
    }

    setIsSubmitting(true);

    const categorySpecs = buildCategorySpecs();
    const hasVerificationEvidence = Boolean(docName.trim() || registryNumber.trim());

    addListing({
      title: title.trim(),
      price: Number(price),
      priceType: transactionType,
      countryCode: listingCountry,
      location: locationName.trim(),
      locationDetails: [streetAddress.trim(), locationName.trim()].filter(Boolean).join(', '),
      registryNumber: registryNumber.trim(),
      category,
      image: photos[0] || '',
      gallery: photos,
      beds:
        category === 'house'
          ? parseOptionalNumber(beds)
          : category === 'rental'
          ? parseOptionalNumber(rentalBeds)
          : undefined,
      baths:
        category === 'house'
          ? parseOptionalNumber(baths)
          : category === 'rental'
          ? parseOptionalNumber(rentalBaths)
          : undefined,
      area: category === 'car' ? mileage.trim() : areaSize.trim(),
      description: description.trim(),
      categorySpecs,
      amenities: [],
      verificationEvidence: hasVerificationEvidence
        ? [
            {
              evidenceType: category === 'car' ? 'tax_clearance' : 'title_deed',
              documentRef: docName.trim(),
              documentPath: docPath || undefined,
              mimeType: docMime || undefined,
              fileSize: docSize || undefined,
              registryNumber: registryNumber.trim() || undefined,
              issuerAuthority: authorityName.trim(),
              status: 'submitted',
            },
          ]
        : [],
    });

    setIsSubmitting(false);
    setToastMessage(`${selectedCategoryName || category} listing submitted for review.`);
    setShowToast(true);

    setTimeout(() => {
      setShowToast(false);
      setActiveTab('home');
      setCurrentScreen('home');
    }, 1200);
  };

  return (
    <div className="flex flex-col w-full bg-surface font-sans text-on-surface pb-32">
      <div className="max-w-2xl mx-auto w-full px-3.5 sm:px-gutter pb-8 flex flex-col gap-4">
        {/* Wizard Progress Header */}
        <section className="flex flex-col gap-2 mt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                type="button"
                onClick={handleBack}
                className="w-9 h-9 -ml-1.5 rounded-2xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container active:scale-95 transition-all cursor-pointer shrink-0"
                title={t('back', 'Back')}
                aria-label="Back"
              >
                <span className="material-symbols-outlined text-[22px]">arrow_back</span>
              </button>
              <span className="text-xs font-bold uppercase tracking-wider text-secondary truncate">
                Step {currentStep} of 5
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface text-xs font-bold shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              {currentStep * 20}% Completed
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-on-surface">
              {currentStep === 1 && t('categoryLabel', 'Asset Category & Model')}
              {currentStep === 2 && t('specifications', 'Details & Pricing')}
              {currentStep === 3 && t('locationLabel', 'Location & Cadastral Area')}
              {currentStep === 4 && t('uploadDeedPhotos', 'High-Resolution Media')}
              {currentStep === 5 && t('deedAuditEvidence', 'Title Deed & Verification Audit')}
            </h1>
            <span className="text-xs text-outline font-medium">{t('navPost', 'Post Listing')}</span>
          </div>

          {/* Stepper Progress Bar */}
          <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden relative">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
              style={{ width: `${currentStep * 20}%` }}
            ></div>
          </div>

          {/* Quick Step Indicators */}
          <div className="flex items-center justify-between pt-1">
            {[1, 2, 3, 4, 5].map((stepNum) => (
              <button
                key={stepNum}
                type="button"
                onClick={() => {
                  if (stepNum < currentStep || validateCurrentStep()) {
                    setCurrentStep(stepNum);
                  }
                }}
                className={`text-[11px] font-bold px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                  currentStep === stepNum
                    ? 'bg-primary text-on-primary'
                    : currentStep > stepNum
                    ? 'bg-primary-fixed text-primary'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                {stepNum}. {stepNum === 1 ? t('categoryLabel', 'Category') : stepNum === 2 ? t('specifications', 'Details') : stepNum === 3 ? t('locationLabel', 'Location') : stepNum === 4 ? t('uploadDeedPhotos', 'Photos') : t('deedAuditEvidence', 'Deed')}
              </button>
            ))}
          </div>
        </section>

        {validationError && (
          <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{validationError}</span>
          </div>
        )}

        {/* STEP 1: Category & Selling Model */}
        {currentStep === 1 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                {t('categoryLabel', 'Select Asset Category')}
              </label>
              {categories.length === 0 ? (
                <div className="p-4 rounded-2xl bg-surface-container-lowest border border-dashed border-outline-variant/30 text-center text-xs text-on-surface-variant">
                  No categories are available yet. An administrator must add one in the admin panel.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {categories.map((item) => {
                    const presentation = categoryPresentation(item);
                    const label = presentation.translationKey
                      ? t(presentation.translationKey, item.name)
                      : item.name;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectCategory(item.slug)}
                        className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                          category === item.slug
                            ? 'bg-primary-container text-on-primary border-primary shadow-md ring-2 ring-primary/20 scale-[1.02]'
                            : 'bg-surface-container-lowest text-on-surface border-outline-variant/20 hover:bg-surface-container'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[26px] mb-1">{presentation.icon}</span>
                        <span className="text-xs font-bold leading-tight">{label}</span>
                        {presentation.tag && (
                          <span className={`text-[10px] font-medium mt-0.5 ${category === item.slug ? 'text-on-primary/80' : 'text-outline'}`}>
                            {presentation.tag}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Category Context Summary Banner */}
            {category && (
              <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/25 flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-[22px] mt-0.5">info</span>
                <div>
                  <h4 className="text-xs font-bold text-on-surface">
                    {category === 'house' && 'Residential House / Villa Workflow'}
                    {category === 'land' && 'Land & Plot Listing Workflow'}
                    {category === 'car' && 'Vehicle Listing Details'}
                    {category === 'rental' && 'Residential Tenancy & Lease Agreement Workflow'}
                    {category === 'commercial' && 'Commercial Plaza & Business Space Workflow'}
                    {!['house', 'land', 'car', 'rental', 'commercial'].includes(category) &&
                      `${selectedCategoryName} Listing Workflow`}
                  </h4>
                  <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
                    {category === 'house' && 'Configured for residential compounds, bedrooms, bathrooms, and municipal title deeds.'}
                    {category === 'land' && 'Configured for boos dimensions (e.g. 20x20m), boundary survey pegs, zoning, and cadastral maps.'}
                    {category === 'car' && 'Configured for vehicle make/model, model year, odometer mileage, 4WD specs, and port customs duty.'}
                    {category === 'rental' && 'Configured for monthly rental terms, furnishing status, security deposits, and tenancy contracts.'}
                    {category === 'commercial' && 'Configured for commercial plazas, usable floor area, heavy generators, and trade zoning.'}
                    {!['house', 'land', 'car', 'rental', 'commercial'].includes(category) &&
                      (selectedCategory?.description ||
                        'Fill in the details, location, photos, and ownership documents to submit this listing for review.')}
                  </p>
                </div>
              </div>
            )}

            {/* Representation Model */}
            <div className="flex flex-col gap-2 pt-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                Representation Model
              </label>
              <div
                onClick={() => setSellingModel('broker')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  sellingModel === 'broker'
                    ? 'bg-surface-container-lowest border-primary shadow-md ring-1 ring-primary/20'
                    : 'bg-surface-container-low border-outline-variant/20'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">verified_user</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-on-surface">Assign to a Broker</span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    The broker coordinates buyer inquiries, site visits, and the deal workflow.
                  </p>
                </div>
              </div>

              <div
                onClick={() => setSellingModel('direct')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  sellingModel === 'direct'
                    ? 'bg-surface-container-lowest border-primary shadow-md ring-1 ring-primary/20'
                    : 'bg-surface-container-low border-outline-variant/20'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-surface-container-high text-on-surface flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">person</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold text-on-surface">Direct Owner Listing</span>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    List directly as the owner. You provide the title documents and coordinate site visits.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Category-Specific Details & Pricing */}
        {currentStep === 2 && (
          <div className="flex flex-col gap-4">
            {/* Common: Headline Title */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface">Listing Headline / Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('listingTitlePlaceholder', 'Describe the asset in a short headline')}
                className="w-full p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Pricing & Country Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface">Transaction Type</label>
                <select
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value as 'sale' | 'rent')}
                  className="w-full p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs sm:text-sm font-semibold outline-none"
                >
                  <option value="sale">For Sale (Fixed Price)</option>
                  <option value="rent">For Rent (Monthly)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface">Country Jurisdiction</label>
                <select
                  value={listingCountry}
                  onChange={(e) => {
                    const code = e.target.value as CountryCode;
                    setListingCountry(code);
                    if (SUPPORTED_COUNTRIES[code]) {
                      setAuthorityName(SUPPORTED_COUNTRIES[code].registryAuthority);
                    }
                  }}
                  className="w-full p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs sm:text-sm font-semibold outline-none"
                >
                  {Object.entries(SUPPORTED_COUNTRIES).map(([code, c]) => (
                    <option key={code} value={code}>
                      {c.name} ({code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface">
                {transactionType === 'rent' ? 'Monthly Rent' : 'Asking Price'} ({SUPPORTED_COUNTRIES[listingCountry]?.currency || 'USD'})
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary font-bold">
                  {SUPPORTED_COUNTRIES[listingCountry]?.currencySymbol || '$'}
                </span>
                <input
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={t('pricePlaceholder', 'Enter price')}
                  className="w-full pl-8 pr-4 py-3 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              {price.trim() !== '' && (
                <span className="text-[11px] text-outline">
                  {formatPrice(Number(price) || 0)} {transactionType === 'rent' ? '/ month' : ''}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface">{t('listingDescription', 'Listing Description (optional)')}</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('listingDescriptionPlaceholder', 'Describe the asset, condition, and key terms in your own words.')}
                className="w-full p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>

            {/* DYNAMIC FIELDS PER CATEGORY */}

            {/* 1. HOUSE / VILLA */}
            {category === 'house' && (
              <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">home</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface">
                    Villa & Compound Specifications
                  </h3>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Bedrooms</label>
                    <input
                      type="number"
                      min={0}
                      value={beds}
                      onChange={(e) => setBeds(e.target.value)}
                      placeholder="e.g. 4"
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Bathrooms</label>
                    <input
                      type="number"
                      min={0}
                      value={baths}
                      onChange={(e) => setBaths(e.target.value)}
                      placeholder="e.g. 3"
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Lot Area</label>
                    <input
                      type="text"
                      value={areaSize}
                      onChange={(e) => setAreaSize(e.target.value)}
                      placeholder="e.g. 380 sqm"
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Stories / Floors</label>
                    <input
                      type="text"
                      value={floors}
                      onChange={(e) => setFloors(e.target.value)}
                      placeholder="e.g. 2 Floors"
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Garage Parking</label>
                    <input
                      type="text"
                      value={garage}
                      onChange={(e) => setGarage(e.target.value)}
                      placeholder="e.g. 2 Cars"
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Water Supply</label>
                    <input
                      type="text"
                      value={waterSource}
                      onChange={(e) => setWaterSource(e.target.value)}
                      placeholder="e.g. Borehole water"
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Power / Electricity</label>
                    <input
                      type="text"
                      value={powerSource}
                      onChange={(e) => setPowerSource(e.target.value)}
                      placeholder="e.g. Solar and city grid"
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. LAND / PLOTS */}
            {category === 'land' && (
              <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-lg">square_foot</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface">
                    Land Parcel & Cadastral Boos Specs
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Plot Dimensions (Cabbir)</label>
                    <input
                      type="text"
                      value={plotDimensions}
                      onChange={(e) => setPlotDimensions(e.target.value)}
                      placeholder="e.g. 20m x 20m"
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Total Land Area</label>
                    <input
                      type="text"
                      value={areaSize}
                      onChange={(e) => setAreaSize(e.target.value)}
                      placeholder="e.g. 400 sqm"
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Zoning Classification</label>
                    <select
                      value={zoning}
                      onChange={(e) => setZoning(e.target.value)}
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    >
                      <option value="">{t('selectOption', 'Select zoning')}</option>
                      <option value="Residential (Guryo Deggan)">Residential (Guryo Deggan)</option>
                      <option value="Commercial (Goobo Ganacsi)">Commercial (Goobo Ganacsi)</option>
                      <option value="Mixed Use (Degmo & Ganacsi)">Mixed Use (Degmo & Ganacsi)</option>
                      <option value="Agricultural (Beer)">Agricultural (Beer)</option>
                      <option value="Industrial / Warehouse (Bakhaar)">Industrial / Warehouse (Bakhaar)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Cadastral Beacons Survey</label>
                    <select
                      value={beaconsStatus}
                      onChange={(e) => setBeaconsStatus(e.target.value)}
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    >
                      <option value="">{t('selectOption', 'Select status')}</option>
                      <option value="Cadastral Beacons Marked & Surveyed">Cadastral Beacons Marked & Surveyed</option>
                      <option value="GPS Corner Pegs Installed">GPS Corner Pegs Installed</option>
                      <option value="Municipal Boundary Verified">Municipal Boundary Verified</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Boundary / Fencing</label>
                    <select
                      value={boundaryFencing}
                      onChange={(e) => setBoundaryFencing(e.target.value)}
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    >
                      <option value="">{t('selectOption', 'Select boundary type')}</option>
                      <option value="Perimeter Stone Walled (Darbi Leh)">Perimeter Stone Walled (Darbi Leh)</option>
                      <option value="Walled & Gated (Darbi & Albaab)">Walled & Gated (Darbi & Albaab)</option>
                      <option value="Wire Fenced Boundary">Wire Fenced Boundary</option>
                      <option value="Open Demarcated Plot (Banaan)">Open Demarcated Plot (Banaan)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Road Access</label>
                    <input
                      type="text"
                      value={roadAccess}
                      onChange={(e) => setRoadAccess(e.target.value)}
                      placeholder="e.g. 15m paved access road"
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. VEHICLE / AUTO */}
            {category === 'car' && (
              <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">directions_car</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface">
                    Vehicle Specifications & Customs Status
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Make & Model</label>
                    <input
                      type="text"
                      value={makeModel}
                      onChange={(e) => setMakeModel(e.target.value)}
                      placeholder="e.g. Toyota Land Cruiser"
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Model Year</label>
                    <input
                      type="text"
                      value={carYear}
                      onChange={(e) => setCarYear(e.target.value)}
                      placeholder="e.g. 2023"
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Mileage</label>
                    <input
                      type="text"
                      value={mileage}
                      onChange={(e) => setMileage(e.target.value)}
                      placeholder="e.g. 42,000 km"
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Transmission</label>
                    <select
                      value={transmission}
                      onChange={(e) => setTransmission(e.target.value)}
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    >
                      <option value="">{t('selectOption', 'Select')}</option>
                      <option value="Automatic">Automatic</option>
                      <option value="Manual">Manual</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Fuel Type</label>
                    <select
                      value={fuelType}
                      onChange={(e) => setFuelType(e.target.value)}
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    >
                      <option value="">{t('selectOption', 'Select')}</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Petrol">Petrol</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Drive System</label>
                    <select
                      value={driveType}
                      onChange={(e) => setDriveType(e.target.value)}
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    >
                      <option value="">{t('selectOption', 'Select')}</option>
                      <option value="4WD / 4x4 Full-Time">4WD / 4x4 Full-Time</option>
                      <option value="All-Wheel Drive (AWD)">All-Wheel Drive (AWD)</option>
                      <option value="Rear-Wheel Drive (RWD)">Rear-Wheel Drive (RWD)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Port Customs Duty (Kastamka)</label>
                    <select
                      value={customsStatus}
                      onChange={(e) => setCustomsStatus(e.target.value)}
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    >
                      <option value="">{t('selectOption', 'Select status')}</option>
                      <option value="100% Port Duty Cleared & Road Tax Paid">100% Duty Cleared & Road Tax Paid</option>
                      <option value="In Bonded Yard (Customs Clearance Upon Sale)">Bonded Yard (Upon Sale)</option>
                      <option value="Direct Port Import Delivery">Direct Port Import Delivery</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 4. RENTAL UNIT */}
            {category === 'rental' && (
              <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-lg">vpn_key</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface">
                    Apartment & Tenancy Terms
                  </h3>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Bedrooms</label>
                    <input
                      type="number"
                      min={0}
                      value={rentalBeds}
                      onChange={(e) => setRentalBeds(e.target.value)}
                      placeholder="e.g. 3"
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Bathrooms</label>
                    <input
                      type="number"
                      min={0}
                      value={rentalBaths}
                      onChange={(e) => setRentalBaths(e.target.value)}
                      placeholder="e.g. 2"
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Unit Area</label>
                    <input
                      type="text"
                      value={areaSize}
                      onChange={(e) => setAreaSize(e.target.value)}
                      placeholder="e.g. 160 sqm"
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Furnishing Status</label>
                    <select
                      value={furnishing}
                      onChange={(e) => setFurnishing(e.target.value)}
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    >
                      <option value="">{t('selectOption', 'Select furnishing')}</option>
                      <option value="Fully Furnished (Qalabaysan)">Fully Furnished (Qalabaysan)</option>
                      <option value="Semi-Furnished">Semi-Furnished</option>
                      <option value="Unfurnished">Unfurnished</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Floor Level</label>
                    <input
                      type="text"
                      value={floorLevel}
                      onChange={(e) => setFloorLevel(e.target.value)}
                      placeholder="e.g. 3rd Floor (with Elevator)"
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Security Deposit</label>
                    <input
                      type="text"
                      value={securityDeposit}
                      onChange={(e) => setSecurityDeposit(e.target.value)}
                      placeholder="e.g. 1 month rent"
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Minimum Lease</label>
                    <select
                      value={leaseTerm}
                      onChange={(e) => setLeaseTerm(e.target.value)}
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    >
                      <option value="">{t('selectOption', 'Select lease term')}</option>
                      <option value="6 Months Minimum">6 Months Minimum</option>
                      <option value="1 Year Lease">1 Year Lease</option>
                      <option value="Month-to-Month (Flexible)">Month-to-Month (Flexible)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 5. COMMERCIAL PROPERTY */}
            {category === 'commercial' && (
              <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">apartment</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface">
                    Commercial Plaza & Building Specs
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Commercial Type</label>
                    <select
                      value={commercialType}
                      onChange={(e) => setCommercialType(e.target.value)}
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    >
                      <option value="">{t('selectOption', 'Select type')}</option>
                      <option value="Commercial Retail & Office Plaza">Retail & Office Plaza</option>
                      <option value="Stand-Alone Commercial Building">Commercial Building</option>
                      <option value="Warehouse & Storage (Bakhaar)">Warehouse & Storage</option>
                      <option value="Hotel & Guesthouse Facility">Hotel & Guesthouse</option>
                      <option value="Corporate Office Floor">Corporate Office Floor</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Total Usable Area</label>
                    <input
                      type="text"
                      value={areaSize}
                      onChange={(e) => setAreaSize(e.target.value)}
                      placeholder="e.g. 850 sqm"
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Stories / Floors</label>
                    <input
                      type="text"
                      value={commercialFloors}
                      onChange={(e) => setCommercialFloors(e.target.value)}
                      placeholder="e.g. 4 Stories"
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Dedicated Parking</label>
                    <input
                      type="text"
                      value={parkingBays}
                      onChange={(e) => setParkingBays(e.target.value)}
                      placeholder="e.g. 12 Dedicated Bays"
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Backup Generator</label>
                    <input
                      type="text"
                      value={powerGenerator}
                      onChange={(e) => setPowerGenerator(e.target.value)}
                      placeholder="e.g. 150kVA Standby Generator"
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface">Street Frontage</label>
                    <input
                      type="text"
                      value={streetFrontage}
                      onChange={(e) => setStreetFrontage(e.target.value)}
                      placeholder="e.g. Main Commercial Boulevard"
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Location */}
        {currentStep === 3 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface">
                {category === 'car' ? 'Inspection Yard / Location City' : 'City / Municipal District'}
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Hodhan, Mogadishu or Westlands, Nairobi"
                className="w-full p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface">
                {category === 'car' ? 'Showroom / Physical Yard Address' : 'Detailed Address & Landmark Coordinates'}
              </label>
              <input
                type="text"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="e.g. KM4 Roundabout, Wadada Maka Al-Mukarama"
                className="w-full p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">location_on</span>
              <div>
                <h4 className="text-xs font-bold text-on-surface">
                  {category === 'car' ? 'Vehicle Inspection Verification Notice' : 'Cadastral Boundary Mapping Notice'}
                </h4>
                <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
                  {category === 'car'
                    ? 'Physical vehicle chassis inspection and mechanical audit will take place at this designated address prior to escrow finalization.'
                    : 'Exact geographic beacon coordinates will be cross-referenced with municipal cadastral maps by an authorized title examiner during the audit.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Media Upload */}
        {currentStep === 4 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-on-surface">
                {category.toUpperCase()} Media Photos ({photos.length})
              </label>
              <label className="text-xs text-primary font-bold flex items-center gap-1 hover:underline cursor-pointer">
                <span className="material-symbols-outlined text-base">add_photo_alternate</span>
                <span>{t('uploadPhotos', 'Add Photos')}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            {photos.length === 0 ? (
              <label className="rounded-xl border-2 border-dashed border-outline-variant/40 bg-surface-container-lowest min-h-[180px] flex flex-col items-center justify-center gap-1.5 p-6 text-center cursor-pointer hover:bg-surface-container transition-colors">
                <span className="material-symbols-outlined text-4xl text-outline">add_photo_alternate</span>
                <span className="text-xs font-bold text-on-surface">
                  {t('noPhotosUploaded', 'No photos uploaded yet')}
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  {t('uploadFromDevice', 'Add photos of the actual asset from your device.')}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {photos.map((photoUrl, i) => (
                  <div
                    key={i}
                    className="relative aspect-video sm:aspect-square rounded-xl overflow-hidden shadow-sm bg-surface-container border border-outline-variant/20 group"
                  >
                    <img alt={`${category} ${i + 1}`} className="w-full h-full object-cover" src={photoUrl} />
                    {i === 0 && (
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-primary text-on-primary text-[9px] font-bold">
                        Cover Photo
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(i)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer hover:bg-error transition-colors"
                    >
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {isUploadingPhotos && (
              <div className="flex items-center gap-2 text-on-surface-variant text-[11px] font-semibold">
                <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                <span>{t('uploadingPhotos', 'Uploading photos…')}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-surface-container-low text-xs text-on-surface-variant flex items-center gap-2 border border-outline-variant/15">
              <span className="material-symbols-outlined text-primary text-base">info</span>
              <span>Images must clearly reflect the actual {category} without misleading filters.</span>
            </div>
          </div>
        )}

        {/* STEP 5: Title Deed / Registration & Audit */}
        {currentStep === 5 && (
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-2xl bg-primary-fixed/20 border border-primary/30 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">workspace_premium</span>
                <h3 className="text-sm font-bold text-primary">
                  {category === 'car'
                    ? 'Vehicle Title & Customs Documents'
                    : category === 'rental'
                    ? 'Tenancy & Ownership Documents'
                    : category === 'commercial'
                    ? 'Commercial Property Documents'
                    : 'Title Deed Documents'}
                </h3>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {category === 'car'
                  ? 'Provide the logbook number and customs clearance receipts.'
                  : category === 'rental'
                  ? 'Provide the titleholder registration or tenancy agreement.'
                  : category === 'commercial'
                  ? 'Provide the commercial title documents and operating licenses.'
                  : 'Provide the registry reference and supporting documents.'}
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface">
                {category === 'car'
                  ? 'Chassis / VIN & Plate Registration Number'
                  : category === 'rental'
                  ? 'Tenancy Agreement / Title Registry Filing Number'
                  : category === 'commercial'
                  ? 'Commercial Building Cadastral Filing Number'
                  : 'Title Registry Filing Number'}
              </label>
              <input
                type="text"
                value={registryNumber}
                onChange={(e) => setRegistryNumber(e.target.value)}
                placeholder={t('registryNumberPlaceholder', 'Enter registry or registration number')}
                className="w-full p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs sm:text-sm font-mono font-bold outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface">
                {category === 'car' ? 'Issuing Transport & Port Customs Authority' : 'Issuing Land / Municipal Authority'}
              </label>
              <input
                type="text"
                value={authorityName}
                onChange={(e) => setAuthorityName(e.target.value)}
                placeholder={t('authorityPlaceholder', 'Enter issuing authority')}
                className="w-full p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs sm:text-sm font-semibold outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface">
                {category === 'car' ? 'Vehicle Logbook & Customs Document File' : 'Official Document Reference File'}
              </label>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/20">
                <span className="material-symbols-outlined text-primary text-lg">description</span>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder={t('documentRefPlaceholder', 'Document name or reference')}
                  className="flex-1 min-w-0 text-xs font-semibold outline-none bg-transparent"
                />
                <label className="text-[11px] font-bold text-primary flex items-center gap-1 cursor-pointer shrink-0 hover:underline">
                  <span className="material-symbols-outlined text-base">attach_file</span>
                  <span>{t('attachFile', 'Attach')}</span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleDocumentUpload}
                    className="hidden"
                  />
                </label>
              </div>
              {docUploading ? (
                <p className="text-[11px] text-on-surface-variant/70 pt-0.5">
                  {t('uploadingDocument', 'Uploading document…')}
                </p>
              ) : docPath ? (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold pt-0.5">
                  {t('documentAttached', 'Document attached securely for reviewer access.')}
                </p>
              ) : null}
            </div>
          </div>
        )}

        {/* Bottom Wizard Actions */}
        {validationError && (
          <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs font-semibold flex items-start gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{validationError}</span>
          </div>
        )}
        <section className="flex items-center gap-3 pt-3 border-t border-surface-container">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-4 py-3 rounded-xl bg-surface-container text-on-surface text-xs font-bold cursor-pointer hover:bg-surface-container-high transition-colors"
            >
              {t('back', 'Previous')}
            </button>
          )}

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="flex-1 py-3 px-4 rounded-xl bg-primary-container text-on-primary text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all cursor-pointer hover:bg-tertiary-container"
            >
              <span>{t('seeAll', 'Continue')} ({currentStep + 1}/5)</span>
              <span className="material-symbols-outlined text-base rtl:rotate-180">arrow_forward</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-xl bg-primary-container hover:bg-tertiary-container text-on-primary text-xs font-bold flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
              ) : (
                <>
                  <span>{t('submitForAudit', 'Submit for Cadastral Audit')}</span>
                  <span className="material-symbols-outlined text-base">task_alt</span>
                </>
              )}
            </button>
          )}
        </section>

        {showToast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-primary text-on-primary rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom duration-200">
            <span className="material-symbols-outlined text-base">task_alt</span>
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
