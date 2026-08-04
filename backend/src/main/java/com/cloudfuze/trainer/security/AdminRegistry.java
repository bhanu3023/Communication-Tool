package com.cloudfuze.trainer.security;

import com.cloudfuze.trainer.domain.Role;
import com.cloudfuze.trainer.entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;
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
 * Because the list keeps granting admin regardless of the stored role, a listed email must
 * stay on ADMIN in the database — otherwise the row would contradict their real access.
 * {@link #isBootstrapAdmin} exists so callers can enforce that.
 *
 * This bean replaced two hand-maintained copies of the email list (one in the controller,
 * one in the React sidebar, which had already drifted out of sync and hid the nav item from
 * a real admin). Keep it the only place the list is read.
 */
@Component
public class AdminRegistry {

    private final Set<String> bootstrapAdminEmails;

    public AdminRegistry(
            @Value("${app.super-admin-emails:abhinav.surattu@cloudfuze.com,"
                    + "bhanu.srikakulam@cloudfuze.com,manmadha.jayamangala@cloudfuze.com}")
            String emails) {
        this.bootstrapAdminEmails = Arrays.stream(emails.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> s.toLowerCase(Locale.ROOT))
                .collect(Collectors.toUnmodifiableSet());
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
}
