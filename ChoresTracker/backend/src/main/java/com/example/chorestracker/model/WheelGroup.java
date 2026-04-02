package com.example.chorestracker.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
@Document(collection = "WheelGroups")
public class WheelGroup {
    @Id
    private String id;

    private String groupName; // e.g., "The Cool Apartment"
    private String inviteCode; // A 6-digit code for others to join

    private List<MemberStat> members = new ArrayList<>();
}