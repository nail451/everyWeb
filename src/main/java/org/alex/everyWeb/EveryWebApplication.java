package org.alex.everyWeb;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = "org.alex.everyWeb")
@EntityScan(basePackages = "org.alex.everyWeb")
@EnableJpaRepositories(basePackages = "org.alex.everyWeb")
@EnableScheduling
public class EveryWebApplication {
	public static void main(String[] args) {
		SpringApplication.run(EveryWebApplication.class, args);
	}

}
