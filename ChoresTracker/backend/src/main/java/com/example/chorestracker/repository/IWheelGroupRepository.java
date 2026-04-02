package com.example.chorestracker.repository;

import com.example.chorestracker.Model.WheelGroup;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IWheelGroupRepository extends MongoRepository<WheelGroup, String> {
    Optional<WheelGroup> findByInviteCode(String inviteCode);
}