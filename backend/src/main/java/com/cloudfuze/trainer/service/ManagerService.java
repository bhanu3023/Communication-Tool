package com.cloudfuze.trainer.service;

import com.cloudfuze.trainer.domain.Role;
import com.cloudfuze.trainer.domain.Section;
import com.cloudfuze.trainer.dto.dashboard.DashboardDtos;
import com.cloudfuze.trainer.dto.manager.ManagerDtos;
import com.cloudfuze.trainer.entity.User;
import com.cloudfuze.trainer.exception.ResourceNotFoundException;
import com.cloudfuze.trainer.repository.ProctorEventRepository;
import com.cloudfuze.trainer.repository.UserRepository;
import com.cloudfuze.trainer.service.ai.AiService;
import com.cloudfuze.trainer.service.ai.OverallFeedback;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
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
