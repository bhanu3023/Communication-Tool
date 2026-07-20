package com.cloudfuze.trainer.controller;

import com.cloudfuze.trainer.dto.SectionScoreResponse;
import com.cloudfuze.trainer.dto.listening.ListeningDtos;
import com.cloudfuze.trainer.security.CurrentUser;
import com.cloudfuze.trainer.service.ListeningService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/listening")
@Tag(name = "Listening", description = "Listening assessment")
public class ListeningController {

    private final ListeningService listeningService;
    private final CurrentUser currentUser;

    public ListeningController(ListeningService listeningService, CurrentUser currentUser) {
        this.listeningService = listeningService;
        this.currentUser = currentUser;
    }

    @Operation(summary = "Start the listening section and receive 10 questions")
    @PostMapping("/start")
    public ListeningDtos.StartResponse start() {
        return listeningService.start(currentUser.user());
    }

    @Operation(summary = "Submit listening answers and receive the score")
    @PostMapping("/submit")
    public SectionScoreResponse submit(@Valid @RequestBody ListeningDtos.SubmitRequest request) {
        return listeningService.submit(currentUser.user(), request);
    }
}
