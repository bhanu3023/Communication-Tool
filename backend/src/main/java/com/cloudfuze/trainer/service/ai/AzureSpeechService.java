package com.cloudfuze.trainer.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.ClientHttpRequestFactories;
import org.springframework.boot.web.client.ClientHttpRequestFactorySettings;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;

/**
 * Calls Azure AI Speech "Pronunciation Assessment" on a recorded WAV clip and a
 * reference sentence, returning calibrated accuracy / fluency / completeness /
 * pronunciation scores. Disabled (returns null) when no Speech key is configured.
 *
 * Audio must be WAV PCM 16 kHz mono (the frontend recorder produces exactly this).
 */
@Component
public class AzureSpeechService {

    private static final Logger log = LoggerFactory.getLogger(AzureSpeechService.class);

    private final String key;
    private final String region;
    private final RestClient restClient;
    private final ObjectMapper mapper = new ObjectMapper();

    public AzureSpeechService(@Value("${app.azure-speech.key:}") String key,
                              @Value("${app.azure-speech.region:}") String region) {
        this.key = key;
        this.region = region;
        // Bound the pronunciation call so a hung Azure endpoint can't block request
        // threads; on timeout the call throws and the caller falls back gracefully.
        ClientHttpRequestFactorySettings settings = ClientHttpRequestFactorySettings.DEFAULTS
                .withConnectTimeout(Duration.ofSeconds(10))
                .withReadTimeout(Duration.ofSeconds(60));
        this.restClient = RestClient.builder()
                .requestFactory(ClientHttpRequestFactories.get(settings))
                .build();
    }

    public boolean isEnabled() {
        return StringUtils.hasText(key) && StringUtils.hasText(region);
    }

    public SpeechAssessment assess(byte[] wavAudio, String referenceText) {
        if (!isEnabled() || wavAudio == null || wavAudio.length == 0) {
            return null;
        }
        try {
            String config = mapper.writeValueAsString(Map.of(
                    "ReferenceText", referenceText == null ? "" : referenceText,
                    "GradingSystem", "HundredMark",
                    "Granularity", "Phoneme",
                    "Dimension", "Comprehensive"));
            String header = Base64.getEncoder().encodeToString(config.getBytes(StandardCharsets.UTF_8));

            String url = "https://" + region + ".stt.speech.microsoft.com"
                    + "/speech/recognition/conversation/cognitiveservices/v1?language=en-US";

            JsonNode response = restClient.post()
                    .uri(url)
                    .header("Ocp-Apim-Subscription-Key", key)
                    .header("Pronunciation-Assessment", header)
                    .header("Accept", "application/json")
                    .contentType(MediaType.parseMediaType("audio/wav; codecs=audio/pcm; samplerate=16000"))
                    .body(wavAudio)
                    .retrieve()
                    .body(JsonNode.class);

            if (response == null) {
                return null;
            }
            JsonNode best = response.path("NBest").path(0);
            JsonNode pa = best.path("PronunciationAssessment");
            if (pa.isMissingNode()) {
                return null;
            }
            return new SpeechAssessment(
                    pa.path("AccuracyScore").asDouble(0),
                    pa.path("FluencyScore").asDouble(0),
                    pa.path("CompletenessScore").asDouble(0),
                    pa.path("PronScore").asDouble(0),
                    best.path("Display").asText(response.path("DisplayText").asText("")));
        } catch (Exception e) {
            log.warn("Azure Speech assessment failed, falling back: {}", e.getMessage());
            return null;
        }
    }
}
