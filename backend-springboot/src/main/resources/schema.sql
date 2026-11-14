-- ========================================================
-- SCHÉMA RELATIONNEL MYSQL — BIBLIOTHÈQUE EST FÈS / USMBA
-- Normalisation 3NF, Clés Primaires, Clés Étrangères, Index
-- ========================================================

CREATE DATABASE IF NOT EXISTS est_library_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE est_library_db;

-- 1. Table des Catégories de l'EST
CREATE TABLE IF NOT EXISTS categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Table des Rôles
CREATE TABLE IF NOT EXISTS roles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- 3. Table des Utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    google_sub VARCHAR(100) UNIQUE,
    email VARCHAR(180) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    avatar_url VARCHAR(255),
    role_id BIGINT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 4. Table des Profils Étudiants
CREATE TABLE IF NOT EXISTS students (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    student_id_number VARCHAR(50) NOT NULL UNIQUE,
    department VARCHAR(100) NOT NULL,
    establishment VARCHAR(150) DEFAULT 'École Supérieure de Technologie de Fès (EST Fès)',
    academic_year VARCHAR(30) DEFAULT '2024-2025',
    card_reference VARCHAR(100),
    phone VARCHAR(30),
    max_loans INT DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_students_number (student_id_number)
) ENGINE=InnoDB;

-- 5. Table des Notices Bibliographiques (Livres)
CREATE TABLE IF NOT EXISTS books (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(180) NOT NULL,
    isbn VARCHAR(30) UNIQUE,
    category_id BIGINT NOT NULL,
    publication_year INT NOT NULL,
    publisher VARCHAR(150),
    summary TEXT NOT NULL,
    cover_image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_books_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    INDEX idx_books_search (title, author)
) ENGINE=InnoDB;

-- 6. Table des Exemplaires Physiques Unitaires
CREATE TABLE IF NOT EXISTS book_copies (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    book_id BIGINT NOT NULL,
    barcode VARCHAR(64) NOT NULL UNIQUE,
    location_shelf VARCHAR(100) NOT NULL,
    physical_condition ENUM('NEW', 'GOOD', 'FAIR', 'DAMAGED') NOT NULL DEFAULT 'GOOD',
    status ENUM('AVAILABLE', 'BORROWED', 'LOST', 'MAINTENANCE') NOT NULL DEFAULT 'AVAILABLE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_copies_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    INDEX idx_copies_barcode (barcode),
    INDEX idx_copies_status (status)
) ENGINE=InnoDB;

-- 7. Table des Emprunts
CREATE TABLE IF NOT EXISTS loans (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT NOT NULL,
    book_copy_id BIGINT NOT NULL,
    loan_date DATE NOT NULL,
    expected_return_date DATE NOT NULL,
    actual_return_date DATE NULL,
    status ENUM('ACTIVE', 'RETURNED', 'OVERDUE') NOT NULL DEFAULT 'ACTIVE',
    notes TEXT,
    created_by_user_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_loans_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT,
    CONSTRAINT fk_loans_copy FOREIGN KEY (book_copy_id) REFERENCES book_copies(id) ON DELETE RESTRICT,
    CONSTRAINT fk_loans_creator FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_loans_active (status, expected_return_date)
) ENGINE=InnoDB;

-- 8. Table des Rappels par e-mail
CREATE TABLE IF NOT EXISTS reminders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT NOT NULL,
    recipient_email VARCHAR(180) NOT NULL,
    overdue_days INT NOT NULL,
    overdue_level ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL,
    message_content TEXT NOT NULL,
    delivery_status ENUM('SENT', 'FAILED') NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_by_user_id BIGINT NOT NULL,
    CONSTRAINT fk_reminders_loan FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,
    CONSTRAINT fk_reminders_sender FOREIGN KEY (sent_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 9. Table de l'Historique de Recherche Étudiant
CREATE TABLE IF NOT EXISTS search_histories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT NOT NULL,
    query_text VARCHAR(255) NOT NULL,
    category_id BIGINT NULL,
    results_count INT NOT NULL DEFAULT 0,
    searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_search_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 10. Table du Journal d'Audit Système
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    actor_user_id BIGINT NULL,
    action VARCHAR(80) NOT NULL,
    entity_name VARCHAR(80) NOT NULL,
    entity_id BIGINT NULL,
    details JSON NULL,
    ip_address VARCHAR(45) NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_timestamp (timestamp)
) ENGINE=InnoDB;

-- 11. Table des Paramètres de la Bibliothèque
CREATE TABLE IF NOT EXISTS library_settings (
    id BIGINT PRIMARY KEY DEFAULT 1,
    default_loan_duration_days INT NOT NULL DEFAULT 14,
    max_loans_per_student INT NOT NULL DEFAULT 3,
    overdue_low_threshold INT NOT NULL DEFAULT 1,
    overdue_medium_threshold INT NOT NULL DEFAULT 4,
    overdue_high_threshold INT NOT NULL DEFAULT 8,
    smtp_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    smtp_from_address VARCHAR(180) DEFAULT 'bibliotheque.est@usmba.ac.ma',
    smtp_from_name VARCHAR(150) DEFAULT 'Bibliothèque EST - USMBA'
) ENGINE=InnoDB;
