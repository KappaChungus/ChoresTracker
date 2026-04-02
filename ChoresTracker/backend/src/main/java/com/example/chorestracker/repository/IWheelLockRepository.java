package com.example.chorestracker.repository;

import com.example.chorestracker.Model.WheelLock;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IWheelLockRepository extends MongoRepository<WheelLock, String> {
}