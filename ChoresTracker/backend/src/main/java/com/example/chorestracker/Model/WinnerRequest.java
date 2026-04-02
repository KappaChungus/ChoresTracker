package com.example.chorestracker.Model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Document(collection = "WinnerRequests")
public class WinnerRequest {
    @Id
    private String id;

    private String groupId;
    private String requesterUsername;
    private String message;

    private int upvotes = 0;
    private int downvotes = 0;
    private List<String> votedUsers = new ArrayList<>();

    private String status = "PENDING";
    private LocalDateTime createdAt = LocalDateTime.now();
}