export type UserRole = 'sender' | 'driver';

export type JobStatus =
  | 'open'
  | 'reviewing'      // top 3 selected, waiting for user to pick
  | 'accepted'
  | 'arrived'        // driver has arrived at pickup, waiting for sender payment
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type MessageType = 'text' | 'quote' | 'image';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface Location {
  address: string;
  coords: {
    latitude: number;
    longitude: number;
  };
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  isAdmin?: boolean;
  profilePhoto?: string;
  rating: number;
  totalTrips: number;
  createdAt: number;
  pushToken?: string;
  notificationPrefs?: {
    newOffers: boolean;
    messages: boolean;
    tripUpdates: boolean;
  };
  totalEarned?: number;
  favouriteDriverIds?: string[];
  jobTemplates?: JobTemplate[];
  referredBy?: string;
  referralCount?: number;
  // driver only
  vehiclePhoto?: string;
  vehiclePhotoPending?: string;
  registrationNumber?: string;
  isOnline?: boolean;
  serviceCity?: string;
  currentLocation?: { latitude: number; longitude: number };
  bankDetails?: {
    bank: string;
    accountHolder: string;
    accountNumber: string;
    accountType: 'cheque' | 'savings';
  };
  // verification
  verificationStatus?: VerificationStatus;
  idNumber?: string;
  idDocumentPhoto?: string;
  selfiePhoto?: string;
  licencePhotoUrl?: string;
  vehicleDiscPhotoUrl?: string;
  vehiclePlatePhotoUrl?: string;
  vehicleFrontPhotoUrl?: string;
  vehicleBackPhotoUrl?: string;
  vehicleLeftPhotoUrl?: string;
  vehicleRightPhotoUrl?: string;
}

export interface Job {
  id: string;
  posterId: string;
  posterName: string;
  city: string;
  category?: string;
  pickup: Location;
  dropoff: Location;
  description: string;
  when: 'now' | number;
  status: JobStatus;
  loadPhotoUrl?: string;
  weightCategory?: 'light' | 'medium' | 'heavy';
  offersCount?: number;
  topOfferIds?: string[];          // IDs of top 3 scored offers
  acceptedDriverId?: string;
  acceptedDriverName?: string;
  agreedPrice?: number;
  senderRated?: boolean;
  driverRated?: boolean;
  driverLocation?: { latitude: number; longitude: number; updatedAt: number };
  pickupPhotoUrl?: string;
  deliveryPhotoUrl?: string;
  cashConfirmedBySender?: boolean;
  cashConfirmedAt?: number;
  walletSettled?: boolean;
  walletSettledAt?: number;
  paymentMethod?: 'wallet' | 'cash';
  discountApplied?: boolean;
  paidAmount?: number;
  createdAt: number;
}

export interface DriverOffer {
  id: string;
  jobId: string;
  driverId: string;
  driverName: string;
  driverRating: number;
  driverPhoto?: string;
  registrationNumber?: string;
  verificationStatus?: VerificationStatus;
  price: number;                   // rands
  note?: string;
  score?: number;                  // computed: (rating * 0.4) + (priceRank * 0.6)
  status: 'submitted' | 'selected' | 'rejected';
  createdAt: number;
}

export interface Conversation {
  id: string;
  jobId: string;
  userId: string;
  driverId: string;
  driverName: string;
  userName: string;
  quotedPrice?: number;
  status: 'active' | 'accepted' | 'declined' | 'completed';
  lastMessage?: string;
  lastMessageAt?: number;
  createdAt: number;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  type: MessageType;
  price?: number;
  imageUrl?: string;
  timestamp: number;
}

export interface MarketplaceItem {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerRating: number;
  city: string;
  title: string;
  description: string;
  price: number;
  photos: string[];
  needsDelivery: boolean;
  deliveryArea?: string;
  status: 'available' | 'sold' | 'removed';
  createdAt: number;
}

export interface JobTemplate {
  id: string;
  name: string;
  city: string;
  pickupAddress: string;
  pickupCoords: { latitude: number; longitude: number };
  dropoffAddress: string;
  dropoffCoords: { latitude: number; longitude: number };
  description?: string;
}

export interface WalletTransaction {
  id: string;
  type: 'topup' | 'job_payment' | 'job_earning' | 'platform_fee' | 'withdrawal' | 'refund';
  amount: number; // positive = credit, negative = debit
  description: string;
  jobId?: string;
  status: 'completed' | 'pending' | 'failed';
  createdAt: number;
}

export interface WithdrawalRequest {
  id: string;
  uid: string;
  driverName: string;
  amount: number;
  bankDetails: {
    bank: string;
    accountHolder: string;
    accountNumber: string;
    accountType: 'cheque' | 'savings';
  };
  status: 'pending' | 'processed' | 'rejected';
  note?: string;
  createdAt: number;
  processedAt?: number;
}

export interface Rating {
  id: string;
  jobId: string;
  fromUserId: string;
  toUserId: string;
  score: number;
  comment?: string;
  createdAt: number;
}
