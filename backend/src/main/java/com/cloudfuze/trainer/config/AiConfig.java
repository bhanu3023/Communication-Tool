package com.cloudfuze.trainer.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Configuration
public class AiConfig {

    /**
     * Thread pool for fanning out per-item AI scoring calls (e.g. the 10 speaking
     * sentences) concurrently instead of sequentially, so submission is fast.
     */
    @Bean(destroyMethod = "shutdown")
    public ExecutorService aiExecutor() {
        return Executors.newFixedThreadPool(12);
    }
}
