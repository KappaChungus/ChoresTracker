package com.example.chorestracker.Controller;

import com.example.chorestracker.Model.WheelLock;
import com.example.chorestracker.repository.IWheelLockRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/wheel-lock")
public class WheelLockController {

    @Autowired
    private IWheelLockRepository lockRepository;

    private WheelLock getOrCreateLock() {
        return lockRepository.findById("GLOBAL_LOCK").orElseGet(() -> {
            WheelLock newLock = new WheelLock();
            newLock.setId("GLOBAL_LOCK");
            return lockRepository.save(newLock);
        });
    }

    @GetMapping
    public ResponseEntity<?> getLockStatus() {
        WheelLock lock = getOrCreateLock();
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

    @PostMapping("/acquire")
    public ResponseEntity<?> acquireLock(@RequestBody Map<String, String> payload) {
        String username = payload.get("username");
        WheelLock lock = getOrCreateLock();

        // Check if someone else already holds a valid lock
        if (lock.isLocked() && lock.getLockedUntil() != null && lock.getLockedUntil().isAfter(LocalDateTime.now())) {
            long remainingMinutes = Duration.between(LocalDateTime.now(), lock.getLockedUntil()).toMinutes();
            long remainingSeconds = Duration.between(LocalDateTime.now(), lock.getLockedUntil()).getSeconds() % 60;

            String timeString = remainingMinutes > 0 ?
                    remainingMinutes + "m " + remainingSeconds + "s" :
                    remainingSeconds + "s";

            return ResponseEntity.status(409).body("Wheel was recently spun by " + lock.getLockedBy() + ". Unlocks in " + timeString + ".");
        }

        // Grant the lock for 1 Hour
        lock.setLocked(true);
        lock.setLockedBy(username);
        lock.setLockedUntil(LocalDateTime.now().plusHours(1));

        return ResponseEntity.ok(lockRepository.save(lock));
    }

    @PostMapping("/release")
    public ResponseEntity<?> releaseLock() {
        WheelLock lock = getOrCreateLock();
        lock.setLocked(false);
        lock.setLockedBy(null);
        lock.setLockedUntil(null);
        return ResponseEntity.ok(lockRepository.save(lock));
    }
}