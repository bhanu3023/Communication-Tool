package com.cloudfuze.trainer.controller;

import com.cloudfuze.trainer.dto.SectionScoreResponse;
import com.cloudfuze.trainer.dto.writing.WritingDtos;
import com.cloudfuze.trainer.security.CurrentUser;
import com.cloudfuze.trainer.service.WritingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/writing")
@Tag(name = "Writing", description = "Writing assessment")
public class WritingController {

    private final WritingService writingService;
    private final CurrentUser currentUser;

    public WritingController(WritingService writingService, CurrentUser currentUser) {
        this.writingService = writingService;
        this.currentUser = currentUser;
    }

    @Operation(summary = "Start the writing section and receive 2 prompts")
    @PostMapping("/start")
    public WritingDtos.StartResponse start() {
        return writingService.start(currentUser.user());
    }

    @Operation(summary = "Auto-save a draft (every 15 seconds from the client)")
    @PostMapping("/saveDraft")
    public ResponseEntity<Void> saveDraft(@Valid @RequestBody WritingDtos.SaveDraftRequest request) {
        writingService.saveDraft(currentUser.user(), request);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Submit writing answers and receive the score")
    @PostMapping("/submit")
    public SectionScoreResponse submit(@Valid @RequestBody WritingDtos.SubmitRequest request) {
        return writingService.submit(currentUser.user(), request);
    }
}
