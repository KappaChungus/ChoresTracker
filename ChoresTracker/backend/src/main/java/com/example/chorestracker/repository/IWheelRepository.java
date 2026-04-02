package com.example.chorestracker.repository;

import com.example.chorestracker.Model.WheelItem;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IWheelRepository extends MongoRepository<WheelItem, String> {
}