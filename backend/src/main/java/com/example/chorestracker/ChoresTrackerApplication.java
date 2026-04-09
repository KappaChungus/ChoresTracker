package com.example.chorestracker;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ChoresTrackerApplication {

	public static void main(String[] args) {
		SpringApplication.run(ChoresTrackerApplication.class, args);
	}

}
