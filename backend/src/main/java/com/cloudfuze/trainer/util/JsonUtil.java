package com.cloudfuze.trainer.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

/** Thin wrapper around Jackson for (de)serializing JSON stored in text columns. */
@Component
public class JsonUtil {

    private final ObjectMapper mapper = new ObjectMapper();

    public String toJson(Object value) {
        try {
            return mapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize JSON", e);
        }
    }

    public <T> T fromJson(String json, Class<T> type) {
        try {
            return json == null ? null : mapper.readValue(json, type);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to deserialize JSON", e);
        }
    }

    public <T> T fromJson(String json, TypeReference<T> type) {
        try {
            return json == null ? null : mapper.readValue(json, type);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to deserialize JSON", e);
        }
    }
}
