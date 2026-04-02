package com.example.chorestracker.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Document(collection = "WheelLock")
public class WheelLock {
    @Id
    private String id;

    private boolean isLocked = false;
    private String lockedBy;
    private LocalDateTime lockedUntil;
}
