import os
import zlib
import urllib.request
import time

def encode6bit(b):
    if b < 10:
        return chr(48 + b)
    b -= 10
    if b < 26:
        return chr(65 + b)
    b -= 26
    if b < 26:
        return chr(97 + b)
    b -= 26
    if b == 0:
        return '-'
    if b == 1:
        return '_'
    return '?'

def append3bytes(b1, b2, b3):
    c1 = b1 >> 2
    c2 = ((b1 & 0x3) << 4) | (b2 >> 4)
    c3 = ((b2 & 0xF) << 2) | (b3 >> 6)
    c4 = b3 & 0x3F
    return encode6bit(c1 & 0x3F) + encode6bit(c2 & 0x3F) + encode6bit(c3 & 0x3F) + encode6bit(c4 & 0x3F)

def encode_plantuml(text):
    z = zlib.compressobj(level=9, method=zlib.DEFLATED, wbits=-15)
    data = z.compress(text.encode('utf-8')) + z.flush()
    res = []
    i = 0
    while i < len(data):
        b1 = data[i]
        b2 = data[i+1] if i+1 < len(data) else 0
        b3 = data[i+2] if i+2 < len(data) else 0
        res.append(append3bytes(b1, b2, b3))
        i += 3
    return ''.join(res)

def download_diagram(puml_code, output_path):
    encoded = encode_plantuml(puml_code)
    url = f"https://www.plantuml.com/plantuml/png/{encoded}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64)'})
    with urllib.request.urlopen(req) as resp:
        data = resp.read()
        with open(output_path, 'wb') as f:
            f.write(data)
        print(f"Downloaded {output_path} ({len(data)} bytes)")

diagrams = [
    {
        'id': '1_use_case_diagram.png',
        'title': 'Diagramme de Cas d\'Utilisation (Use Case Diagram)',
        'code': '''@startuml
skinparam roundcorner 8
skinparam packageStyle rectangle
skinparam shadowing false
skinparam defaultFontName Arial
skinparam defaultFontSize 11

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
actor "Système E-mail SMTP" as SMTP

rectangle "Application Web Bibliothèque EST - USMBA" {
  ' Cas communs
  usecase "S'authentifier (OAuth / CNE)" as UC_Auth
  usecase "Consulter les notifications" as UC_Notif
  
  package "Espace Étudiant" {
    usecase "Rechercher dans le catalogue\\n(Titre, Auteur, Filière)" as UC_Recherche
    usecase "Consulter l'historique de recherche" as UC_Hist
    usecase "Consulter la notice d'un ouvrage" as UC_DetailLivre
    usecase "Demander un emprunt en ligne" as UC_DemandeEmprunt
    usecase "Suivre ses demandes (Mes Demandes)" as UC_SuivreDemandes
    usecase "Annuler une demande en attente" as UC_AnnulerDemande
    usecase "Consulter ses emprunts en cours" as UC_MesEmprunts
  }

  package "Espace Gérant / Administration" {
    usecase "Consulter le tableau de bord (KPI & alertes)" as UC_Dashboard
    usecase "Gérer les livres (Recherche en ligne / OCR)" as UC_GestionLivres
    usecase "Gérer les exemplaires & codes-barres" as UC_GestionCopies
    usecase "Scanner un livre par caméra" as UC_ScanCamera
    usecase "Inscrire un étudiant par scan OCR" as UC_ScanCarte
    usecase "Gérer les étudiants (CRUD & Statut)" as UC_GestionEtudiants
    usecase "Traiter les demandes d'emprunt en ligne" as UC_TraiterDemandes
    usecase "Accepter la demande (Exemplaire RESERVED)" as UC_ValiderResa
    usecase "Refuser la demande (Motif obligatoire)" as UC_RefuserDemande
    usecase "Confirmer la remise physique du livre" as UC_RemisePhysique
    usecase "Enregistrer un prêt direct au comptoir" as UC_PretComptoir
    usecase "Enregistrer la restitution physique" as UC_RetourLivre
    usecase "Suivre les retards & pénalités" as UC_SuiviRetards
    usecase "Envoyer des rappels par e-mail" as UC_EnvoyerRappel
    usecase "Consulter le journal d'audit" as UC_Audit
    usecase "Configurer les paramètres de prêt" as UC_Settings
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

UC_DemandeEmprunt ..> UC_DetailLivre : <<extend>>
UC_TraiterDemandes <.. UC_ValiderResa : <<extend>>
UC_TraiterDemandes <.. UC_RefuserDemande : <<extend>>
UC_TraiterDemandes <.. UC_RemisePhysique : <<extend>>

UC_EnvoyerRappel --> SMTP : <<déclenche envoi>>
UC_ValiderResa ..> UC_Notif : <<notifie étudiant>>
UC_RefuserDemande ..> UC_Notif : <<notifie motif>>
@enduml'''
    },
    {
        'id': '2_class_diagram.png',
        'title': 'Diagramme de Classes Métier (Class Diagram)',
        'code': '''@startuml
skinparam roundcorner 6
skinparam packageStyle rectangle
skinparam classAttributeIconSize 0
skinparam shadowing false
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
  + getAvailableCopies(): List<BookCopy>
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
  - reminderCount: Integer
  - notes: String
  - createdByUserId: Integer
  + calculateOverdueDays(): Integer
  + closeReturn(condition: CopyCondition): void
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
  - type: String
  - title: String
  - message: String
  - isRead: Boolean
  - createdAt: DateTime
  + markAsRead(): void
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

User "1" *-- "0..1" Student : caractérise >
Category "1" o-- "0..*" Book : classe >
Book "1" *-- "1..*" BookCopy : possède des exemplaires physiques >
Student "1" -- "0..*" Loan : effectue >
BookCopy "1" -- "0..*" Loan : fait l'objet de >
Student "1" -- "0..*" LoanRequest : formule en ligne >
Book "1" -- "0..*" LoanRequest : concerne >
BookCopy "0..1" -- "0..*" LoanRequest : est réservé par >
User "1" -- "0..*" Notification : reçoit >
User "0..1" -- "0..*" AuditLog : déclenche >
User "0..1" -- "0..*" LoanRequest : examine >
@enduml'''
    },
    {
        'id': '3_sequence_online_loan.png',
        'title': 'Diagramme de Séquence : Demande & Validation en Ligne',
        'code': '''@startuml
skinparam roundcorner 6
skinparam shadowing false
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

title **Diagramme de Séquence UML : Emprunt en Ligne & Validation Gérant**

actor "Étudiant EST" as Etudiant
participant "Espace Étudiant\\n(React UI)" as UI_Etudiant
participant "API Express\\n(/server.ts)" as API
participant "Base de Données\\n(database.ts)" as DB
participant "Espace Gérant\\n(React UI)" as UI_Gerant
actor "Gérant Bibliothèque" as Gerant

== 1. Consultation & Vérification d'Éligibilité ==
Etudiant -> UI_Etudiant : Ouvre la fiche d'un livre (ID=4)
UI_Etudiant -> API : GET /api/students/:id/eligibility?bookId=4
API -> DB : checkStudentEligibility(studentId, bookId)
note over DB
  - Compte actif ?
  - Aucun retard non réglé ?
  - Quota max non dépassé ?
  - Exemplaire disponible en rayon ?
end note
DB --> API : { eligible: true }
API --> UI_Etudiant : 200 OK (Bouton "Demander l'emprunt" actif)

== 2. Soumission de la Demande d'Emprunt ==
Etudiant -> UI_Etudiant : Clique sur "Demander l'emprunt" & valide
UI_Etudiant -> API : POST /api/loan-requests { bookId: 4, notes: "TP Réseaux" }
API -> DB : createLoanRequest(studentId, bookId, notes)
DB -> DB : Instancie LoanRequest (Status = PENDING)
DB -> DB : Notification Gérant ("Nouvelle demande d'emprunt")
DB -> DB : Log Audit ("LOAN_REQUEST_SUBMITTED")
DB --> API : LoanRequest (ID=101, Status=PENDING)
API --> UI_Etudiant : 201 Created
UI_Etudiant --> Etudiant : Confirmation & Redirection vers "Mes Demandes"

== 3. Examen & Validation par le Gérant ==
UI_Gerant -> API : GET /api/loan-requests
API --> UI_Gerant : Liste des demandes (Demande #101 PENDING)
Gerant -> UI_Gerant : Clique sur "Accepter"
UI_Gerant -> UI_Gerant : Sélectionne l'exemplaire (EST-INF-001) et délai (2 jours)
Gerant -> UI_Gerant : Confirme la réservation
UI_Gerant -> API : POST /api/loan-requests/101/approve { copyId: 1, pickupDeadlineDays: 2 }
API -> DB : approveLoanRequest(101, copyId=1)
DB -> DB : Copy #1 status -> 'RESERVED'
DB -> DB : LoanRequest #101 status -> 'APPROVED'
DB -> DB : Notification Étudiant ("Demande approuvée : retirez sous 48h")
DB -> DB : Log Audit ("LOAN_REQUEST_APPROVED")
DB --> API : LoanRequest mise à jour
API --> UI_Gerant : 200 OK
UI_Gerant --> Gerant : Badge mis à jour

== 4. Remise Physique au Comptoir ==
Etudiant -> Gerant : Se présente au comptoir avec sa carte CNE
Gerant -> UI_Gerant : Clique sur "Confirmer la remise" (Demande #101)
UI_Gerant -> API : POST /api/loan-requests/101/fulfill
API -> DB : fulfillLoanRequest(101)
DB -> DB : Copy #1 status -> 'BORROWED'
DB -> DB : Création prêt officiel Loan (J+14)
DB -> DB : LoanRequest #101 status -> 'FULFILLED'
DB -> DB : Log Audit ("LOAN_REQUEST_FULFILLED")
DB --> API : 200 OK
API --> UI_Gerant : Confirmation de remise
Gerant -> Etudiant : Remet le livre physique
@enduml'''
    },
    {
        'id': '4_state_diagram.png',
        'title': 'Diagramme d\'États : Cycle de Vie Exemplaire & Demande',
        'code': '''@startuml
skinparam roundcorner 6
skinparam shadowing false
skinparam defaultFontName Arial
skinparam defaultFontSize 11

skinparam state {
  BackgroundColor #FFFFFF
  BorderColor #002B49
  StartColor #002B49
  EndColor #002B49
  ArrowColor #002B49
}

title **Diagramme d'États-Transitions UML**\\n**Cycle de Vie d'un Exemplaire Physique & d'une Demande d'Emprunt**

state "Cycle de Vie d'une Demande en Ligne (LoanRequest)" as DemandeState {
  [*] --> PENDING : Soumission en ligne par l'étudiant
  
  PENDING --> CANCELLED : Annulation par l'étudiant
  PENDING --> REJECTED : Refus par le gérant (motif notifié)
  PENDING --> APPROVED : Validation par le gérant (exemplaire réservé)
  
  APPROVED --> EXPIRED : Délai de retrait (48h) dépassé
  APPROVED --> FULFILLED : Remise physique confirmée au comptoir
  
  CANCELLED --> [*]
  REJECTED --> [*]
  EXPIRED --> [*]
  FULFILLED --> [*]
}

--

state "Cycle de Vie d'un Exemplaire Physique (BookCopy)" as CopyState {
  [*] --> AVAILABLE : Inventorié et placé en rayon
  
  AVAILABLE --> RESERVED : Approbation d'une demande en ligne
  AVAILABLE --> BORROWED : Prêt direct enregistré au comptoir
  AVAILABLE --> MAINTENANCE : État dégradé / Réparation
  
  RESERVED --> AVAILABLE : Réservation annulée ou expirée (remis en rayon)
  RESERVED --> BORROWED : Remise physique validée à l'étudiant
  
  BORROWED --> AVAILABLE : Restitution physique en bon état
  BORROWED --> MAINTENANCE : Restitué dégradé (DAMAGED)
  BORROWED --> LOST : Non restitué après relances
  
  MAINTENANCE --> AVAILABLE : Ouvrage restauré
  LOST --> [*]
}

@enduml'''
    },
    {
        'id': '5_activity_ocr_student.png',
        'title': 'Diagramme d\'Activité : Inscription Étudiant par Scan OCR',
        'code': '''@startuml
skinparam roundcorner 6
skinparam shadowing false
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

:Le gérant clique sur "Ajouter un étudiant";

:Choix du mode d'acquisition :
- Caméra en direct (WebRTC)
- Import d'image (Recto / Verso);

if (Mode choisi ?) then (Caméra)
  :Activation du flux vidéo (getUserMedia) ;
  :Cadrage de la carte étudiante EST ;
  :Capture photo haute résolution ;
else (Import image)
  :Sélection du fichier image ;
endif

:Prétraitement de l'image (contraste, recadrage);

:Exécution de l'algorithme OCR / Reconnaissance de texte;

:Extraction des informations de la carte :
- Nom & Prénom
- Code National Étudiant (CNE)
- Filière (DUT / LP)
- Établissement (EST Fès / USMBA)
- Année universitaire;

:Affichage du formulaire prérempli;

:Vérification de l'unicité du CNE dans la base;

if (Étudiant déjà enregistré ?) then (Oui - Doublon détecté)
  :Affichage alerte rouge : "Étudiant déjà inscrit avec ce CNE";
  :Consultation de la fiche existante;
  stop
else (Non - Nouveau)
  :Le gérant vérifie et valide les informations;
  if (Corrections manuelles requises ?) then (Oui)
    :Le gérant corrige les champs erronés;
  else (Non)
  endif
  
  :Clic sur "Confirmer l'inscription";
  :Création de l'utilisateur (ROLE_ETUDIANT);
  :Création de la fiche étudiant (Quota initial = 3);
  :Enregistrement dans le journal d'audit;
  :Affichage message vert : "Étudiant inscrit avec succès";
  stop
endif

@enduml'''
    },
    {
        'id': '6_component_architecture.png',
        'title': 'Diagramme de Composants & Architecture Système',
        'code': '''@startuml
skinparam roundcorner 6
skinparam shadowing false
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

package "Navigateur Client (React 19 + TypeScript + Tailwind CSS)" {
  [Authentification & Switcher Profil] as AuthComp
  
  package "Espace Étudiant" {
    [Recherche & Catalogue] as CatalogComp
    [Détails Livre & Éligibilité] as BookDetailComp
    [Mes Demandes en Ligne] as StudentRequestsComp
    [Mes Emprunts en Cours] as StudentLoansComp
  }

  package "Espace Gérant" {
    [Tableau de Bord & Stats] as DashComp
    [Gestion Livres & Couverture OCR] as BookMgmtComp
    [Gestion Exemplaires & Barcodes] as CopiesMgmtComp
    [Scanner Barcode Caméra] as ScannerComp
    [Inscription Étudiant OCR] as StudentOcrComp
    [Emprunts & Validation Demandes] as ManagerLoansComp
    [Suivi Retards & Relances E-mail] as OverdueComp
    [Journal d'Audit] as AuditComp
  }
  
  [Centre de Notifications (Navbar)] as NotifComp
  [Client Axios / Services API] as ApiServices
}

package "Serveur d'Application (Node.js / Express)" {
  [Middleware Auth & Contrôle d'Accès] as AuthMiddleware
  
  package "Contrôleurs REST API (/api/*)" {
    [Books & Copies API] as BookController
    [Students & OCR API] as StudentController
    [Loans & Returns API] as LoanController
    [LoanRequests API] as RequestController
    [Notifications API] as NotifController
    [Reminders & SMTP Controller] as ReminderController
    [Audit & Stats Controller] as AuditController
  }

  package "Logique Métier & Persistance" {
    [Database Store Engine\\n(server/db/database.ts)] as DBEngine
    [Schémas & Types\\n(server/db/schema.ts)] as SchemaDef
  }
}

database "Persistance Locale" {
  file "server-data/library_database.json" as JSON_DB
}

cloud "Services Externes" {
  [Serveur SMTP E-mail] as SMTP_Server
  [Google Books API] as ExtBiblio
}

' Relations Client
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

' Backend -> DB
BookController --> DBEngine
StudentController --> DBEngine
LoanController --> DBEngine
RequestController --> DBEngine
NotifController --> DBEngine
ReminderController --> DBEngine
AuditController --> DBEngine

DBEngine --> SchemaDef
DBEngine --> JSON_DB : Lecture/Écriture atomique JSON

ReminderController --> SMTP_Server : SMTP TLS / Relances retards
BookMgmtComp ..> ExtBiblio : Requêtes métadonnées ISBN

@enduml'''
    }
]

out_dir = os.path.join(os.path.dirname(__file__), 'public', 'diagrams')
os.makedirs(out_dir, exist_ok=True)

print("Starting UML generation...")
for diag in diagrams:
    file_path = os.path.join(out_dir, diag['id'])
    print(f"Generating {diag['title']} -> {file_path}")
    try:
        download_diagram(diag['code'], file_path)
    except Exception as e:
        print(f"Error generating {diag['id']}: {e}")
    time.sleep(0.5)

print("All diagrams generated successfully.")
