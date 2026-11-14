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
  isGoogleAuth?: boolean;
  isEphemeralSession?: boolean;
}

export interface Student {
  id: number;
  userId: number;
  studentIdNumber: string;
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
  user?: User;
  activeLoansCount?: number;
  overdueLoansCount?: number;
  totalLoansCount?: number;
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
  categoryName?: string;
  totalCopies?: number;
  availableCopies?: number;
  copies?: BookCopy[];
}

export interface BibliographicCandidate {
  id: string;
  title: string;
  subtitle?: string;
  authors: string[];
  publisher?: string;
  publishedDate?: string;
  publicationYear?: number;
  isbn?: string;
  isbn10?: string;
  isbn13?: string;
  description?: string;
  coverImageUrl?: string;
  language?: string;
  pageCount?: number;
  suggestedCategoryCode?: string;
  source: 'Open Library' | 'Google Books' | 'OCR Visuel';
  duplicateInLibrary?: Book | null;
}

export interface CoverOcrExtraction {
  title: string;
  subtitle?: string;
  authors: string[];
  isbn?: string;
  publisher?: string;
  publicationYear?: number;
  suggestedCategoryCode?: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  rawOcrText?: string;
}

export interface CoverOcrResponse {
  success: boolean;
  extracted: CoverOcrExtraction;
  candidates: BibliographicCandidate[];
  duplicateInLibrary?: Book | null;
}

export type CopyCondition = 'NEW' | 'GOOD' | 'FAIR' | 'DAMAGED';
export type CopyStatus = 'AVAILABLE' | 'BORROWED' | 'RESERVED' | 'LOST' | 'DAMAGED' | 'RETIRED' | 'MAINTENANCE';

export interface BookCopy {
  id: number;
  bookId: number;
  barcode: string;
  locationShelf: string;
  condition: CopyCondition;
  status: CopyStatus;
  createdAt: string;
  book?: Book;
}

export type LoanStatus = 'ACTIVE' | 'RETURNED' | 'OVERDUE';
export type OverdueLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface Loan {
  id: number;
  studentId: number;
  bookCopyId: number;
  loanDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string | null;
  status: LoanStatus;
  notes?: string;
  createdByUserId: number;
  createdAt: string;
  updatedAt?: string;
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
  requestDate: string;
  status: LoanRequestStatus;
  reviewDate?: string | null;
  reviewedByUserId?: number | null;
  rejectionReason?: string | null;
  pickupDeadline?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
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
  defaultLoanDurationDays: number; // Durée du prêt (14 jours)
  maxLoansPerStudent: number; // Nombre max d'emprunts par étudiant (3)
  withdrawalDeadlineHours: number; // Délai de retrait en heures (48 h)
  reservationDurationDays: number; // Délai de retrait en jours (2 jours)
  reminderDaysBeforeDue: number; // Jours de rappel avant échéance (2 jours)
  overdueReminderFrequencyDays: number; // Fréquence des rappels de retard (3 jours)
  suspensionThresholdDays: number; // Seuil de suspension (7 jours de retard)
  maxActiveRequestsPerStudent?: number;
  overdueLowThreshold: number;
  overdueMediumThreshold: number;
  overdueHighThreshold: number;
  smtpEnabled: boolean;
  smtpFromAddress: string;
  smtpFromName: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
}

export interface DashboardStats {
  totalBooks: number;
  totalCopies: number;
  availableCopies: number;
  activeLoans: number;
  overdueLoans: number;
  pendingRequestsCount?: number;
  recentLoans: Loan[];
  recentReturns: Loan[];
  urgentOverdues: Loan[];
}
