package com.cloudfuze.trainer.controller;

import com.cloudfuze.trainer.dto.proctor.ProctorDtos;
import com.cloudfuze.trainer.security.CurrentUser;
import com.cloudfuze.trainer.service.ProctorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/proctor")
@Tag(name = "Proctoring", description = "Records exam malpractice warnings")
public class ProctorController {

    private final ProctorService proctorService;
    private final CurrentUser currentUser;

    public ProctorController(ProctorService proctorService, CurrentUser currentUser) {
        this.proctorService = proctorService;
        this.currentUser = currentUser;
    }

    @Operation(summary = "Record a proctoring warning for the current attempt")
    @PostMapping("/event")
    public ProctorDtos.ViolationResponse event(@Valid @RequestBody ProctorDtos.ViolationRequest request) {
        int warnings = proctorService.recordWarning(currentUser.user(), request.sessionId(), request.reason());
        return new ProctorDtos.ViolationResponse(warnings);
    }
}
