package com.cloudfuze.trainer.security;

import com.cloudfuze.trainer.domain.Role;
import com.cloudfuze.trainer.entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * The single answer to "is this user an admin?".
 *
 * Admin rights come from EITHER source:
 * <ol>
 *   <li>{@code role == ADMIN} in the database — what the User Access screen manages, and
 *       the normal way admins are granted now.</li>
 *   <li>membership of the configured bootstrap email list — a permanent safety net so a bad
 *       role edit, a wiped volume, or a botched reseed can never leave nobody able to reach
 *       the screen that fixes it.</li>
 * </ol>
 *
 * Default bootstrap emails are ALWAYS included, then any {@code app.super-admin-emails}
 * entries are merged in — an empty or partial env override must never drop the built-in list.
 */
@Component
public class AdminRegistry {

    private static final String DEFAULT_BOOTSTRAP =
            "abhinav.surattu@cloudfuze.com,bhanu.srikakulam@cloudfuze.com,manmadha.jayamangala@cloudfuze.com";

    private final Set<String> bootstrapAdminEmails;

    public AdminRegistry(@Value("${app.super-admin-emails:}") String configured) {
        Set<String> emails = new LinkedHashSet<>();
        parseEmails(DEFAULT_BOOTSTRAP, emails);
        if (StringUtils.hasText(configured)) {
            parseEmails(configured, emails);
        }
        this.bootstrapAdminEmails = Set.copyOf(emails);
    }

    private static void parseEmails(String raw, Set<String> into) {
        Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> s.toLowerCase(Locale.ROOT))
                .forEach(into::add);
    }

    /** True when the user administers the app, from either source above. */
    public boolean isAdmin(User user) {
        if (user == null) {
            return false;
        }
        return user.getRole() == Role.ADMIN || isBootstrapAdmin(user.getEmail());
    }

    /** True for an email on the configured list — an admin who cannot be demoted away. */
    public boolean isBootstrapAdmin(String email) {
        return email != null && bootstrapAdminEmails.contains(email.trim().toLowerCase(Locale.ROOT));
    }

    /** For tests and diagnostics — never log in production callers. */
    Set<String> bootstrapEmails() {
        return bootstrapAdminEmails;
    }
}
