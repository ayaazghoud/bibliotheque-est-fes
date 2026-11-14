import axios from 'axios';
import {
  Book,
  BookCopy,
  Category,
  DashboardStats,
  LibrarySettings,
  Loan,
  LoanRequest,
  LoanRequestStatus,
  Notification,
  Reminder,
  SearchHistory,
  Student,
  User,
  AuditLog,
  BibliographicCandidate,
  CoverOcrResponse,
  CopyCondition,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach user ID from local storage (only for persisted DB users with id > 0)
api.interceptors.request.use(config => {
  const storedUser = localStorage.getItem('est_library_user');
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      if (user && typeof user.id === 'number' && user.id > 0) {
        config.headers['x-user-id'] = user.id.toString();
      }
    } catch (e) {
      // ignore
    }
  }
  return config;
});

export const authApi = {
  loginWithGoogle: async (payload: {
    email: string;
    fullName?: string;
    avatarUrl?: string;
    googleSub?: string;
    targetSpace: 'etudiant' | 'gerant' | 'auto';
    isGoogleAuth?: boolean;
    emailVerified?: boolean;
  }) => {
    const res = await api.post<{
      token: string;
      user: User;
      student?: Student | null;
      dbAvailable?: boolean;
      autoCreated?: boolean;
    }>('/auth/google-login', payload);
    return res.data;
  },
  getMe: async () => {
    const res = await api.get<{ user: User; student?: Student }>('/auth/me');
    return res.data;
  },
  getDemoUsers: async () => {
    const res = await api.get<Array<User & { student?: Student }>>('/auth/demo-users');
    return res.data;
  },
};

export const categoriesApi = {
  getAll: async () => {
    const res = await api.get<Category[]>('/categories');
    return res.data;
  },
};

export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'TITLE' | 'AUTHOR' | 'SUBJECT' | 'KEYWORD';
  typeLabel: 'Titre' | 'Auteur' | 'Sujet' | 'Mot-clé';
}

export const booksApi = {
  getAll: async (params?: { query?: string; categoryId?: number }) => {
    const res = await api.get<Book[]>('/books', { params });
    return res.data;
  },
  getSuggestions: async (q: string) => {
    const res = await api.get<SearchSuggestion[]>('/search/suggestions', { params: { q } });
    return res.data;
  },
  getById: async (id: number) => {
    const res = await api.get<Book & { copies: BookCopy[] }>(`/books/${id}`);
    return res.data;
  },
  checkDuplicate: async (isbn: string) => {
    const res = await api.get<{ exists: boolean; book?: Book; copiesCount?: number; copies?: BookCopy[] }>(
      `/books/check-duplicate/${encodeURIComponent(isbn.trim())}`
    );
    return res.data;
  },
  create: async (data: Partial<Book>) => {
    const res = await api.post<Book>('/books', data);
    return res.data;
  },
  update: async (id: number, data: Partial<Book>) => {
    const res = await api.put<Book>(`/books/${id}`, data);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/books/${id}`);
    return res.data;
  },
};

export const copiesApi = {
  getAll: async (bookId?: number) => {
    const res = await api.get<BookCopy[]>('/copies', { params: { bookId } });
    return res.data;
  },
  getByBarcode: async (barcode: string) => {
    const res = await api.get<{ found: boolean; copy?: BookCopy; currentLoan?: Loan; error?: string }>(
      `/copies/barcode/${encodeURIComponent(barcode)}`
    );
    return res.data;
  },
  create: async (data: Partial<BookCopy>) => {
    const res = await api.post<BookCopy>('/copies', data);
    return res.data;
  },
  createBatch: async (
    bookId: number,
    copies: Array<{ barcode: string; locationShelf: string; condition?: CopyCondition }>
  ) => {
    const res = await api.post<{ success: boolean; count: number; copies: BookCopy[] }>('/copies/batch', {
      bookId,
      copies,
    });
    return res.data;
  },
  update: async (id: number, data: Partial<BookCopy>) => {
    const res = await api.put<BookCopy>(`/copies/${id}`, data);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/copies/${id}`);
    return res.data;
  },
};

export const bibliographicApi = {
  search: async (params: { q?: string; isbn?: string }) => {
    const res = await api.get<{ candidates: BibliographicCandidate[]; count: number }>('/bibliographic/search', {
      params,
    });
    return res.data;
  },
  scanCoverOcr: async (payload: { imageCoverBase64: string; imageTitlePageBase64?: string }) => {
    const res = await api.post<CoverOcrResponse>('/bibliographic/scan-cover-ocr', payload);
    return res.data;
  },
  validateIsbn: (isbn: string): { valid: boolean; format: 'ISBN-10' | 'ISBN-13' | 'INVALID'; cleaned: string } => {
    const cleaned = isbn.replace(/[-\s]/g, '').toUpperCase();
    if (cleaned.length === 10) {
      if (!/^[0-9]{9}[0-9X]$/.test(cleaned)) return { valid: false, format: 'INVALID', cleaned };
      let sum = 0;
      for (let i = 0; i < 9; i++) sum += parseInt(cleaned[i], 10) * (10 - i);
      const lastChar = cleaned[9];
      sum += lastChar === 'X' ? 10 : parseInt(lastChar, 10);
      const isValid = sum % 11 === 0;
      return { valid: isValid, format: isValid ? 'ISBN-10' : 'INVALID', cleaned };
    } else if (cleaned.length === 13) {
      if (!/^[0-9]{13}$/.test(cleaned)) return { valid: false, format: 'INVALID', cleaned };
      let sum = 0;
      for (let i = 0; i < 12; i++) sum += parseInt(cleaned[i], 10) * (i % 2 === 0 ? 1 : 3);
      const checkDigit = (10 - (sum % 10)) % 10;
      const isValid = checkDigit === parseInt(cleaned[12], 10);
      return { valid: isValid, format: isValid ? 'ISBN-13' : 'INVALID', cleaned };
    }
    return { valid: false, format: 'INVALID', cleaned };
  },
};

export interface OcrExtractedData {
  lastName: string;
  firstName: string;
  studentIdNumber: string;
  establishment: string;
  department: string;
  academicYear: string;
  confidence: string;
}

export interface OcrScanResponse {
  success: boolean;
  extracted: OcrExtractedData;
  isDuplicate: boolean;
  duplicateStudent?: Student;
}

export const studentsApi = {
  getAll: async (query?: string) => {
    const res = await api.get<Student[]>('/students', { params: { query } });
    return res.data;
  },
  getById: async (id: number) => {
    const res = await api.get<Student & { loans: Loan[] }>(`/students/${id}`);
    return res.data;
  },
  checkDuplicate: async (studentIdNumber: string) => {
    const res = await api.get<{ exists: boolean; student?: Student }>(
      `/students/check-duplicate/${encodeURIComponent(studentIdNumber)}`
    );
    return res.data;
  },
  scanCardOcr: async (payload: { imageFrontBase64: string; imageBackBase64?: string }) => {
    const res = await api.post<OcrScanResponse>('/students/scan-card-ocr', payload);
    return res.data;
  },
  create: async (payload: {
    fullName: string;
    email: string;
    studentIdNumber: string;
    department: string;
    phone?: string;
    academicYear?: string;
    establishment?: string;
    cardReference?: string;
  }) => {
    const res = await api.post<Student>('/students', payload);
    return res.data;
  },
};

export const loansApi = {
  getAll: async (params?: { studentId?: number; status?: string; onlyOverdue?: boolean }) => {
    const res = await api.get<Loan[]>('/loans', { params });
    return res.data;
  },
  getMyLoans: async () => {
    const res = await api.get<Loan[]>('/my-loans');
    return res.data;
  },
  create: async (payload: {
    studentId: number;
    bookCopyId: number;
    loanDate: string;
    expectedReturnDate: string;
    notes?: string;
  }) => {
    const res = await api.post<Loan>('/loans', payload);
    return res.data;
  },
  returnLoan: async (loanId: number, payload: { actualReturnDate?: string; condition?: string; notes?: string }) => {
    const res = await api.post<Loan>(`/loans/${loanId}/return`, payload);
    return res.data;
  },
};

export const remindersApi = {
  getAll: async (loanId?: number) => {
    const res = await api.get<Reminder[]>('/reminders', { params: { loanId } });
    return res.data;
  },
  send: async (loanId: number) => {
    const res = await api.post<{ success: boolean; message: string; reminder: Reminder }>(`/loans/${loanId}/remind`);
    return res.data;
  },
};

export const searchHistoryApi = {
  get: async () => {
    const res = await api.get<SearchHistory[]>('/search-history');
    return res.data;
  },
  add: async (payload: { queryText: string; categoryId?: number | null; resultsCount: number }) => {
    const res = await api.post<SearchHistory>('/search-history', payload);
    return res.data;
  },
  clear: async () => {
    const res = await api.delete('/search-history');
    return res.data;
  },
};

export const statsApi = {
  getDashboard: async () => {
    const res = await api.get<DashboardStats>('/stats/dashboard');
    return res.data;
  },
};

export const auditApi = {
  getAll: async () => {
    const res = await api.get<AuditLog[]>('/audit-logs');
    return res.data;
  },
};

export const settingsApi = {
  get: async () => {
    const res = await api.get<LibrarySettings>('/settings');
    return res.data;
  },
  update: async (data: Partial<LibrarySettings>) => {
    const res = await api.put<LibrarySettings>('/settings', data);
    return res.data;
  },
};

export const schedulerApi = {
  triggerNow: async () => {
    const res = await api.post<{
      success: boolean;
      message: string;
      result: {
        timestamp: string;
        overdueCount: number;
        newlySuspendedCount: number;
        cancelledExpiredReservationsCount: number;
        emailsSentCount: number;
        emailsSummary: string[];
      };
    }>('/scheduler/run-now');
    return res.data;
  },
};

export const loanRequestsApi = {
  getAll: async (params?: { studentId?: number; status?: LoanRequestStatus; query?: string }) => {
    const res = await api.get<LoanRequest[]>('/loan-requests', { params });
    return res.data;
  },
  getMyRequests: async () => {
    const res = await api.get<LoanRequest[]>('/my-loan-requests');
    return res.data;
  },
  getById: async (id: number) => {
    const res = await api.get<LoanRequest>(`/loan-requests/${id}`);
    return res.data;
  },
  checkEligibility: async (studentId: number, bookId?: number) => {
    const res = await api.get<{
      eligible: boolean;
      reasons: string[];
      activeLoansCount: number;
      activeRequestsCount: number;
      overdueCount: number;
      maxLoans: number;
    }>(`/students/${studentId}/eligibility`, { params: { bookId } });
    return res.data;
  },
  create: async (payload: { bookId: number; notes?: string; studentId?: number }) => {
    const res = await api.post<LoanRequest>('/loan-requests', payload);
    return res.data;
  },
  approve: async (id: number, payload?: { copyId?: number; pickupDeadlineDays?: number; notes?: string }) => {
    const res = await api.post<{ success: boolean; message: string; request: LoanRequest; copy: BookCopy }>(
      `/loan-requests/${id}/approve`,
      payload || {}
    );
    return res.data;
  },
  reject: async (id: number, payload: { reason: string; notes?: string }) => {
    const res = await api.post<{ success: boolean; message: string; request: LoanRequest }>(
      `/loan-requests/${id}/reject`,
      payload
    );
    return res.data;
  },
  cancel: async (id: number) => {
    const res = await api.post<{ success: boolean; message: string; request: LoanRequest }>(
      `/loan-requests/${id}/cancel`
    );
    return res.data;
  },
  fulfill: async (id: number) => {
    const res = await api.post<{ success: boolean; message: string; request: LoanRequest; loan: Loan }>(
      `/loan-requests/${id}/fulfill`
    );
    return res.data;
  },
};

export const notificationsApi = {
  getAll: async () => {
    const res = await api.get<Notification[]>('/notifications');
    return res.data;
  },
  markAsRead: async (id: number) => {
    const res = await api.post<{ success: boolean }>(`/notifications/${id}/read`);
    return res.data;
  },
  markAllAsRead: async () => {
    const res = await api.post<{ success: boolean }>('/notifications/read-all');
    return res.data;
  },
};

export default api;
