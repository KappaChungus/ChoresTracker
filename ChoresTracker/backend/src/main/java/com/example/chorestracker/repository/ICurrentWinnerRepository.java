package com.example.chorestracker.repository;

import com.example.chorestracker.model.CurrentWinner;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ICurrentWinnerRepository extends MongoRepository<CurrentWinner, String> {
    Optional<CurrentWinner> findByGroupId(String groupId);
    void deleteByGroupId(String groupId);
}