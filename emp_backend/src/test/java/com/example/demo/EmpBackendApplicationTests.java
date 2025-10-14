package com.example.demo;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")  // Use test profile
class EmpBackendApplicationTests {

    @Test
    void contextLoads() {
        // This test just checks if Spring context loads
    }
}
