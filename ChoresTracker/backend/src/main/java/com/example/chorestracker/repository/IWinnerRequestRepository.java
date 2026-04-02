package com.example.chorestracker.repository;


import com.example.chorestracker.model.WinnerRequest;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IWinnerRequestRepository extends MongoRepository<WinnerRequest, String> {
}