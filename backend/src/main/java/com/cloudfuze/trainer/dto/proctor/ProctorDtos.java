package com.cloudfuze.trainer.dto.proctor;

import jakarta.validation.constraints.NotNull;

public final class ProctorDtos {

    private ProctorDtos() {
    }

    public record ViolationRequest(@NotNull Long sessionId, String reason) {
    }

    public record ViolationResponse(int warnings) {
    }
}
