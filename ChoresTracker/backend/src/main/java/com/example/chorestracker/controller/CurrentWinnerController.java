package com.example.chorestracker.controller;

import com.example.chorestracker.model.CurrentWinner;
import com.example.chorestracker.model.WheelGroup;
import com.example.chorestracker.repository.ICurrentWinnerRepository;
import com.example.chorestracker.repository.IWheelGroupRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/current-winner")
public class CurrentWinnerController {

    @Autowired
    private ICurrentWinnerRepository currentWinnerRepository;

    @Autowired
    private IWheelGroupRepository groupRepository; // <-- Added this

    @GetMapping("/{groupId}")
    public ResponseEntity<?> getCurrentWinner(@PathVariable String groupId) {
        Optional<CurrentWinner> winner = currentWinnerRepository.findByGroupId(groupId);

        if (winner.isPresent()) {
            return ResponseEntity.ok(winner.get());
        }

        return ResponseEntity.notFound().build();
    }

    @PostMapping("/{groupId}")
    public ResponseEntity<?> setCurrentWinner(@PathVariable String groupId, @RequestBody Map<String, String> payload) {
        String username = payload.get("username");

        if (username == null || username.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Username is required");
        }

        Optional<WheelGroup> groupOpt = groupRepository.findById(groupId);
        if (groupOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Group not found.");
        }

        boolean isMember = groupOpt.get().getMembers().stream()
                .anyMatch(m -> m.getUsername().equalsIgnoreCase(username));

        if (!isMember) {
            return ResponseEntity.status(403).body("User is not a member of this group.");
        }

        currentWinnerRepository.deleteByGroupId(groupId);

        CurrentWinner newWinner = new CurrentWinner();
        newWinner.setGroupId(groupId);
        newWinner.setUsername(username);
        newWinner.setWinTime(LocalDateTime.now());

        return ResponseEntity.ok(currentWinnerRepository.save(newWinner));
    }
}