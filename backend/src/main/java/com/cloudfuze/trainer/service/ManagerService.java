package com.cloudfuze.trainer.service;

import com.cloudfuze.trainer.domain.Role;
import com.cloudfuze.trainer.domain.Section;
import com.cloudfuze.trainer.dto.dashboard.DashboardDtos;
import com.cloudfuze.trainer.dto.manager.ManagerDtos;
import com.cloudfuze.trainer.entity.AssessmentSession;
import com.cloudfuze.trainer.entity.SectionAttemptControl;
import com.cloudfuze.trainer.entity.Team;
import com.cloudfuze.trainer.entity.User;
import com.cloudfuze.trainer.exception.ApiException;
import com.cloudfuze.trainer.exception.ResourceNotFoundException;
import com.cloudfuze.trainer.repository.AssessmentSessionRepository;
import com.cloudfuze.trainer.repository.DepartmentRepository;
import com.cloudfuze.trainer.repository.ProctorEventRepository;
import com.cloudfuze.trainer.repository.SectionAttemptControlRepository;
import com.cloudfuze.trainer.repository.TeamRepository;
import com.cloudfuze.trainer.repository.UserRepository;
import com.cloudfuze.trainer.security.AdminRegistry;
import com.cloudfuze.trainer.service.ai.AiService;
import com.cloudfuze.trainer.service.ai.OverallFeedback;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/** Team overview and per-employee, per-section detail for managers. */
@Service
@Transactional(readOnly = true)
public class ManagerService {

    private static final DateTimeFormatter DATE_TIME =
            DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm").withZone(ZoneId.systemDefault());

    /** Department a newly created team is filed under (the only one that exists today). */
    private static final String DEFAULT_DEPARTMENT = "Migration";

    private final UserRepository userRepository;
    private final ProctorEventRepository proctorEventRepository;
    private final DashboardService dashboardService;
    private final AiService aiService;
    private final TeamRepository teamRepository;
    private final AttemptPolicy attemptPolicy;
    private final AssessmentSessionRepository sessionRepository;
    private final SectionAttemptControlRepository sectionControlRepository;
    private final DepartmentRepository departmentRepository;
    private final AuditService auditService;
    private final AdminRegistry adminRegistry;

    public ManagerService(UserRepository userRepository, ProctorEventRepository proctorEventRepository,
                          DashboardService dashboardService, AiService aiService,
                          TeamRepository teamRepository, AttemptPolicy attemptPolicy,
                          AssessmentSessionRepository sessionRepository,
                          SectionAttemptControlRepository sectionControlRepository,
                          DepartmentRepository departmentRepository, AuditService auditService,
                          AdminRegistry adminRegistry) {
        this.userRepository = userRepository;
        this.proctorEventRepository = proctorEventRepository;
        this.dashboardService = dashboardService;
        this.aiService = aiService;
        this.teamRepository = teamRepository;
        this.attemptPolicy = attemptPolicy;
        this.sessionRepository = sessionRepository;
        this.sectionControlRepository = sectionControlRepository;
        this.departmentRepository = departmentRepository;
        this.auditService = auditService;
        this.adminRegistry = adminRegistry;
    }

    /** Distinct team names for the Team Overview filter dropdown, alphabetically sorted. */
    public List<String> teamNames() {
        return teamRepository.findAll().stream()
                .map(com.cloudfuze.trainer.entity.Team::getName)
                .filter(StringUtils::hasText)
                .distinct()
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .toList();
    }

    public List<ManagerDtos.TeamRow> team(User manager, String search, String team, String department) {
        return team(manager, search, team, department, AttemptPolicy.LEVEL_ONE);
    }

    /**
     * The team table at one level. Level 1 and Level 2 are reported separately — mixing
     * them in one row would average two different pass marks and two different attempt
     * allowances into a number that means nothing.
     */
    public List<ManagerDtos.TeamRow> team(User manager, String search, String team, String department, int level) {
        AttemptPolicy.requireValidLevel(level);
        List<User> employees = userRepository.findByRoleWithTeamAndDepartment(Role.EMPLOYEE).stream()
                .filter(e -> matches(e, search, team, department))
                .toList();
        if (employees.isEmpty()) {
            return List.of();
        }

        // Everything the table needs, in a fixed FIVE queries regardless of team size.
        // Building each row independently meant ~10 queries per employee plus one per
        // proctor event, so a 20-person team cost several hundred round-trips.
        List<Long> ids = employees.stream().map(User::getId).toList();

        Map<Long, Map<Section, List<AssessmentSession>>> attempts =
                sessionRepository.findCompletedByUsersAndLevel(ids, level).stream()
                        .filter(s -> s.getSection() != null)
                        .collect(Collectors.groupingBy(s -> s.getUser().getId(),
                                Collectors.groupingBy(AssessmentSession::getSection)));

        Set<String> pending = sectionControlRepository.findByUserIdInAndLevel(ids, level).stream()
                .filter(SectionAttemptControl::isRequestPending)
                .map(c -> c.getUser().getId() + "#" + c.getSection())
                .collect(Collectors.toSet());

        Map<Long, Integer> warnings = new HashMap<>();
        for (Object[] row : proctorEventRepository.countByLevelGroupedByUser(level)) {
            warnings.put((Long) row[0], ((Number) row[1]).intValue());
        }

        Set<Long> level2Open = level2UnlockedFor(ids);

        return employees.stream()
                .map(e -> row(e, level, attempts.getOrDefault(e.getId(), Map.of()),
                        pending, warnings.getOrDefault(e.getId(), 0), level2Open.contains(e.getId())))
                .toList();
    }

    /**
     * Which of these users have Level 2 open — i.e. passed all three Level 1 sections.
     * One aggregate for the whole team; asking {@code AttemptPolicy} per user would run
     * three best-score queries each.
     */
    private Set<Long> level2UnlockedFor(List<Long> userIds) {
        Map<Long, Integer> passedSections = new HashMap<>();
        for (Object[] row : sessionRepository.findBestScoresByUsersAndLevel(userIds, AttemptPolicy.LEVEL_ONE)) {
            Double best = (Double) row[2];
            if (best != null && best >= AttemptPolicy.passMark(AttemptPolicy.LEVEL_ONE)) {
                passedSections.merge((Long) row[0], 1, Integer::sum);
            }
        }
        return passedSections.entrySet().stream()
                .filter(en -> en.getValue() >= Section.values().length)
                .map(Map.Entry::getKey)
                .collect(Collectors.toSet());
    }

    /** One team row, built entirely from the pre-fetched batches above. */
    private ManagerDtos.TeamRow row(User e, int level, Map<Section, List<AssessmentSession>> bySection,
                                    Set<String> pending, int warnings, boolean level2Open) {
        boolean requestPending = false;
        for (Section s : Section.values()) {
            if (pending.contains(e.getId() + "#" + s)) {
                requestPending = true;
                break;
            }
        }
        return new ManagerDtos.TeamRow(
                e.getId(), e.getName(), e.getEmail(),
                e.getDepartment() != null ? e.getDepartment().getName() : null,
                e.getTeam() != null ? e.getTeam().getName() : null,
                level,
                level2Open,
                latestScore(bySection.get(Section.LISTENING)),
                latestScore(bySection.get(Section.SPEAKING)),
                latestScore(bySection.get(Section.WRITING)),
                count(bySection.get(Section.LISTENING)),
                count(bySection.get(Section.SPEAKING)),
                count(bySection.get(Section.WRITING)),
                requestPending, warnings);
    }

    /** Score of the most recent completed attempt (the batch arrives oldest-first). */
    private Double latestScore(List<AssessmentSession> done) {
        return done == null || done.isEmpty() ? null : done.get(done.size() - 1).getScore();
    }

    private int count(List<AssessmentSession> done) {
        return done == null ? 0 : done.size();
    }

    /** All current managers (for the admin "User Access" screen). */
    public List<ManagerDtos.ManagerRow> managers() {
        return userRepository.findByRole(Role.MANAGER).stream()
                .map(u -> new ManagerDtos.ManagerRow(u.getId(), u.getName(), u.getEmail()))
                .toList();
    }

    /**
     * Revoke a user's manager access by demoting them back to EMPLOYEE. The caller
     * (controller) must have verified super-admin rights and that the target is not
     * itself a super-admin. Returns the updated manager list.
     */
    @Transactional
    public List<ManagerDtos.ManagerRow> revokeManager(Long id) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Manager not found: " + id));
        if (u.getRole() != Role.MANAGER) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "User is not a manager");
        }
        u.setRole(Role.EMPLOYEE);
        userRepository.save(u);
        return managers();
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

    /**
     * Add a user with a role and a team, or re-assign one who already exists. Admin only —
     * the controller enforces that.
     *
     * The team is matched case-insensitively and created when new, so an admin can stand up
     * a team without a redeploy (previously teams only came from {@code data.sql}). Department
     * follows the team, which is the same rule {@code AuthService} applies on first login, so
     * a user added here is indistinguishable from one provisioned by signing in.
     */
    @Transactional
    public ManagerDtos.AddedUser addUser(ManagerDtos.AddUserRequest request, String actorEmail) {
        String email = request.email() == null ? "" : request.email().trim();
        String teamName = request.team() == null ? "" : request.team().trim();
        if (email.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email is required");
        }
        if (teamName.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Team is required");
        }
        Role role = request.role() == null ? Role.EMPLOYEE : request.role();
        Team team = findOrCreateTeam(teamName);

        Optional<User> found = userRepository.findByEmailIgnoreCase(email);
        boolean created = found.isEmpty();
        User user = found.orElseGet(User::new);
        if (created) {
            user.setEmail(email);
            // Same shape AuthService uses, so ids stay consistent however a user arrived.
            user.setEmployeeId("CF-" + Math.abs(email.toLowerCase(Locale.ROOT).hashCode() % 100000));
        }
        if (StringUtils.hasText(request.name())) {
            user.setName(request.name().trim());
        } else if (!StringUtils.hasText(user.getName())) {
            user.setName(nameFromEmail(email));
        }
        user.setRole(role);
        user.setTeam(team);
        user.setDepartment(team.getDepartment());
        if (role == Role.MANAGER) {
            user.setManager(null); // managers sit at the top of the hierarchy
        }
        User saved = userRepository.save(user);

        auditService.log(actorEmail, created ? "ADMIN_ADD_USER" : "ADMIN_REASSIGN_USER",
                "email=" + email + " role=" + role + " team=" + team.getName());

        return new ManagerDtos.AddedUser(saved.getId(), saved.getName(), saved.getEmail(),
                role.name(), team.getName(),
                saved.getDepartment() != null ? saved.getDepartment().getName() : null, created);
    }

    /** Every user, for the admin User Access list — newest-looking order is by name. */
    public List<ManagerDtos.UserRow> allUsers() {
        return userRepository.findAllWithTeamAndDepartment().stream()
                .sorted(Comparator.comparing(u -> u.getName() == null ? "" : u.getName(),
                        String.CASE_INSENSITIVE_ORDER))
                .map(u -> new ManagerDtos.UserRow(
                        u.getId(), u.getName(), u.getEmail(), u.getEmployeeId(),
                        u.getRole().name(),
                        u.getTeam() != null ? u.getTeam().getName() : null,
                        u.getDepartment() != null ? u.getDepartment().getName() : null,
                        adminRegistry.isRootAdmin(u.getEmail())))
                .toList();
    }

    /**
     * Change an existing user's role and team. Admin only — the controller enforces both that
     * and the protection of bootstrap-list admins.
     */
    @Transactional
    public ManagerDtos.UserRow updateUser(Long id, ManagerDtos.UpdateUserRequest request, String actorEmail) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
        Role role = request.role() == null ? user.getRole() : request.role();

        // Blank team = "leave it as it is", so a role-only change works for someone with no
        // team. Only touch team/department when a name was actually supplied.
        String teamName = request.team() == null ? "" : request.team().trim();
        String before = user.getRole() + "/" + (user.getTeam() != null ? user.getTeam().getName() : "-");
        if (!teamName.isBlank()) {
            Team team = findOrCreateTeam(teamName);
            user.setTeam(team);
            user.setDepartment(team.getDepartment());
        }
        user.setRole(role);
        if (role != Role.EMPLOYEE) {
            user.setManager(null); // managers and admins sit at the top of the hierarchy
        }
        User saved = userRepository.save(user);
        // Read the team back off the user, since it may have been left untouched above.
        String finalTeam = saved.getTeam() != null ? saved.getTeam().getName() : null;

        auditService.log(actorEmail, "ADMIN_UPDATE_USER",
                "email=" + saved.getEmail() + " from=" + before
                        + " to=" + role + "/" + (finalTeam == null ? "-" : finalTeam));

        return new ManagerDtos.UserRow(
                saved.getId(), saved.getName(), saved.getEmail(), saved.getEmployeeId(),
                role.name(), finalTeam,
                saved.getDepartment() != null ? saved.getDepartment().getName() : null,
                adminRegistry.isRootAdmin(saved.getEmail()));
    }

    /**
     * Existing team matched ignoring case, else a new one. New teams inherit the default
     * department so every team still hangs off the org tree rather than dangling.
     */
    private Team findOrCreateTeam(String name) {
        return teamRepository.findAll().stream()
                .filter(t -> name.equalsIgnoreCase(t.getName()))
                .findFirst()
                .orElseGet(() -> {
                    Team t = new Team();
                    t.setName(name);
                    departmentRepository.findByName(DEFAULT_DEPARTMENT).ifPresent(t::setDepartment);
                    return teamRepository.save(t);
                });
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

    public ManagerDtos.EmployeeDetail employeeDetail(User manager, Long employeeId) {
        return employeeDetail(manager, employeeId, AttemptPolicy.LEVEL_ONE);
    }

    /** Employee detail for one level, so a manager can review Level 2 as well as Level 1. */
    public ManagerDtos.EmployeeDetail employeeDetail(User manager, Long employeeId, int level) {
        User employee = userRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + employeeId));

        List<DashboardDtos.SectionCard> sections = dashboardService.sectionCards(employee, level);

        // Filtered by level in SQL with the session joined in, so this is one query total
        // rather than "load every event, then one lazy session fetch per event".
        List<ManagerDtos.WarningRow> warnings = proctorEventRepository
                .findByUserAndLevelWithSession(employeeId, level).stream()
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
                level,
                attemptPolicy.levelUnlocked(employee.getId(), AttemptPolicy.LEVEL_TWO),
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
