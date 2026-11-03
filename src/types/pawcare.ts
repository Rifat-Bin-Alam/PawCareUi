// ============================================================
// PawCare Hub – Core TypeScript Interfaces
// ============================================================

export type UserRole = 'owner' | 'vet' | 'provider' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // plain text for demo only
  role: UserRole;
  avatar?: string;
  phone?: string;
  address?: string;
  bio?: string;
  specialty?: string; // vet specialty
  isApproved: boolean; // admin approval for vets/providers
  createdAt: string;
}

export interface Pet {
  id: string;
  ownerId: string;
  name: string;
  type: 'Dog' | 'Cat' | 'Bird' | 'Rabbit' | 'Fish' | 'Hamster' | 'Other';
  breed: string;
  age: number;
  sex: 'Male' | 'Female';
  weight: number; // kg
  healthStatus: 'Healthy' | 'Under Treatment' | 'Needs Attention' | 'Critical';
  avatar?: string;
  notes?: string;
  createdAt: string;
}

export type ServiceCategory = 'Veterinary Checkup' | 'Grooming' | 'Boarding';

export interface ServiceItem {
  id: string;
  providerId: string;
  category: ServiceCategory;
  name: string;
  description: string;
  price: number;
  duration: number; // minutes
  isActive: boolean;
  createdAt: string;
}

export interface TimeSlot {
  id: string;
  providerId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isBooked: boolean;
  bookingId?: string;
}

export type BookingStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
export type PaymentStatus = 'Pending' | 'Paid' | 'Refunded' | 'Failed';

export interface Booking {
  id: string;
  ownerId: string;
  petId: string;
  serviceId: string;
  providerId: string;
  timeSlotId: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  transactionRef?: string;
  totalAmount: number;
  notes?: string;
  symptomSummary?: string; // AI pre-visit symptom notes
  rescheduleRequested?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  bookingId: string;
  amount: number;
  transactionRef: string;
  method: 'Credit Card' | 'Debit Card' | 'Mobile Banking' | 'bKash';
  status: PaymentStatus;
  paidAt: string;
}

export interface VetVisitNote {
  id: string;
  bookingId: string;
  petId: string;
  vetId: string;
  examinationNotes: string;
  medicalAdvice: string;
  followUpDate?: string;
  simplifiedSummary?: string; // AI-generated plain-language summary
  createdAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  ownerId: string;
  providerId: string;
  serviceId: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'booking' | 'payment' | 'review' | 'system' | 'reminder';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// ============================================================
// State shape
// ============================================================
export interface PawCareState {
  users: User[];
  pets: Pet[];
  services: ServiceItem[];
  timeSlots: TimeSlot[];
  bookings: Booking[];
  payments: PaymentRecord[];
  vetNotes: VetVisitNote[];
  reviews: Review[];
  notifications: Notification[];
  currentUser: User | null;
}
