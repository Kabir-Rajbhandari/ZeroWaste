package com.zerowaste.zerowaste;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ZerowasteApplication {

    public static void main(String[] args) {
        SpringApplication.run(ZerowasteApplication.class, args);
    }

}
