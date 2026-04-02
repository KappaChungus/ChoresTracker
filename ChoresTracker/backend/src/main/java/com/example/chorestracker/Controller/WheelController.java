package com.example.chorestracker.Controller;

import com.example.chorestracker.Model.WheelItem;
import com.example.chorestracker.repository.IWheelRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/wheel-items")
public class WheelController {

    @Autowired
    private IWheelRepository repository;

    // GET /api/wheel-items
    @GetMapping
    public List<WheelItem> getAllItems() {
        return repository.findAll();
    }

    // PUT /api/wheel-items (Bulk Update)
    @PutMapping
    public String updateAllItems(@RequestBody List<WheelItem> items) {
        repository.saveAll(items);
        return "All items updated successfully";
    }

    @PutMapping("/{id}/increment")
    public ResponseEntity<WheelItem> incrementOccurrence(@PathVariable String id) {
        Optional<WheelItem> itemOptional = repository.findById(id);
        if (itemOptional.isPresent()) {
            WheelItem item = itemOptional.get();
            item.setOccurrences(item.getOccurrences() + 1);
            WheelItem updatedItem = repository.save(item);
            return ResponseEntity.ok(updatedItem);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}