package com.example.chorestracker.Model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Document(collection = "CurrentWinner")
public class CurrentWinner {
    @Id
    private String id;

    private String groupId; // NEW: Which group does this winner belong to?
    private String username; // CHANGED: Replaced wheelItemId
    private LocalDateTime winTime;
}