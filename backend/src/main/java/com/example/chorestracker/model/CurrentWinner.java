package com.example.chorestracker.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Document(collection = "CurrentWinner")
public class CurrentWinner {
    @Id
    private String id;

    private String groupId;
    private String username;
    private LocalDateTime winTime;
}