package com.example.chorestracker.Controller;

import com.example.chorestracker.Model.CurrentWinner;
import com.example.chorestracker.repository.ICurrentWinnerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/current-winner")
public class CurrentWinnerController {

    @Autowired
    private ICurrentWinnerRepository currentWinnerRepository;

    @GetMapping
    public ResponseEntity<CurrentWinner> getCurrentWinner() {
        List<CurrentWinner> winners = currentWinnerRepository.findAll();
        if (winners.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(winners.get(0));
    }

    @PostMapping("/{wheelItemId}")
    public ResponseEntity<CurrentWinner> setCurrentWinner(@PathVariable String wheelItemId) {
        currentWinnerRepository.deleteAll();

        CurrentWinner newWinner = new CurrentWinner();
        newWinner.setWheelItemId(wheelItemId);
        newWinner.setWinTime(LocalDateTime.now());

        CurrentWinner savedWinner = currentWinnerRepository.save(newWinner);
        return ResponseEntity.ok(savedWinner);
    }
}