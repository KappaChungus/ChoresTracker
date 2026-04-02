package com.example.chorestracker.Model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import lombok.Data;

@Data
@Document(collection = "WheelData")
public class WheelItem {
    @Id
    private String id;

    @Field("itemname")
    private String name;

    @Field("occurrence")
    private Integer occurrences;

    private boolean active = true;
}