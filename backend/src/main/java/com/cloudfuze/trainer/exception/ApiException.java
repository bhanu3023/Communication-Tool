package com.cloudfuze.trainer.exception;

import org.springframework.http.HttpStatus;

/** Base exception carrying an HTTP status for the global handler. */
public class ApiException extends RuntimeException {

    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
