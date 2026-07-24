package com.cloudfuze.trainer.service;

import com.cloudfuze.trainer.domain.Role;
import com.cloudfuze.trainer.domain.Section;
import com.cloudfuze.trainer.dto.dashboard.DashboardDtos;
import com.cloudfuze.trainer.dto.manager.ManagerDtos;
import com.cloudfuze.trainer.entity.User;
import com.cloudfuze.trainer.exception.ApiException;
import com.cloudfuze.trainer.exception.ResourceNotFoundException;
import com.cloudfuze.trainer.repository.ProctorEventRepository;
import com.cloudfuze.trainer.repository.UserRepository;
import com.cloudfuze.trainer.service.ai.AiService;
import com.cloudfuze.trainer.service.ai.OverallFeedback;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/** Team overview and per-employee, per-section detail for managers. */
@Service
@Transactional(readOnly = true)
public class ManagerService {

    private static final DateTimeFormatter DATE_TIME =
            DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm").withZone(ZoneId.systemDefault());

    private final UserRepository userRepository;
    private final ProctorEventRepository proctorEventRepository;
    private final DashboardService dashboardService;
    private final AiService aiService;

    public ManagerService(UserRepository userRepository, ProctorEventRepository proctorEventRepository,
                          DashboardService dashboardService, AiService aiService) {
        this.userRepository = userRepository;
        this.proctorEventRepository = proctorEventRepository;
        this.dashboardService = dashboardService;
        this.aiService = aiService;
    }

    public List<ManagerDtos.TeamRow> team(User manager, String search, String team, String department) {
        return userRepository.findByRole(Role.EMPLOYEE).stream()
                .filter(e -> matches(e, search, team, department))
                .map(this::toRow)
                .toList();
    }

    /** All current managers (for the admin "Manager Access" screen). */
    public List<ManagerDtos.ManagerRow> managers() {
        return userRepository.findByRole(Role.MANAGER).stream()
                .map(u -> new ManagerDtos.ManagerRow(u.getId(), u.getName(), u.getEmail()))
                .toList();
    }

    /**
     * Grant manager access to the user with the given email. If the user already
     * exists they are promoted to MANAGER; otherwise a manager account is created so
     * the role is in place before their first Microsoft login.
     */
    @Transactional
    public void grantManager(String email) {
        String normalized = email == null ? "" : email.trim();
        if (normalized.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email is required");
        }
        User user = userRepository.findByEmailIgnoreCase(normalized).orElseGet(() -> {
            User u = new User();
            u.setEmail(normalized);
            u.setName(nameFromEmail(normalized));
            u.setEmployeeId("MGR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT));
            return u;
        });
        user.setRole(Role.MANAGER);
        user.setManager(null); // managers sit at the top of the hierarchy
        userRepository.save(user);
    }

    /** Derive a display name from an email local-part, e.g. "bhanu.srikakulam" -> "Bhanu Srikakulam". */
    private String nameFromEmail(String email) {
        String local = email.contains("@") ? email.substring(0, email.indexOf('@')) : email;
        String[] parts = local.split("[._-]+");
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (p.isBlank()) continue;
            if (sb.length() > 0) sb.append(' ');
            sb.append(Character.toUpperCase(p.charAt(0))).append(p.substring(1));
        }
        return sb.length() == 0 ? email : sb.toString();
    }

    private Map<String, DashboardDtos.SectionCard> cardsBySection(User employee) {
        return dashboardService.sectionCards(employee).stream()
                .collect(Collectors.toMap(DashboardDtos.SectionCard::section, c -> c));
    }

    private ManagerDtos.TeamRow toRow(User e) {
        Map<String, DashboardDtos.SectionCard> cards = cardsBySection(e);
        DashboardDtos.SectionCard l = cards.get("LISTENING");
        DashboardDtos.SectionCard s = cards.get("SPEAKING");
        DashboardDtos.SectionCard w = cards.get("WRITING");
        boolean requestPending = cards.values().stream().anyMatch(DashboardDtos.SectionCard::requestPending);
        int warnings = proctorEventRepository.findBySession_User_IdOrderByCreatedAtDesc(e.getId()).size();
        return new ManagerDtos.TeamRow(
                e.getId(), e.getName(), e.getEmail(),
                e.getDepartment() != null ? e.getDepartment().getName() : null,
                e.getTeam() != null ? e.getTeam().getName() : null,
                l.latestScore(), s.latestScore(), w.latestScore(),
                l.attemptsUsed(), s.attemptsUsed(), w.attemptsUsed(),
                requestPending, warnings);
    }

    public ManagerDtos.EmployeeDetail employeeDetail(User manager, Long employeeId) {
        User employee = userRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + employeeId));

        List<DashboardDtos.SectionCard> sections = dashboardService.sectionCards(employee);

        List<ManagerDtos.WarningRow> warnings = proctorEventRepository
                .findBySession_User_IdOrderByCreatedAtDesc(employeeId).stream()
                .map(ev -> new ManagerDtos.WarningRow(
                        ev.getSession().getAttemptNumber(),
                        ev.getSession().getSection() != null ? ev.getSession().getSection().name() : "—",
                        DATE_TIME.format(ev.getCreatedAt()), ev.getReason()))
                .toList();

        Double latestL = sections.stream().filter(c -> c.section().equals("LISTENING")).findFirst().map(DashboardDtos.SectionCard::latestScore).orElse(null);
        Double latestS = sections.stream().filter(c -> c.section().equals("SPEAKING")).findFirst().map(DashboardDtos.SectionCard::latestScore).orElse(null);
        Double latestW = sections.stream().filter(c -> c.section().equals("WRITING")).findFirst().map(DashboardDtos.SectionCard::latestScore).orElse(null);
        OverallFeedback fb = aiService.buildOverall(latestL, latestS, latestW);

        return new ManagerDtos.EmployeeDetail(
                employee.getId(), employee.getName(), employee.getEmail(), employee.getEmployeeId(),
                employee.getDepartment() != null ? employee.getDepartment().getName() : null,
                employee.getTeam() != null ? employee.getTeam().getName() : null,
                employee.getManager() != null ? employee.getManager().getName() : null,
                sections, warnings,
                new DashboardDtos.AiFeedback(fb.strengths(), fb.weaknesses(), fb.suggestions()),
                new ArrayList<>(fb.suggestions()));
    }

    private boolean matches(User e, String search, String team, String department) {
        if (StringUtils.hasText(search)) {
            String q = search.toLowerCase();
            if (!(e.getName().toLowerCase().contains(q) || e.getEmail().toLowerCase().contains(q))) return false;
        }
        if (StringUtils.hasText(team)) {
            if (e.getTeam() == null || !e.getTeam().getName().equalsIgnoreCase(team)) return false;
        }
        if (StringUtils.hasText(department)) {
            if (e.getDepartment() == null || !e.getDepartment().getName().equalsIgnoreCase(department)) return false;
        }
        return true;
    }
}
