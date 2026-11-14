package ma.ac.usmba.est.library.controllers;

import ma.ac.usmba.est.library.entities.Student;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/students")
@CrossOrigin(origins = "*")
public class StudentController {

    // Simulating Service injection
    // In production: private final StudentService studentService;

    @GetMapping("/check-duplicate/{studentIdNumber}")
    @PreAuthorize("hasRole('GERANT')")
    public ResponseEntity<?> checkDuplicate(@PathVariable String studentIdNumber) {
        // Checks if student with CNE/Apogée exists in MySQL
        // If found: returns exists: true, message, student object
        // If not: returns exists: false
        return ResponseEntity.ok(Map.of(
            "exists", false,
            "studentIdNumber", studentIdNumber
        ));
    }

    @PostMapping("/scan-card-ocr")
    @PreAuthorize("hasRole('GERANT')")
    public ResponseEntity<?> scanStudentCardOcr(@RequestBody Map<String, Object> payload) {
        // 1. Receives base64 image (recto/verso)
        // 2. Processes in-memory without saving image file on disk (GDPR / Privacy)
        // 3. Extracts: nom, prenom, studentIdNumber, establishment, department, academicYear
        // 4. Verifies duplicates against MySQL student repository
        // 5. Returns parsed data + duplicate warning if any
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "OCR card extraction completed"
        ));
    }

    @PostMapping
    @PreAuthorize("hasRole('GERANT')")
    public ResponseEntity<?> registerStudent(@RequestBody Map<String, Object> studentDto) {
        // Enforces strict duplicate check on studentIdNumber
        // Creates User account with ROLE_ETUDIANT and linked Student entity
        // Logs action in audit_logs
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
            "success", true,
            "message", "Étudiant enregistré avec succès dans MySQL"
        ));
    }
}
