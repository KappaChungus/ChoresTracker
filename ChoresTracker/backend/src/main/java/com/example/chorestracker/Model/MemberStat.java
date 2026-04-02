package com.example.chorestracker.Model;

import lombok.Data;

@Data
public class MemberStat {
    private String username;
    private int occurrences = 0;
    private boolean active = true;
}