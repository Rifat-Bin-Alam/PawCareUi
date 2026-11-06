'use client';
// ============================================================
// PawCare Hub – Centralized State Context + localStorage Sync
// ============================================================
import React, { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
import type {
  PawCareState, User, Pet, ServiceItem, TimeSlot, Booking,
  PaymentRecord, VetVisitNote, Review, Notification, UserRole,
  BookingStatus, PaymentStatus, ChatMessage,
} from '@/types/pawcare';
import { seedData } from '@/data/seedData';

const STORAGE_KEY = 'pawcare_hub_state';

// ── helpers ──────────────────────────────────────────────
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const txnRef = () => `TXN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

function loadState(): PawCareState {
  if (typeof window === 'undefined') return seedData;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PawCareState;
  } catch { /* corrupted – reset */ }
  return seedData;
}

function saveState(state: PawCareState) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* quota */ }
}

// ── Action types ─────────────────────────────────────────
type Action =
  | { type: 'RESET' }
  | { type: 'LOGIN'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'SWITCH_ROLE'; payload: UserRole }
  | { type: 'REGISTER_USER'; payload: User }
  | { type: 'UPDATE_USER'; payload: Partial<User> & { id: string } }
  | { type: 'ADD_PET'; payload: Pet }
  | { type: 'UPDATE_PET'; payload: Partial<Pet> & { id: string } }
  | { type: 'DELETE_PET'; payload: string }
  | { type: 'ADD_SERVICE'; payload: ServiceItem }
  | { type: 'UPDATE_SERVICE'; payload: Partial<ServiceItem> & { id: string } }
  | { type: 'ADD_TIMESLOT'; payload: TimeSlot }
  | { type: 'UPDATE_TIMESLOT'; payload: Partial<TimeSlot> & { id: string } }
  | { type: 'CREATE_BOOKING'; payload: { booking: Booking; payment: PaymentRecord; timeSlotId: string } }
  | { type: 'UPDATE_BOOKING_STATUS'; payload: { id: string; status: BookingStatus } }
  | { type: 'CANCEL_BOOKING'; payload: string }
  | { type: 'REQUEST_RESCHEDULE'; payload: string }
  | { type: 'ADD_VET_NOTE'; payload: VetVisitNote }
  | { type: 'ADD_REVIEW'; payload: Review }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'MARK_ALL_NOTIFICATIONS_READ'; payload: string }
  | { type: 'APPROVE_USER'; payload: string }
  | { type: 'DELETE_USER'; payload: string };

function reducer(state: PawCareState, action: Action): PawCareState {
  switch (action.type) {
    case 'RESET':
      return { ...seedData, currentUser: null };

    case 'LOGIN':
      return { ...state, currentUser: action.payload };

    case 'LOGOUT':
      return { ...state, currentUser: null };

    case 'SWITCH_ROLE': {
      const roleUsers = state.users.filter(u => u.role === action.payload);
      return { ...state, currentUser: roleUsers[0] ?? state.currentUser };
    }

    case 'REGISTER_USER':
      return { ...state, users: [...state.users, action.payload] };

    case 'UPDATE_USER': {
      const users = state.users.map(u => u.id === action.payload.id ? { ...u, ...action.payload } : u);
      const currentUser = state.currentUser?.id === action.payload.id
        ? { ...state.currentUser, ...action.payload } as User
        : state.currentUser;
      return { ...state, users, currentUser };
    }

    case 'ADD_PET':
      return { ...state, pets: [...state.pets, action.payload] };

    case 'UPDATE_PET':
      return { ...state, pets: state.pets.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p) };

    case 'DELETE_PET':
      return { ...state, pets: state.pets.filter(p => p.id !== action.payload) };

    case 'ADD_SERVICE':
      return { ...state, services: [...state.services, action.payload] };

    case 'UPDATE_SERVICE':
      return { ...state, services: state.services.map(s => s.id === action.payload.id ? { ...s, ...action.payload } : s) };

    case 'ADD_TIMESLOT':
      return { ...state, timeSlots: [...state.timeSlots, action.payload] };

    case 'UPDATE_TIMESLOT':
      return { ...state, timeSlots: state.timeSlots.map(t => t.id === action.payload.id ? { ...t, ...action.payload } : t) };

    case 'CREATE_BOOKING': {
      const { booking, payment, timeSlotId } = action.payload;
      // Mark time slot as booked — prevents double-booking
      const timeSlots = state.timeSlots.map(t =>
        t.id === timeSlotId ? { ...t, isBooked: true, bookingId: booking.id } : t
      );
      return {
        ...state,
        bookings: [...state.bookings, booking],
        payments: [...state.payments, payment],
        timeSlots,
      };
    }

    case 'UPDATE_BOOKING_STATUS':
      return {
        ...state,
        bookings: state.bookings.map(b =>
          b.id === action.payload.id
            ? { ...b, status: action.payload.status, updatedAt: new Date().toISOString() }
            : b
        ),
      };

    case 'CANCEL_BOOKING': {
      const booking = state.bookings.find(b => b.id === action.payload);
      const timeSlots = booking
        ? state.timeSlots.map(t => t.id === booking.timeSlotId ? { ...t, isBooked: false, bookingId: undefined } : t)
        : state.timeSlots;
      return {
        ...state,
        bookings: state.bookings.map(b =>
          b.id === action.payload ? { ...b, status: 'Cancelled' as BookingStatus, updatedAt: new Date().toISOString() } : b
        ),
        payments: state.payments.map(p =>
          p.bookingId === action.payload ? { ...p, status: 'Refunded' as PaymentStatus } : p
        ),
        timeSlots,
      };
    }

    case 'REQUEST_RESCHEDULE':
      return {
        ...state,
        bookings: state.bookings.map(b =>
          b.id === action.payload ? { ...b, rescheduleRequested: true, updatedAt: new Date().toISOString() } : b
        ),
      };

    case 'ADD_VET_NOTE':
      return { ...state, vetNotes: [...state.vetNotes, action.payload] };

    case 'ADD_REVIEW':
      return { ...state, reviews: [...state.reviews, action.payload] };

    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [...state.notifications, action.payload] };

    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => n.id === action.payload ? { ...n, isRead: true } : n),
      };

    case 'MARK_ALL_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => n.userId === action.payload ? { ...n, isRead: true } : n),
      };

    case 'APPROVE_USER':
      return { ...state, users: state.users.map(u => u.id === action.payload ? { ...u, isApproved: true } : u) };

    case 'DELETE_USER':
      return { ...state, users: state.users.filter(u => u.id !== action.payload) };

    default:
      return state;
  }
}

// ── Context value ────────────────────────────────────────
interface pet.PawCareContextValue {
  state: PawCareState;
  // Auth
  login: (email: string, password: string) => User | null;
  logout: () => void;
  register: (data: Omit<User, 'id' | 'isApproved' | 'createdAt'>) => User;
  switchRole: (role: UserRole) => void;
  // Users
  updateUser: (data: Partial<User> & { id: string }) => void;
  approveUser: (id: string) => void;
  deleteUser: (id: string) => void;
  // Pets
  addPet: (data: Omit<Pet, 'id' | 'createdAt'>) => Pet;
  updatePet: (data: Partial<Pet> & { id: string }) => void;
  deletePet: (id: string) => void;
  // Services
  addService: (data: Omit<ServiceItem, 'id' | 'createdAt'>) => ServiceItem;
  updateService: (data: Partial<ServiceItem> & { id: string }) => void;
  // Time slots
  addTimeSlot: (data: Omit<TimeSlot, 'id' | 'isBooked'>) => TimeSlot;
  updateTimeSlot: (data: Partial<TimeSlot> & { id: string }) => void;
  // Bookings
  createBooking: (data: { ownerId: string; petId: string; serviceId: string; providerId: string; timeSlotId: string; totalAmount: number; notes?: string; symptomSummary?: string; paymentMethod: PaymentRecord['method'] }) => { booking: Booking; payment: PaymentRecord } | null;
  updateBookingStatus: (id: string, status: BookingStatus) => void;
  cancelBooking: (id: string) => void;
  requestReschedule: (id: string) => void;
  // Vet notes
  addVetNote: (data: Omit<VetVisitNote, 'id' | 'createdAt'>) => VetVisitNote;
  // Reviews
  addReview: (data: Omit<Review, 'id' | 'createdAt'>) => Review;
  // Notifications
  addNotification: (data: Omit<Notification, 'id' | 'createdAt'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId: string) => void;
  // Lookups
  getUserById: (id: string) => User | undefined;
  getPetById: (id: string) => Pet | undefined;
  getServiceById: (id: string) => ServiceItem | undefined;
  getProviderRating: (providerId: string) => number;
  // Reset
  resetData: () => void;
  // Helpers
  uid: () => string;
}

const PawCareContext = createContext<PawCareContextValue | null>(null);

export function PawCareProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  // persist every state change
  useEffect(() => { saveState(state); }, [state]);

  // ── Auth ──
  const login = useCallback((email: string, password: string): User | null => {
    const user = state.users.find(u => u.email === email && u.password === password);
    if (user) dispatch({ type: 'LOGIN', payload: user });
    return user ?? null;
  }, [state.users]);

  const logout = useCallback(() => dispatch({ type: 'LOGOUT' }), []);

  const register = useCallback((data: Omit<User, 'id' | 'isApproved' | 'createdAt'>): User => {
    const user: User = { ...data, id: uid(), isApproved: data.role === 'owner', createdAt: new Date().toISOString() };
    dispatch({ type: 'REGISTER_USER', payload: user });
    dispatch({ type: 'LOGIN', payload: user });
    return user;
  }, []);

  const switchRole = useCallback((role: UserRole) => dispatch({ type: 'SWITCH_ROLE', payload: role }), []);

  // ── Users ──
  const updateUser = useCallback((data: Partial<User> & { id: string }) => dispatch({ type: 'UPDATE_USER', payload: data }), []);
  const approveUser = useCallback((id: string) => dispatch({ type: 'APPROVE_USER', payload: id }), []);
  const deleteUser = useCallback((id: string) => dispatch({ type: 'DELETE_USER', payload: id }), []);

  // ── Pets ──
  const addPet = useCallback((data: Omit<Pet, 'id' | 'createdAt'>): Pet => {
    const pet: Pet = { ...data, id: uid(), createdAt: new Date().toISOString() };
    dispatch({ type: 'ADD_PET', payload: pet });
    return pet;
  }, []);
  const updatePet = useCallback((data: Partial<Pet> & { id: string }) => dispatch({ type: 'UPDATE_PET', payload: data }), []);
  const deletePet = useCallback((id: string) => dispatch({ type: 'DELETE_PET', payload: id }), []);

  // ── Services ──
  const addService = useCallback((data: Omit<ServiceItem, 'id' | 'createdAt'>): ServiceItem => {
    const service: ServiceItem = { ...data, id: uid(), createdAt: new Date().toISOString() };
    dispatch({ type: 'ADD_SERVICE', payload: service });
    return service;
  }, []);
  const updateService = useCallback((data: Partial<ServiceItem> & { id: string }) => dispatch({ type: 'UPDATE_SERVICE', payload: data }), []);

  // ── Time slots ──
  const addTimeSlot = useCallback((data: Omit<TimeSlot, 'id' | 'isBooked'>): TimeSlot => {
    const slot: TimeSlot = { ...data, id: uid(), isBooked: false };
    dispatch({ type: 'ADD_TIMESLOT', payload: slot });
    return slot;
  }, []);
  const updateTimeSlot = useCallback((data: Partial<TimeSlot> & { id: string }) => dispatch({ type: 'UPDATE_TIMESLOT', payload: data }), []);

  // ── Bookings ──
  const createBooking = useCallback((data: {
    ownerId: string; petId: string; serviceId: string; providerId: string;
    timeSlotId: string; totalAmount: number; notes?: string; symptomSummary?: string;
    paymentMethod: PaymentRecord['method'];
  }) => {
    // Double-booking guard
    const slot = state.timeSlots.find(t => t.id === data.timeSlotId);
    if (!slot || slot.isBooked) return null;

    const bookingId = uid();
    const ref = txnRef();
    const now = new Date().toISOString();

    const booking: Booking = {
      id: bookingId,
      ownerId: data.ownerId,
      petId: data.petId,
      serviceId: data.serviceId,
      providerId: data.providerId,
      timeSlotId: data.timeSlotId,
      status: 'Pending',
      paymentStatus: 'Paid',
      transactionRef: ref,
      totalAmount: data.totalAmount,
      notes: data.notes,
      symptomSummary: data.symptomSummary,
      createdAt: now,
      updatedAt: now,
    };

    const payment: PaymentRecord = {
      id: uid(),
      bookingId,
      amount: data.totalAmount,
      transactionRef: ref,
      method: data.paymentMethod,
      status: 'Paid',
      paidAt: now,
    };

    dispatch({ type: 'CREATE_BOOKING', payload: { booking, payment, timeSlotId: data.timeSlotId } });
    return { booking, payment };
  }, [state.timeSlots]);

  const updateBookingStatus = useCallback((id: string, status: BookingStatus) =>
    dispatch({ type: 'UPDATE_BOOKING_STATUS', payload: { id, status } }), []);
  const cancelBooking = useCallback((id: string) => dispatch({ type: 'CANCEL_BOOKING', payload: id }), []);
  const requestReschedule = useCallback((id: string) => dispatch({ type: 'REQUEST_RESCHEDULE', payload: id }), []);

  // ── Vet notes ──
  const addVetNote = useCallback((data: Omit<VetVisitNote, 'id' | 'createdAt'>): VetVisitNote => {
    const note: VetVisitNote = { ...data, id: uid(), createdAt: new Date().toISOString() };
    dispatch({ type: 'ADD_VET_NOTE', payload: note });
    return note;
  }, []);

  // ── Reviews ──
  const addReview = useCallback((data: Omit<Review, 'id' | 'createdAt'>): Review => {
    const review: Review = { ...data, id: uid(), createdAt: new Date().toISOString() };
    dispatch({ type: 'ADD_REVIEW', payload: review });
    return review;
  }, []);

  // ── Notifications ──
  const addNotification = useCallback((data: Omit<Notification, 'id' | 'createdAt'>) => {
    const notif: Notification = { ...data, id: uid(), createdAt: new Date().toISOString() };
    dispatch({ type: 'ADD_NOTIFICATION', payload: notif });
  }, []);
  const markNotificationRead = useCallback((id: string) => dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id }), []);
  const markAllNotificationsRead = useCallback((userId: string) => dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ', payload: userId }), []);

  // ── Lookups ──
  const getUserById = useCallback((id: string) => state.users.find(u => u.id === id), [state.users]);
  const getPetById = useCallback((id: string) => state.pets.find(p => p.id === id), [state.pets]);
  const getServiceById = useCallback((id: string) => state.services.find(s => s.id === id), [state.services]);
  const getProviderRating = useCallback((providerId: string) => {
    const providerReviews = state.reviews.filter(r => r.providerId === providerId);
    if (providerReviews.length === 0) return 0;
    return providerReviews.reduce((sum, r) => sum + r.rating, 0) / providerReviews.length;
  }, [state.reviews]);

  // ── Reset ──
  const resetData = useCallback(() => dispatch({ type: 'RESET' }), []);

  const value: PawCareContextValue = {
    state, login, logout, register, switchRole,
    updateUser, approveUser, deleteUser,
    addPet, updatePet, deletePet,
    addService, updateService,
    addTimeSlot, updateTimeSlot,
    createBooking, updateBookingStatus, cancelBooking, requestReschedule,
    addVetNote, addReview,
    addNotification, markNotificationRead, markAllNotificationsRead,
    getUserById, getPetById, getServiceById, getProviderRating,
    resetData, uid,
  };

  return <PawCareContext.Provider value={value}>{children}</PawCareContext.Provider>;
}

export function usePawCare(): PawCareContextValue {
  const ctx = useContext(PawCareContext);
  if (!ctx) throw new Error('usePawCare must be used within PawCareProvider');
  return ctx;
}
