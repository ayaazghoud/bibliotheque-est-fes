import fs from 'fs';
import path from 'path';
import { emailService } from '../services/emailService.ts';
import {
  User,
  Student,
  Category,
  Book,
  BookCopy,
  Loan,
  LoanRequest,
  LoanRequestStatus,
  Notification,
  NotificationType,
  Reminder,
  SearchHistory,
  AuditLog,
  LibrarySettings,
  LoanStatus,
  OverdueLevel,
  CopyCondition,
  CopyStatus,
  RoleName,
} from './schema.ts';

const DB_DIR = path.resolve(process.cwd(), 'server-data');
const DB_FILE = path.resolve(DB_DIR, 'library_database.json');

interface DatabaseStore {
  categories: Category[];
  users: User[];
  students: Student[];
  books: Book[];
  bookCopies: BookCopy[];
  loans: Loan[];
  loanRequests: LoanRequest[];
  notifications: Notification[];
  reminders: Reminder[];
  searchHistories: SearchHistory[];
  auditLogs: AuditLog[];
  settings: LibrarySettings;
  counters: {
    category: number;
    user: number;
    student: number;
    book: number;
    copy: number;
    loan: number;
    loanRequest: number;
    notification: number;
    reminder: number;
    search: number;
    audit: number;
  };
}

const INITIAL_CATEGORIES: Category[] = [
  { id: 1, code: 'GL', name: 'Génie Logiciel', description: 'Génie logiciel, architectures, modélisation UML, design patterns et cycle de vie.' },
  { id: 2, code: 'RT', name: 'Réseaux et Télécommunications', description: 'Protocoles, sécurité des réseaux, télécommunications et administration systèmes.' },
  { id: 3, code: 'BD', name: 'Bases de Données', description: 'Modélisation relationnelle, SQL avancé, optimisation de requêtes et SGBD.' },
  { id: 4, code: 'AL', name: 'Algorithmique', description: 'Structures de données, complexité algorithmique et résolution de problèmes.' },
  { id: 5, code: 'PR', name: 'Programmation', description: 'Langages de programmation (Java, C, Python, JavaScript) et frameworks.' },
  { id: 6, code: 'GE', name: 'Génie Électrique', description: 'Électrotechnique, électronique de puissance, automatismes et systèmes embarqués.' },
  { id: 7, code: 'GE_ENT', name: 'Gestion des Entreprises', description: 'Management de projet, comptabilité, gestion financière et entrepreneuriat.' },
];

const INITIAL_USERS: User[] = [
  {
    id: 1,
    googleSub: 'google-sub-gerant-est',
    email: 'gerant.est@usmba.ac.ma',
    fullName: 'M. Rachid Bennani (Responsable Bibliothèque EST)',
    role: 'ROLE_GERANT',
    isActive: true,
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 2,
    googleSub: 'google-sub-aya-admin',
    email: 'aya.azghoud.19@gmail.com',
    fullName: 'Aya Azghoud (Gérante Bibliothèque EST)',
    role: 'ROLE_GERANT',
    isActive: true,
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 3,
    googleSub: 'google-sub-student-1',
    email: 'aya.azghoud@usmba.ac.ma',
    fullName: 'Aya Azghoud',
    role: 'ROLE_ETUDIANT',
    isActive: true,
    createdAt: '2026-09-10T10:00:00Z',
  },
  {
    id: 4,
    googleSub: 'google-sub-student-2',
    email: 'mehdi.elamrani@usmba.ac.ma',
    fullName: 'Mehdi El Amrani',
    role: 'ROLE_ETUDIANT',
    isActive: true,
    createdAt: '2026-09-12T11:30:00Z',
  },
  {
    id: 5,
    googleSub: 'google-sub-student-3',
    email: 'salma.idrissi@usmba.ac.ma',
    fullName: 'Salma Idrissi',
    role: 'ROLE_ETUDIANT',
    isActive: true,
    createdAt: '2026-09-15T09:15:00Z',
  },
  {
    id: 6,
    googleSub: 'google-sub-student-4',
    email: 'hamza.benjelloun@usmba.ac.ma',
    fullName: 'Hamza Benjelloun',
    role: 'ROLE_ETUDIANT',
    isActive: true,
    createdAt: '2026-09-18T14:20:00Z',
  },
];

const INITIAL_STUDENTS: Student[] = [
  { id: 1, userId: 3, studentIdNumber: 'N134098221', department: 'Génie Logiciel', phone: '+212 6 61 23 45 67', maxLoans: 3, createdAt: '2026-09-10T10:00:00Z' },
  { id: 2, userId: 4, studentIdNumber: 'N142076112', department: 'Réseaux et Télécoms', phone: '+212 6 62 34 56 78', maxLoans: 3, createdAt: '2026-09-12T11:30:00Z' },
  { id: 3, userId: 5, studentIdNumber: 'N139044558', department: 'Génie Informatique', phone: '+212 6 63 45 67 89', maxLoans: 3, createdAt: '2026-09-15T09:15:00Z' },
  { id: 4, userId: 6, studentIdNumber: 'N130099341', department: 'Génie Électrique', phone: '+212 6 64 56 78 90', maxLoans: 3, createdAt: '2026-09-18T14:20:00Z' },
];

const INITIAL_BOOKS: Book[] = [
  {
    id: 1,
    title: 'Conception et Architecture Logicielle avec UML et Design Patterns',
    author: 'Prof. Ahmed Bennani',
    isbn: '978-2-10-081234-1',
    categoryId: 1,
    publicationYear: 2024,
    publisher: 'Dunod Informatique',
    summary: 'Guide de référence pour la modélisation objet avancée, les patrons de conception GoF, et l’architecture hexagonale appliquée aux applications d’entreprise.',
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 2,
    title: 'Réseaux Informatiques : Protocoles TCP/IP, Routage et Sécurité',
    author: 'Dr. Karim Alami',
    isbn: '978-2-10-079876-2',
    categoryId: 2,
    publicationYear: 2023,
    publisher: 'Eyrolles Réseaux',
    summary: 'Fondements complets des architectures réseau, routage dynamique OSPF/BGP, segmentation VLAN, et politiques de sécurité périmétrique.',
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 3,
    title: 'Bases de Données Relationnelles et MySQL Avancé : Modélisation et Optimisation',
    author: 'Fatima Zahra Mansouri',
    isbn: '978-2-10-083451-8',
    categoryId: 3,
    publicationYear: 2024,
    publisher: 'Éditions ENI',
    summary: 'Modélisation relationnelle rigoureuse en 3NF, indexation B-Tree, optimisation des plans d’exécution SQL et gestion des transactions ACID.',
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 4,
    title: 'Structures de Données et Algorithmes Fondamentaux en Java',
    author: 'Youssef Tazi',
    isbn: '978-2-10-084992-5',
    categoryId: 4,
    publicationYear: 2023,
    publisher: 'Pearson Supérieur',
    summary: 'Arbres binaires, graphes, algorithmes de Dijkstra et A*, files de priorité et analyse de complexité spatio-temporelle Big-O.',
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 5,
    title: 'Développement Web Full Stack avec Spring Boot 3 et React 19',
    author: 'Prof. Mohammed Chraibi',
    isbn: '978-2-10-082119-0',
    categoryId: 5,
    publicationYear: 2025,
    publisher: 'O’Reilly France',
    summary: 'Conception d’APIs REST sécurisées par Spring Security et OAuth 2.0, Spring Data JPA avec MySQL et interfaces réactives en React moderne.',
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 6,
    title: 'Électrotechnique, Automates Programmables et Systèmes Embarqués',
    author: 'Hassan El Fassi',
    isbn: '978-2-10-080345-3',
    categoryId: 6,
    publicationYear: 2023,
    publisher: 'Dunod Sciences',
    summary: 'Circuits triphasés, machines électriques synchrones et asynchrones, automates industriels et microcontrôleurs embarqués.',
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 7,
    title: 'Management de Projets et Stratégie des Entreprises Technologiques',
    author: 'Dr. Leila Berrada',
    isbn: '978-2-10-085771-4',
    categoryId: 7,
    publicationYear: 2024,
    publisher: 'Vuibert Gestion',
    summary: 'Méthodes Agiles Scrum/Kanban, gestion financière prévisionnelle, analyse des risques et gouvernance des projets technologiques.',
    createdAt: '2026-09-01T08:00:00Z',
  },
];

const INITIAL_COPIES: BookCopy[] = [
  // Book 1: Conception Logicielle (3 copies: 2 available, 1 borrowed)
  { id: 1, bookId: 1, barcode: 'EST-GL-001-A', locationShelf: 'Salle Informatique - Rayon A1 - Étagère 2', condition: 'NEW', status: 'AVAILABLE', createdAt: '2026-09-01T08:00:00Z' },
  { id: 2, bookId: 1, barcode: 'EST-GL-001-B', locationShelf: 'Salle Informatique - Rayon A1 - Étagère 2', condition: 'GOOD', status: 'BORROWED', createdAt: '2026-09-01T08:00:00Z' },
  { id: 3, bookId: 1, barcode: 'EST-GL-001-C', locationShelf: 'Salle Informatique - Rayon A1 - Étagère 2', condition: 'GOOD', status: 'AVAILABLE', createdAt: '2026-09-01T08:00:00Z' },

  // Book 2: Réseaux (2 copies: 1 available, 1 borrowed overdue)
  { id: 4, bookId: 2, barcode: 'EST-RT-002-A', locationShelf: 'Salle Informatique - Rayon B2 - Étagère 1', condition: 'GOOD', status: 'BORROWED', createdAt: '2026-09-01T08:00:00Z' },
  { id: 5, bookId: 2, barcode: 'EST-RT-002-B', locationShelf: 'Salle Informatique - Rayon B2 - Étagère 1', condition: 'NEW', status: 'AVAILABLE', createdAt: '2026-09-01T08:00:00Z' },

  // Book 3: Bases de données (3 copies: 2 available, 1 borrowed overdue medium)
  { id: 6, bookId: 3, barcode: 'EST-BD-003-A', locationShelf: 'Salle Informatique - Rayon C1 - Étagère 3', condition: 'NEW', status: 'AVAILABLE', createdAt: '2026-09-01T08:00:00Z' },
  { id: 7, bookId: 3, barcode: 'EST-BD-003-B', locationShelf: 'Salle Informatique - Rayon C1 - Étagère 3', condition: 'BORROWED' as any, status: 'BORROWED', createdAt: '2026-09-01T08:00:00Z' },
  { id: 8, bookId: 3, barcode: 'EST-BD-003-C', locationShelf: 'Salle Informatique - Rayon C1 - Étagère 3', condition: 'GOOD', status: 'AVAILABLE', createdAt: '2026-09-01T08:00:00Z' },

  // Book 4: Algorithmique (2 copies: 1 available, 1 borrowed overdue high)
  { id: 9, bookId: 4, barcode: 'EST-AL-004-A', locationShelf: 'Salle Informatique - Rayon D3 - Étagère 2', condition: 'GOOD', status: 'BORROWED', createdAt: '2026-09-01T08:00:00Z' },
  { id: 10, bookId: 4, barcode: 'EST-AL-004-B', locationShelf: 'Salle Informatique - Rayon D3 - Étagère 2', condition: 'NEW', status: 'AVAILABLE', createdAt: '2026-09-01T08:00:00Z' },

  // Book 5: Spring Boot & React (2 copies: 2 available)
  { id: 11, bookId: 5, barcode: 'EST-PR-005-A', locationShelf: 'Salle Informatique - Rayon E1 - Étagère 1', condition: 'NEW', status: 'AVAILABLE', createdAt: '2026-09-01T08:00:00Z' },
  { id: 12, bookId: 5, barcode: 'EST-PR-005-B', locationShelf: 'Salle Informatique - Rayon E1 - Étagère 1', condition: 'GOOD', status: 'AVAILABLE', createdAt: '2026-09-01T08:00:00Z' },

  // Book 6: Génie Électrique (2 copies: 2 available)
  { id: 13, bookId: 6, barcode: 'EST-GE-006-A', locationShelf: 'Salle Technique - Rayon G1 - Étagère 4', condition: 'GOOD', status: 'AVAILABLE', createdAt: '2026-09-01T08:00:00Z' },
  { id: 14, bookId: 6, barcode: 'EST-GE-006-B', locationShelf: 'Salle Technique - Rayon G1 - Étagère 4', condition: 'FAIR', status: 'AVAILABLE', createdAt: '2026-09-01T08:00:00Z' },

  // Book 7: Gestion des Entreprises (2 copies: 2 available)
  { id: 15, bookId: 7, barcode: 'EST-MG-007-A', locationShelf: 'Salle Économie - Rayon M2 - Étagère 1', condition: 'NEW', status: 'AVAILABLE', createdAt: '2026-09-01T08:00:00Z' },
  { id: 16, bookId: 7, barcode: 'EST-MG-007-B', locationShelf: 'Salle Économie - Rayon M2 - Étagère 1', condition: 'GOOD', status: 'AVAILABLE', createdAt: '2026-09-01T08:00:00Z' },
];

// Current date in system: 2026-11-07
const INITIAL_LOANS: Loan[] = [
  // 1. Active loan, not overdue (loaned 2026-11-01, expected 2026-11-15) -> Copy id 2
  {
    id: 1,
    studentId: 1, // Aya Azghoud
    bookCopyId: 2, // EST-GL-001-B
    loanDate: '2026-11-01',
    expectedReturnDate: '2026-11-15',
    actualReturnDate: null,
    status: 'ACTIVE',
    notes: 'Projet de fin de semestre - module Architecture logicielle',
    createdByUserId: 1,
    createdAt: '2026-11-01T10:00:00Z',
    overdueDays: 0,
    overdueLevel: 'NONE',
    reminderCount: 0,
  },
  // 2. Overdue loan, Low level (loaned 2026-10-21, expected 2026-11-04, 3 days overdue) -> Copy id 4
  {
    id: 2,
    studentId: 2, // Mehdi El Amrani
    bookCopyId: 4, // EST-RT-002-A
    loanDate: '2026-10-21',
    expectedReturnDate: '2026-11-04',
    actualReturnDate: null,
    status: 'OVERDUE',
    notes: 'Préparation certification Réseaux',
    createdByUserId: 1,
    createdAt: '2026-10-21T09:30:00Z',
    overdueDays: 3,
    overdueLevel: 'LOW',
    reminderCount: 1,
    lastReminderSentAt: '2026-11-05T14:30:00Z',
  },
  // 3. Overdue loan, Medium level (loaned 2026-10-18, expected 2026-11-01, 6 days overdue) -> Copy id 7
  {
    id: 3,
    studentId: 3, // Salma Idrissi
    bookCopyId: 7, // EST-BD-003-B
    loanDate: '2026-10-18',
    expectedReturnDate: '2026-11-01',
    actualReturnDate: null,
    status: 'OVERDUE',
    notes: 'TP Bases de données avancées',
    createdByUserId: 1,
    createdAt: '2026-10-18T14:00:00Z',
    overdueDays: 6,
    overdueLevel: 'MEDIUM',
    reminderCount: 2,
    lastReminderSentAt: '2026-11-04T10:15:00Z',
  },
  // 4. Overdue loan, High level (loaned 2026-10-12, expected 2026-10-26, 12 days overdue) -> Copy id 9
  {
    id: 4,
    studentId: 4, // Hamza Benjelloun
    bookCopyId: 9, // EST-AL-004-A
    loanDate: '2026-10-12',
    expectedReturnDate: '2026-10-26',
    actualReturnDate: null,
    status: 'OVERDUE',
    notes: 'Révision Algorithmique et complexité',
    createdByUserId: 1,
    createdAt: '2026-10-12T11:00:00Z',
    overdueDays: 12,
    overdueLevel: 'HIGH',
    reminderCount: 3,
    lastReminderSentAt: '2026-11-02T08:45:00Z',
  },
  // 5. Returned loan (completed)
  {
    id: 5,
    studentId: 1, // Aya Azghoud
    bookCopyId: 11, // EST-PR-005-A
    loanDate: '2026-10-01',
    expectedReturnDate: '2026-10-15',
    actualReturnDate: '2026-10-14',
    status: 'RETURNED',
    notes: 'Rendu en parfait état',
    createdByUserId: 1,
    createdAt: '2026-10-01T10:00:00Z',
    overdueDays: 0,
    overdueLevel: 'NONE',
    reminderCount: 0,
  },
];

const INITIAL_REMINDERS: Reminder[] = [
  {
    id: 1,
    loanId: 2,
    recipientEmail: 'mehdi.elamrani@usmba.ac.ma',
    overdueDays: 1,
    overdueLevel: 'LOW',
    messageContent: 'Rappel amical : l’ouvrage « Réseaux Informatiques » emprunté à la Bibliothèque EST est arrivé à échéance le 04/11/2026. Merci de le restituer dès que possible.',
    deliveryStatus: 'SENT',
    sentAt: '2026-11-05T14:30:00Z',
    sentByUserId: 1,
  },
  {
    id: 2,
    loanId: 3,
    recipientEmail: 'salma.idrissi@usmba.ac.ma',
    overdueDays: 3,
    overdueLevel: 'MEDIUM',
    messageContent: 'Avis de retard : l’ouvrage « Bases de Données Relationnelles » est en retard de 3 jours. Prière de le rapporter au guichet de prêt de l’EST Fès.',
    deliveryStatus: 'SENT',
    sentAt: '2026-11-04T10:15:00Z',
    sentByUserId: 1,
  },
  {
    id: 3,
    loanId: 4,
    recipientEmail: 'hamza.benjelloun@usmba.ac.ma',
    overdueDays: 7,
    overdueLevel: 'HIGH',
    messageContent: 'Mise en demeure de restitution : l’ouvrage « Structures de Données et Algorithmes » accuse un retard important de plus de 7 jours. Votre compte d’emprunt est suspendu jusqu’à régularisation.',
    deliveryStatus: 'SENT',
    sentAt: '2026-11-02T08:45:00Z',
    sentByUserId: 1,
  },
];

const INITIAL_AUDIT: AuditLog[] = [
  {
    id: 1,
    actorUserId: 1,
    actorName: 'M. Rachid Bennani',
    action: 'SYSTEM_INITIALIZATION',
    entityName: 'LIBRARY',
    entityId: 1,
    details: { message: 'Initialisation du catalogue de la bibliothèque EST Fès' },
    timestamp: '2026-09-01T08:00:00Z',
  },
  {
    id: 2,
    actorUserId: 1,
    actorName: 'M. Rachid Bennani',
    action: 'CREATE_LOAN',
    entityName: 'LOAN',
    entityId: 1,
    details: { student: 'Aya Azghoud', copyBarcode: 'EST-GL-001-B', expectedReturn: '2026-11-15' },
    timestamp: '2026-11-01T10:00:00Z',
  },
];

const INITIAL_LOAN_REQUESTS: LoanRequest[] = [
  // 1. Pending request from Mehdi El Amrani (studentId: 2) for Book 5 (Spring Boot & React 19)
  {
    id: 1,
    studentId: 2,
    bookId: 5,
    requestDate: '2026-11-06T14:30:00Z',
    status: 'PENDING',
    notes: 'Besoin pour le projet semestriel en génie logiciel et développement web.',
    createdAt: '2026-11-06T14:30:00Z',
  },
  // 2. Approved request with reserved copy for Salma Idrissi (studentId: 3) for Book 1 (Conception Logicielle)
  {
    id: 2,
    studentId: 3,
    bookId: 1,
    allocatedCopyId: 3, // EST-GL-001-C (reserved)
    requestDate: '2026-11-05T10:15:00Z',
    status: 'APPROVED',
    reviewDate: '2026-11-05T11:00:00Z',
    reviewedByUserId: 1,
    pickupDeadline: '2026-11-08',
    notes: 'Demande validée. Exemplaire mis de côté au guichet.',
    createdAt: '2026-11-05T10:15:00Z',
    updatedAt: '2026-11-05T11:00:00Z',
  },
  // 3. Rejected request for Hamza Benjelloun (studentId: 4) for Book 3 (Bases de données)
  {
    id: 3,
    studentId: 4,
    bookId: 3,
    requestDate: '2026-11-04T09:00:00Z',
    status: 'REJECTED',
    reviewDate: '2026-11-04T10:30:00Z',
    reviewedByUserId: 1,
    rejectionReason: "Étudiant ayant un retard bloquant (veuillez restituer l'ouvrage en retard).",
    createdAt: '2026-11-04T09:00:00Z',
    updatedAt: '2026-11-04T10:30:00Z',
  },
];

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 1,
    recipientUserId: 1, // Manager
    recipientRole: 'ROLE_GERANT',
    type: 'NEW_LOAN_REQUEST',
    title: "Nouvelle demande d'emprunt en ligne",
    message: "L'étudiant Mehdi El Amrani a soumis une demande d'emprunt pour « Développement Web Full Stack avec Spring Boot 3 et React 19 ».",
    relatedEntityName: 'LOAN_REQUEST',
    relatedEntityId: 1,
    isRead: false,
    createdAt: '2026-11-06T14:30:00Z',
  },
  {
    id: 2,
    recipientUserId: 5, // Salma Idrissi
    type: 'REQUEST_APPROVED',
    title: "Demande d'emprunt acceptée",
    message: "Votre demande pour « Conception et Architecture Logicielle avec UML et Design Patterns » a été acceptée. Votre exemplaire EST-GL-001-C est réservé jusqu'au 08/11/2026 au guichet de prêt de la bibliothèque.",
    relatedEntityName: 'LOAN_REQUEST',
    relatedEntityId: 2,
    isRead: false,
    createdAt: '2026-11-05T11:00:00Z',
  },
  {
    id: 3,
    recipientUserId: 6, // Hamza Benjelloun
    type: 'REQUEST_REJECTED',
    title: "Demande d'emprunt refusée",
    message: "Votre demande pour « Bases de Données Relationnelles et MySQL Avancé » a été refusée. Motif : Étudiant ayant un retard bloquant.",
    relatedEntityName: 'LOAN_REQUEST',
    relatedEntityId: 3,
    isRead: true,
    createdAt: '2026-11-04T10:30:00Z',
  },
];

const INITIAL_SETTINGS: LibrarySettings = {
  id: 1,
  defaultLoanDurationDays: 14, // Durée du prêt (14 jours)
  maxLoansPerStudent: 3, // Nombre maximum d'emprunts par étudiant (3)
  withdrawalDeadlineHours: 48, // Délai de retrait (48 h)
  reservationDurationDays: 2, // 48h deadline (2 jours)
  reminderDaysBeforeDue: 2, // 2 jours avant la date de retour : rappel de retour
  overdueReminderFrequencyDays: 3, // en cas de retard : un e-mail tous les 3 jours
  suspensionThresholdDays: 7, // seuil de suspension (7 jours de retard)
  maxActiveRequestsPerStudent: 2,
  overdueLowThreshold: 1,
  overdueMediumThreshold: 4,
  overdueHighThreshold: 8,
  smtpEnabled: true,
  smtpFromAddress: 'bibliotheque.est@usmba.ac.ma',
  smtpFromName: 'Bibliothèque EST Fès - USMBA',
  smtpHost: 'smtp.usmba.ac.ma',
  smtpPort: 587,
};

class RelationalDatabase {
  private store: DatabaseStore;

  constructor() {
    this.store = this.loadFromDisk();
    this.recalculateAllOverdues();
    this.checkExpiredReservations();
  }

  public getTodayStr(): string {
    return new Date().toISOString().split('T')[0];
  }

  private loadFromDisk(): DatabaseStore {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const loaded = JSON.parse(raw);

        // Ensure new loanRequests and notifications tables exist if migrating
        let needsSave = false;
        if (!loaded.loanRequests || loaded.loanRequests.length === 0) {
          loaded.loanRequests = INITIAL_LOAN_REQUESTS;
          needsSave = true;
        }
        if (!loaded.notifications || loaded.notifications.length === 0) {
          loaded.notifications = INITIAL_NOTIFICATIONS;
          needsSave = true;
        }
        if (!loaded.counters) {
          loaded.counters = {};
          needsSave = true;
        }
        if (loaded.counters.loanRequest === undefined) {
          loaded.counters.loanRequest = loaded.loanRequests.length;
          needsSave = true;
        }
        if (loaded.counters.notification === undefined) {
          loaded.counters.notification = loaded.notifications.length;
          needsSave = true;
        }
        if (loaded.settings) {
          if (loaded.settings.defaultLoanDurationDays === undefined) {
            loaded.settings.defaultLoanDurationDays = 14;
            needsSave = true;
          }
          if (loaded.settings.maxLoansPerStudent === undefined) {
            loaded.settings.maxLoansPerStudent = 3;
            needsSave = true;
          }
          if (loaded.settings.withdrawalDeadlineHours === undefined) {
            loaded.settings.withdrawalDeadlineHours = 48;
            needsSave = true;
          }
          if (loaded.settings.reservationDurationDays === undefined) {
            loaded.settings.reservationDurationDays = 2;
            needsSave = true;
          }
          if (loaded.settings.reminderDaysBeforeDue === undefined) {
            loaded.settings.reminderDaysBeforeDue = 2;
            needsSave = true;
          }
          if (loaded.settings.overdueReminderFrequencyDays === undefined) {
            loaded.settings.overdueReminderFrequencyDays = 3;
            needsSave = true;
          }
          if (loaded.settings.suspensionThresholdDays === undefined) {
            loaded.settings.suspensionThresholdDays = 7;
            needsSave = true;
          }
        } else {
          loaded.settings = INITIAL_SETTINGS;
          needsSave = true;
        }

        // Ensure copy 3 is marked RESERVED if loan request 2 is approved
        const copy3 = loaded.bookCopies?.find((c: any) => c.id === 3);
        if (copy3 && copy3.status === 'AVAILABLE') {
          copy3.status = 'RESERVED';
          needsSave = true;
        }

        if (needsSave) {
          this.saveToDisk(loaded);
        }
        return loaded;
      }
    } catch (e) {
      console.warn('Could not read existing database, initializing fresh store:', e);
    }

    const initial: DatabaseStore = {
      categories: INITIAL_CATEGORIES,
      users: INITIAL_USERS,
      students: INITIAL_STUDENTS,
      books: INITIAL_BOOKS,
      bookCopies: INITIAL_COPIES,
      loans: INITIAL_LOANS,
      loanRequests: INITIAL_LOAN_REQUESTS,
      notifications: INITIAL_NOTIFICATIONS,
      reminders: INITIAL_REMINDERS,
      searchHistories: [
        { id: 1, studentId: 1, queryText: 'Architecture', categoryId: 1, resultsCount: 1, searchedAt: '2026-11-01T09:45:00Z' },
        { id: 2, studentId: 1, queryText: 'Spring Boot', categoryId: 5, resultsCount: 1, searchedAt: '2026-11-02T14:10:00Z' },
      ],
      auditLogs: INITIAL_AUDIT,
      settings: INITIAL_SETTINGS,
      counters: {
        category: 7,
        user: 6,
        student: 4,
        book: 7,
        copy: 16,
        loan: 5,
        loanRequest: 3,
        notification: 3,
        reminder: 3,
        search: 2,
        audit: 2,
      },
    };

    this.saveToDisk(initial);
    return initial;
  }

  public saveToDisk(store?: DatabaseStore): void {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(store || this.store, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving database to disk:', e);
    }
  }

  // Calculate real overdue based on current date
  public recalculateAllOverdues(): void {
    const todayStr = this.getTodayStr();
    const today = new Date(todayStr);

    for (const loan of this.store.loans) {
      if (loan.status === 'RETURNED') {
        loan.overdueDays = 0;
        loan.overdueLevel = 'NONE';
        continue;
      }

      const expectedDate = new Date(loan.expectedReturnDate);
      const diffTime = today.getTime() - expectedDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        loan.overdueDays = diffDays;
        loan.status = 'OVERDUE';
        if (diffDays >= this.store.settings.overdueHighThreshold) {
          loan.overdueLevel = 'HIGH';
        } else if (diffDays >= this.store.settings.overdueMediumThreshold) {
          loan.overdueLevel = 'MEDIUM';
        } else {
          loan.overdueLevel = 'LOW';
        }
      } else {
        loan.overdueDays = 0;
        loan.status = 'ACTIVE';
        loan.overdueLevel = 'NONE';
      }
    }
    this.saveToDisk();
  }

  // --- Categories ---
  public getCategories(): Category[] {
    return [...this.store.categories];
  }

  public getCategoryById(id: number): Category | undefined {
    return this.store.categories.find(c => c.id === id);
  }

  // --- Books & Copies ---
  public getBooks(filters?: { query?: string; categoryId?: number }): Book[] {
    let result = [...this.store.books];

    if (filters?.categoryId) {
      result = result.filter(b => b.categoryId === filters.categoryId);
    }

    if (filters?.query && filters.query.trim()) {
      const normalize = (str: string) =>
        str
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim();

      const q = normalize(filters.query);
      result = result.filter(b => {
        const titleNorm = normalize(b.title || '');
        const subtitleNorm = normalize((b as any).subtitle || '');
        const authorNorm = normalize(b.author || '');
        const summaryNorm = normalize(b.summary || '');
        const isbnNorm = normalize(b.isbn || '');
        const publisherNorm = normalize((b as any).publisher || '');

        return (
          titleNorm.includes(q) ||
          subtitleNorm.includes(q) ||
          authorNorm.includes(q) ||
          summaryNorm.includes(q) ||
          isbnNorm.includes(q) ||
          publisherNorm.includes(q)
        );
      });
    }

    // Attach computed availability and category name
    return result.map(book => {
      const category = this.getCategoryById(book.categoryId);
      const copies = this.store.bookCopies.filter(c => c.bookId === book.id);
      const availableCopies = copies.filter(c => c.status === 'AVAILABLE').length;

      return {
        ...book,
        categoryName: category?.name || 'Inconnue',
        totalCopies: copies.length,
        availableCopies,
      };
    });
  }

  public getBookById(id: number): Book | undefined {
    const book = this.store.books.find(b => b.id === id);
    if (!book) return undefined;

    const category = this.getCategoryById(book.categoryId);
    const copies = this.store.bookCopies.filter(c => c.bookId === book.id);
    const availableCopies = copies.filter(c => c.status === 'AVAILABLE').length;

    return {
      ...book,
      categoryName: category?.name || 'Inconnue',
      totalCopies: copies.length,
      availableCopies,
    };
  }

  public getBookByIsbn(isbn: string): Book | undefined {
    const clean = isbn.replace(/[-\s]/g, '').toLowerCase();
    const book = this.store.books.find(
      b => b.isbn && b.isbn.replace(/[-\s]/g, '').toLowerCase() === clean
    );
    if (!book) return undefined;
    return this.getBookById(book.id);
  }

  public createBook(data: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>): Book {
    // Check ISBN uniqueness if provided
    if (data.isbn) {
      const exists = this.store.books.some(b => b.isbn === data.isbn);
      if (exists) {
        throw new Error(`Un ouvrage avec l'ISBN ${data.isbn} existe déjà dans la base.`);
      }
    }

    this.store.counters.book += 1;
    const newBook: Book = {
      ...data,
      id: this.store.counters.book,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.store.books.push(newBook);
    this.saveToDisk();
    return this.getBookById(newBook.id)!;
  }

  public updateBook(id: number, data: Partial<Book>): Book {
    const idx = this.store.books.findIndex(b => b.id === id);
    if (idx === -1) throw new Error(`Ouvrage introuvable (ID: ${id})`);

    if (data.isbn) {
      const duplicate = this.store.books.some(b => b.isbn === data.isbn && b.id !== id);
      if (duplicate) {
        throw new Error(`Un autre ouvrage possède déjà cet ISBN (${data.isbn}).`);
      }
    }

    this.store.books[idx] = {
      ...this.store.books[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    this.saveToDisk();
    return this.getBookById(id)!;
  }

  public deleteBook(_id: number): void {
    throw new Error(
      "Action interdite : la suppression des livres est désactivée. Tous les ouvrages doivent être conservés pour préserver l'historique de la bibliothèque."
    );
  }

  // --- Copies ---
  public getCopies(bookId?: number): BookCopy[] {
    let copies = [...this.store.bookCopies];
    if (bookId) {
      copies = copies.filter(c => c.bookId === bookId);
    }
    return copies.map(copy => ({
      ...copy,
      book: this.store.books.find(b => b.id === copy.bookId),
    }));
  }

  public getCopyById(id: number): BookCopy | undefined {
    const copy = this.store.bookCopies.find(c => c.id === id);
    if (!copy) return undefined;
    return {
      ...copy,
      book: this.store.books.find(b => b.id === copy.bookId),
    };
  }

  public getCopyByBarcode(barcode: string): BookCopy | undefined {
    const trimmed = barcode.trim().toUpperCase();
    const copy = this.store.bookCopies.find(c => c.barcode.toUpperCase() === trimmed);
    if (!copy) return undefined;
    return {
      ...copy,
      book: this.store.books.find(b => b.id === copy.bookId),
    };
  }

  public createCopy(data: Omit<BookCopy, 'id' | 'createdAt'>): BookCopy {
    const barcodeTrimmed = data.barcode.trim().toUpperCase();
    const exists = this.store.bookCopies.some(c => c.barcode.toUpperCase() === barcodeTrimmed);
    if (exists) {
      throw new Error(`Le code-barres ${data.barcode} est déjà attribué à un autre exemplaire.`);
    }

    const book = this.store.books.find(b => b.id === data.bookId);
    if (!book) {
      throw new Error(`L'ouvrage référencé (ID: ${data.bookId}) n'existe pas.`);
    }

    this.store.counters.copy += 1;
    const newCopy: BookCopy = {
      ...data,
      barcode: barcodeTrimmed,
      id: this.store.counters.copy,
      status: data.status || 'AVAILABLE',
      createdAt: new Date().toISOString(),
    };

    this.store.bookCopies.push(newCopy);
    this.saveToDisk();
    return this.getCopyById(newCopy.id)!;
  }

  public createCopiesBatch(
    bookId: number,
    copiesData: Array<{ barcode: string; locationShelf: string; condition?: CopyCondition }>
  ): BookCopy[] {
    const book = this.store.books.find(b => b.id === bookId);
    if (!book) {
      throw new Error(`L'ouvrage référencé (ID: ${bookId}) n'existe pas.`);
    }

    const createdCopies: BookCopy[] = [];
    for (const item of copiesData) {
      const barcodeTrimmed = item.barcode.trim().toUpperCase();
      const exists = this.store.bookCopies.some(c => c.barcode.toUpperCase() === barcodeTrimmed);
      if (exists) {
        throw new Error(`Le code-barres ${item.barcode} est déjà attribué à un autre exemplaire.`);
      }

      this.store.counters.copy += 1;
      const newCopy: BookCopy = {
        id: this.store.counters.copy,
        bookId,
        barcode: barcodeTrimmed,
        locationShelf: item.locationShelf.trim(),
        condition: item.condition || 'NEW',
        status: 'AVAILABLE',
        createdAt: new Date().toISOString(),
      };
      this.store.bookCopies.push(newCopy);
      createdCopies.push(newCopy);
    }

    this.saveToDisk();
    return createdCopies.map(c => this.getCopyById(c.id)!);
  }

  public updateCopy(id: number, data: Partial<BookCopy>): BookCopy {
    const idx = this.store.bookCopies.findIndex(c => c.id === id);
    if (idx === -1) throw new Error(`Exemplaire introuvable (ID: ${id})`);

    if (data.barcode) {
      const barcodeTrimmed = data.barcode.trim().toUpperCase();
      const duplicate = this.store.bookCopies.some(c => c.barcode.toUpperCase() === barcodeTrimmed && c.id !== id);
      if (duplicate) {
        throw new Error(`Le code-barres ${data.barcode} est déjà utilisé.`);
      }
      data.barcode = barcodeTrimmed;
    }

    this.store.bookCopies[idx] = {
      ...this.store.bookCopies[idx],
      ...data,
    };

    this.saveToDisk();
    return this.getCopyById(id)!;
  }

  public deleteCopy(_id: number): void {
    throw new Error(
      "Action interdite : la suppression des exemplaires est désactivée. Modifiez plutôt le statut de l'exemplaire (ex: 'Retiré du service', 'Perdu', 'Endommagé') afin de préserver l'historique des emprunts."
    );
  }

  // --- Users & Students ---
  public getUsers(): User[] {
    return [...this.store.users];
  }

  public getUserByEmail(email: string): User | undefined {
    return this.store.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserById(id: number): User | undefined {
    return this.store.users.find(u => u.id === id);
  }

  public getStudents(): Student[] {
    return this.store.students.map(s => ({
      ...s,
      user: this.store.users.find(u => u.id === s.userId),
    }));
  }

  public getStudentById(id: number): Student | undefined {
    const s = this.store.students.find(st => st.id === id);
    if (!s) return undefined;
    return {
      ...s,
      user: this.store.users.find(u => u.id === s.userId),
    };
  }

  public getStudentByUserId(userId: number): Student | undefined {
    const s = this.store.students.find(st => st.userId === userId);
    if (!s) return undefined;
    return {
      ...s,
      user: this.store.users.find(u => u.id === s.userId),
    };
  }

  public getStudentByStudentIdNumber(studentIdNumber: string): Student | undefined {
    const trimmed = studentIdNumber.trim().toUpperCase();
    const s = this.store.students.find(st => st.studentIdNumber.trim().toUpperCase() === trimmed);
    if (!s) return undefined;
    return {
      ...s,
      user: this.store.users.find(u => u.id === s.userId),
    };
  }

  // --- Database Availability & Google Auto-Provisioning ---
  public isAvailable(): boolean {
    if (process.env.FORCE_DB_UNAVAILABLE === 'true') {
      return false;
    }
    return !!this.store && Array.isArray(this.store.users);
  }

  private formatDisplayNameFromEmail(email: string): string {
    const localPart = email.split('@')[0] || 'etudiant';
    return localPart
      .split(/[._-]+/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ') || 'Étudiant USMBA';
  }

  public autoProvisionStudentFromGoogle(data: {
    email: string;
    fullName?: string;
    googleSub?: string;
    avatarUrl?: string;
  }): { user: User; student: Student } {
    if (!this.isAvailable()) {
      throw new Error('DB_UNAVAILABLE');
    }

    const emailTrimmed = data.email.toLowerCase().trim();
    const existingUser = this.getUserByEmail(emailTrimmed);
    if (existingUser) {
      const existingStudent =
        existingUser.role === 'ROLE_ETUDIANT'
          ? this.getStudentByUserId(existingUser.id) || this.ensureStudentProfileForUser(existingUser)
          : undefined;
      if (!existingStudent) {
        throw new Error('Compte existant sans profil étudiant.');
      }
      return { user: existingUser, student: existingStudent };
    }

    this.store.counters.user += 1;
    const displayName = (data.fullName || '').trim() || this.formatDisplayNameFromEmail(emailTrimmed);
    const newUser: User = {
      id: this.store.counters.user,
      googleSub: data.googleSub || undefined,
      email: emailTrimmed,
      fullName: displayName,
      avatarUrl:
        data.avatarUrl ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
      role: 'ROLE_ETUDIANT', // Jamais ROLE_GERANT automatiquement
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    this.store.users.push(newUser);

    const newStudent = this.ensureStudentProfileForUser(newUser);

    this.addAuditLog({
      actorUserId: newUser.id,
      actorName: newUser.fullName,
      action: 'STUDENT_AUTO_PROVISIONED_GOOGLE',
      entityName: 'USER',
      entityId: newUser.id,
      details: {
        email: emailTrimmed,
        role: 'ROLE_ETUDIANT',
        studentIdNumber: newStudent.studentIdNumber,
      },
    });

    this.saveToDisk();
    return { user: newUser, student: newStudent };
  }

  public ensureStudentProfileForUser(user: User): Student {
    const existing = this.getStudentByUserId(user.id);
    if (existing) return existing;

    this.store.counters.student += 1;
    const autoCode = `USMBA-AUTO-${String(user.id).padStart(4, '0')}`;
    const newStudent: Student = {
      id: this.store.counters.student,
      userId: user.id,
      studentIdNumber: autoCode,
      department: 'EST Fès',
      maxLoans: this.store.settings.maxLoansPerStudent || 3,
      academicYear: '2026/2027',
      establishment: 'École Supérieure de Technologie de Fès (USMBA)',
      createdAt: new Date().toISOString(),
    };
    this.store.students.push(newStudent);
    this.saveToDisk();
    return this.getStudentById(newStudent.id)!;
  }

  public createStudent(data: {
    fullName: string;
    email: string;
    studentIdNumber: string;
    department: string;
    phone?: string;
    academicYear?: string;
    establishment?: string;
    cardReference?: string;
    actorUserId: number;
  }): Student {
    const studentIdTrimmed = data.studentIdNumber.trim().toUpperCase();
    const emailTrimmed = data.email.trim().toLowerCase();

    // 1. Check duplicate student ID
    const existingStudent = this.store.students.find(
      s => s.studentIdNumber.trim().toUpperCase() === studentIdTrimmed
    );
    if (existingStudent) {
      const u = this.store.users.find(usr => usr.id === existingStudent.userId);
      throw new Error(
        `L'étudiant avec le numéro ${studentIdTrimmed} (${u?.fullName || 'Existant'}) est déjà enregistré dans la bibliothèque.`
      );
    }

    // 2. Check duplicate email in users (upgrade auto-provisioned student profile if applicable)
    const existingUser = this.store.users.find(u => u.email.toLowerCase() === emailTrimmed);
    if (existingUser) {
      const linkedStudent = this.store.students.find(s => s.userId === existingUser.id);
      if (
        existingUser.role === 'ROLE_ETUDIANT' &&
        linkedStudent &&
        linkedStudent.studentIdNumber.startsWith('USMBA-AUTO-')
      ) {
        existingUser.fullName = data.fullName.trim();
        linkedStudent.studentIdNumber = studentIdTrimmed;
        linkedStudent.department = data.department.trim();
        linkedStudent.phone = data.phone?.trim() || linkedStudent.phone;
        linkedStudent.academicYear = data.academicYear?.trim() || linkedStudent.academicYear || '2026/2027';
        linkedStudent.establishment =
          data.establishment?.trim() ||
          linkedStudent.establishment ||
          'École Supérieure de Technologie de Fès (USMBA)';
        linkedStudent.cardReference =
          data.cardReference?.trim() || `CARD-${studentIdTrimmed}-${Date.now().toString().slice(-4)}`;

        this.addAuditLog({
          actorUserId: data.actorUserId,
          action: 'STUDENT_REGISTERED_CARD_SCAN',
          entityName: 'STUDENT',
          entityId: linkedStudent.id,
          details: {
            studentName: existingUser.fullName,
            studentIdNumber: linkedStudent.studentIdNumber,
            department: linkedStudent.department,
            upgradedFromAutoProvision: true,
          },
        });
        this.saveToDisk();
        return this.getStudentById(linkedStudent.id)!;
      }

      throw new Error(`L'adresse e-mail ${emailTrimmed} est déjà associée à un compte.`);
    }

    // 3. Create User record
    this.store.counters.user += 1;
    const newUser: User = {
      id: this.store.counters.user,
      googleSub: `google-card-${Date.now()}`,
      email: emailTrimmed,
      fullName: data.fullName.trim(),
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.fullName.trim())}`,
      role: 'ROLE_ETUDIANT',
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    this.store.users.push(newUser);

    // 4. Create Student record
    this.store.counters.student += 1;
    const newStudent: Student = {
      id: this.store.counters.student,
      userId: newUser.id,
      studentIdNumber: studentIdTrimmed,
      department: data.department.trim(),
      phone: data.phone?.trim() || undefined,
      maxLoans: this.store.settings.maxLoansPerStudent || 3,
      academicYear: data.academicYear?.trim() || '2026/2027',
      establishment: data.establishment?.trim() || 'École Supérieure de Technologie de Fès (USMBA)',
      cardReference: data.cardReference?.trim() || `CARD-${studentIdTrimmed}-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString(),
    };
    this.store.students.push(newStudent);

    // 5. Add Audit Log
    this.addAuditLog({
      actorUserId: data.actorUserId,
      action: 'STUDENT_REGISTERED_CARD_SCAN',
      entityName: 'STUDENT',
      entityId: newStudent.id,
      details: {
        studentName: newUser.fullName,
        studentIdNumber: newStudent.studentIdNumber,
        department: newStudent.department,
        academicYear: newStudent.academicYear,
        establishment: newStudent.establishment,
      },
    });

    this.saveToDisk();
    return this.getStudentById(newStudent.id)!;
  }

  // --- Loans & Returns ---
  public getLoans(filters?: { studentId?: number; status?: LoanStatus; onlyOverdue?: boolean }): Loan[] {
    this.recalculateAllOverdues();
    let loans = [...this.store.loans];

    if (filters?.studentId) {
      loans = loans.filter(l => l.studentId === filters.studentId);
    }

    if (filters?.status) {
      loans = loans.filter(l => l.status === filters.status);
    }

    if (filters?.onlyOverdue) {
      loans = loans.filter(l => l.status === 'OVERDUE' || l.overdueDays > 0);
    }

    // Sort by id descending (most recent first)
    loans.sort((a, b) => b.id - a.id);

    return loans.map(loan => {
      const student = this.getStudentById(loan.studentId);
      const copy = this.getCopyById(loan.bookCopyId);
      const book = copy ? this.getBookById(copy.bookId) : undefined;

      return {
        ...loan,
        student,
        bookCopy: copy,
        book,
      };
    });
  }

  public getLoanById(id: number): Loan | undefined {
    this.recalculateAllOverdues();
    const loan = this.store.loans.find(l => l.id === id);
    if (!loan) return undefined;

    const student = this.getStudentById(loan.studentId);
    const copy = this.getCopyById(loan.bookCopyId);
    const book = copy ? this.getBookById(copy.bookId) : undefined;

    return {
      ...loan,
      student,
      bookCopy: copy,
      book,
    };
  }

  public createLoan(data: {
    studentId: number;
    bookCopyId: number;
    loanDate: string;
    expectedReturnDate: string;
    notes?: string;
    actorUserId: number;
  }): Loan {
    // 1. Check student exists and can borrow
    const student = this.getStudentById(data.studentId);
    if (!student) throw new Error(`Étudiant introuvable (ID: ${data.studentId})`);

    const activeLoans = this.store.loans.filter(l => l.studentId === data.studentId && l.status !== 'RETURNED');
    if (activeLoans.length >= student.maxLoans) {
      throw new Error(`Cet étudiant a atteint le quota maximal de prêts simultanés (${student.maxLoans}).`);
    }

    // 2. Check copy exists and is AVAILABLE
    const copy = this.getCopyById(data.bookCopyId);
    if (!copy) throw new Error(`Exemplaire introuvable (ID: ${data.bookCopyId})`);
    if (copy.status !== 'AVAILABLE') {
      throw new Error(`Cet exemplaire (${copy.barcode}) n'est pas disponible pour le prêt (Statut actuel: ${copy.status}).`);
    }

    // 3. Atomically create loan and set copy status to BORROWED
    this.store.counters.loan += 1;
    const newLoan: Loan = {
      id: this.store.counters.loan,
      studentId: data.studentId,
      bookCopyId: data.bookCopyId,
      loanDate: data.loanDate,
      expectedReturnDate: data.expectedReturnDate,
      actualReturnDate: null,
      status: 'ACTIVE',
      notes: data.notes,
      createdByUserId: data.actorUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      overdueDays: 0,
      overdueLevel: 'NONE',
      reminderCount: 0,
    };

    // Update copy status
    const copyIdx = this.store.bookCopies.findIndex(c => c.id === data.bookCopyId);
    if (copyIdx !== -1) {
      this.store.bookCopies[copyIdx].status = 'BORROWED';
    }

    this.store.loans.push(newLoan);

    // Audit Log
    this.addAuditLog({
      actorUserId: data.actorUserId,
      action: 'LOAN_CREATED',
      entityName: 'LOAN',
      entityId: newLoan.id,
      details: {
        student: student.user?.fullName,
        studentCNE: student.studentIdNumber,
        copyBarcode: copy.barcode,
        loanDate: data.loanDate,
        expectedReturnDate: data.expectedReturnDate,
      },
    });

    this.saveToDisk();
    return this.getLoanById(newLoan.id)!;
  }

  public returnLoan(loanId: number, data: { actualReturnDate: string; condition?: string; actorUserId: number; notes?: string }): Loan {
    const loanIdx = this.store.loans.findIndex(l => l.id === loanId);
    if (loanIdx === -1) throw new Error(`Emprunt introuvable (ID: ${loanId})`);

    const loan = this.store.loans[loanIdx];
    if (loan.status === 'RETURNED') {
      throw new Error(`Cet emprunt a déjà été retourné le ${loan.actualReturnDate}.`);
    }

    // Calculate overdue days at return date
    const expectedDate = new Date(loan.expectedReturnDate);
    const returnDate = new Date(data.actualReturnDate);
    const overdueDays = Math.max(0, Math.floor((returnDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24)));

    loan.actualReturnDate = data.actualReturnDate;
    loan.status = 'RETURNED';
    loan.overdueDays = 0;
    loan.overdueLevel = 'NONE';
    loan.updatedAt = new Date().toISOString();
    if (data.notes) {
      loan.notes = loan.notes ? `${loan.notes} | Retour: ${data.notes}` : data.notes;
    }

    // Free the copy (status becomes AVAILABLE)
    const copyIdx = this.store.bookCopies.findIndex(c => c.id === loan.bookCopyId);
    if (copyIdx !== -1) {
      this.store.bookCopies[copyIdx].status = 'AVAILABLE';
      if (data.condition && ['NEW', 'GOOD', 'FAIR', 'DAMAGED'].includes(data.condition)) {
        this.store.bookCopies[copyIdx].condition = data.condition as any;
      }
    }

    // Audit log for return
    this.addAuditLog({
      actorUserId: data.actorUserId,
      action: 'LOAN_RETURNED',
      entityName: 'LOAN',
      entityId: loan.id,
      details: {
        actualReturnDate: data.actualReturnDate,
        retardJours: overdueDays,
        notes: data.notes,
      },
    });

    // Check if student was suspended and if any other overdue loan remains
    const otherOverdueLoans = this.store.loans.filter(
      l => l.studentId === loan.studentId && l.id !== loan.id && (l.status === 'OVERDUE' || l.overdueDays > 0)
    );
    if (otherOverdueLoans.length === 0) {
      const student = this.store.students.find(s => s.id === loan.studentId);
      if (student && (student.isSuspended || student.suspendedUntil)) {
        student.isSuspended = false;
        student.suspendedUntil = undefined;
        student.suspensionReason = undefined;

        if (student.userId) {
          this.addNotification({
            recipientUserId: student.userId,
            type: 'GENERAL',
            title: 'Suspension levée avec succès',
            message: `Votre retard a été régularisé suite au retour de votre emprunt. La suspension de votre compte est levée automatiquement.`,
            relatedEntityName: 'STUDENT',
            relatedEntityId: student.id,
          });
        }

        this.addAuditLog({
          actorUserId: null,
          actorName: 'Automatique',
          action: 'SUSPENSION_LEVEE_AUTO',
          entityName: 'STUDENT',
          entityId: student.id,
          details: {
            studentCNE: student.studentIdNumber,
            loanId: loan.id,
            retardJours: overdueDays,
            raison: 'Restitution complète des emprunts en retard',
          },
        });
      }
    }

    this.saveToDisk();
    return this.getLoanById(loan.id)!;
  }

  // --- Reminders ---
  public getReminders(loanId?: number): Reminder[] {
    let reminders = [...this.store.reminders];
    if (loanId) {
      reminders = reminders.filter(r => r.loanId === loanId);
    }
    reminders.sort((a, b) => b.id - a.id);
    return reminders;
  }

  public sendReminder(loanId: number, actorUserId: number): Reminder {
    this.recalculateAllOverdues();
    const loan = this.getLoanById(loanId);
    if (!loan) throw new Error(`Emprunt introuvable (ID: ${loanId})`);
    if (loan.status === 'RETURNED') {
      throw new Error(`Le livre a déjà été restitué, impossible d'envoyer un rappel.`);
    }
    if (loan.overdueDays <= 0) {
      throw new Error(`L'emprunt n'est pas encore en retard (Échéance: ${loan.expectedReturnDate}).`);
    }

    // Protection anti-doublon le même jour
    const todayStr = '2026-11-07';
    const recentToday = this.store.reminders.find(
      r => r.loanId === loanId && r.sentAt.startsWith(todayStr)
    );
    if (recentToday) {
      throw new Error(`Un rappel a déjà été envoyé aujourd'hui à cet étudiant pour cet emprunt.`);
    }

    const studentEmail = loan.student?.user?.email || 'etudiant@usmba.ac.ma';
    const studentName = loan.student?.user?.fullName || 'Étudiant';
    const bookTitle = loan.book?.title || 'Ouvrage';

    let levelLabel = 'Faible';
    let urgencyTone = 'Nous vous rappelons amicalement de bien vouloir rapporter l’ouvrage.';
    if (loan.overdueLevel === 'HIGH') {
      levelLabel = 'Élevé';
      urgencyTone = 'ATTENTION : Votre retard important entraîne la suspension immédiate de vos droits d’emprunt jusqu’à restitution.';
    } else if (loan.overdueLevel === 'MEDIUM') {
      levelLabel = 'Moyen';
      urgencyTone = 'Prière de régulariser votre situation sous 48 heures ouvrables.';
    }

    const message = `Bonjour ${studentName},\n\n` +
      `Votre emprunt de l'ouvrage « ${bookTitle} » (Exemplaire: ${loan.bookCopy?.barcode}) est arrivé à échéance le ${loan.expectedReturnDate}.\n` +
      `Nombre de jours de retard : ${loan.overdueDays} jour(s) [Niveau de retard: ${levelLabel}].\n\n` +
      `${urgencyTone}\n\n` +
      `Bibliothèque de l'École Supérieure de Technologie (EST) - USMBA Fès\n` +
      `Contact : bibliotheque.est@usmba.ac.ma`;

    this.store.counters.reminder += 1;
    const reminder: Reminder = {
      id: this.store.counters.reminder,
      loanId: loan.id,
      recipientEmail: studentEmail,
      overdueDays: loan.overdueDays,
      overdueLevel: loan.overdueLevel === 'NONE' ? 'LOW' : loan.overdueLevel,
      messageContent: message,
      deliveryStatus: 'SENT',
      sentAt: new Date().toISOString(),
      sentByUserId: actorUserId,
    };

    this.store.reminders.push(reminder);

    // Update loan reminder count
    const loanIdx = this.store.loans.findIndex(l => l.id === loanId);
    if (loanIdx !== -1) {
      this.store.loans[loanIdx].reminderCount = (this.store.loans[loanIdx].reminderCount || 0) + 1;
      this.store.loans[loanIdx].lastReminderSentAt = reminder.sentAt;
    }

    this.addAuditLog({
      actorUserId,
      action: 'REMINDER_SENT',
      entityName: 'LOAN',
      entityId: loan.id,
      details: {
        recipientEmail: studentEmail,
        overdueDays: loan.overdueDays,
        overdueLevel: loan.overdueLevel,
      },
    });

    this.saveToDisk();
    return reminder;
  }

  // --- Search History ---
  public addSearchHistory(data: { studentId: number; queryText: string; categoryId?: number | null; resultsCount: number }): SearchHistory {
    this.store.counters.search += 1;
    const entry: SearchHistory = {
      id: this.store.counters.search,
      studentId: data.studentId,
      queryText: data.queryText,
      categoryId: data.categoryId,
      resultsCount: data.resultsCount,
      searchedAt: new Date().toISOString(),
    };
    this.store.searchHistories.unshift(entry);
    // Keep max 50 entries
    if (this.store.searchHistories.length > 50) {
      this.store.searchHistories.pop();
    }
    this.saveToDisk();
    return entry;
  }

  public getSearchHistory(studentId: number): SearchHistory[] {
    return this.store.searchHistories.filter(h => h.studentId === studentId);
  }

  public clearSearchHistory(studentId: number): void {
    this.store.searchHistories = this.store.searchHistories.filter(h => h.studentId !== studentId);
    this.saveToDisk();
  }

  // --- Audit Log ---
  public addAuditLog(data: {
    actorUserId?: number | null;
    actorName?: string;
    action: string;
    entityName: string;
    entityId?: number | null;
    details?: Record<string, any>;
    ipAddress?: string;
  }): AuditLog {
    this.store.counters.audit += 1;
    const actor = data.actorUserId ? this.getUserById(data.actorUserId) : undefined;
    const log: AuditLog = {
      id: this.store.counters.audit,
      actorUserId: data.actorUserId,
      actorName: data.actorName || actor?.fullName || 'Système',
      action: data.action,
      entityName: data.entityName,
      entityId: data.entityId,
      details: data.details,
      ipAddress: data.ipAddress,
      timestamp: new Date().toISOString(),
    };
    this.store.auditLogs.unshift(log);
    if (this.store.auditLogs.length > 200) {
      this.store.auditLogs.pop();
    }
    this.saveToDisk();
    return log;
  }

  public getAuditLogs(): AuditLog[] {
    return [...this.store.auditLogs];
  }

  // --- Loan Requests & Reservations ---
  public getLoanRequests(filters?: { studentId?: number; status?: LoanRequestStatus; query?: string }): LoanRequest[] {
    this.checkExpiredReservations();
    let list = [...this.store.loanRequests];

    if (filters?.studentId) {
      list = list.filter(r => r.studentId === filters.studentId);
    }

    if (filters?.status) {
      list = list.filter(r => r.status === filters.status);
    }

    if (filters?.query && filters.query.trim()) {
      const q = filters.query.toLowerCase().trim();
      list = list.filter(r => {
        const student = this.getStudentById(r.studentId);
        const book = this.getBookById(r.bookId);
        const copy = r.allocatedCopyId ? this.getCopyById(r.allocatedCopyId) : undefined;
        return (
          (student?.user?.fullName && student.user.fullName.toLowerCase().includes(q)) ||
          (student?.studentIdNumber && student.studentIdNumber.toLowerCase().includes(q)) ||
          (student?.department && student.department.toLowerCase().includes(q)) ||
          (book?.title && book.title.toLowerCase().includes(q)) ||
          (book?.author && book.author.toLowerCase().includes(q)) ||
          (copy?.barcode && copy.barcode.toLowerCase().includes(q)) ||
          r.id.toString() === q
        );
      });
    }

    // Sort by id descending (most recent first)
    list.sort((a, b) => b.id - a.id);

    return list.map(req => this.populateLoanRequest(req));
  }

  public getLoanRequestById(id: number): LoanRequest | undefined {
    this.checkExpiredReservations();
    const req = this.store.loanRequests.find(r => r.id === id);
    if (!req) return undefined;
    return this.populateLoanRequest(req);
  }

  private populateLoanRequest(req: LoanRequest): LoanRequest {
    const student = this.getStudentById(req.studentId);
    const book = this.getBookById(req.bookId);
    const copy = req.allocatedCopyId ? this.getCopyById(req.allocatedCopyId) : undefined;
    const reviewedByUser = req.reviewedByUserId ? this.getUserById(req.reviewedByUserId) : undefined;

    return {
      ...req,
      student,
      book,
      allocatedCopy: copy,
      reviewedByUser,
    };
  }

  public async createLoanRequest(data: { studentId: number; bookId: number; notes?: string }): Promise<LoanRequest> {
    const student = this.getStudentById(data.studentId);
    if (!student) throw new Error("Profil étudiant introuvable.");

    const book = this.getBookById(data.bookId);
    if (!book) throw new Error("Ouvrage introuvable dans le catalogue.");

    const nowIso = new Date().toISOString();
    const todayStr = this.getTodayStr();
    const studentName = student.user?.fullName || 'Étudiant';
    const studentEmail = student.user?.email || 'etudiant@usmba.ac.ma';

    // -------------------------------------------------------------------------
    // RÈGLES DE DÉCISION AUTOMATIQUE (appliquées dans cet ordre strict) :
    // a. L'étudiant a au moins un emprunt en retard -> REFUSÉE (motif : « Vous avez un retard à régulariser »).
    // b. Le compte de l'étudiant est suspendu -> REFUSÉE (motif : « Compte suspendu jusqu'au [date] »).
    // c. L'étudiant a déjà atteint le nombre maximum d'emprunts en cours (3 par défaut) -> REFUSÉE.
    // d. L'étudiant a déjà un emprunt ou une demande en cours pour le même livre -> REFUSÉE.
    // e. Aucun exemplaire disponible -> REFUSÉE (motif : « Aucun exemplaire disponible »).
    // f. Sinon -> ACCEPTÉE : un exemplaire est réservé automatiquement, le statut devient « Acceptée / Prêt à retirer » avec une date limite de retrait (48 h par défaut).
    // -------------------------------------------------------------------------

    this.recalculateAllOverdues();
    const overdueLoans = this.store.loans.filter(
      l => l.studentId === data.studentId && (l.status === 'OVERDUE' || l.overdueDays > 0)
    );

    let rejectionReason: string | null = null;

    // Règle a
    if (overdueLoans.length > 0) {
      rejectionReason = "Vous avez un retard à régulariser";
    }
    // Règle b
    else if (student.isSuspended || (student.suspendedUntil && student.suspendedUntil >= todayStr) || !student.user?.isActive) {
      rejectionReason = student.suspendedUntil
        ? `Compte suspendu jusqu'au ${student.suspendedUntil}`
        : (student.suspensionReason || "Compte suspendu");
    }
    // Règle c
    else {
      const activeLoans = this.store.loans.filter(l => l.studentId === data.studentId && l.status !== 'RETURNED');
      const activeReservedRequests = this.store.loanRequests.filter(
        r => r.studentId === data.studentId && r.status === 'APPROVED'
      );
      const totalOngoing = activeLoans.length + activeReservedRequests.length;
      const maxAllowed = this.store.settings.maxLoansPerStudent ?? student.maxLoans ?? 3;
      if (totalOngoing >= maxAllowed) {
        rejectionReason = `Nombre maximum d'emprunts en cours atteint (${maxAllowed} max)`;
      }
      // Règle d
      else {
        const hasLoanForBook = activeLoans.some(l => {
          const c = this.getCopyById(l.bookCopyId);
          return c && c.bookId === data.bookId;
        });
        const hasRequestForBook = this.store.loanRequests.some(
          r => r.studentId === data.studentId && r.bookId === data.bookId && (r.status === 'PENDING' || r.status === 'APPROVED')
        );
        if (hasLoanForBook || hasRequestForBook) {
          rejectionReason = "Vous avez déjà un emprunt ou une demande en cours pour le même livre";
        }
        // Règle e
        else {
          const availableCopies = this.store.bookCopies.filter(
            c => c.bookId === data.bookId && c.status === 'AVAILABLE'
          );
          if (availableCopies.length === 0) {
            rejectionReason = "Aucun exemplaire disponible";
          }
        }
      }
    }

    this.store.counters.loanRequest += 1;
    const requestId = this.store.counters.loanRequest;

    // En cas de REFUS
    if (rejectionReason) {
      const rejectedReq: LoanRequest = {
        id: requestId,
        studentId: data.studentId,
        bookId: data.bookId,
        requestDate: nowIso,
        status: 'REJECTED',
        rejectionReason,
        reviewDate: nowIso,
        reviewedByUserId: null,
        notes: data.notes?.trim() || undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      this.store.loanRequests.push(rejectedReq);

      // Notification étudiant (cloche)
      if (student.userId) {
        this.addNotification({
          recipientUserId: student.userId,
          type: 'REQUEST_REJECTED',
          title: "Demande d'emprunt refusée",
          message: `Votre demande pour « ${book.title} » a été refusée automatiquement. Motif : ${rejectionReason}`,
          relatedEntityName: 'LOAN_REQUEST',
          relatedEntityId: requestId,
        });
      }

      // Historique avec auteur « Automatique »
      this.addAuditLog({
        actorUserId: null,
        actorName: 'Automatique',
        action: 'DEMANDE_EMPRUNT_REFUSEE_AUTO',
        entityName: 'LOAN_REQUEST',
        entityId: requestId,
        details: {
          bookTitle: book.title,
          studentName,
          studentCNE: student.studentIdNumber,
          motif: rejectionReason,
        },
      });

      // E-mail automatique avec le motif
      try {
        await emailService.sendAutomatedEmail({
          to: studentEmail,
          subject: `[Bibliothèque EST Fès] Refus de votre demande d'emprunt : ${book.title}`,
          text: `Bonjour ${studentName},\n\nVotre demande d'emprunt pour l'ouvrage « ${book.title} » a été traitée automatiquement par le système et n'a pas pu être acceptée.\n\nMotif du refus : ${rejectionReason}\n\nSi vous avez des questions ou un retard à régulariser, merci de vous adresser à l'accueil de la bibliothèque de l'EST Fès.\n\nCordialement,\nBibliothèque de l'EST Fès - USMBA`,
          type: 'REFUS_DEMANDE_EMPRUNT',
          triggerKey: `req-reject-${requestId}`,
          loanId: requestId,
        });
      } catch (mailErr) {
        console.warn('Mail send error:', mailErr);
      }

      this.saveToDisk();
      return this.populateLoanRequest(rejectedReq);
    }

    // Règle f : Sinon -> ACCEPTÉE
    const availableCopies = this.store.bookCopies.filter(
      c => c.bookId === data.bookId && c.status === 'AVAILABLE'
    );
    const allocatedCopy = availableCopies[0];

    // Réserver l'exemplaire (statut RESERVED)
    const copyIdx = this.store.bookCopies.findIndex(c => c.id === allocatedCopy.id);
    if (copyIdx !== -1) {
      this.store.bookCopies[copyIdx].status = 'RESERVED';
    }

    // Calculer la date limite de retrait (48 h par défaut)
    const deadlineHours = this.store.settings.withdrawalDeadlineHours || 48;
    const deadlineDate = new Date();
    deadlineDate.setHours(deadlineDate.getHours() + deadlineHours);
    const deadlineStr = deadlineDate.toISOString().split('T')[0];

    const approvedReq: LoanRequest = {
      id: requestId,
      studentId: data.studentId,
      bookId: data.bookId,
      allocatedCopyId: allocatedCopy.id,
      requestDate: nowIso,
      status: 'APPROVED',
      pickupDeadline: deadlineStr,
      reviewDate: nowIso,
      reviewedByUserId: null,
      notes: data.notes?.trim() || undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    this.store.loanRequests.push(approvedReq);

    // Notification étudiant
    if (student.userId) {
      this.addNotification({
        recipientUserId: student.userId,
        type: 'REQUEST_APPROVED',
        title: "Demande acceptée · Prêt à retirer",
        message: `Votre demande pour « ${book.title} » a été acceptée automatiquement ! L'exemplaire ${allocatedCopy.barcode} (Rayon : ${allocatedCopy.locationShelf}) vous est réservé jusqu'au ${deadlineStr}. Présentez-vous au guichet avec votre carte étudiante pour le récupérer.`,
        relatedEntityName: 'LOAN_REQUEST',
        relatedEntityId: requestId,
      });
    }

    // Historique avec auteur « Automatique »
    this.addAuditLog({
      actorUserId: null,
      actorName: 'Automatique',
      action: 'DEMANDE_EMPRUNT_ACCEPTEE_AUTO',
      entityName: 'LOAN_REQUEST',
      entityId: requestId,
      details: {
        bookTitle: book.title,
        studentName,
        studentCNE: student.studentIdNumber,
        allocatedBarcode: allocatedCopy.barcode,
        pickupDeadline: deadlineStr,
        delaiHeures: deadlineHours,
      },
    });

    // Envoi de confirmation
    try {
      await emailService.sendAutomatedEmail({
        to: studentEmail,
        subject: `[Bibliothèque EST Fès] Demande acceptée : « ${book.title} » est prêt à retirer`,
        text: `Bonjour ${studentName},\n\nVotre demande d'emprunt pour l'ouvrage « ${book.title} » a été acceptée automatiquement par le système.\n\n- Exemplaire réservé : ${allocatedCopy.barcode}\n- Emplacement en rayon : ${allocatedCopy.locationShelf}\n- Date limite de retrait : ${deadlineStr} (délai de ${deadlineHours} heures)\n\nMerci de vous présenter au guichet de la bibliothèque avec votre carte étudiante avant la date limite. Passé ce délai, la réservation sera automatiquement annulée.\n\nCordialement,\nBibliothèque de l'EST Fès - USMBA`,
        type: 'ACCEPTATION_DEMANDE_EMPRUNT',
        triggerKey: `req-approved-${requestId}`,
        loanId: requestId,
      });
    } catch (mailErr) {
      console.warn('Mail send error:', mailErr);
    }

    this.saveToDisk();
    return this.populateLoanRequest(approvedReq);
  }

  public cancelLoanRequest(id: number, studentId: number): LoanRequest {
    const req = this.store.loanRequests.find(r => r.id === id);
    if (!req) throw new Error(`Demande introuvable (ID: ${id})`);
    if (req.studentId !== studentId) {
      throw new Error("Action non autorisée : vous ne pouvez annuler que vos propres demandes.");
    }
    if (req.status !== 'PENDING' && req.status !== 'APPROVED') {
      throw new Error(`Cette demande ne peut plus être annulée (statut actuel: ${req.status}).`);
    }

    // Libérer l'exemplaire si c'était approuvé
    if (req.allocatedCopyId) {
      const copyIdx = this.store.bookCopies.findIndex(c => c.id === req.allocatedCopyId);
      if (copyIdx !== -1 && this.store.bookCopies[copyIdx].status === 'RESERVED') {
        this.store.bookCopies[copyIdx].status = 'AVAILABLE';
      }
    }

    const nowIso = new Date().toISOString();
    req.status = 'CANCELLED';
    req.updatedAt = nowIso;

    const student = this.getStudentById(studentId);
    this.addAuditLog({
      actorUserId: student?.userId,
      actorName: student?.user?.fullName || 'Étudiant',
      action: 'LOAN_REQUEST_CANCELLED',
      entityName: 'LOAN_REQUEST',
      entityId: req.id,
    });

    this.saveToDisk();
    return this.populateLoanRequest(req);
  }

  public fulfillLoanRequest(id: number, actorUserId: number): { request: LoanRequest; loan: Loan } {
    const req = this.store.loanRequests.find(r => r.id === id);
    if (!req) throw new Error(`Demande introuvable (ID: ${id})`);
    if (req.status !== 'APPROVED') {
      throw new Error("Seule une réservation validée peut être remise physiquement à l'étudiant.");
    }
    if (!req.allocatedCopyId) {
      throw new Error("Aucun exemplaire physique n'est associé à cette réservation.");
    }

    const copy = this.getCopyById(req.allocatedCopyId);
    if (!copy) throw new Error("Exemplaire physique introuvable.");

    // Convert RESERVED copy to real active Loan
    const durationDays = this.store.settings.defaultLoanDurationDays || 14;
    const todayStr = this.getTodayStr();
    const returnDateObj = new Date(todayStr);
    returnDateObj.setDate(returnDateObj.getDate() + durationDays);
    const expectedReturnDate = returnDateObj.toISOString().split('T')[0];

    // Create active loan
    this.store.counters.loan += 1;
    const newLoan: Loan = {
      id: this.store.counters.loan,
      studentId: req.studentId,
      bookCopyId: copy.id,
      loanDate: todayStr,
      expectedReturnDate,
      actualReturnDate: null,
      status: 'ACTIVE',
      notes: `Remise physique suite à la demande en ligne n°${req.id}`,
      createdByUserId: actorUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      overdueDays: 0,
      overdueLevel: 'NONE',
      reminderCount: 0,
    };

    // Update copy status from RESERVED to BORROWED
    const copyIdx = this.store.bookCopies.findIndex(c => c.id === copy.id);
    if (copyIdx !== -1) {
      this.store.bookCopies[copyIdx].status = 'BORROWED';
    }

    this.store.loans.push(newLoan);

    // Update request to FULFILLED
    req.status = 'FULFILLED';
    req.updatedAt = new Date().toISOString();

    const student = this.getStudentById(req.studentId);
    const book = this.getBookById(req.bookId);

    if (student?.userId) {
      this.addNotification({
        recipientUserId: student.userId,
        type: 'GENERAL',
        title: "Emprunt physique confirmé",
        message: `Vous venez d'emprunter « ${book?.title} » (Exemplaire : ${copy.barcode}). Date prévue de restitution : ${expectedReturnDate}.`,
        relatedEntityName: 'LOAN',
        relatedEntityId: newLoan.id,
      });
    }

    this.addAuditLog({
      actorUserId,
      action: 'LOAN_REQUEST_FULFILLED',
      entityName: 'LOAN_REQUEST',
      entityId: req.id,
      details: {
        loanId: newLoan.id,
        copyBarcode: copy.barcode,
        student: student?.user?.fullName,
        loanDate: todayStr,
        expectedReturnDate,
        durationDays,
      },
    });

    this.saveToDisk();
    return {
      request: this.populateLoanRequest(req),
      loan: this.getLoanById(newLoan.id)!,
    };
  }

  public expireLoanRequest(id: number): LoanRequest {
    const req = this.store.loanRequests.find(r => r.id === id);
    if (!req) throw new Error(`Demande introuvable (ID: ${id})`);
    if (req.status !== 'APPROVED') {
      throw new Error("Seule une réservation validée peut expirer.");
    }

    if (req.allocatedCopyId) {
      const copyIdx = this.store.bookCopies.findIndex(c => c.id === req.allocatedCopyId);
      if (copyIdx !== -1 && this.store.bookCopies[copyIdx].status === 'RESERVED') {
        this.store.bookCopies[copyIdx].status = 'AVAILABLE';
      }
    }

    req.status = 'EXPIRED';
    req.updatedAt = new Date().toISOString();

    const student = this.getStudentById(req.studentId);
    const book = this.getBookById(req.bookId);

    if (student?.userId) {
      this.addNotification({
        recipientUserId: student.userId,
        type: 'RESERVATION_EXPIRED',
        title: "Réservation expirée",
        message: `Le délai de retrait pour « ${book?.title} » est expiré. L'exemplaire physique a été remis en rayon pour d'autres lecteurs.`,
        relatedEntityName: 'LOAN_REQUEST',
        relatedEntityId: req.id,
      });
    }

    this.addAuditLog({
      actorUserId: null,
      actorName: 'Automatique',
      action: 'ANNULATION_NON_RETRAIT_AUTO',
      entityName: 'LOAN_REQUEST',
      entityId: req.id,
      details: {
        student: student?.user?.fullName,
        book: book?.title,
      },
    });

    this.saveToDisk();
    return this.populateLoanRequest(req);
  }

  public checkExpiredReservations(forcedDateStr?: string): number {
    const todayStr = forcedDateStr || this.getTodayStr();
    let expiredCount = 0;
    for (const req of this.store.loanRequests) {
      if (req.status === 'APPROVED' && req.pickupDeadline && req.pickupDeadline < todayStr) {
        if (req.allocatedCopyId) {
          const copy = this.store.bookCopies.find(c => c.id === req.allocatedCopyId);
          if (copy && copy.status === 'RESERVED') {
            copy.status = 'AVAILABLE';
          }
        }
        req.status = 'EXPIRED';
        req.updatedAt = new Date().toISOString();
        expiredCount++;

        const student = this.getStudentById(req.studentId);
        const book = this.getBookById(req.bookId);

        if (student?.userId) {
          this.addNotification({
            recipientUserId: student.userId,
            type: 'RESERVATION_EXPIRED',
            title: "Réservation annulée (délai dépassé)",
            message: `Le délai de retrait de 48h pour « ${book?.title || 'Ouvrage'} » est expiré. L'exemplaire physique a été remis en rayon.`,
            relatedEntityName: 'LOAN_REQUEST',
            relatedEntityId: req.id,
          });
        }

        this.addAuditLog({
          actorUserId: null,
          actorName: 'Automatique',
          action: 'ANNULATION_NON_RETRAIT_AUTO',
          entityName: 'LOAN_REQUEST',
          entityId: req.id,
          details: {
            student: student?.user?.fullName,
            book: book?.title,
            pickupDeadline: req.pickupDeadline,
          },
        });
      }
    }
    if (expiredCount > 0) {
      this.saveToDisk();
    }
    return expiredCount;
  }

  public async runAutomatedScheduledTasks(forcedDateStr?: string): Promise<{
    today: string;
    overdueLoansCount: number;
    newOverdueTransitions: number;
    suspendedStudentsCount: number;
    expiredReservationsCount: number;
    emailsSentCount: number;
  }> {
    const todayStr = forcedDateStr || this.getTodayStr();
    const today = new Date(todayStr);

    let newOverdueTransitions = 0;
    let suspendedStudentsCount = 0;
    let emailsSentCount = 0;

    // 1. Passage automatique en « En retard » pour les prêts dont la date de retour est dépassée
    for (const loan of this.store.loans) {
      if (loan.status === 'RETURNED') continue;

      const expectedDate = new Date(loan.expectedReturnDate);
      const diffTime = today.getTime() - expectedDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        const wasActive = loan.status !== 'OVERDUE';
        loan.overdueDays = diffDays;
        loan.status = 'OVERDUE';
        if (diffDays >= this.store.settings.overdueHighThreshold) {
          loan.overdueLevel = 'HIGH';
        } else if (diffDays >= this.store.settings.overdueMediumThreshold) {
          loan.overdueLevel = 'MEDIUM';
        } else {
          loan.overdueLevel = 'LOW';
        }

        if (wasActive) {
          newOverdueTransitions++;
          this.addAuditLog({
            actorUserId: null,
            actorName: 'Automatique',
            action: 'PASSAGE_EN_RETARD_AUTO',
            entityName: 'LOAN',
            entityId: loan.id,
            details: {
              expectedReturnDate: loan.expectedReturnDate,
              overdueDays: diffDays,
              overdueLevel: loan.overdueLevel,
            },
          });
        }
      } else {
        loan.overdueDays = 0;
        loan.status = 'ACTIVE';
        loan.overdueLevel = 'NONE';
      }
    }

    // 2. Suspension automatique si le retard dépasse le seuil (7 jours par défaut)
    const threshold = this.store.settings.suspensionThresholdDays || 7;
    for (const student of this.store.students) {
      const studentOverdues = this.store.loans.filter(
        l => l.studentId === student.id && l.status === 'OVERDUE' && l.overdueDays > threshold
      );

      if (studentOverdues.length > 0 && !student.isSuspended) {
        student.isSuspended = true;
        student.suspensionReason = `Retard supérieur au seuil légal (${threshold} jours)`;
        student.suspendedUntil = 'Régularisation';
        suspendedStudentsCount++;

        if (student.userId) {
          this.addNotification({
            recipientUserId: student.userId,
            type: 'GENERAL',
            title: 'Compte suspendu pour dépassement de retard',
            message: `Votre compte bibliothèque a été suspendu automatiquement. Vous avez des emprunts en retard de plus de ${threshold} jours. Veuillez restituer les ouvrages au guichet pour lever la suspension.`,
            relatedEntityName: 'STUDENT',
            relatedEntityId: student.id,
          });
        }

        this.addAuditLog({
          actorUserId: null,
          actorName: 'Automatique',
          action: 'SUSPENSION_COMPTE_AUTO',
          entityName: 'STUDENT',
          entityId: student.id,
          details: {
            studentCNE: student.studentIdNumber,
            seuilJours: threshold,
            nombreEmpruntsCritiques: studentOverdues.length,
          },
        });

        // Email de suspension
        const user = this.getUserById(student.userId);
        if (user?.email) {
          try {
            await emailService.sendAutomatedEmail({
              to: user.email,
              subject: `[Avis de suspension] Compte bibliothèque suspendu - EST Fès`,
              text: `Bonjour ${user.fullName},\n\nVotre compte de bibliothèque de l'EST Fès a été suspendu automatiquement suite à un retard d'emprunt de plus de ${threshold} jours.\n\nTout nouvel emprunt ou réservation en ligne vous est interdit jusqu'à la restitution complète des ouvrages au comptoir.\n\nBibliothèque EST Fès - USMBA`,
              type: 'SUSPENSION_COMPTE',
              triggerKey: `suspension-${student.id}-${todayStr}`,
              loanId: studentOverdues[0]?.id,
            });
            emailsSentCount++;
          } catch (e) {
            console.warn('Mail send error:', e);
          }
        }
      }
    }

    // 3. Annulation automatique des réservations non retirées à échéance
    const expiredReservationsCount = this.checkExpiredReservations(todayStr);

    // 4. Envoi automatique des e-mails avec anti-doublon :
    const reminderDaysBefore = this.store.settings.reminderDaysBeforeDue || 2;
    const overdueFreq = this.store.settings.overdueReminderFrequencyDays || 3;

    for (const loan of this.store.loans) {
      if (loan.status === 'RETURNED') continue;

      const student = this.getStudentById(loan.studentId);
      const user = student?.userId ? this.getUserById(student.userId) : undefined;
      const copy = this.getCopyById(loan.bookCopyId);
      const book = copy ? this.getBookById(copy.bookId) : undefined;
      if (!user?.email) continue;

      const expDate = new Date(loan.expectedReturnDate);
      const diffTime = expDate.getTime() - today.getTime();
      const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // • 2 jours avant la date de retour prévue : rappel de retour imminent
      if (daysUntilDue === reminderDaysBefore) {
        const triggerKey = `remind-imminent-${loan.id}-${loan.expectedReturnDate}`;
        if (!emailService.hasTriggerBeenSent(triggerKey)) {
          await emailService.sendAutomatedEmail({
            to: user.email,
            subject: `[Rappel de retour imminent] « ${book?.title || 'Ouvrage'} » à rendre dans ${reminderDaysBefore} jours`,
            text: `Bonjour ${user.fullName},\n\nNous vous rappelons que votre emprunt de l'ouvrage « ${book?.title || 'Ouvrage'} » (Exemplaire : ${copy?.barcode}) arrive à échéance le ${loan.expectedReturnDate}.\n\nPensez à le rapporter au comptoir de la bibliothèque à temps pour éviter toute pénalité.\n\nBibliothèque EST Fès - USMBA`,
            type: 'RAPPEL_RETOUR_IMMINENT',
            triggerKey,
            loanId: loan.id,
          });
          emailsSentCount++;
        }
      }

      // • Le jour même de la date de retour : rappel du jour de l'échéance
      if (daysUntilDue === 0) {
        const triggerKey = `remind-due-day-${loan.id}-${loan.expectedReturnDate}`;
        if (!emailService.hasTriggerBeenSent(triggerKey)) {
          await emailService.sendAutomatedEmail({
            to: user.email,
            subject: `[Échéance aujourd'hui] Restitution de « ${book?.title || 'Ouvrage'} »`,
            text: `Bonjour ${user.fullName},\n\nVotre emprunt de « ${book?.title || 'Ouvrage'} » arrive à échéance AUJOURD'HUI (${loan.expectedReturnDate}).\n\nMerci de bien vouloir déposer l'exemplaire au comptoir avant la fermeture.\n\nBibliothèque EST Fès - USMBA`,
            type: 'RAPPEL_ECHEANCE_JOUR_J',
            triggerKey,
            loanId: loan.id,
          });
          emailsSentCount++;
        }
      }

      // • En cas de retard : un e-mail de rappel tous les 3 jours tant que le livre n'est pas rendu
      if (loan.status === 'OVERDUE' && loan.overdueDays > 0) {
        if (loan.overdueDays % overdueFreq === 0) {
          const triggerKey = `remind-overdue-${loan.id}-day-${loan.overdueDays}`;
          if (!emailService.hasTriggerBeenSent(triggerKey)) {
            await emailService.sendAutomatedEmail({
              to: user.email,
              subject: `[Avis de retard : ${loan.overdueDays} jours] Restitution urgente requise - « ${book?.title || 'Ouvrage'} »`,
              text: `Bonjour ${user.fullName},\n\nVotre emprunt de l'ouvrage « ${book?.title || 'Ouvrage'} » (Exemplaire : ${copy?.barcode}) est en RETARD de ${loan.overdueDays} jour(s) (date limite dépassée : ${loan.expectedReturnDate}).\n\nMerci de restituer ce document au plus vite au comptoir de la bibliothèque. Tout retard prolongé au-delà de ${threshold} jours entraîne la suspension de vos droits d'emprunt.\n\nBibliothèque EST Fès - USMBA`,
              type: 'RAPPEL_RETARD_PERIODIQUE',
              triggerKey,
              loanId: loan.id,
            });
            emailsSentCount++;
          }
        }
      }
    }

    // • La veille de la date limite de retrait d'une réservation acceptée
    for (const req of this.store.loanRequests) {
      if (req.status !== 'APPROVED' || !req.pickupDeadline) continue;

      const student = this.getStudentById(req.studentId);
      const user = student?.userId ? this.getUserById(student.userId) : undefined;
      const copy = req.allocatedCopyId ? this.getCopyById(req.allocatedCopyId) : undefined;
      const book = this.getBookById(req.bookId);
      if (!user?.email) continue;

      const deadlineDate = new Date(req.pickupDeadline);
      const diffTime = deadlineDate.getTime() - today.getTime();
      const daysUntilDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysUntilDeadline === 1) {
        const triggerKey = `remind-pickup-eve-${req.id}-${req.pickupDeadline}`;
        if (!emailService.hasTriggerBeenSent(triggerKey)) {
          await emailService.sendAutomatedEmail({
            to: user.email,
            subject: `[Dernier jour] Retirez votre livre réservé « ${book?.title || 'Ouvrage'} » avant demain`,
            text: `Bonjour ${user.fullName},\n\nVotre réservation pour « ${book?.title || 'Ouvrage'} » (Exemplaire : ${copy?.barcode}, Emplacement : ${copy?.locationShelf}) expire DEMAIN (${req.pickupDeadline}).\n\nSi vous ne le retirez pas avant cette date, la réservation sera automatiquement annulée et le livre remis en rayon.\n\nBibliothèque EST Fès - USMBA`,
            type: 'RAPPEL_VEILLE_RETRAIT',
            triggerKey,
            loanId: req.id,
          });
          emailsSentCount++;
        }
      }
    }

    this.saveToDisk();

    const overdueLoansCount = this.store.loans.filter(l => l.status === 'OVERDUE' || l.overdueDays > 0).length;

    return {
      today: todayStr,
      overdueLoansCount,
      newOverdueTransitions,
      suspendedStudentsCount,
      expiredReservationsCount,
      emailsSentCount,
    };
  }

  // --- Notifications ---
  public getNotifications(userId: number, role?: RoleName): Notification[] {
    return this.store.notifications
      .filter(n => n.recipientUserId === userId || (role && n.recipientRole === role))
      .sort((a, b) => b.id - a.id);
  }

  public addNotification(data: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Notification {
    this.store.counters.notification += 1;
    const notif: Notification = {
      id: this.store.counters.notification,
      recipientUserId: data.recipientUserId,
      recipientRole: data.recipientRole,
      type: data.type,
      title: data.title,
      message: data.message,
      relatedEntityName: data.relatedEntityName,
      relatedEntityId: data.relatedEntityId,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    this.store.notifications.unshift(notif);
    if (this.store.notifications.length > 300) {
      this.store.notifications.pop();
    }
    this.saveToDisk();
    return notif;
  }

  public markNotificationAsRead(id: number): void {
    const notif = this.store.notifications.find(n => n.id === id);
    if (notif) {
      notif.isRead = true;
      this.saveToDisk();
    }
  }

  public markAllNotificationsAsRead(userId: number): void {
    let changed = false;
    for (const n of this.store.notifications) {
      if (n.recipientUserId === userId && !n.isRead) {
        n.isRead = true;
        changed = true;
      }
    }
    if (changed) {
      this.saveToDisk();
    }
  }

  // --- Settings ---
  public getSettings(): LibrarySettings {
    return { ...this.store.settings };
  }

  public updateSettings(data: Partial<LibrarySettings>): LibrarySettings {
    this.store.settings = {
      ...this.store.settings,
      ...data,
    };
    this.saveToDisk();
    return this.getSettings();
  }

  // --- Stats Dashboard ---
  public getDashboardStats() {
    this.recalculateAllOverdues();

    const totalBooks = this.store.books.length;
    const totalCopies = this.store.bookCopies.length;
    const availableCopies = this.store.bookCopies.filter(c => c.status === 'AVAILABLE').length;
    const activeLoans = this.store.loans.filter(l => l.status === 'ACTIVE' || l.status === 'OVERDUE').length;
    const overdueLoans = this.store.loans.filter(l => l.status === 'OVERDUE' || l.overdueDays > 0).length;
    const pendingRequestsCount = this.store.loanRequests.filter(r => r.status === 'PENDING').length;

    const recentLoans = this.getLoans().slice(0, 5);
    const recentReturns = this.store.loans
      .filter(l => l.status === 'RETURNED')
      .sort((a, b) => (b.actualReturnDate || '').localeCompare(a.actualReturnDate || ''))
      .slice(0, 5)
      .map(loan => ({
        ...loan,
        student: this.getStudentById(loan.studentId),
        bookCopy: this.getCopyById(loan.bookCopyId),
        book: this.getBookById(this.getCopyById(loan.bookCopyId)?.bookId || 0),
      }));

    const urgentOverdues = this.getLoans({ onlyOverdue: true }).slice(0, 5);

    return {
      totalBooks,
      totalCopies,
      availableCopies,
      activeLoans,
      overdueLoans,
      pendingRequestsCount,
      recentLoans,
      recentReturns,
      urgentOverdues,
    };
  }
}

export const db = new RelationalDatabase();
