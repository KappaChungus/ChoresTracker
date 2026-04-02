package com.example.chorestracker.repository;

import com.example.chorestracker.Model.CurrentWinner;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ICurrentWinnerRepository extends MongoRepository<CurrentWinner, String> {
}