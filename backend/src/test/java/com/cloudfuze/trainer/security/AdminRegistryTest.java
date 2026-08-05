package com.cloudfuze.trainer.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class AdminRegistryTest {

    @Test
    void defaultBootstrapListAlwaysIncludesManmadha() {
        AdminRegistry registry = new AdminRegistry("");
        assertTrue(registry.isBootstrapAdmin("Manmadha.jayamangala@cloudfuze.com"));
    }

    @Test
    void configuredEmailsMergeWithDefaults() {
        AdminRegistry registry = new AdminRegistry("other.admin@cloudfuze.com");
        assertTrue(registry.isBootstrapAdmin("manmadha.jayamangala@cloudfuze.com"));
        assertTrue(registry.isBootstrapAdmin("other.admin@cloudfuze.com"));
    }
}
