package com.example.chorestracker.Controller;

import com.example.chorestracker.Model.MemberStat;
import com.example.chorestracker.Model.WheelGroup;
import com.example.chorestracker.repository.IWheelGroupRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/groups")
public class WheelController {

    @Autowired
    private IWheelGroupRepository groupRepository;

    // 1. Create a new group
    @PostMapping
    public ResponseEntity<?> createGroup(@RequestBody Map<String, String> payload) {
        String groupName = payload.get("groupName");
        String username = payload.get("username");

        WheelGroup group = new WheelGroup();
        group.setGroupName(groupName);

        // Generate a 6-character uppercase invite code (e.g., "A8F9B2")
        String inviteCode = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        group.setInviteCode(inviteCode);

        // Add the creator as the first active member
        MemberStat creator = new MemberStat();
        creator.setUsername(username);
        creator.setOccurrences(0);
        creator.setActive(true);

        group.getMembers().add(creator);

        return ResponseEntity.ok(groupRepository.save(group));
    }

    // 2. Join an existing group using an invite code
    @PostMapping("/join")
    public ResponseEntity<?> joinGroup(@RequestBody Map<String, String> payload) {
        String inviteCode = payload.get("inviteCode");
        String username = payload.get("username");

        Optional<WheelGroup> groupOpt = groupRepository.findByInviteCode(inviteCode);
        if (groupOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Invalid invite code.");
        }

        WheelGroup group = groupOpt.get();

        // Check if user is already in the group
        boolean alreadyMember = group.getMembers().stream()
                .anyMatch(m -> m.getUsername().equalsIgnoreCase(username));

        if (alreadyMember) {
            return ResponseEntity.badRequest().body("You are already in this group.");
        }

        // Add the new user to the group
        MemberStat newMember = new MemberStat();
        newMember.setUsername(username);
        newMember.setOccurrences(0);
        newMember.setActive(true);

        group.getMembers().add(newMember);

        return ResponseEntity.ok(groupRepository.save(group));
    }

    // 3. Get a specific group's data (Replaces the old GET /api/wheel-items)
    @GetMapping("/{groupId}")
    public ResponseEntity<?> getGroup(@PathVariable String groupId) {
        Optional<WheelGroup> groupOpt = groupRepository.findById(groupId);
        if (groupOpt.isPresent()) {
            return ResponseEntity.ok(groupOpt.get());
        }
        return ResponseEntity.notFound().build();
    }

    // 4. Bulk update a group's members (e.g., toggling active status from the frontend)
    @PutMapping("/{groupId}/members")
    public ResponseEntity<?> updateMembers(@PathVariable String groupId, @RequestBody List<MemberStat> updatedMembers) {
        Optional<WheelGroup> groupOpt = groupRepository.findById(groupId);
        if (groupOpt.isPresent()) {
            WheelGroup group = groupOpt.get();
            group.setMembers(updatedMembers);
            return ResponseEntity.ok(groupRepository.save(group));
        }
        return ResponseEntity.notFound().build();
    }

    // 5. Increment occurrences for a specific user after they win a spin
    @PutMapping("/{groupId}/members/{username}/increment")
    public ResponseEntity<?> incrementOccurrence(@PathVariable String groupId, @PathVariable String username) {
        Optional<WheelGroup> groupOpt = groupRepository.findById(groupId);

        if (groupOpt.isPresent()) {
            WheelGroup group = groupOpt.get();

            // Find the specific member in the list and increment their score
            boolean updated = false;
            for (MemberStat member : group.getMembers()) {
                if (member.getUsername().equalsIgnoreCase(username)) {
                    member.setOccurrences(member.getOccurrences() + 1);
                    updated = true;
                    break;
                }
            }

            if (updated) {
                return ResponseEntity.ok(groupRepository.save(group));
            } else {
                return ResponseEntity.badRequest().body("User not found in this group.");
            }
        }
        return ResponseEntity.notFound().build();
    }

    // 6. Get all groups for a specific user
    @GetMapping("/user/{username}")
    public ResponseEntity<?> getUserGroups(@PathVariable String username) {
        List<WheelGroup> userGroups = groupRepository.findAll().stream()
                .filter(g -> g.getMembers().stream().anyMatch(m -> m.getUsername().equalsIgnoreCase(username)))
                .toList();
        return ResponseEntity.ok(userGroups);
    }
}