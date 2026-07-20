package com.cloudfuze.trainer.service.ai;

/** Content-based estimate of how likely a piece of writing was AI-generated (0-100). */
public record AiDetection(double aiLikelihood, String note) {
}
