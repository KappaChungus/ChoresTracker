package com.example.chorestracker.Controller;

import com.example.chorestracker.Model.CurrentWinner;
import com.example.chorestracker.Model.WheelItem;
import com.example.chorestracker.Model.WinnerRequest;
import com.example.chorestracker.repository.ICurrentWinnerRepository;
import com.example.chorestracker.repository.IUserRepository;
import com.example.chorestracker.repository.IWheelRepository;
import com.example.chorestracker.repository.IWinnerRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/requests")
public class WinnerRequestController {

    @Autowired private IWinnerRequestRepository requestRepository;
    @Autowired private IUserRepository userRepository;
    @Autowired private IWheelRepository wheelRepository;
    @Autowired private ICurrentWinnerRepository currentWinnerRepository;

    // Get all requests (Sorted by newest first could be done on frontend)
    @GetMapping
    public List<WinnerRequest> getAllRequests() {
        return requestRepository.findAll();
    }

    // Create a new request
    @PostMapping
    public ResponseEntity<?> createRequest(@RequestBody WinnerRequest request) {

        // BOUNDARY 1: Check if user already has a pending request
        boolean hasPending = requestRepository.findAll().stream()
                .anyMatch(r -> "PENDING".equals(r.getStatus()) && r.getRequesterUsername().equals(request.getRequesterUsername()));

        if (hasPending) {
            return ResponseEntity.badRequest().body("You already have a pending request.");
        }

        // BOUNDARY 2 & 3 COMBINED: Fetch the item and ensure it belongs to the requester
        Optional<WheelItem> wheelItemOpt = wheelRepository.findById(request.getWheelItemId());
        if (wheelItemOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("This account is not on the wheel.");
        }

        // If the name on the wheel doesn't perfectly match the logged-in username, block it!
        if (!wheelItemOpt.get().getName().equalsIgnoreCase(request.getRequesterUsername())) {
            return ResponseEntity.badRequest().body("You can only request yourself as the winner.");
        }

        request.setCreatedAt(LocalDateTime.now());
        request.setStatus("PENDING");
        request.setUpvotes(1); // Auto-upvote their own request
        request.getVotedUsers().add(request.getRequesterUsername());

        return ResponseEntity.ok(requestRepository.save(request));
    }

    // Cast a vote
    @PostMapping("/{id}/vote")
    public ResponseEntity<?> vote(@PathVariable String id, @RequestBody Map<String, String> payload) {
        String username = payload.get("username");
        String voteType = payload.get("voteType"); // "UP" or "DOWN"

        Optional<WinnerRequest> reqOpt = requestRepository.findById(id);
        if (reqOpt.isEmpty()) return ResponseEntity.notFound().build();

        WinnerRequest request = reqOpt.get();

        // 1. Validate request state and user
        if (!request.getStatus().equals("PENDING")) {
            return ResponseEntity.badRequest().body("This request is already closed.");
        }
        if (request.getVotedUsers().contains(username)) {
            return ResponseEntity.badRequest().body("User has already voted.");
        }

        // 2. Register the vote
        request.getVotedUsers().add(username);
        if ("UP".equals(voteType)) request.setUpvotes(request.getUpvotes() + 1);
        else if ("DOWN".equals(voteType)) request.setDownvotes(request.getDownvotes() + 1);

        // 3. Evaluate 50% logic
        long totalUsers = userRepository.count();
        double threshold = totalUsers / 2.0; // 50% of total registered users

        if (request.getUpvotes() >= threshold) {
            request.setStatus("APPROVED");

            // --- AUTOMATIC WINNER ASSIGNMENT ---
            // A. Increment Occurrences (points)
            Optional<WheelItem> itemOpt = wheelRepository.findById(request.getWheelItemId());
            if (itemOpt.isPresent()) {
                WheelItem item = itemOpt.get();
                item.setOccurrences(item.getOccurrences() + 2);
                wheelRepository.save(item);
            }

            // B. Set as Current Winner
            currentWinnerRepository.deleteAll();
            CurrentWinner newWinner = new CurrentWinner();
            newWinner.setWheelItemId(request.getWheelItemId());
            newWinner.setWinTime(LocalDateTime.now());
            currentWinnerRepository.save(newWinner);

        } else if (request.getDownvotes() > threshold) {
            // If downvotes cross the 50% threshold, it's impossible to recover
            request.setStatus("REJECTED");
        }

        return ResponseEntity.ok(requestRepository.save(request));
    }
}