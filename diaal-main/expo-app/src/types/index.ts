export type Language = 'en' | 'so' | 'ar';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'AED' | 'KES' | 'SOS' | 'SLSH' | 'TRY';

export type CountryCode = 'SO' | 'KE' | 'AE' | 'GB' | 'US' | 'TR';

export type AreaUnit = 'sqm' | 'sqft';

export type UserRole = 'guest' | 'buyer' | 'seller' | 'broker' | 'reviewer' | 'admin';

export type VerificationStatus =
  | 'not_submitted'
  | 'submitted'
  | 'in_review'
  | 'more_info_required'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'revoked';

export type ModerationStatus = 'published' | 'under_review' | 'flagged' | 'removed';

export interface CountryConfig {
  code: CountryCode;
  name: string;
  nativeName: string;
  currency: Currency;
  currencySymbol: string;
  defaultUnit: AreaUnit;
  registryAuthority: string;
  escrowLegalStatus: 'licensed_escrow_available' | 'partner_notary_only' | 'sandbox_pilot';
  phonePrefix: string;
  cities?: string[];
}

export interface VerificationEvidence {
  evidenceType: 'title_deed' | 'boundary_survey' | 'broker_license' | 'tax_clearance' | 'owner_id';
  documentRef: string;
  documentPath?: string;
  mimeType?: string;
  fileSize?: string;
  registryNumber?: string;
  issuerAuthority: string;
  verifiedBy?: string;
  verifiedAt?: string;
  expiresAt?: string;
  notes?: string;
  status: VerificationStatus;
}

export interface PropertyListing {
  id: string;
  title: string;
  titleSo: string;
  titleAr?: string;
  price: number; // Base asking amount in primary listing currency
  currency: Currency; // ISO 4217 currency
  priceText?: string;
  priceType: 'sale' | 'rent';
  countryCode: CountryCode;
  location: string;
  locationDetails: string;
  registryNumber: string;
  beds?: number;
  baths?: number;
  area: string;
  areaUnit: AreaUnit;
  garage?: number;
  category: string; // slug of an active row in the categories table
  image: string;
  gallery: string[];
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  verificationEvidence?: VerificationEvidence[];
  verifiedLabel: string;
  brokerId: string;
  brokerName: string;
  brokerAvatar: string;
  brokerRating: number;
  brokerDeals: number;
  lat: number;
  lng: number;
  description: string;
  amenities: string[];
  isFavorite?: boolean;
  tags?: string[];
  moderationStatus: ModerationStatus;
  ownerId?: string;
  reportsCount?: number;
  createdAt?: string;
  updatedAt?: string;
  categorySpecs?: {
    // Car
    makeModel?: string;
    year?: string;
    mileage?: string;
    transmission?: string;
    fuelType?: string;
    driveType?: string;
    engineSize?: string;
    plateNumber?: string;
    customsDutyPaid?: boolean;
    condition?: string;
    // Land
    plotDimensions?: string;
    zoning?: string;
    beaconsStatus?: string;
    boundaryFencing?: string;
    roadAccess?: string;
    utilitiesReady?: string;
    topography?: string;
    // Rental
    furnishing?: string;
    floorLevel?: string;
    leaseTerm?: string;
    securityDeposit?: string;
    utilitiesPolicy?: string;
    powerBackup?: string;
    waterSource?: string;
    // Commercial
    commercialType?: string;
    stories?: string;
    parkingBays?: string;
    generatorCapacity?: string;
    streetFrontage?: string;
    safetyCompliance?: string;
  };
}

export interface Broker {
  id: string;
  name: string;
  title: string;
  titleSo: string;
  avatar: string;
  rating: number;
  reviewsCount: number;
  deals: number;
  trustScore: number;
  tier: string;
  responseTime: string;
  licenseNumber: string;
  licenseAuthority: string;
  verificationStatus: VerificationStatus;
  languages: string[];
  coverage: string;
  countryCode: CountryCode;
  diasporaCoverage: string;
  isOnline: boolean;
  ownerId?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'broker' | 'user' | 'system';
  senderName?: string;
  text: string;
  timestamp: string;
  sentAt?: string;
  isAudio?: boolean;
  audioDuration?: string;
  audioOrigin?: string;
  attachments?: {
    id: string;
    title: string;
    type: 'pdf' | 'image' | 'audio';
    image?: string;
    url?: string;
    size?: string;
    storagePath?: string;
    mimeType?: string;
  }[];
  offer?: {
    id: string;
    version: number;
    assetSubject: string;
    proposedPrice: number;
    currency: Currency;
    originalPrice: number;
    discountPercent: number;
    depositAmount: number;
    escrowTerms: string;
    titleGuarantee: string;
    expiryTime: string;
    status: 'active' | 'accepted' | 'countered' | 'declined' | 'expired';
  };
}

export interface Milestone {
  id: number;
  title: string;
  titleSo: string;
  subtitle: string;
  date?: string;
  status: 'completed' | 'active' | 'pending';
  badge?: string;
  requiredEvidence?: string;
  evidenceProvided?: boolean;
  evidenceNotes?: string;
}

export type PaymentMethodType =
  | 'evc_plus'
  | 'zaad'
  | 'sahal'
  | 'edahab'
  | 'mpesa'
  | 'card_stripe'
  | 'bank_wire';

export interface EscrowDeal {
  id: string;
  dealNumber: string;
  assetId: string;
  assetTitle: string;
  assetImage: string;
  assetLocation: string;
  assetCategory: string;
  agreedPrice: number;
  currency: Currency;
  depositAmount: number;
  depositPaid: boolean;
  brokerName: string;
  escrowOfficer: string;
  currentMilestoneId: number;
  milestones: Milestone[];
  selectedPaymentChannel: 'mobile_money' | 'card' | 'bank_wire';
  paymentProviderName: string;
  isSandbox: boolean;
  sandboxNotice: string;
  disputeStatus?: 'none' | 'disputed' | 'resolved';
}

export interface ReportCase {
  id: string;
  targetType: 'listing' | 'broker' | 'message';
  targetId: string;
  targetTitle: string;
  reporterEmail: string;
  reason: 'fraud_fake_listing' | 'ownership_dispute' | 'wrong_price' | 'misleading_photos' | 'harassment' | 'other';
  description: string;
  status: 'pending' | 'in_review' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  category: 'dispute' | 'verification' | 'fraud' | 'payments' | 'general';
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'resolved';
  messages: {
    sender: 'user' | 'support';
    text: string;
    timestamp: string;
  }[];
  createdAt: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  countryCode: CountryCode;
  location: string;
  createdAt: string;
  notifyOnMatch: boolean;
}

export interface AuditLog {
  id: string;
  action: string;
  actorRole: UserRole;
  actorEmail: string;
  targetEntity: string;
  details: string;
  timestamp: string;
}
