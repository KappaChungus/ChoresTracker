package com.example.chorestracker.repository;


import com.example.chorestracker.model.WinnerRequest;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface IWinnerRequestRepository extends MongoRepository<WinnerRequest, String> {
    List<WinnerRequest> findByGroupId(String groupId);
}