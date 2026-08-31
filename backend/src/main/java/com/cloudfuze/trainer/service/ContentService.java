package com.cloudfuze.trainer.service;

/**
 * Shared vocabulary for the content banks.
 *
 * <p>This class previously also selected the content for an attempt, via {@code randomStory}
 * and {@code writingPrompts}. Both drew at random, returned a fresh draw on every call and
 * recorded nothing on the session, so a reload mid-attempt changed the candidate's questions
 * and a retake could repeat them. Selection now lives in {@link ContentAssignmentService},
 * which pins its choice to the session and excludes what the candidate has already been
 * served — the same rules {@link SpeakingSetService} applies to Speaking.
 *
 * <p>The methods were removed rather than deprecated so that nothing can reach for the
 * unpinned behaviour again.
 */
public final class ContentService {

    /** The category used for customer-email prompts (always the first writing task). */
    public static final String EMAIL_CATEGORY = "Customer Email";

    private ContentService() {
    }
}
