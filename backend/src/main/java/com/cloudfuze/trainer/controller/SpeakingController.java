package com.cloudfuze.trainer.controller;

import com.cloudfuze.trainer.dto.SectionScoreResponse;
import com.cloudfuze.trainer.dto.speaking.SpeakingDtos;
import com.cloudfuze.trainer.security.CurrentUser;
import com.cloudfuze.trainer.service.SpeakingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/speaking")
@Tag(name = "Speaking", description = "Speaking assessment")
public class SpeakingController {

    private final SpeakingService speakingService;
    private final CurrentUser currentUser;

    public SpeakingController(SpeakingService speakingService, CurrentUser currentUser) {
        this.speakingService = speakingService;
        this.currentUser = currentUser;
    }

    @Operation(summary = "Start the speaking section and receive 10 sentences")
    @PostMapping("/start")
    public SpeakingDtos.StartResponse start() {
        return speakingService.start(currentUser.user());
    }

    @Operation(summary = "Submit speech transcripts and receive the score")
    @PostMapping("/submitSpeech")
    public SectionScoreResponse submitSpeech(@Valid @RequestBody SpeakingDtos.SubmitRequest request) {
        return speakingService.submit(currentUser.user(), request);
    }

    @Operation(summary = "Play back one sentence's recorded audio from an attempt")
    @GetMapping("/recording/{sessionId}/{index}")
    public ResponseEntity<byte[]> recording(@PathVariable Long sessionId, @PathVariable int index) {
        byte[] wav = speakingService.recording(currentUser.user(), sessionId, index);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("audio/wav"))
                .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePrivate())
                .body(wav);
    }
}
