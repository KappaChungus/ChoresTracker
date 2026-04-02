package com.example.chorestracker;

import com.example.chorestracker.Model.MemberStat;
import com.example.chorestracker.Model.WheelGroup;
import com.example.chorestracker.Model.WheelLock;
import com.example.chorestracker.Model.WinnerRequest;
import com.example.chorestracker.repository.IWheelGroupRepository;
import com.example.chorestracker.repository.IWheelLockRepository;
import com.example.chorestracker.repository.IWinnerRequestRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.data.mongo.DataMongoTest;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@DataMongoTest
public class DatabaseIntegrationTest {

    @Autowired
    private IWheelGroupRepository groupRepository;

    @Autowired
    private IWinnerRequestRepository requestRepository;

    @Autowired
    private IWheelLockRepository lockRepository;

    // Clean up the test database after each test runs so they don't interfere with each other
    @AfterEach
    void cleanUp() {
        groupRepository.deleteAll();
        requestRepository.deleteAll();
        lockRepository.deleteAll();
    }

    @Test
    void testCreateAndFindWheelGroup() {
        // 1. Arrange: Setup our new Group and Members
        WheelGroup group = new WheelGroup();
        group.setGroupName("The Cool Apartment");
        group.setInviteCode("ABCDEF");

        MemberStat member1 = new MemberStat();
        member1.setUsername("admin");
        member1.setOccurrences(5);

        MemberStat member2 = new MemberStat();
        member2.setUsername("roommate");
        member2.setOccurrences(2);

        group.getMembers().add(member1);
        group.getMembers().add(member2);

        // 2. Act: Save to DB and try to find it using our custom repository method
        groupRepository.save(group);
        Optional<WheelGroup> foundGroup = groupRepository.findByInviteCode("ABCDEF");

        // 3. Assert: Verify the database mapping worked perfectly
        assertTrue(foundGroup.isPresent(), "Group should be found by invite code");
        assertEquals("The Cool Apartment", foundGroup.get().getGroupName());
        assertEquals(2, foundGroup.get().getMembers().size(), "Group should have 2 members");
        assertEquals("admin", foundGroup.get().getMembers().get(0).getUsername());
        assertEquals(5, foundGroup.get().getMembers().get(0).getOccurrences());
    }

    @Test
    void testWinnerRequestWithGroupId() {
        // 1. Arrange
        WinnerRequest request = new WinnerRequest();
        request.setGroupId("group-123");
        request.setRequesterUsername("admin");
        request.setMessage("I'll do the dishes!");

        // 2. Act
        WinnerRequest savedRequest = requestRepository.save(request);

        // 3. Assert
        assertNotNull(savedRequest.getId(), "Database should generate an ID");
        assertEquals("group-123", savedRequest.getGroupId());
        assertEquals("PENDING", savedRequest.getStatus());
        assertEquals(0, savedRequest.getUpvotes());
    }

    @Test
    void testWheelLockWithGroupId() {
        // 1. Arrange: Now that we have groups, the ID should be the Group ID, not "GLOBAL_LOCK"
        WheelLock lock = new WheelLock();
        lock.setId("group-123-lock");
        lock.setLocked(true);
        lock.setLockedBy("admin");
        lock.setLockedUntil(LocalDateTime.now().plusHours(1));

        // 2. Act
        lockRepository.save(lock);
        Optional<WheelLock> foundLock = lockRepository.findById("group-123-lock");

        // 3. Assert
        assertTrue(foundLock.isPresent());
        assertTrue(foundLock.get().isLocked());
        assertEquals("admin", foundLock.get().getLockedBy());
    }
}