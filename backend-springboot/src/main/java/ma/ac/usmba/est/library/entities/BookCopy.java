package ma.ac.usmba.est.library.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "book_copies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookCopy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "book_id", nullable = false)
    private Book book;

    @Column(nullable = false, unique = true, length = 64)
    private String barcode;

    @Column(name = "location_shelf", nullable = false)
    private String locationShelf;

    @Enumerated(EnumType.STRING)
    @Column(name = "physical_condition", nullable = false)
    @Builder.Default
    private Condition condition = Condition.GOOD;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Status status = Status.AVAILABLE;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum Condition {
        NEW, GOOD, FAIR, DAMAGED
    }

    public enum Status {
        AVAILABLE, BORROWED, LOST, MAINTENANCE
    }
}
