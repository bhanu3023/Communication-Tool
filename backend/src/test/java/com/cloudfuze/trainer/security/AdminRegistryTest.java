package com.cloudfuze.trainer.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AdminRegistryTest {

    @Test
    void defaultRootIsAbhinav() {
        AdminRegistry registry = new AdminRegistry("abhinav.surattu@cloudfuze.com");
        assertTrue(registry.isRootAdmin("Abhinav.surattu@cloudfuze.com"));
        assertFalse(registry.isRootAdmin("manmadha.jayamangala@cloudfuze.com"));
    }

    @Test
    void configuredRootEmailsAreHonored() {
        AdminRegistry registry = new AdminRegistry("root@test.com, other.root@test.com");
        assertTrue(registry.isRootAdmin("root@test.com"));
        assertTrue(registry.isRootAdmin("other.root@test.com"));
    }
}
