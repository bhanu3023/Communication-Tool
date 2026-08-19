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
import org.springframework.web.bind.annotation.RequestParam;
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

    @Operation(summary = "Start the speaking section for a level and receive 10 sentences")
    @PostMapping("/start")
    public SpeakingDtos.StartResponse start(@RequestParam(defaultValue = "1") int level) {
        return speakingService.start(currentUser.user(), level);
    }

    @Operation(summary = "Upload one take and get back what the recording was heard to say")
    @PostMapping("/take")
    public SpeakingDtos.TakeResponse take(@Valid @RequestBody SpeakingDtos.TakeRequest request) {
        return speakingService.recordTake(currentUser.user(), request);
    }

    @Operation(summary = "Score the takes already uploaded for this attempt")
    @PostMapping("/submitSpeech")
    public SectionScoreResponse submitSpeech(@Valid @RequestBody SpeakingDtos.SubmitRequest request) {
        return speakingService.submit(currentUser.user(), request);
    }

    @Operation(summary = "Play back one sentence's recorded audio from an attempt")
    @GetMapping("/recording/{sessionId}/{index}")
    public ResponseEntity<byte[]> recording(@PathVariable Long sessionId, @PathVariable int index) {
        com.cloudfuze.trainer.entity.SpeakingRecording rec =
                speakingService.recording(currentUser.user(), sessionId, index);
        // Recordings are now stored in whatever container the browser produced, so the type has
        // to come from the row. Rows written before that column existed were always WAV, and a
        // webm clip served as audio/wav simply does not play in some browsers.
        String type = org.springframework.util.StringUtils.hasText(rec.getMimeType())
                ? rec.getMimeType()
                : "audio/wav";
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(type))
                .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePrivate())
                .body(rec.getAudio());
    }
}
