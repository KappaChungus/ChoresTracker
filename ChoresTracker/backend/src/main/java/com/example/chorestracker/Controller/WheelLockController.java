package com.example.chorestracker.Controller;

import com.example.chorestracker.Model.WheelGroup;
import com.example.chorestracker.Model.WheelLock;
import com.example.chorestracker.repository.IWheelGroupRepository;
import com.example.chorestracker.repository.IWheelLockRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/wheel-lock")
public class WheelLockController {

    @Autowired
    private IWheelLockRepository lockRepository;

    @Autowired
    private IWheelGroupRepository groupRepository; // Inject group repo to verify membership

    // Use the groupId dynamically instead of a global string
    private WheelLock getOrCreateLock(String groupId) {
        return lockRepository.findById(groupId).orElseGet(() -> {
            WheelLock newLock = new WheelLock();
            newLock.setId(groupId);
            return lockRepository.save(newLock);
        });
    }

    @GetMapping("/{groupId}")
    public ResponseEntity<?> getLockStatus(@PathVariable String groupId) {
        WheelLock lock = getOrCreateLock(groupId);
        long remaining = 0;
        boolean isCurrentlyLocked = false;

        if (lock.isLocked() && lock.getLockedUntil() != null) {
            remaining = Duration.between(LocalDateTime.now(), lock.getLockedUntil()).getSeconds();
            if (remaining > 0) {
                isCurrentlyLocked = true;
            } else {
                // Lock expired! Auto-unlock it.
                lock.setLocked(false);
                lock.setLockedBy(null);
                lock.setLockedUntil(null);
                lockRepository.save(lock);
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("isLocked", isCurrentlyLocked);
        response.put("lockedBy", lock.getLockedBy());
        response.put("remainingSeconds", Math.max(0, remaining));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{groupId}/acquire")
    public ResponseEntity<?> acquireLock(@PathVariable String groupId, @RequestBody Map<String, String> payload) {
        String username = payload.get("username");

        // 1. BOUNDARY CHECK: Ensure the group exists and the user is a member
        Optional<WheelGroup> groupOpt = groupRepository.findById(groupId);
        if (groupOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Group not found.");
        }

        WheelGroup group = groupOpt.get();
        boolean isMember = group.getMembers().stream()
                .anyMatch(m -> m.getUsername().equalsIgnoreCase(username));

        if (!isMember) {
            // Return 403 Forbidden if they are not in the group
            return ResponseEntity.status(403).body("You are not a member of this group.");
        }

        // 2. Fetch the lock specific to this group
        WheelLock lock = getOrCreateLock(groupId);

        // 3. Check if someone else already holds a valid lock for this group
        if (lock.isLocked() && lock.getLockedUntil() != null && lock.getLockedUntil().isAfter(LocalDateTime.now())) {
            long remainingMinutes = Duration.between(LocalDateTime.now(), lock.getLockedUntil()).toMinutes();
            long remainingSeconds = Duration.between(LocalDateTime.now(), lock.getLockedUntil()).getSeconds() % 60;

            String timeString = remainingMinutes > 0 ?
                    remainingMinutes + "m " + remainingSeconds + "s" :
                    remainingSeconds + "s";

            return ResponseEntity.status(409).body("Wheel was recently spun by " + lock.getLockedBy() + ". Unlocks in " + timeString + ".");
        }

        // 4. Grant the lock for 1 Hour
        lock.setLocked(true);
        lock.setLockedBy(username);
        lock.setLockedUntil(LocalDateTime.now().plusHours(1));

        return ResponseEntity.ok(lockRepository.save(lock));
    }

    @PostMapping("/{groupId}/release")
    public ResponseEntity<?> releaseLock(@PathVariable String groupId) {
        WheelLock lock = getOrCreateLock(groupId);
        lock.setLocked(false);
        lock.setLockedBy(null);
        lock.setLockedUntil(null);
        return ResponseEntity.ok(lockRepository.save(lock));
    }
}