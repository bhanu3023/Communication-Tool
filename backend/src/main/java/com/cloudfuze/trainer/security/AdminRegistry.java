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
 *   <li>{@code role == ADMIN} in the database — what the User Access screen manages, and the
 *       normal way admins are granted and removed.</li>
 *   <li>membership of the configured <strong>root</strong> email list — a permanent safety net
 *       so a bad role edit, a wiped volume, or a botched reseed can never leave nobody able to
 *       reach the screen that fixes it.</li>
 * </ol>
 *
 * The root list is deliberately kept to <strong>one</strong> address. It used to hold all three
 * admins, which meant no admin could ever remove another's access: the list grants admin
 * regardless of the stored role, so the only consistent thing to do was refuse the change. With
 * a single root, every other admin is an ordinary revocable ADMIN row, and the root account can
 * always recover the system. {@link #isRootAdmin} exists so callers can enforce that asymmetry.
 *
 * This bean replaced two hand-maintained copies of the email list (one in the controller, one in
 * the React sidebar, which had already drifted out of sync and hid the nav item from a real
 * admin). Keep it the only place the list is read.
 */
@Component
public class AdminRegistry {

    private final Set<String> rootAdminEmails;

    public AdminRegistry(@Value("${app.super-admin-emails:abhinav.surattu@cloudfuze.com}") String emails) {
        this.rootAdminEmails = Arrays.stream(emails.split(","))
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
        return user.getRole() == Role.ADMIN || isRootAdmin(user.getEmail());
    }

    /**
     * True for the root account — an admin who cannot be demoted, by anyone including
     * themselves. Every other admin can have their access removed on the User Access screen.
     */
    public boolean isRootAdmin(String email) {
        return email != null && rootAdminEmails.contains(email.trim().toLowerCase(Locale.ROOT));
    }
}
