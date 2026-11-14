export type RoleName = 'ROLE_ETUDIANT' | 'ROLE_GERANT';

export interface User {
  id: number;
  googleSub?: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: RoleName;
  isActive: boolean;
  createdAt: string;
}

export interface Student {
  id: number;
  userId: number;
  studentIdNumber: string; // CNE / Apogée
  department: string;
  phone?: string;
  maxLoans: number;
  createdAt: string;
  academicYear?: string;
  establishment?: string;
  cardReference?: string;
  isSuspended?: boolean;
  suspendedAt?: string | null;
  suspendedUntil?: string | null;
  suspensionReason?: string | null;
  // Joined fields for convenience
  user?: User;
}

export interface Category {
  id: number;
  code: string;
  name: string;
  description: string;
}

export interface Book {
  id: number;
  title: string;
  subtitle?: string;
  author: string;
  isbn?: string;
  categoryId: number;
  publicationYear: number;
  publisher?: string;
  summary: string;
  coverImageUrl?: string;
  language?: string;
  createdAt: string;
  updatedAt?: string;
  // Computed fields
  categoryName?: string;
  totalCopies?: number;
  availableCopies?: number;
}

export type CopyCondition = 'NEW' | 'GOOD' | 'FAIR' | 'DAMAGED';
export type CopyStatus = 'AVAILABLE' | 'BORROWED' | 'RESERVED' | 'LOST' | 'DAMAGED' | 'RETIRED' | 'MAINTENANCE';

export interface BookCopy {
  id: number;
  bookId: number;
  barcode: string;
  locationShelf: string; // e.g. "Salle 1 - Rayon B - Étagère 3"
  condition: CopyCondition;
  status: CopyStatus;
  createdAt: string;
  // Joined book info
  book?: Book;
}

export type LoanStatus = 'ACTIVE' | 'RETURNED' | 'OVERDUE';
export type OverdueLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface Loan {
  id: number;
  studentId: number;
  bookCopyId: number;
  loanDate: string; // YYYY-MM-DD
  expectedReturnDate: string; // YYYY-MM-DD
  actualReturnDate?: string | null;
  status: LoanStatus;
  notes?: string;
  createdByUserId: number;
  createdAt: string;
  updatedAt?: string;
  // Computed / joined fields
  overdueDays: number;
  overdueLevel: OverdueLevel;
  reminderCount: number;
  lastReminderSentAt?: string | null;
  student?: Student;
  bookCopy?: BookCopy;
  book?: Book;
}

export type LoanRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED' | 'FULFILLED';

export interface LoanRequest {
  id: number;
  studentId: number;
  bookId: number;
  allocatedCopyId?: number | null;
  requestDate: string; // YYYY-MM-DD HH:mm:ss
  status: LoanRequestStatus;
  reviewDate?: string | null;
  reviewedByUserId?: number | null;
  rejectionReason?: string | null;
  pickupDeadline?: string | null; // YYYY-MM-DD
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
  // Computed / joined fields
  student?: Student;
  book?: Book;
  allocatedCopy?: BookCopy;
  bookCopy?: BookCopy; // Alias for allocatedCopy
  reviewedByUser?: User;
}

export type NotificationType =
  | 'NEW_LOAN_REQUEST'
  | 'REQUEST_APPROVED'
  | 'REQUEST_REJECTED'
  | 'RESERVATION_EXPIRING'
  | 'RESERVATION_EXPIRED'
  | 'LOAN_OVERDUE'
  | 'GENERAL';

export interface Notification {
  id: number;
  recipientUserId: number;
  recipientRole?: RoleName;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityName?: string;
  relatedEntityId?: number;
  isRead: boolean;
  createdAt: string;
}

export interface Reminder {
  id: number;
  loanId: number;
  recipientEmail: string;
  overdueDays: number;
  overdueLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  messageContent: string;
  deliveryStatus: 'SENT' | 'FAILED';
  sentAt: string;
  sentByUserId: number;
}

export interface SearchHistory {
  id: number;
  studentId: number;
  queryText: string;
  categoryId?: number | null;
  resultsCount: number;
  searchedAt: string;
}

export interface AuditLog {
  id: number;
  actorUserId?: number | null;
  actorName?: string;
  action: string;
  entityName: string;
  entityId?: number | null;
  details?: Record<string, any>;
  ipAddress?: string;
  timestamp: string;
}

export interface LibrarySettings {
  id: number;
  defaultLoanDurationDays: number; // 14 jours par défaut
  maxLoansPerStudent: number; // 3 par défaut
  withdrawalDeadlineHours: number; // 48 h par défaut
  reservationDurationDays: number; // 2 jours par défaut
  reminderDaysBeforeDue: number; // 2 jours avant la date de retour
  overdueReminderFrequencyDays: number; // 3 jours de fréquence de rappel en retard
  suspensionThresholdDays: number; // 7 jours de retard avant suspension automatique
  maxActiveRequestsPerStudent?: number;
  overdueLowThreshold: number; // e.g., 1 day
  overdueMediumThreshold: number; // e.g., 4 days
  overdueHighThreshold: number; // e.g., 8 days
  smtpEnabled: boolean;
  smtpFromAddress: string;
  smtpFromName: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
}
