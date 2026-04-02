package com.example.chorestracker.Controller;

import com.example.chorestracker.Model.CurrentWinner;
import com.example.chorestracker.Model.MemberStat;
import com.example.chorestracker.Model.WheelGroup;
import com.example.chorestracker.Model.WinnerRequest;
import com.example.chorestracker.repository.ICurrentWinnerRepository;
import com.example.chorestracker.repository.IWheelGroupRepository;
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
    @Autowired private IWheelGroupRepository wheelGroupRepository;
    @Autowired private ICurrentWinnerRepository currentWinnerRepository;

    // Get all requests FOR A SPECIFIC GROUP
    @GetMapping("/group/{groupId}")
    public List<WinnerRequest> getRequestsByGroup(@PathVariable String groupId) {
        return requestRepository.findAll().stream()
                .filter(r -> groupId.equals(r.getGroupId()))
                .toList();
    }

    // Create a new request
    @PostMapping
    public ResponseEntity<?> createRequest(@RequestBody WinnerRequest request) {

        if (request.getGroupId() == null || request.getRequesterUsername() == null) {
            return ResponseEntity.badRequest().body("Group ID and Username are required.");
        }

        // BOUNDARY 1: Check if user already has a pending request in THIS group
        boolean hasPending = requestRepository.findAll().stream()
                .anyMatch(r -> "PENDING".equals(r.getStatus())
                        && r.getRequesterUsername().equalsIgnoreCase(request.getRequesterUsername())
                        && request.getGroupId().equals(r.getGroupId()));

        if (hasPending) {
            return ResponseEntity.badRequest().body("You already have a pending request.");
        }

        // BOUNDARY 2: Ensure the group exists
        Optional<WheelGroup> groupOpt = wheelGroupRepository.findById(request.getGroupId());
        if (groupOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Group not found.");
        }

        WheelGroup group = groupOpt.get();

        // BOUNDARY 3: Ensure the requester is actually a member of the group!
        boolean isMember = group.getMembers().stream()
                .anyMatch(m -> m.getUsername().equalsIgnoreCase(request.getRequesterUsername()));

        if (!isMember) {
            return ResponseEntity.badRequest().body("You are not a member of this group.");
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

        // 1. Validate request state
        if (!request.getStatus().equals("PENDING")) {
            return ResponseEntity.badRequest().body("This request is already closed.");
        }
        if (request.getVotedUsers().contains(username)) {
            return ResponseEntity.badRequest().body("User has already voted.");
        }

        // 2. Fetch the group and validate the voter is a member
        Optional<WheelGroup> groupOpt = wheelGroupRepository.findById(request.getGroupId());
        if (groupOpt.isEmpty()) return ResponseEntity.badRequest().body("Associated group not found.");
        WheelGroup group = groupOpt.get();

        boolean isVoterMember = group.getMembers().stream()
                .anyMatch(m -> m.getUsername().equalsIgnoreCase(username));
        if (!isVoterMember) {
            return ResponseEntity.badRequest().body("Only members of this group can vote.");
        }

        // 3. Register the vote
        request.getVotedUsers().add(username);
        if ("UP".equals(voteType)) request.setUpvotes(request.getUpvotes() + 1);
        else if ("DOWN".equals(voteType)) request.setDownvotes(request.getDownvotes() + 1);

        // 4. Evaluate 50% logic based on GROUP size, not total global users!
        long totalGroupMembers = group.getMembers().size();
        double threshold = totalGroupMembers / 2.0;

        if (request.getUpvotes() >= threshold) {
            request.setStatus("APPROVED");

            // --- AUTOMATIC WINNER ASSIGNMENT ---
            // A. Increment Occurrences (points) for the winner in the group
            for (MemberStat member : group.getMembers()) {
                if (member.getUsername().equalsIgnoreCase(request.getRequesterUsername())) {
                    member.setOccurrences(member.getOccurrences() + 2);
                    break;
                }
            }
            wheelGroupRepository.save(group); // Save the updated occurrences

            // B. Clear the old winner FOR THIS SPECIFIC GROUP only
            List<CurrentWinner> oldWinners = currentWinnerRepository.findAll().stream()
                    .filter(cw -> request.getGroupId().equals(cw.getGroupId()))
                    .toList();
            currentWinnerRepository.deleteAll(oldWinners);

            // C. Set the new winner
            CurrentWinner newWinner = new CurrentWinner();
            newWinner.setGroupId(request.getGroupId());
            newWinner.setUsername(request.getRequesterUsername());
            newWinner.setWinTime(LocalDateTime.now());
            currentWinnerRepository.save(newWinner);

        } else if (request.getDownvotes() > threshold) {
            // If downvotes cross the 50% threshold, it's impossible to recover
            request.setStatus("REJECTED");
        }

        return ResponseEntity.ok(requestRepository.save(request));
    }
}