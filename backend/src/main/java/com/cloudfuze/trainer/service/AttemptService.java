package com.cloudfuze.trainer.service;

import com.cloudfuze.trainer.domain.Section;
import com.cloudfuze.trainer.dto.dashboard.DashboardDtos;
import com.cloudfuze.trainer.entity.SectionAttemptControl;
import com.cloudfuze.trainer.entity.User;
import com.cloudfuze.trainer.exception.ApiException;
import com.cloudfuze.trainer.exception.ResourceNotFoundException;
import com.cloudfuze.trainer.repository.SectionAttemptControlRepository;
import com.cloudfuze.trainer.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Employee "request another attempt" and manager "grant attempt" actions, per section. */
@Service
public class AttemptService {

    private final UserRepository userRepository;
    private final SectionAttemptControlRepository controlRepository;
    private final AttemptPolicy attemptPolicy;
    private final DashboardService dashboardService;
    private final AuditService auditService;

    public AttemptService(UserRepository userRepository, SectionAttemptControlRepository controlRepository,
                          AttemptPolicy attemptPolicy, DashboardService dashboardService, AuditService auditService) {
        this.userRepository = userRepository;
        this.controlRepository = controlRepository;
        this.attemptPolicy = attemptPolicy;
        this.dashboardService = dashboardService;
        this.auditService = auditService;
    }

    private SectionAttemptControl control(User user, Section section, int level) {
        return controlRepository.findByUserIdAndSectionAndLevel(user.getId(), section, level)
                .orElseGet(() -> {
                    SectionAttemptControl c = new SectionAttemptControl();
                    c.setUser(user);
                    c.setSection(section);
                    c.setLevel(level);
                    return c;
                });
    }

    /** Employee requests another attempt for a section (at one level) whose attempts are exhausted. */
    @Transactional
    public DashboardDtos.SectionCard requestAnother(User user, Section section, int level) {
        AttemptPolicy.requireValidLevel(level);
        if (!attemptPolicy.exhausted(user.getId(), section, level)) {
            throw new ApiException(HttpStatus.CONFLICT, "You still have Level " + level
                    + " attempts remaining for the " + AttemptPolicy.label(section) + " section.");
        }
        SectionAttemptControl c = control(user, section, level);
        c.setRequestPending(true);
        controlRepository.save(c);
        auditService.log(user.getEmail(), "ATTEMPT_REQUEST",
                "section=" + section + " level=" + level + " requested another attempt");
        return dashboardService.sectionCard(user, section, level);
    }

    /** Manager grants extra attempts to an employee for a section (clears any pending request). */
    @Transactional
    public void grant(User manager, Long employeeId, Section section, int level, int extra) {
        AttemptPolicy.requireValidLevel(level);
        User employee = userRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + employeeId));
        SectionAttemptControl c = control(employee, section, level);
        c.setExtraGranted(c.getExtraGranted() + Math.max(1, extra));
        c.setRequestPending(false);
        controlRepository.save(c);
        auditService.log(manager.getEmail(), "ATTEMPT_GRANT", "employee=" + employeeId + " section=" + section
                + " level=" + level + " granted=" + Math.max(1, extra));
    }
}
