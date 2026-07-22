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

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Minimal OpenAI Chat Completions client. Requests JSON-object responses so the
 * caller can parse structured evaluations. Disabled (no-op) when no API key is set.
 */
@Component
public class OpenAiClient {

    private static final Logger log = LoggerFactory.getLogger(OpenAiClient.class);

    private final String apiKey;
    private final String model;
    private final String audioModel;
    private final RestClient restClient;
    private final ObjectMapper mapper = new ObjectMapper();

    public OpenAiClient(@Value("${app.openai.api-key:}") String apiKey,
                        @Value("${app.openai.model:gpt-4o-mini}") String model,
                        @Value("${app.openai.audio-model:gpt-4o-audio-preview}") String audioModel,
                        @Value("${app.openai.base-url:https://api.openai.com/v1}") String baseUrl) {
        this.apiKey = apiKey;
        this.model = model;
        this.audioModel = audioModel;
        // Bound every OpenAI call so a slow/hung API can't tie up request threads
        // indefinitely — on timeout the call throws and the caller falls back to mock.
        ClientHttpRequestFactorySettings settings = ClientHttpRequestFactorySettings.DEFAULTS
                .withConnectTimeout(Duration.ofSeconds(10))
                .withReadTimeout(Duration.ofSeconds(60));
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(ClientHttpRequestFactories.get(settings))
                .build();
    }

    public boolean isEnabled() {
        return StringUtils.hasText(apiKey);
    }

    /**
     * Sends a system + user prompt and returns the assistant's JSON content as a
     * parsed tree. Returns {@code null} on any error so callers can fall back.
     */
    public JsonNode completeJson(String system, String user) {
        if (!isEnabled()) {
            return null;
        }
        try {
            Map<String, Object> body = Map.of(
                    "model", model,
                    "temperature", 0.2,
                    "response_format", Map.of("type", "json_object"),
                    "messages", List.of(
                            Map.of("role", "system", "content", system),
                            Map.of("role", "user", "content", user)));

            JsonNode response = restClient.post()
                    .uri("/chat/completions")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);

            String content = response.path("choices").path(0).path("message").path("content").asText(null);
            return content == null ? null : mapper.readTree(content);
        } catch (Exception e) {
            log.warn("OpenAI call failed, falling back to mock evaluator: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Sends a system prompt + user text + an audio clip to the audio-capable model
     * (gpt-4o-audio-preview) and returns the parsed JSON response. The model can
     * "hear" the audio and judge pronunciation/fluency. Returns null on any error.
     *
     * @param base64Wav raw base64 (no data-URL prefix) of a WAV clip
     */
    public JsonNode completeJsonWithAudio(String system, String userText, String base64Wav) {
        // Audio scoring is skipped when no audio model is configured (e.g. the key
        // has no access to gpt-4o audio models) — caller falls back to transcript.
        if (!isEnabled() || !StringUtils.hasText(audioModel) || base64Wav == null || base64Wav.isBlank()) {
            return null;
        }
        try {
            // NOTE: audio models (gpt-audio*) do NOT support response_format=json_object;
            // sending it returns 400. We instead instruct JSON in the prompt and parse
            // the content leniently below.
            Map<String, Object> body = Map.of(
                    "model", audioModel,
                    "modalities", List.of("text"),
                    "temperature", 0.2,
                    "messages", List.of(
                            Map.of("role", "system", "content", system),
                            Map.of("role", "user", "content", List.of(
                                    Map.of("type", "text", "text", userText),
                                    Map.of("type", "input_audio", "input_audio",
                                            Map.of("data", base64Wav, "format", "wav"))))));

            JsonNode response = restClient.post()
                    .uri("/chat/completions")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);

            String content = response.path("choices").path(0).path("message").path("content").asText(null);
            return parseLooseJson(content);
        } catch (Exception e) {
            log.warn("OpenAI audio call failed, falling back: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Parses model output as JSON, tolerating markdown fences or surrounding prose by
     * extracting the outermost {@code { ... }} object. Returns null if none is found.
     */
    private JsonNode parseLooseJson(String content) throws com.fasterxml.jackson.core.JsonProcessingException {
        if (content == null || content.isBlank()) {
            return null;
        }
        String text = content.trim();
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
            text = text.substring(start, end + 1);
        }
        return mapper.readTree(text);
    }
}
