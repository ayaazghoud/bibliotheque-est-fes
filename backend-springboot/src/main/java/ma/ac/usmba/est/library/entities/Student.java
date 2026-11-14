package ma.ac.usmba.est.library.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "students")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "student_id_number", nullable = false, unique = true, length = 50)
    private String studentIdNumber;

    @Column(nullable = false, length = 100)
    private String department;

    @Column(length = 150)
    @Builder.Default
    private String establishment = "École Supérieure de Technologie de Fès (EST Fès)";

    @Column(name = "academic_year", length = 30)
    @Builder.Default
    private String academicYear = "2024-2025";

    @Column(name = "card_reference", length = 100)
    private String cardReference;

    @Column(length = 30)
    private String phone;

    @Column(name = "max_loans")
    @Builder.Default
    private Integer maxLoans = 3;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
