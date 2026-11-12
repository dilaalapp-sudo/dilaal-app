import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useApp } from '../context/AppContext';
import { categoryPresentation } from '../lib/categories';
import { SUPPORTED_COUNTRIES } from '../data/countries';
import { uploadListingPhoto, uploadVerificationDoc } from '../lib/storage';
import { CountryCode } from '../types';
import { Icon } from '../components/Icon';
import { useColors, typography, shadow } from '../theme';

const parseOptionalNumber = (value: string): number | undefined => {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

interface FieldInputProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  numeric?: boolean;
  multiline?: boolean;
  mono?: boolean;
  flex?: boolean;
}

const FieldInput: React.FC<FieldInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  numeric,
  multiline,
  mono,
  flex,
}) => {
  const colors = useColors();
  return (
    <View style={[styles.field, flex ? styles.flex1 : null]}>
      <Text style={[styles.label, { color: colors.onSurface }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.outline}
        keyboardType={numeric ? 'numeric' : 'default'}
        multiline={multiline}
        autoCapitalize="none"
        style={[
          styles.input,
          multiline ? styles.inputMultiline : null,
          mono ? styles.inputMono : null,
          {
            backgroundColor: colors.surfaceContainerLowest,
            borderColor: colors.outlineVariant + '33',
            color: colors.onSurface,
          },
        ]}
      />
    </View>
  );
};

interface SelectOption {
  label: string;
  value: string;
}

interface SelectBoxProps {
  label: string;
  value: string;
  placeholder?: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  flex?: boolean;
}

const SelectBox: React.FC<SelectBoxProps> = ({ label, value, placeholder, options, onChange, flex }) => {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={[styles.field, flex ? styles.flex1 : null]}>
      <Text style={[styles.label, { color: colors.onSurface }]}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.select,
          {
            backgroundColor: colors.surfaceContainerLowest,
            borderColor: colors.outlineVariant + '33',
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[styles.selectText, { color: selected ? colors.onSurface : colors.outline }]}
        >
          {selected ? selected.label : placeholder}
        </Text>
        <Icon name="expand_more" size={16} color={colors.onSurfaceVariant} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setOpen(false)}>
          <View style={[styles.sheetCard, { backgroundColor: colors.surfaceContainerLowest }]}>
            <View style={[styles.sheetHeader, { borderBottomColor: colors.outlineVariant + '33' }]}>
              <Text style={[styles.sheetTitle, { color: colors.onSurface }]}>{label}</Text>
              <Pressable
                onPress={() => setOpen(false)}
                style={[styles.sheetClose, { backgroundColor: colors.surfaceContainer }]}
              >
                <Icon name="close" size={16} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>
            <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
              {options.map((option) => {
                const active = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    style={[
                      styles.sheetOption,
                      active ? { backgroundColor: colors.primary + '12' } : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.sheetOptionText,
                        { color: active ? colors.primary : colors.onSurface },
                      ]}
                    >
                      {option.label}
                    </Text>
                    {active ? <Icon name="check" size={16} color={colors.primary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const StepGroup: React.FC<{ icon: string; iconColor: string; title: string; children: React.ReactNode }> = ({
  icon,
  iconColor,
  title,
  children,
}) => {
  const colors = useColors();
  return (
    <View
      style={[
        styles.group,
        { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant + '33' },
      ]}
    >
      <View style={styles.groupHeader}>
        <Icon name={icon} size={17} color={iconColor} />
        <Text style={[styles.groupTitle, { color: colors.onSurface }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
};

const ZONING_OPTIONS: SelectOption[] = [
  { value: 'Residential (Guryo Deggan)', label: 'Residential (Guryo Deggan)' },
  { value: 'Commercial (Goobo Ganacsi)', label: 'Commercial (Goobo Ganacsi)' },
  { value: 'Mixed Use (Degmo & Ganacsi)', label: 'Mixed Use (Degmo & Ganacsi)' },
  { value: 'Agricultural (Beer)', label: 'Agricultural (Beer)' },
  { value: 'Industrial / Warehouse (Bakhaar)', label: 'Industrial / Warehouse (Bakhaar)' },
];

const BEACONS_OPTIONS: SelectOption[] = [
  { value: 'Cadastral Beacons Marked & Surveyed', label: 'Cadastral Beacons Marked & Surveyed' },
  { value: 'GPS Corner Pegs Installed', label: 'GPS Corner Pegs Installed' },
  { value: 'Municipal Boundary Verified', label: 'Municipal Boundary Verified' },
];

const BOUNDARY_OPTIONS: SelectOption[] = [
  { value: 'Perimeter Stone Walled (Darbi Leh)', label: 'Perimeter Stone Walled (Darbi Leh)' },
  { value: 'Walled & Gated (Darbi & Albaab)', label: 'Walled & Gated (Darbi & Albaab)' },
  { value: 'Wire Fenced Boundary', label: 'Wire Fenced Boundary' },
  { value: 'Open Demarcated Plot (Banaan)', label: 'Open Demarcated Plot (Banaan)' },
];

const TRANSMISSION_OPTIONS: SelectOption[] = [
  { value: 'Automatic', label: 'Automatic' },
  { value: 'Manual', label: 'Manual' },
];

const FUEL_OPTIONS: SelectOption[] = [
  { value: 'Diesel', label: 'Diesel' },
  { value: 'Petrol', label: 'Petrol' },
  { value: 'Hybrid', label: 'Hybrid' },
];

const DRIVE_OPTIONS: SelectOption[] = [
  { value: '4WD / 4x4 Full-Time', label: '4WD / 4x4 Full-Time' },
  { value: 'All-Wheel Drive (AWD)', label: 'All-Wheel Drive (AWD)' },
  { value: 'Rear-Wheel Drive (RWD)', label: 'Rear-Wheel Drive (RWD)' },
];

const CUSTOMS_OPTIONS: SelectOption[] = [
  { value: '100% Port Duty Cleared & Road Tax Paid', label: '100% Duty Cleared & Road Tax Paid' },
  { value: 'In Bonded Yard (Customs Clearance Upon Sale)', label: 'Bonded Yard (Upon Sale)' },
  { value: 'Direct Port Import Delivery', label: 'Direct Port Import Delivery' },
];

const FURNISHING_OPTIONS: SelectOption[] = [
  { value: 'Fully Furnished (Qalabaysan)', label: 'Fully Furnished (Qalabaysan)' },
  { value: 'Semi-Furnished', label: 'Semi-Furnished' },
  { value: 'Unfurnished', label: 'Unfurnished' },
];

const LEASE_OPTIONS: SelectOption[] = [
  { value: '6 Months Minimum', label: '6 Months Minimum' },
  { value: '1 Year Lease', label: '1 Year Lease' },
  { value: 'Month-to-Month (Flexible)', label: 'Month-to-Month (Flexible)' },
];

const COMMERCIAL_TYPE_OPTIONS: SelectOption[] = [
  { value: 'Commercial Retail & Office Plaza', label: 'Retail & Office Plaza' },
  { value: 'Stand-Alone Commercial Building', label: 'Commercial Building' },
  { value: 'Warehouse & Storage (Bakhaar)', label: 'Warehouse & Storage' },
  { value: 'Hotel & Guesthouse Facility', label: 'Hotel & Guesthouse' },
  { value: 'Corporate Office Floor', label: 'Corporate Office Floor' },
];

export const PostListingScreen: React.FC = () => {
  const { addListing, categories, refreshCategories, setCurrentScreen, setActiveTab, selectedCountry, formatPrice, authUserId, t } =
    useApp();
  const colors = useColors();

  const [currentStep, setCurrentStep] = useState(1);
  const [category, setCategory] = useState('');

  useEffect(() => {
    void refreshCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (categories.length === 0) return;
    if (!categories.some((item) => item.slug === category)) {
      setCategory(categories[0].slug);
    }
  }, [categories, category]);

  const selectedCategory = categories.find((item) => item.slug === category);
  const selectedCategoryName = selectedCategory?.name ?? category;
  const [sellingModel, setSellingModel] = useState<'broker' | 'direct'>('broker');

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
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const [beds, setBeds] = useState('');
  const [baths, setBaths] = useState('');
  const [floors, setFloors] = useState('');
  const [garage, setGarage] = useState('');
  const [waterSource, setWaterSource] = useState('');
  const [powerSource, setPowerSource] = useState('');

  const [plotDimensions, setPlotDimensions] = useState('');
  const [zoning, setZoning] = useState('');
  const [beaconsStatus, setBeaconsStatus] = useState('');
  const [boundaryFencing, setBoundaryFencing] = useState('');
  const [roadAccess, setRoadAccess] = useState('');
  const [topography, setTopography] = useState('');

  const [makeModel, setMakeModel] = useState('');
  const [carYear, setCarYear] = useState('');
  const [mileage, setMileage] = useState('');
  const [transmission, setTransmission] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [driveType, setDriveType] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [customsStatus, setCustomsStatus] = useState('');
  const [carCondition, setCarCondition] = useState('');

  const [rentalBeds, setRentalBeds] = useState('');
  const [rentalBaths, setRentalBaths] = useState('');
  const [furnishing, setFurnishing] = useState('');
  const [floorLevel, setFloorLevel] = useState('');
  const [leaseTerm, setLeaseTerm] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');

  const [commercialType, setCommercialType] = useState('');
  const [commercialFloors, setCommercialFloors] = useState('');
  const [parkingBays, setParkingBays] = useState('');
  const [powerGenerator, setPowerGenerator] = useState('');
  const [streetFrontage, setStreetFrontage] = useState('');

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

    setCommercialType('');
    setCommercialFloors('');
    setParkingBays('');
    setPowerGenerator('');
    setStreetFrontage('');
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

  const handleAddPhotos = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setValidationError('Allow photo access to add listing images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;
    if (!authUserId) {
      setValidationError('Sign in again before uploading photos.');
      return;
    }
    setUploadingPhotos(true);
    setValidationError(null);
    const uploaded = await Promise.all(
      result.assets.map((asset) =>
        uploadListingPhoto(asset.uri, authUserId, asset.mimeType || 'image/jpeg')
      )
    );
    setUploadingPhotos(false);
    const urls = uploaded.map((item) => item.url).filter((url): url is string => Boolean(url));
    if (urls.length > 0) setPhotos((prev) => [...prev, ...urls]);
    const failed = uploaded.find((item) => item.error);
    if (failed) {
      setValidationError(
        urls.length > 0
          ? `Some photos could not be uploaded (${failed.error}).`
          : failed.error || 'Photos could not be uploaded. Please try again.'
      );
    }
  };

  const handleAttachDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setDocName(asset.name);
    setDocPath('');
    setDocMime('');
    setDocSize('');
    setValidationError(null);
    if (!authUserId) {
      setValidationError('Sign in again before uploading documents.');
      return;
    }

    setDocUploading(true);
    const upload = await uploadVerificationDoc(
      asset.uri,
      authUserId,
      asset.mimeType || 'application/pdf',
      asset.size
    );
    setDocUploading(false);
    if (upload.error) {
      setValidationError(upload.error);
      return;
    }
    setDocPath(upload.path || '');
    setDocMime(asset.mimeType || 'application/pdf');
    setDocSize(upload.size || '');
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

  const handleNextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, 5));
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
    } else if (category === 'commercial') {
      put('commercialType', commercialType);
      put('stories', commercialFloors);
      put('parkingBays', parkingBays);
      put('generatorCapacity', powerGenerator);
      put('streetFrontage', streetFrontage);
    }

    return specs;
  };

  const handleSubmit = () => {
    if (!validateCurrentStep()) {
      return;
    }
    if (!authUserId) {
      setValidationError(
        'You need to be signed in to publish a listing. Open the Profile tab, sign in, then submit again.'
      );
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

  const stepTitle =
    currentStep === 1
      ? t('categoryLabel', 'Asset Category & Model')
      : currentStep === 2
      ? t('specifications', 'Details & Pricing')
      : currentStep === 3
      ? t('locationLabel', 'Location & Cadastral Area')
      : currentStep === 4
      ? t('uploadDeedPhotos', 'High-Resolution Media')
      : t('deedAuditEvidence', 'Title Deed & Verification Audit');

  const stepChipLabel = (stepNum: number) =>
    stepNum === 1
      ? t('categoryLabel', 'Category')
      : stepNum === 2
      ? t('specifications', 'Details')
      : stepNum === 3
      ? t('locationLabel', 'Location')
      : stepNum === 4
      ? t('uploadDeedPhotos', 'Photos')
      : t('deedAuditEvidence', 'Deed');

  const countryOptions: SelectOption[] = Object.entries(SUPPORTED_COUNTRIES).map(([code, c]) => ({
    value: code,
    label: `${c.name} (${code})`,
  }));
  const countryCurrency = SUPPORTED_COUNTRIES[listingCountry];
  const validationBanner = validationError ? (
    <View style={[styles.errorBanner, { backgroundColor: colors.errorContainer }]}>
      <Icon name="error" size={16} color={colors.onErrorContainer} />
      <Text style={[styles.errorText, { color: colors.onErrorContainer }]}>{validationError}</Text>
    </View>
  ) : null;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.surface }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Wizard Progress Header */}
        <View style={styles.wizardHeader}>
          <View style={styles.wizardTopRow}>
            <View style={styles.wizardTopLeft}>
              <Pressable
                onPress={handleBack}
                style={styles.backBtn}
                accessibilityRole="button"
                accessibilityLabel={t('back', 'Back')}
              >
                <Icon name="arrow_back" size={22} color={colors.onSurfaceVariant} />
              </Pressable>
              <Text style={[styles.stepCount, { color: colors.secondary }]}>
                {`Step ${currentStep} of 5`}
              </Text>
            </View>
            <View style={[styles.progressPill, { backgroundColor: colors.surfaceContainerHigh }]}>
              <View style={[styles.progressDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.progressPillText, { color: colors.onSurface }]}>
                {`${currentStep * 20}% Completed`}
              </Text>
            </View>
          </View>

          <View style={styles.titleRow}>
            <Text style={[styles.stepTitle, { color: colors.onSurface }]}>{stepTitle}</Text>
            <Text style={[styles.stepTag, { color: colors.outline }]}>{t('navPost', 'Post Listing')}</Text>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: colors.surfaceContainerHighest }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.primary, width: `${currentStep * 20}%` },
              ]}
            />
          </View>

          <View style={styles.stepChips}>
            {[1, 2, 3, 4, 5].map((stepNum) => {
              const active = currentStep === stepNum;
              const done = currentStep > stepNum;
              return (
                <Pressable
                  key={stepNum}
                  onPress={() => {
                    if (stepNum < currentStep || validateCurrentStep()) {
                      setCurrentStep(stepNum);
                    }
                  }}
                  style={[
                    styles.stepChip,
                    active
                      ? { backgroundColor: colors.primary }
                      : done
                      ? { backgroundColor: colors.primaryFixed }
                      : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepChipText,
                      { color: active ? colors.onPrimary : done ? colors.primary : colors.outline },
                    ]}
                  >
                    {`${stepNum}. ${stepChipLabel(stepNum)}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {validationBanner}

        {/* STEP 1: Category & Selling Model */}
        {currentStep === 1 && (
          <View style={styles.stepBody}>
            <View style={styles.field}>
              <Text style={[styles.labelUpper, { color: colors.onSurfaceVariant }]}>
                {t('categoryLabel', 'Select Asset Category')}
              </Text>
              {categories.length === 0 ? (
                <View
                  style={[
                    styles.emptyCategories,
                    {
                      backgroundColor: colors.surfaceContainerLowest,
                      borderColor: colors.outlineVariant + '4D',
                    },
                  ]}
                >
                  <Text style={[styles.emptyCategoriesText, { color: colors.onSurfaceVariant }]}>
                    No categories are available yet. An administrator must add one in the admin panel.
                  </Text>
                </View>
              ) : (
                <View style={styles.categoryGrid}>
                  {categories.map((item) => {
                    const presentation = categoryPresentation(item);
                    const label = presentation.translationKey
                      ? t(presentation.translationKey, item.name)
                      : item.name;
                    const active = category === item.slug;
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => handleSelectCategory(item.slug)}
                        style={({ pressed }) => [
                          styles.categoryCard,
                          active
                            ? {
                                backgroundColor: colors.primaryContainer,
                                borderColor: colors.primaryContainer,
                                ...shadow.card,
                              }
                            : {
                                backgroundColor: colors.surfaceContainerLowest,
                                borderColor: colors.outlineVariant + '33',
                              },
                          pressed && { opacity: 0.85 },
                        ]}
                      >
                        <View
                          style={[
                            styles.categoryIconWrap,
                            {
                              backgroundColor: active
                                ? 'rgba(255,255,255,0.14)'
                                : colors.surfaceContainer,
                            },
                          ]}
                        >
                          <Icon
                            name={presentation.icon}
                            size={19}
                            color={active ? colors.secondaryFixed : colors.primary}
                          />
                        </View>

                        <View style={styles.categoryTextCol}>
                          <Text
                            style={[
                              styles.categoryLabel,
                              { color: active ? colors.onPrimary : colors.onSurface },
                            ]}
                            numberOfLines={1}
                          >
                            {label}
                          </Text>
                          {presentation.tag ? (
                            <Text
                              style={[
                                styles.categoryTag,
                                { color: active ? colors.primaryFixedDim : colors.outline },
                              ]}
                              numberOfLines={1}
                            >
                              {presentation.tag}
                            </Text>
                          ) : null}
                        </View>

                        <View
                          style={[
                            styles.categoryCheck,
                            {
                              backgroundColor: active ? colors.secondaryContainer : 'transparent',
                              borderColor: active
                                ? colors.secondaryContainer
                                : colors.outlineVariant + '66',
                            },
                          ]}
                        >
                          {active ? (
                            <Icon name="check" size={12} color={colors.onSecondaryContainer} />
                          ) : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {category ? (
              <View
                style={[
                  styles.infoBanner,
                  {
                    backgroundColor: colors.surfaceContainerLow,
                    borderColor: colors.outlineVariant + '40',
                  },
                ]}
              >
                <Icon name="info" size={22} color={colors.primary} />
                <View style={styles.flex1}>
                  <Text style={[styles.infoTitle, { color: colors.onSurface }]}>
                    {category === 'house' && 'Residential House / Villa Workflow'}
                    {category === 'land' && 'Land & Plot Listing Workflow'}
                    {category === 'car' && 'Vehicle Listing Details'}
                    {category === 'rental' && 'Residential Tenancy & Lease Agreement Workflow'}
                    {category === 'commercial' && 'Commercial Plaza & Business Space Workflow'}
                    {!['house', 'land', 'car', 'rental', 'commercial'].includes(category) &&
                      `${selectedCategoryName} Listing Workflow`}
                  </Text>
                  <Text style={[styles.infoText, { color: colors.onSurfaceVariant }]}>
                    {category === 'house' &&
                      'Configured for residential compounds, bedrooms, bathrooms, and municipal title deeds.'}
                    {category === 'land' &&
                      'Configured for boos dimensions (e.g. 20x20m), boundary survey pegs, zoning, and cadastral maps.'}
                    {category === 'car' &&
                      'Configured for vehicle make/model, model year, odometer mileage, 4WD specs, and port customs duty.'}
                    {category === 'rental' &&
                      'Configured for monthly rental terms, furnishing status, security deposits, and tenancy contracts.'}
                    {category === 'commercial' &&
                      'Configured for commercial plazas, usable floor area, heavy generators, and trade zoning.'}
                    {!['house', 'land', 'car', 'rental', 'commercial'].includes(category) &&
                      (selectedCategory?.description ||
                        'Fill in the details, location, photos, and ownership documents to submit this listing for review.')}
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={[styles.labelUpper, { color: colors.onSurfaceVariant }]}>
                Representation Model
              </Text>

              <Pressable
                onPress={() => setSellingModel('broker')}
                style={[
                  styles.modelCard,
                  sellingModel === 'broker'
                    ? {
                        backgroundColor: colors.surfaceContainerLowest,
                        borderColor: colors.primary,
                        ...shadow.card,
                      }
                    : {
                        backgroundColor: colors.surfaceContainerLow,
                        borderColor: colors.outlineVariant + '33',
                      },
                ]}
              >
                <View style={[styles.modelIcon, { backgroundColor: colors.primaryContainer }]}>
                  <Icon name="verified_user" size={20} color={colors.onPrimary} />
                </View>
                <View style={styles.flex1}>
                  <Text style={[styles.modelTitle, { color: colors.onSurface }]}>Assign to a Broker</Text>
                  <Text style={[styles.modelText, { color: colors.onSurfaceVariant }]}>
                    The broker coordinates buyer inquiries, site visits, and the deal workflow.
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => setSellingModel('direct')}
                style={[
                  styles.modelCard,
                  sellingModel === 'direct'
                    ? {
                        backgroundColor: colors.surfaceContainerLowest,
                        borderColor: colors.primary,
                        ...shadow.card,
                      }
                    : {
                        backgroundColor: colors.surfaceContainerLow,
                        borderColor: colors.outlineVariant + '33',
                      },
                ]}
              >
                <View style={[styles.modelIcon, { backgroundColor: colors.surfaceContainerHigh }]}>
                  <Icon name="person" size={20} color={colors.onSurface} />
                </View>
                <View style={styles.flex1}>
                  <Text style={[styles.modelTitle, { color: colors.onSurface }]}>Direct Owner Listing</Text>
                  <Text style={[styles.modelText, { color: colors.onSurfaceVariant }]}>
                    List directly as the owner. You provide the title documents and coordinate site visits.
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        )}

        {/* STEP 2: Category-Specific Details & Pricing */}
        {currentStep === 2 && (
          <View style={styles.stepBody}>
            <FieldInput
              label="Listing Headline / Title"
              value={title}
              onChangeText={setTitle}
              placeholder={t('listingTitlePlaceholder', 'Describe the asset in a short headline')}
            />

            <View style={styles.row}>
              <SelectBox
                label="Transaction Type"
                value={transactionType}
                options={[
                  { value: 'sale', label: 'For Sale (Fixed Price)' },
                  { value: 'rent', label: 'For Rent (Monthly)' },
                ]}
                onChange={(value) => setTransactionType(value as 'sale' | 'rent')}
                flex
              />
              <SelectBox
                label="Country Jurisdiction"
                value={listingCountry}
                options={countryOptions}
                onChange={(value) => {
                  const code = value as CountryCode;
                  setListingCountry(code);
                  if (SUPPORTED_COUNTRIES[code]) {
                    setAuthorityName(SUPPORTED_COUNTRIES[code].registryAuthority);
                  }
                }}
                flex
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.onSurface }]}>
                {transactionType === 'rent' ? 'Monthly Rent' : 'Asking Price'} (
                {countryCurrency?.currency || 'USD'})
              </Text>
              <View
                style={[
                  styles.priceWrap,
                  {
                    backgroundColor: colors.surfaceContainerLowest,
                    borderColor: colors.outlineVariant + '33',
                  },
                ]}
              >
                <Text style={[styles.priceSymbol, { color: colors.primary }]}>
                  {countryCurrency?.currencySymbol || '$'}
                </Text>
                <TextInput
                  value={price}
                  onChangeText={setPrice}
                  placeholder={t('pricePlaceholder', 'Enter price')}
                  placeholderTextColor={colors.outline}
                  keyboardType="numeric"
                  style={[styles.priceInput, { color: colors.onSurface }]}
                />
              </View>
              {price.trim() !== '' ? (
                <Text style={[styles.pricePreview, { color: colors.outline }]}>
                  {formatPrice(Number(price) || 0)}
                  {transactionType === 'rent' ? ' / month' : ''}
                </Text>
              ) : null}
            </View>

            <FieldInput
              label={t('listingDescription', 'Listing Description (optional)')}
              value={description}
              onChangeText={setDescription}
              placeholder={t(
                'listingDescriptionPlaceholder',
                'Describe the asset, condition, and key terms in your own words.'
              )}
              multiline
            />

            {/* 1. HOUSE / VILLA */}
            {category === 'house' && (
              <StepGroup icon="home" iconColor={colors.primary} title="Villa & Compound Specifications">
                <View style={styles.row}>
                  <FieldInput label="Bedrooms" value={beds} onChangeText={setBeds} placeholder="e.g. 4" numeric flex />
                  <FieldInput label="Bathrooms" value={baths} onChangeText={setBaths} placeholder="e.g. 3" numeric flex />
                  <FieldInput label="Lot Area" value={areaSize} onChangeText={setAreaSize} placeholder="e.g. 380 sqm" flex />
                </View>
                <View style={styles.row}>
                  <FieldInput label="Stories / Floors" value={floors} onChangeText={setFloors} placeholder="e.g. 2 Floors" flex />
                  <FieldInput label="Garage Parking" value={garage} onChangeText={setGarage} placeholder="e.g. 2 Cars" flex />
                </View>
                <View style={styles.row}>
                  <FieldInput label="Water Supply" value={waterSource} onChangeText={setWaterSource} placeholder="e.g. Borehole water" flex />
                  <FieldInput label="Power / Electricity" value={powerSource} onChangeText={setPowerSource} placeholder="e.g. Solar and city grid" flex />
                </View>
              </StepGroup>
            )}

            {/* 2. LAND / PLOTS */}
            {category === 'land' && (
              <StepGroup icon="square_foot" iconColor={colors.secondary} title="Land Parcel & Cadastral Boos Specs">
                <View style={styles.row}>
                  <FieldInput label="Plot Dimensions (Cabbir)" value={plotDimensions} onChangeText={setPlotDimensions} placeholder="e.g. 20m x 20m" flex />
                  <FieldInput label="Total Land Area" value={areaSize} onChangeText={setAreaSize} placeholder="e.g. 400 sqm" flex />
                </View>
                <View style={styles.row}>
                  <SelectBox
                    label="Zoning Classification"
                    value={zoning}
                    onChange={setZoning}
                    placeholder={t('selectOption', 'Select zoning')}
                    options={ZONING_OPTIONS}
                    flex
                  />
                  <SelectBox
                    label="Cadastral Beacons Survey"
                    value={beaconsStatus}
                    onChange={setBeaconsStatus}
                    placeholder={t('selectOption', 'Select status')}
                    options={BEACONS_OPTIONS}
                    flex
                  />
                </View>
                <View style={styles.row}>
                  <SelectBox
                    label="Boundary / Fencing"
                    value={boundaryFencing}
                    onChange={setBoundaryFencing}
                    placeholder={t('selectOption', 'Select boundary type')}
                    options={BOUNDARY_OPTIONS}
                    flex
                  />
                  <FieldInput label="Road Access" value={roadAccess} onChangeText={setRoadAccess} placeholder="e.g. 15m paved access road" flex />
                </View>
              </StepGroup>
            )}

            {/* 3. VEHICLE / AUTO */}
            {category === 'car' && (
              <StepGroup icon="directions_car" iconColor={colors.primary} title="Vehicle Specifications & Customs Status">
                <View style={styles.row}>
                  <FieldInput label="Make & Model" value={makeModel} onChangeText={setMakeModel} placeholder="e.g. Toyota Land Cruiser" flex />
                  <FieldInput label="Model Year" value={carYear} onChangeText={setCarYear} placeholder="e.g. 2023" flex />
                </View>
                <View style={styles.row}>
                  <FieldInput label="Mileage" value={mileage} onChangeText={setMileage} placeholder="e.g. 42,000 km" flex />
                  <SelectBox
                    label="Transmission"
                    value={transmission}
                    onChange={setTransmission}
                    placeholder={t('selectOption', 'Select')}
                    options={TRANSMISSION_OPTIONS}
                    flex
                  />
                  <SelectBox
                    label="Fuel Type"
                    value={fuelType}
                    onChange={setFuelType}
                    placeholder={t('selectOption', 'Select')}
                    options={FUEL_OPTIONS}
                    flex
                  />
                </View>
                <View style={styles.row}>
                  <SelectBox
                    label="Drive System"
                    value={driveType}
                    onChange={setDriveType}
                    placeholder={t('selectOption', 'Select')}
                    options={DRIVE_OPTIONS}
                    flex
                  />
                  <SelectBox
                    label="Port Customs Duty (Kastamka)"
                    value={customsStatus}
                    onChange={setCustomsStatus}
                    placeholder={t('selectOption', 'Select status')}
                    options={CUSTOMS_OPTIONS}
                    flex
                  />
                </View>
              </StepGroup>
            )}

            {/* 4. RENTAL UNIT */}
            {category === 'rental' && (
              <StepGroup icon="vpn_key" iconColor={colors.secondary} title="Apartment & Tenancy Terms">
                <View style={styles.row}>
                  <FieldInput label="Bedrooms" value={rentalBeds} onChangeText={setRentalBeds} placeholder="e.g. 3" numeric flex />
                  <FieldInput label="Bathrooms" value={rentalBaths} onChangeText={setRentalBaths} placeholder="e.g. 2" numeric flex />
                  <FieldInput label="Unit Area" value={areaSize} onChangeText={setAreaSize} placeholder="e.g. 160 sqm" flex />
                </View>
                <View style={styles.row}>
                  <SelectBox
                    label="Furnishing Status"
                    value={furnishing}
                    onChange={setFurnishing}
                    placeholder={t('selectOption', 'Select furnishing')}
                    options={FURNISHING_OPTIONS}
                    flex
                  />
                  <FieldInput label="Floor Level" value={floorLevel} onChangeText={setFloorLevel} placeholder="e.g. 3rd Floor (with Elevator)" flex />
                </View>
                <View style={styles.row}>
                  <FieldInput label="Security Deposit" value={securityDeposit} onChangeText={setSecurityDeposit} placeholder="e.g. 1 month rent" flex />
                  <SelectBox
                    label="Minimum Lease"
                    value={leaseTerm}
                    onChange={setLeaseTerm}
                    placeholder={t('selectOption', 'Select lease term')}
                    options={LEASE_OPTIONS}
                    flex
                  />
                </View>
              </StepGroup>
            )}

            {/* 5. COMMERCIAL PROPERTY */}
            {category === 'commercial' && (
              <StepGroup icon="apartment" iconColor={colors.primary} title="Commercial Plaza & Building Specs">
                <View style={styles.row}>
                  <SelectBox
                    label="Commercial Type"
                    value={commercialType}
                    onChange={setCommercialType}
                    placeholder={t('selectOption', 'Select type')}
                    options={COMMERCIAL_TYPE_OPTIONS}
                    flex
                  />
                  <FieldInput label="Total Usable Area" value={areaSize} onChangeText={setAreaSize} placeholder="e.g. 850 sqm" flex />
                </View>
                <View style={styles.row}>
                  <FieldInput label="Stories / Floors" value={commercialFloors} onChangeText={setCommercialFloors} placeholder="e.g. 4 Stories" flex />
                  <FieldInput label="Dedicated Parking" value={parkingBays} onChangeText={setParkingBays} placeholder="e.g. 12 Dedicated Bays" flex />
                </View>
                <View style={styles.row}>
                  <FieldInput label="Backup Generator" value={powerGenerator} onChangeText={setPowerGenerator} placeholder="e.g. 150kVA Standby Generator" flex />
                  <FieldInput label="Street Frontage" value={streetFrontage} onChangeText={setStreetFrontage} placeholder="e.g. Main Commercial Boulevard" flex />
                </View>
              </StepGroup>
            )}
          </View>
        )}

        {/* STEP 3: Location */}
        {currentStep === 3 && (
          <View style={styles.stepBody}>
            <FieldInput
              label={category === 'car' ? 'Inspection Yard / Location City' : 'City / Municipal District'}
              value={locationName}
              onChangeText={setLocationName}
              placeholder="e.g. Hodhan, Mogadishu or Westlands, Nairobi"
            />
            <FieldInput
              label={category === 'car' ? 'Showroom / Physical Yard Address' : 'Detailed Address & Landmark Coordinates'}
              value={streetAddress}
              onChangeText={setStreetAddress}
              placeholder="e.g. KM4 Roundabout, Wadada Maka Al-Mukarama"
            />

            <View
              style={[
                styles.infoBanner,
                { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant + '33' },
              ]}
            >
              <Icon name="location_on" size={20} color={colors.primary} />
              <View style={styles.flex1}>
                <Text style={[styles.infoTitle, { color: colors.onSurface }]}>
                  {category === 'car'
                    ? 'Vehicle Inspection Verification Notice'
                    : 'Cadastral Boundary Mapping Notice'}
                </Text>
                <Text style={[styles.infoText, { color: colors.onSurfaceVariant }]}>
                  {category === 'car'
                    ? 'Physical vehicle chassis inspection and mechanical audit will take place at this designated address prior to escrow finalization.'
                    : 'Exact geographic beacon coordinates will be cross-referenced with municipal cadastral maps by an authorized title examiner during the audit.'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* STEP 4: Media Upload */}
        {currentStep === 4 && (
          <View style={styles.stepBody}>
            <View style={styles.mediaHeader}>
              <Text style={[styles.mediaTitle, { color: colors.onSurface }]}>
                {`${category.toUpperCase()} Media Photos (${photos.length})`}
              </Text>
              <Pressable
                onPress={handleAddPhotos}
                disabled={uploadingPhotos}
                style={[styles.attachLink, uploadingPhotos && { opacity: 0.6 }]}
              >
                {uploadingPhotos ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Icon name="add_photo_alternate" size={16} color={colors.primary} />
                )}
                <Text style={[styles.attachLinkText, { color: colors.primary }]}>
                  {uploadingPhotos
                    ? t('uploadingPhotos', 'Uploading…')
                    : t('uploadPhotos', 'Add Photos')}
                </Text>
              </Pressable>
            </View>

            {photos.length === 0 ? (
              <Pressable
                onPress={handleAddPhotos}
                style={[
                  styles.uploadEmpty,
                  {
                    backgroundColor: colors.surfaceContainerLowest,
                    borderColor: colors.outlineVariant + '66',
                  },
                ]}
              >
                <Icon name="add_photo_alternate" size={36} color={colors.outline} />
                <Text style={[styles.uploadEmptyTitle, { color: colors.onSurface }]}>
                  {t('noPhotosUploaded', 'No photos uploaded yet')}
                </Text>
                <Text style={[styles.uploadEmptyText, { color: colors.onSurfaceVariant }]}>
                  {t('uploadFromDevice', 'Add photos of the actual asset from your device.')}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.photoGrid}>
                {photos.map((photoUrl, i) => (
                  <View
                    key={`${photoUrl}-${i}`}
                    style={[
                      styles.photoTile,
                      {
                        backgroundColor: colors.surfaceContainer,
                        borderColor: colors.outlineVariant + '33',
                      },
                      shadow.card,
                    ]}
                  >
                    <Image source={{ uri: photoUrl }} style={styles.photoImage} resizeMode="cover" />
                    {i === 0 ? (
                      <View style={[styles.coverBadge, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.coverBadgeText, { color: colors.onPrimary }]}>Cover Photo</Text>
                      </View>
                    ) : null}
                    <Pressable onPress={() => handleRemovePhoto(i)} style={styles.photoRemove}>
                      <Icon name="close" size={13} color="#ffffff" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <View
              style={[
                styles.tipRow,
                { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant + '26' },
              ]}
            >
              <Icon name="info" size={16} color={colors.primary} />
              <Text style={[styles.tipText, { color: colors.onSurfaceVariant }]}>
                {`Images must clearly reflect the actual ${category} without misleading filters.`}
              </Text>
            </View>
          </View>
        )}

        {/* STEP 5: Title Deed / Registration & Audit */}
        {currentStep === 5 && (
          <View style={styles.stepBody}>
            <View
              style={[
                styles.deedBanner,
                {
                  backgroundColor: colors.primaryFixed + '33',
                  borderColor: colors.primary + '4D',
                },
              ]}
            >
              <View style={styles.deedHeader}>
                <Icon name="workspace_premium" size={20} color={colors.primary} />
                <Text style={[styles.deedTitle, { color: colors.primary }]}>
                  {category === 'car'
                    ? 'Vehicle Title & Customs Documents'
                    : category === 'rental'
                    ? 'Tenancy & Ownership Documents'
                    : category === 'commercial'
                    ? 'Commercial Property Documents'
                    : 'Title Deed Documents'}
                </Text>
              </View>
              <Text style={[styles.infoText, { color: colors.onSurfaceVariant }]}>
                {category === 'car'
                  ? 'Provide the logbook number and customs clearance receipts.'
                  : category === 'rental'
                  ? 'Provide the titleholder registration or tenancy agreement.'
                  : category === 'commercial'
                  ? 'Provide the commercial title documents and operating licenses.'
                  : 'Provide the registry reference and supporting documents.'}
              </Text>
            </View>

            <FieldInput
              label={
                category === 'car'
                  ? 'Chassis / VIN & Plate Registration Number'
                  : category === 'rental'
                  ? 'Tenancy Agreement / Title Registry Filing Number'
                  : category === 'commercial'
                  ? 'Commercial Building Cadastral Filing Number'
                  : 'Title Registry Filing Number'
              }
              value={registryNumber}
              onChangeText={setRegistryNumber}
              placeholder={t('registryNumberPlaceholder', 'Enter registry or registration number')}
              mono
            />

            <FieldInput
              label={
                category === 'car'
                  ? 'Issuing Transport & Port Customs Authority'
                  : 'Issuing Land / Municipal Authority'
              }
              value={authorityName}
              onChangeText={setAuthorityName}
              placeholder={t('authorityPlaceholder', 'Enter issuing authority')}
            />

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.onSurface }]}>
                {category === 'car'
                  ? 'Vehicle Logbook & Customs Document File'
                  : 'Official Document Reference File'}
              </Text>
              <View
                style={[
                  styles.documentRow,
                  {
                    backgroundColor: colors.surfaceContainerLowest,
                    borderColor: colors.outlineVariant + '33',
                  },
                ]}
              >
                <Icon name="description" size={18} color={colors.primary} />
                <TextInput
                  value={docName}
                  onChangeText={setDocName}
                  placeholder={t('documentRefPlaceholder', 'Document name or reference')}
                  placeholderTextColor={colors.outline}
                  style={[styles.documentInput, { color: colors.onSurface }]}
                />
                <Pressable onPress={handleAttachDocument} style={styles.attachLink}>
                  <Icon name="attach_file" size={16} color={colors.primary} />
                  <Text style={[styles.attachLinkText, { color: colors.primary }]}>
                    {t('attachFile', 'Attach')}
                  </Text>
                </Pressable>
              </View>
              {docUploading ? (
                <Text style={[styles.docHint, { color: colors.outline }]}>
                  {t('uploadingDocument', 'Uploading document…')}
                </Text>
              ) : docPath ? (
                <Text style={[styles.docHint, { color: '#047857', fontFamily: typography.semibold }]}>
                  {t('documentAttached', 'Document attached securely for reviewer access.')}
                </Text>
              ) : null}
            </View>
          </View>
        )}

        {validationBanner}

        {/* Bottom Wizard Actions */}
        <View style={[styles.footer, { borderTopColor: colors.surfaceContainer }]}>
          {currentStep > 1 && (
            <Pressable
              onPress={handlePrevStep}
              style={[styles.prevBtn, { backgroundColor: colors.surfaceContainer }]}
            >
              <Text style={[styles.prevBtnText, { color: colors.onSurface }]}>
                {t('back', 'Previous')}
              </Text>
            </Pressable>
          )}

          {currentStep < 5 ? (
            <Pressable
              onPress={handleNextStep}
              style={[styles.nextBtn, { backgroundColor: colors.primaryContainer }, shadow.card]}
            >
              <Text style={[styles.nextBtnText, { color: colors.onPrimary }]}>
                {`${t('seeAll', 'Continue')} (${currentStep + 1}/5)`}
              </Text>
              <Icon name="arrow_forward" size={16} color={colors.onPrimary} />
            </Pressable>
          ) : (
            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={[styles.nextBtn, { backgroundColor: colors.primaryContainer }, shadow.card]}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <>
                  <Text style={[styles.nextBtnText, { color: colors.onPrimary }]}>
                    {t('submitForAudit', 'Submit for Cadastral Audit')}
                  </Text>
                  <Icon name="task_alt" size={16} color={colors.onPrimary} />
                </>
              )}
            </Pressable>
          )}
        </View>
      </ScrollView>

      {showToast ? (
        <View style={[styles.toast, { backgroundColor: colors.primary }, shadow.floating]}>
          <Icon name="task_alt" size={16} color={colors.onPrimary} />
          <Text style={[styles.toastText, { color: colors.onPrimary }]} numberOfLines={2}>
            {toastMessage}
          </Text>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 120, gap: 14 },
  flex1: { flex: 1 },
  row: { flexDirection: 'row', gap: 8 },
  stepBody: { gap: 14 },

  wizardHeader: { gap: 8 },
  wizardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wizardTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 },
  backBtn: {
    width: 36,
    height: 36,
    marginLeft: -6,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCount: {
    fontSize: 11,
    fontFamily: typography.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  progressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  progressDot: { width: 6, height: 6, borderRadius: 3 },
  progressPillText: { fontSize: 10.5, fontFamily: typography.bold },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  stepTitle: { fontSize: 20, fontFamily: typography.bold, flexShrink: 1 },
  stepTag: { fontSize: 11, fontFamily: typography.medium },
  progressTrack: { height: 8, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  stepChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingTop: 2 },
  stepChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  stepChipText: { fontSize: 10, fontFamily: typography.bold },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  errorText: { fontSize: 11.5, fontFamily: typography.semibold, flex: 1 },

  field: { gap: 5 },
  label: { fontSize: 11.5, fontFamily: typography.bold },
  labelUpper: {
    fontSize: 11,
    fontFamily: typography.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 13,
    fontFamily: typography.semibold,
  },
  inputMultiline: { minHeight: 84, textAlignVertical: 'top' },
  inputMono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  select: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  selectText: { fontSize: 12.5, fontFamily: typography.semibold, flex: 1 },

  emptyCategories: { padding: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed' },
  emptyCategoriesText: { fontSize: 11.5, textAlign: 'center', fontFamily: typography.medium },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryCard: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  categoryIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTextCol: { flex: 1, gap: 1 },
  categoryLabel: { fontSize: 12.5, fontFamily: typography.bold, letterSpacing: -0.2 },
  categoryTag: { fontSize: 10, fontFamily: typography.medium },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  infoTitle: { fontSize: 12, fontFamily: typography.bold },
  infoText: { fontSize: 11, fontFamily: typography.medium, marginTop: 2, lineHeight: 16 },

  modelCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 6,
  },
  modelIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  modelTitle: { fontSize: 13, fontFamily: typography.bold },
  modelText: { fontSize: 11, fontFamily: typography.medium, marginTop: 3, lineHeight: 16 },

  priceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 8,
  },
  priceSymbol: { fontSize: 15, fontFamily: typography.bold, marginRight: 4 },
  priceInput: { flex: 1, paddingVertical: 12, fontSize: 14, fontFamily: typography.bold },
  pricePreview: { fontSize: 11, fontFamily: typography.medium },

  group: { padding: 14, borderRadius: 16, borderWidth: 1, gap: 10 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  groupTitle: {
    fontSize: 11,
    fontFamily: typography.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    flexShrink: 1,
  },

  mediaHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  mediaTitle: { fontSize: 12, fontFamily: typography.bold, flexShrink: 1 },
  attachLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  attachLinkText: { fontSize: 11, fontFamily: typography.bold },

  uploadEmpty: {
    minHeight: 180,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 24,
  },
  uploadEmptyTitle: { fontSize: 12, fontFamily: typography.bold },
  uploadEmptyText: { fontSize: 11, fontFamily: typography.medium, textAlign: 'center' },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoTile: {
    width: '48%',
    flexGrow: 1,
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  photoImage: { width: '100%', height: '100%' },
  coverBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  coverBadgeText: { fontSize: 9, fontFamily: typography.bold },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  tipText: { fontSize: 11, fontFamily: typography.medium, flex: 1, lineHeight: 16 },

  deedBanner: { padding: 14, borderRadius: 16, borderWidth: 1, gap: 6 },
  deedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deedTitle: { fontSize: 13.5, fontFamily: typography.bold, flexShrink: 1 },

  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  documentInput: { flex: 1, paddingVertical: 12, fontSize: 12, fontFamily: typography.semibold },
  docHint: { fontSize: 10, marginTop: 4, lineHeight: 14 },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 2,
  },
  prevBtn: { paddingHorizontal: 16, paddingVertical: 13, borderRadius: 12 },
  prevBtnText: { fontSize: 12, fontFamily: typography.bold },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  nextBtnText: { fontSize: 12, fontFamily: typography.bold },

  toast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    maxWidth: '86%',
  },
  toastText: { fontSize: 11.5, fontFamily: typography.bold, flexShrink: 1 },

  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  sheetCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', maxHeight: '72%' },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle: { fontSize: 14, fontFamily: typography.bold, flexShrink: 1 },
  sheetClose: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sheetList: { paddingHorizontal: 8, paddingVertical: 6 },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 10,
  },
  sheetOptionText: { fontSize: 12.5, fontFamily: typography.semibold, flex: 1 },
});
