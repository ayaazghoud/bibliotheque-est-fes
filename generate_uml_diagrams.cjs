const fs = require('fs');
const https = require('https');
const zlib = require('zlib');
const path = require('path');

// PlantUML custom Base64 encoder mapping
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';

function encode6bit(b) {
  if (b < 10) return String.fromCharCode(48 + b);
  b -= 10;
  if (b < 26) return String.fromCharCode(65 + b);
  b -= 26;
  if (b < 26) return String.fromCharCode(97 + b);
  b -= 26;
  if (b === 0) return '-';
  if (b === 1) return '_';
  return '?';
}

function append3bytes(b1, b2, b3) {
  const c1 = b1 >> 2;
  const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
  const c3 = ((b2 & 0xF) << 2) | (b3 >> 6);
  const c4 = b3 & 0x3F;
  return encode6bit(c1 & 0x3F) + encode6bit(c2 & 0x3F) + encode6bit(c3 & 0x3F) + encode6bit(c4 & 0x3F);
}

function encodePlantUML(pumlText) {
  const deflated = zlib.deflateRawSync(Buffer.from(pumlText, 'utf8'), { level: 9 });
  let res = '';
  let i = 0;
  for (i = 0; i < deflated.length - 2; i += 3) {
    res += append3bytes(deflated[i], deflated[i + 1], deflated[i + 2]);
  }
  if (i === deflated.length - 2) {
    res += append3bytes(deflated[i], deflated[i + 1], 0);
  } else if (i === deflated.length - 1) {
    res += append3bytes(deflated[i], 0, 0);
  }
  return res;
}

function downloadDiagram(pumlText, outputPath) {
  return new Promise((resolve, reject) => {
    const encoded = encodePlantUML(pumlText);
    const url = `https://www.plantuml.com/plantuml/png/~1${encoded}`;
    
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download diagram, HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        fs.writeFileSync(outputPath, buffer);
        console.log(`Saved ${outputPath} (${buffer.length} bytes)`);
        resolve(buffer.length);
      });
    }).on('error', reject);
  });
}

// Diagrams definitions
const diagrams = [
  {
    name: '1_use_case_diagram.png',
    title: 'Diagramme de Cas d\'Utilisation (Use Case Diagram)',
    puml: `@startuml
skinparam handwritten false
skinparam monochrome false
skinparam roundcorner 10
skinparam packageStyle rectangle
skinparam shadowing true
skinparam defaultFontName Arial
skinparam defaultFontSize 12

skinparam actor {
  BackgroundColor #E0F2FE
  BorderColor #0369A1
}

skinparam usecase {
  BackgroundColor #FFFFFF
  BorderColor #002B49
  ArrowColor #002B49
}

title **Système de Gestion de Bibliothèque EST - USMBA**\\n**Diagramme de Cas d'Utilisation Global**

left to right direction

actor "Étudiant EST Fès" as Etudiant
actor "Gérant de Bibliothèque" as Gerant
actor "Système E-mail (SMTP)" as SMTP

rectangle "Plateforme Bibliothèque EST - USMBA" {
  ' Cas communs
  usecase "S'authentifier (OAuth / CNE / Profil)" as UC_Auth
  usecase "Consulter les notifications" as UC_Notif
  
  ' Espace Étudiant
  package "Espace Étudiant" {
    usecase "Consulter & Rechercher dans le catalogue\\n(Titre, Auteur, Filière, Cote)" as UC_Recherche
    usecase "Consulter l'historique de recherche" as UC_Hist
    usecase "Consulter la fiche détaillée d'un livre" as UC_DetailLivre
    usecase "Demander un emprunt en ligne" as UC_DemandeEmprunt
    usecase "Suivre ses demandes d'emprunt (Mes Demandes)" as UC_SuivreDemandes
    usecase "Annuler une demande en attente" as UC_AnnulerDemande
    usecase "Consulter ses emprunts en cours & retards" as UC_MesEmprunts
  }

  ' Espace Gérant
  package "Espace Gérant / Administration" {
    usecase "Consulter le tableau de bord (KPI & alertes)" as UC_Dashboard
    usecase "Gérer les ouvrages (CRUD & scan ISBN/Couverture)" as UC_GestionLivres
    usecase "Gérer les exemplaires physiques & codes-barres" as UC_GestionCopies
    usecase "Scanner un livre par caméra / douchette" as UC_ScanCamera
    usecase "Inscrire un étudiant par scan OCR de la carte" as UC_ScanCarte
    usecase "Gérer les comptes étudiants (CRUD & statut)" as UC_GestionEtudiants
    usecase "Traiter les demandes d'emprunt en ligne" as UC_TraiterDemandes
    usecase "Valider la réservation physique (Statut RESERVED)" as UC_ValiderResa
    usecase "Refuser la demande avec motif obligatoire" as UC_RefuserDemande
    usecase "Confirmer la remise physique du livre" as UC_RemisePhysique
    usecase "Enregistrer un prêt direct au comptoir" as UC_PretComptoir
    usecase "Enregistrer la restitution physique d'un livre" as UC_RetourLivre
    usecase "Suivre les retards (Niveaux 1, 2, 3)" as UC_SuiviRetards
    usecase "Envoyer des rappels par e-mail" as UC_EnvoyerRappel
    usecase "Consulter le journal d'audit de sécurité" as UC_Audit
    usecase "Configurer les paramètres (Délais, Quotas)" as UC_Settings
  }
}

' Relations Étudiant
Etudiant --> UC_Auth
Etudiant --> UC_Notif
Etudiant --> UC_Recherche
Etudiant --> UC_Hist
Etudiant --> UC_DetailLivre
Etudiant --> UC_DemandeEmprunt
Etudiant --> UC_SuivreDemandes
Etudiant --> UC_AnnulerDemande
Etudiant --> UC_MesEmprunts

' Relations Gérant
Gerant --> UC_Auth
Gerant --> UC_Notif
Gerant --> UC_Dashboard
Gerant --> UC_GestionLivres
Gerant --> UC_GestionCopies
Gerant --> UC_ScanCamera
Gerant --> UC_ScanCarte
Gerant --> UC_GestionEtudiants
Gerant --> UC_TraiterDemandes
Gerant --> UC_PretComptoir
Gerant --> UC_RetourLivre
Gerant --> UC_SuiviRetards
Gerant --> UC_EnvoyerRappel
Gerant --> UC_Audit
Gerant --> UC_Settings

' Relations d'inclusion & extension
UC_DemandeEmprunt ..> UC_DetailLivre : <<extend>>
UC_TraiterDemandes <.. UC_ValiderResa : <<extend>>
UC_TraiterDemandes <.. UC_RefuserDemande : <<extend>>
UC_TraiterDemandes <.. UC_RemisePhysique : <<extend>>

UC_EnvoyerRappel --> SMTP : <<déclenche l'envoi>>
UC_ValiderResa ..> UC_Notif : <<notifie étudiant>>
UC_RefuserDemande ..> UC_Notif : <<notifie motif>>

@enduml`
  },
  {
    name: '2_class_diagram.png',
    title: 'Diagramme de Classes Métier (Class Diagram)',
    puml: `@startuml
skinparam handwritten false
skinparam roundcorner 8
skinparam packageStyle rectangle
skinparam classAttributeIconSize 0
skinparam defaultFontName Arial
skinparam defaultFontSize 11

skinparam class {
  BackgroundColor #FFFFFF
  BorderColor #002B49
  HeaderBackgroundColor #E0F2FE
  ArrowColor #002B49
}

title **Système de Gestion de Bibliothèque EST - USMBA**\\n**Diagramme de Classes UML (Modèle Domaine)**

enum RoleName {
  ROLE_ETUDIANT
  ROLE_GERANT
  ROLE_ADMIN
}

enum StudentStatus {
  ACTIVE
  SUSPENDED
  GRADUATED
}

enum CopyStatus {
  AVAILABLE
  RESERVED
  BORROWED
  MAINTENANCE
  LOST
}

enum CopyCondition {
  NEW
  GOOD
  FAIR
  DAMAGED
}

enum LoanStatus {
  ACTIVE
  RETURNED
  OVERDUE
}

enum LoanRequestStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
  EXPIRED
  FULFILLED
}

enum OverdueLevel {
  NONE
  LOW
  MEDIUM
  HIGH
}

enum NotificationType {
  NEW_LOAN_REQUEST
  REQUEST_APPROVED
  REQUEST_REJECTED
  RESERVATION_EXPIRING
  RESERVATION_EXPIRED
  LOAN_OVERDUE
  GENERAL
}

class User {
  - id: Integer
  - email: String
  - fullName: String
  - role: RoleName
  - avatarUrl: String
  - createdAt: DateTime
  + verifyCredentials(): Boolean
}

class Student {
  - id: Integer
  - userId: Integer
  - studentIdNumber: String {CNE}
  - department: String
  - academicYear: String
  - phone: String
  - status: StudentStatus
  - maxLoans: Integer
  + isEligibleForLoan(): Boolean
  + countActiveLoans(): Integer
  + hasOverdueLoans(): Boolean
}

class Category {
  - id: Integer
  - code: String
  - name: String
  - description: String
}

class Book {
  - id: Integer
  - isbn: String
  - title: String
  - author: String
  - publisher: String
  - publicationYear: Integer
  - categoryId: Integer
  - categoryName: String
  - summary: String
  - coverImageUrl: String
  - totalCopies: Integer
  - availableCopies: Integer
  + getAvailableCopiesList(): List<BookCopy>
  + decrementAvailable(): void
  + incrementAvailable(): void
}

class BookCopy {
  - id: Integer
  - bookId: Integer
  - barcode: String {unique}
  - locationShelf: String
  - condition: CopyCondition
  - status: CopyStatus
  - createdAt: DateTime
  + markReserved(): void
  + markBorrowed(): void
  + markAvailable(): void
}

class Loan {
  - id: Integer
  - studentId: Integer
  - bookCopyId: Integer
  - loanDate: Date
  - expectedReturnDate: Date
  - actualReturnDate: Date
  - status: LoanStatus
  - overdueDays: Integer
  - overdueLevel: OverdueLevel
  - reminderCount: Integer
  - lastReminderSentAt: DateTime
  - notes: String
  - createdByUserId: Integer
  + calculateOverdueDays(currentDate: Date): Integer
  + closeReturn(condition: CopyCondition, notes: String): void
}

class LoanRequest {
  - id: Integer
  - studentId: Integer
  - bookId: Integer
  - allocatedCopyId: Integer
  - requestDate: DateTime
  - status: LoanRequestStatus
  - reviewDate: DateTime
  - reviewedByUserId: Integer
  - rejectionReason: String
  - pickupDeadline: Date
  - notes: String
  + approve(copyId: Integer, days: Integer): void
  + reject(reason: String): void
  + cancel(): void
  + fulfill(): Loan
}

class Notification {
  - id: Integer
  - recipientUserId: Integer
  - recipientRole: RoleName
  - type: NotificationType
  - title: String
  - message: String
  - relatedEntityName: String
  - relatedEntityId: Integer
  - isRead: Boolean
  - createdAt: DateTime
  + markAsRead(): void
}

class Reminder {
  - id: Integer
  - loanId: Integer
  - recipientEmail: String
  - overdueDays: Integer
  - overdueLevel: OverdueLevel
  - messageContent: String
  - deliveryStatus: String
  - sentAt: DateTime
  - sentByUserId: Integer
}

class AuditLog {
  - id: Integer
  - actorUserId: Integer
  - actorName: String
  - action: String
  - entityName: String
  - entityId: Integer
  - details: JSON
  - ipAddress: String
  - timestamp: DateTime
}

' Associations
User "1" *-- "0..1" Student : caractérise >
Category "1" o-- "0..*" Book : classe >
Book "1" *-- "1..*" BookCopy : possède des exemplaires physiques >
Student "1" -- "0..*" Loan : effectue >
BookCopy "1" -- "0..*" Loan : fait l'objet de >
Student "1" -- "0..*" LoanRequest : formule en ligne >
Book "1" -- "0..*" LoanRequest : concerne >
BookCopy "0..1" -- "0..*" LoanRequest : est réservé par >
Loan "1" -- "0..*" Reminder : génère des relances >
User "1" -- "0..*" Notification : reçoit >
User "0..1" -- "0..*" AuditLog : génère l'événement >
User "0..1" -- "0..*" LoanRequest : examine >
@enduml`
  },
  {
    name: '3_sequence_online_loan.png',
    title: 'Diagramme de Séquence : Demande & Validation en Ligne',
    puml: `@startuml
skinparam handwritten false
skinparam roundcorner 8
skinparam shadowing true
skinparam defaultFontName Arial
skinparam defaultFontSize 11
skinparam sequenceMessageAlign center

skinparam actor {
  BackgroundColor #E0F2FE
  BorderColor #0369A1
}

skinparam participant {
  BackgroundColor #F8FAFC
  BorderColor #002B49
}

title **Diagramme de Séquence UML : Cycle Complet Emprunt en Ligne**\\n**(Demande Étudiant, Validation Gérant, Réservation & Remise Comptoir)**

actor "Étudiant EST" as Etudiant
participant "Espace Étudiant\\n(React UI)" as UI_Etudiant
participant "API REST\\n(Express /server.ts)" as API
participant "Base de Données\\n(database.ts / JSON Store)" as DB
participant "Espace Gérant\\n(React UI)" as UI_Gerant
actor "Gérant Bibliothèque" as Gerant

== 1. Consultation & Vérification d'Éligibilité ==
Etudiant -> UI_Etudiant : Ouvre la fiche d'un livre (ID=4)
UI_Etudiant -> API : GET /api/students/:id/eligibility?bookId=4
API -> DB : checkStudentEligibility(studentId, bookId)
note over DB
  1. Compte actif ? (status == 'ACTIVE')
  2. Aucun retard non réglé ? (overdueDays == 0)
  3. Quota respecté ? (prêts actifs + demandes < maxLoans)
  4. Exemplaire disponible ? (status == 'AVAILABLE')
  5. Pas de doublon en attente ?
end note
DB --> API : { eligible: true, reasons: [] }
API --> UI_Etudiant : 200 OK (Bouton "Demander l'emprunt" actif)

== 2. Soumission de la Demande d'Emprunt ==
Etudiant -> UI_Etudiant : Clique sur "Demander l'emprunt" & confirme
UI_Etudiant -> API : POST /api/loan-requests { bookId: 4, notes: "TP Réseaux" }
API -> DB : createLoanRequest(studentId, bookId, notes)
DB -> DB : Instancie LoanRequest (Status = PENDING)
DB -> DB : addNotification(Role: GERANT, "Nouvelle demande en ligne")
DB -> DB : addAuditLog("LOAN_REQUEST_SUBMITTED")
DB --> API : LoanRequest (ID=101, Status=PENDING)
API --> UI_Etudiant : 201 Created (Message succès)
UI_Etudiant --> Etudiant : Affiche confirmation + redirige vers "Mes Demandes"

== 3. Examen & Validation par le Gérant ==
UI_Gerant -> API : Polling / GET /api/loan-requests
API --> UI_Gerant : Liste des demandes (Demande #101 PENDING)
Gerant -> UI_Gerant : Consulte la demande #101 et clique sur "Accepter"
UI_Gerant -> UI_Gerant : Sélectionne l'exemplaire (EST-INF-001) et délai (2 jours)
Gerant -> UI_Gerant : Confirme la réservation
UI_Gerant -> API : POST /api/loan-requests/101/approve { copyId: 1, pickupDeadlineDays: 2 }
API -> DB : approveLoanRequest(101, copyId: 1, 2 jours)
DB -> DB : Copy #1 status -> 'RESERVED' (bloqué pour les autres)
DB -> DB : LoanRequest #101 status -> 'APPROVED'
DB -> DB : addNotification(Étudiant, "Demande approuvée : retirez sous 48h")
DB -> DB : addAuditLog("LOAN_REQUEST_APPROVED")
DB --> API : LoanRequest mise à jour
API --> UI_Gerant : 200 OK (Mise à jour interface gérant)

== 4. Notification & Retrait au Comptoir ==
Etudiant -> UI_Etudiant : Ouvre "Mes Demandes" (statut APPROVED, code-barres affiché)
Etudiant -> Gerant : Se présente au comptoir avec sa carte étudiante CNE
Gerant -> UI_Gerant : Clique sur "Confirmer la remise" (Demande #101)
UI_Gerant -> API : POST /api/loan-requests/101/fulfill
API -> DB : fulfillLoanRequest(101)
DB -> DB : Copy #1 status -> 'BORROWED'
DB -> DB : Crée Loan actif (loanDate=Aujourd'hui, expectedReturn=J+14)
DB -> DB : LoanRequest #101 status -> 'FULFILLED'
DB -> DB : addAuditLog("LOAN_REQUEST_FULFILLED")
DB --> API : 200 OK (Prêt officiel créé)
API --> UI_Gerant : Confirmation de remise physique
Gerant -> Etudiant : Remet l'exemplaire physique en main propre
@enduml`
  },
  {
    name: '4_state_diagram.png',
    title: 'Diagramme d\'États : Cycle de Vie Exemplaire & Demande',
    puml: `@startuml
skinparam handwritten false
skinparam roundcorner 8
skinparam shadowing true
skinparam defaultFontName Arial
skinparam defaultFontSize 11

skinparam state {
  BackgroundColor #FFFFFF
  BorderColor #002B49
  StartColor #002B49
  EndColor #002B49
  ArrowColor #002B49
}

title **Diagramme d'États-Transitions UML**\\n**Cycle de Vie d'un Exemplaire Physique (BookCopy) & Demande d'Emprunt**

state "Cycle de Vie d'une Demande en Ligne (LoanRequest)" as DemandeState {
  [*] --> PENDING : Étudiant soumet sa demande
  
  PENDING --> CANCELLED : Étudiant annule sa demande
  PENDING --> REJECTED : Gérant refuse avec motif obligatoire
  PENDING --> APPROVED : Gérant accepte et réserve un exemplaire
  
  APPROVED --> EXPIRED : Délai de retrait (48h) dépassé
  APPROVED --> FULFILLED : Gérant confirme la remise physique au comptoir
  
  CANCELLED --> [*]
  REJECTED --> [*]
  EXPIRED --> [*]
  FULFILLED --> [*]
}

--

state "Cycle de Vie d'un Exemplaire Physique (BookCopy)" as CopyState {
  [*] --> AVAILABLE : Enregistrement inventaire / Rayon
  
  AVAILABLE --> RESERVED : Gérant approuve une demande en ligne
  AVAILABLE --> BORROWED : Prêt direct comptoir enregistré
  AVAILABLE --> MAINTENANCE : Constat d'usure / reliure nécessaire
  
  RESERVED --> AVAILABLE : Réservation expirée ou annulée
  RESERVED --> BORROWED : Remise physique confirmée au comptoir
  
  BORROWED --> AVAILABLE : Restitution sans dommage
  BORROWED --> MAINTENANCE : Restitué dégradé (état DAMAGED)
  BORROWED --> LOST : Non restitué après relances / Perdu
  
  MAINTENANCE --> AVAILABLE : Ouvrage réparé et remis en rayon
  LOST --> [*]
}

@enduml`
  },
  {
    name: '5_activity_ocr_student.png',
    title: 'Diagramme d\'Activité : Inscription Étudiant par Scan OCR',
    puml: `@startuml
skinparam handwritten false
skinparam roundcorner 8
skinparam shadowing true
skinparam defaultFontName Arial
skinparam defaultFontSize 11

skinparam activity {
  BackgroundColor #FFFFFF
  BorderColor #002B49
  StartColor #002B49
  EndColor #002B49
  ArrowColor #002B49
}

title **Diagramme d'Activité UML : Inscription d'un Étudiant par Scan Carte (OCR)**

start

:Le gérant clique sur "Ajouter un étudiant" (Espace Gérant);

:Sélection du mode d'acquisition :
- Caméra en direct (WebRTC)
- Import d'image (Recto / Verso);

if (Mode choisi ?) then (Caméra)
  :Activation du flux vidéo (getUserMedia) ;
  :Cadrage de la carte étudiante EST ;
  :Capture de la photo haute résolution ;
else (Import fichier)
  :Sélection du fichier image (PNG/JPEG) ;
endif

:Prétraitement de l'image (normalisation contraste & recadrage);

:Exécution de l'algorithme OCR / Reconnaissance de texte;

:Extraction des entités clés :
- Nom & Prénom
- Numéro étudiant / Code National (CNE)
- Filière académique (DUT / LP)
- Établissement (EST Fès / USMBA)
- Année universitaire;

:Affichage du formulaire prérempli à l'écran;

:Vérification de l'existence du CNE dans la base de données;

if (Étudiant déjà enregistré ?) then (Oui - Doublon détecté)
  #FFEEEE:Affichage alerte rouge : "Étudiant déjà inscrit avec ce CNE";
  :Possibilité de consulter la fiche existante;
  stop
else (Non - Nouvel étudiant)
  :Le gérant examine les champs extraits;
  if (Erreur de reconnaissance OCR ?) then (Oui)
    :Le gérant corrige ou complète manuellement les champs;
  else (Non)
  endif
  
  :Le gérant clique sur "Confirmer l'inscription";
  :Création de l'utilisateur (Role: ROLE_ETUDIANT);
  :Création de la fiche étudiante (CNE, Filière, Quota=3);
  :Journalisation de l'événement dans le journal d'audit;
  #EEFFEE:Affichage notification verte : "Étudiant inscrit avec succès";
  stop
endif

@enduml`
  },
  {
    name: '6_component_architecture.png',
    title: 'Diagramme de Composants & Architecture Système',
    puml: `@startuml
skinparam handwritten false
skinparam roundcorner 8
skinparam shadowing true
skinparam defaultFontName Arial
skinparam defaultFontSize 11
skinparam componentStyle uml2

skinparam component {
  BackgroundColor #FFFFFF
  BorderColor #002B49
}

skinparam node {
  BackgroundColor #F8FAFC
  BorderColor #0369A1
}

title **Diagramme de Composants & Architecture Système**\\n**Application Web Bibliothèque EST - USMBA**

package "Navigateur Client (React 19 + TypeScript + Vite + Tailwind CSS)" {
  [Portail d'Authentification / Switcher] as AuthComp
  
  package "Espace Étudiant" {
    [Recherche & Catalogue] as CatalogComp
    [Détails Livre & Éligibilité] as BookDetailComp
    [Mes Demandes en Ligne] as StudentRequestsComp
    [Mes Emprunts en Cours] as StudentLoansComp
  }

  package "Espace Gérant" {
    [Dashboard & Statistiques] as DashComp
    [Gestion Livres & Couverture OCR] as BookMgmtComp
    [Gestion Exemplaires & Barcodes] as CopiesMgmtComp
    [Scanner Caméra ZXing] as ScannerComp
    [Inscription Étudiant OCR] as StudentOcrComp
    [Gestion Emprunts & Validation Demandes] as ManagerLoansComp
    [Suivi Retards & Relances E-mail] as OverdueComp
    [Journal d'Audit] as AuditComp
  }
  
  [Centre de Notifications (Navbar Popover)] as NotifComp
  [Client HTTP Axios / Services API] as ApiServices
}

package "Serveur d'Application (Node.js / Express)" {
  [Middleware Auth & RBAC] as AuthMiddleware
  
  package "Contrôleurs REST API" {
    [Books & Copies API] as BookController
    [Students & OCR API] as StudentController
    [Loans & Returns API] as LoanController
    [LoanRequests API] as RequestController
    [Notifications API] as NotifController
    [Reminders & SMTP Controller] as ReminderController
    [Audit & Stats Controller] as AuditController
  }

  package "Couche Logique Métier & Persistance" {
    [Database Store Engine\\n(server/db/database.ts)] as DBEngine
    [Modèle Données & Schemas\\n(server/db/schema.ts)] as SchemaDef
  }
}

database "Stockage Persistant" {
  file "server-data/library_database.json" as JSON_DB
  folder "Couvertures & Images" as ImgStore
}

cloud "Services Externes" {
  [Serveur SMTP E-mail] as SMTP_Server
  [Google Books API / BNF] as ExtBiblio
}

' Liaisons Client -> Services API
CatalogComp --> ApiServices
BookDetailComp --> ApiServices
StudentRequestsComp --> ApiServices
StudentLoansComp --> ApiServices
ManagerLoansComp --> ApiServices
StudentOcrComp --> ApiServices
NotifComp --> ApiServices

' Client -> Backend
ApiServices ..> AuthMiddleware : HTTP REST (JSON)
AuthMiddleware --> BookController
AuthMiddleware --> StudentController
AuthMiddleware --> LoanController
AuthMiddleware --> RequestController
AuthMiddleware --> NotifController
AuthMiddleware --> ReminderController
AuthMiddleware --> AuditController

' Contrôleurs -> DB Engine
BookController --> DBEngine
StudentController --> DBEngine
LoanController --> DBEngine
RequestController --> DBEngine
NotifController --> DBEngine
ReminderController --> DBEngine
AuditController --> DBEngine

DBEngine --> SchemaDef
DBEngine --> JSON_DB : Lecture/Écriture atomique JSON

ReminderController --> SMTP_Server : SMTP TLS / Alertes retards
BookMgmtComp ..> ExtBiblio : Requêtes bibliographiques ISBN

@enduml`
  }
];

async function main() {
  const outDir = path.join(__dirname, 'public', 'diagrams');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log(`Starting generation of ${diagrams.length} UML PNG diagrams...`);
  
  for (const diag of diagrams) {
    const filePath = path.join(outDir, diag.name);
    console.log(`Generating: ${diag.title} -> ${filePath}`);
    try {
      await downloadDiagram(diag.puml, filePath);
    } catch (err) {
      console.error(`Error generating ${diag.name}:`, err.message);
    }
  }

  // Create an index HTML viewer so user can view/zoom all diagrams in high res directly in browser
  const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Diagrammes UML - Bibliothèque EST Fès USMBA</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  </style>
</head>
<body class="bg-slate-100 text-slate-900 min-h-screen">
  <header class="bg-[#002B49] text-white py-6 px-8 shadow-md sticky top-0 z-50">
    <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        <div class="text-xs uppercase tracking-widest text-sky-400 font-bold">École Supérieure de Technologie · EST Fès</div>
        <h1 class="text-2xl font-bold">Dossier d'Architecture & Diagrammes UML</h1>
        <p class="text-xs text-slate-300 mt-1">Université Sidi Mohamed Ben Abdellah · Application de Gestion de Bibliothèque</p>
      </div>
      <a href="/" class="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg transition-colors shadow">
        ← Retour à l'application
      </a>
    </div>
  </header>

  <main class="max-w-6xl mx-auto p-6 space-y-12">
    <!-- Introduction & Downloads -->
    <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
      <h2 class="text-lg font-bold text-slate-900">Spécifications & Modélisation UML du Système</h2>
      <p class="text-xs text-slate-600 leading-relaxed">
        Ce document regroupe les <strong>6 diagrammes UML officiels</strong> modélisant l'intégralité de l'application de gestion de bibliothèque de l'EST Fès (USMBA), couvrant les cas d'utilisation, le modèle de classes du domaine, la séquence de demande et validation d'emprunt en ligne, les diagrammes d'état-transition, l'activité d'inscription par scan OCR et l'architecture des composants logiciels.
      </p>
      <div class="flex flex-wrap gap-2 pt-2">
        ${diagrams.map(d => `
          <a href="/diagrams/${d.name}" download="${d.name}" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-sky-50 hover:text-sky-800 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors">
            📥 Télécharger ${d.name}
          </a>
        `).join('')}
      </div>
    </div>

    <!-- Diagram Cards -->
    ${diagrams.map((d, index) => `
      <section id="diag-${index + 1}" class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <span class="text-[11px] font-bold text-sky-700 uppercase tracking-wider">Diagramme ${index + 1} / ${diagrams.length}</span>
            <h3 class="text-base font-bold text-slate-900">${d.title}</h3>
          </div>
          <a href="/diagrams/${d.name}" target="_blank" class="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-lg shadow-2xs">
            Ouvrir en plein écran (PNG)
          </a>
        </div>
        <div class="p-6 bg-slate-50/40 flex justify-center items-center overflow-x-auto">
          <img src="/diagrams/${d.name}" alt="${d.title}" class="max-w-full h-auto rounded-lg shadow border border-slate-200" />
        </div>
      </section>
    `).join('')}
  </main>

  <footer class="text-center py-6 text-xs text-slate-500 border-t border-slate-200 bg-white mt-12">
    © 2026 École Supérieure de Technologie de Fès · Université Sidi Mohamed Ben Abdellah
  </footer>
</body>
</html>`;

  fs.writeFileSync(path.join(outDir, 'index.html'), htmlContent);
  console.log(`Viewer generated at ${path.join(outDir, 'index.html')}`);
}

main().catch(console.error);
