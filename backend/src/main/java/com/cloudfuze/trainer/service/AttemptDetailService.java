package com.cloudfuze.trainer.service;

import com.cloudfuze.trainer.domain.Section;
import com.cloudfuze.trainer.domain.SessionStatus;
import com.cloudfuze.trainer.dto.AttemptDetail;
import com.cloudfuze.trainer.entity.AssessmentSession;
import com.cloudfuze.trainer.entity.SectionResult;
import com.cloudfuze.trainer.repository.AssessmentSessionRepository;
import com.cloudfuze.trainer.repository.SectionResultRepository;
import com.cloudfuze.trainer.util.JsonUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Builds the per-section-attempt feedback history for a user — each attempt with its
 * score, stored feedback, improvement versus the previous attempt of the same section,
 * and (on a drop) which sub-areas got worse.
 */
@Service
@Transactional(readOnly = true)
public class AttemptDetailService {

    private static final DateTimeFormatter DATE =
            DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm").withZone(ZoneId.systemDefault());

    private static final String[] SPEAKING_DIMS =
            {"pronunciation", "accuracy", "fluency", "grammar", "vocabulary", "confidence"};
    private static final String[] WRITING_DIMS =
            {"grammar", "clarity", "vocabulary", "tone", "professionalism", "structure",
                    "readability", "completeness", "spelling", "conciseness"};

    private final AssessmentSessionRepository sessionRepository;
    private final SectionResultRepository sectionResultRepository;
    private final JsonUtil json;

    public AttemptDetailService(AssessmentSessionRepository sessionRepository,
                                SectionResultRepository sectionResultRepository, JsonUtil json) {
        this.sessionRepository = sessionRepository;
        this.sectionResultRepository = sectionResultRepository;
        this.json = json;
    }

    /** All submitted section attempts for the user, newest first, each with improvement + declines. */
    public List<AttemptDetail> attemptsFor(Long userId) {
        List<AssessmentSession> all = sessionRepository.findByUserIdOrderByCreatedAtDesc(userId);

        // Pass 1: parse each submitted attempt's details + per-dimension averages, keyed by section#attempt.
        Map<String, Double> scoreByKey = new HashMap<>();
        Map<String, Object> detailsByKey = new HashMap<>();
        Map<String, Map<String, Double>> dimsByKey = new HashMap<>();
        for (AssessmentSession s : all) {
            if (s.getSection() == null || s.getStatus() != SessionStatus.COMPLETED) continue;
            SectionResult r = sectionResultRepository
                    .findBySessionIdAndSection(s.getId(), s.getSection()).orElse(null);
            if (r == null) continue;
            String key = s.getSection().name() + "#" + s.getAttemptNumber();
            Object details = json.fromJson(r.getDetails(), Object.class);
            scoreByKey.put(key, s.getScore());
            detailsByKey.put(key, details);
            dimsByKey.put(key, dimensionAverages(s.getSection(), details));
        }

        List<AttemptDetail> out = new ArrayList<>();
        for (AssessmentSession s : all) {
            if (s.getSection() == null) continue;
            String key = s.getSection().name() + "#" + s.getAttemptNumber();
            if (!detailsByKey.containsKey(key)) continue; // not submitted
            String prevKey = s.getSection().name() + "#" + (s.getAttemptNumber() - 1);
            Double prev = scoreByKey.get(prevKey);
            Double improvement = (prev != null && s.getScore() != null)
                    ? Math.round((s.getScore() - prev) * 10.0) / 10.0 : null;
            boolean hasPrevDims = dimsByKey.containsKey(prevKey);
            List<String> improved = hasPrevDims
                    ? changedAreas(dimsByKey.get(prevKey), dimsByKey.get(key), true) : List.of();
            List<String> declined = hasPrevDims
                    ? changedAreas(dimsByKey.get(prevKey), dimsByKey.get(key), false) : List.of();
            out.add(new AttemptDetail(
                    s.getId(), s.getSection().name(), s.getAttemptNumber(), DATE.format(s.getCreatedAt()),
                    s.getScore(), improvement, improved, declined, s.getProctorWarnings(), s.getStatus().name(),
                    detailsByKey.get(key)));
        }
        return out;
    }

    /** Average of each rubric dimension across all items in an attempt's stored details. */
    @SuppressWarnings("unchecked")
    private Map<String, Double> dimensionAverages(Section section, Object details) {
        Map<String, Double> avg = new LinkedHashMap<>();
        String[] dims = section == Section.SPEAKING ? SPEAKING_DIMS
                : section == Section.WRITING ? WRITING_DIMS : new String[0];
        if (dims.length == 0 || !(details instanceof Map<?, ?> m)) return avg;
        Object itemsObj = m.get("items");
        if (!(itemsObj instanceof List<?> items) || items.isEmpty()) return avg;
        Map<String, Double> sum = new LinkedHashMap<>();
        int n = 0;
        for (Object it : items) {
            if (!(it instanceof Map<?, ?> im)) continue;
            Object evO = im.get("evaluation");
            if (!(evO instanceof Map<?, ?> ev)) continue;
            n++;
            for (String d : dims) {
                Object v = ((Map<String, Object>) ev).get(d);
                if (v instanceof Number num) sum.merge(d, num.doubleValue(), Double::sum);
            }
        }
        if (n == 0) return avg;
        for (String d : dims) avg.put(d, sum.getOrDefault(d, 0.0) / n);
        return avg;
    }

    /**
     * Dimensions that changed meaningfully (≥3 points) versus the previous attempt (top 3
     * by magnitude). When {@code improved} is true it reports the gains ("Fluency (+12)");
     * otherwise the declines ("Fluency (-12)").
     */
    private List<String> changedAreas(Map<String, Double> prev, Map<String, Double> cur, boolean improved) {
        if (prev == null || cur == null || prev.isEmpty() || cur.isEmpty()) return List.of();
        List<Map.Entry<String, Double>> ranked = new ArrayList<>();
        for (String d : cur.keySet()) {
            Double p = prev.get(d);
            Double c = cur.get(d);
            if (p == null || c == null) continue;
            double delta = c - p;                       // positive = improved
            double magnitude = improved ? delta : -delta;
            if (magnitude >= 3) ranked.add(Map.entry(d, magnitude)); // only meaningful changes
        }
        ranked.sort(Comparator.comparingDouble((Map.Entry<String, Double> e) -> e.getValue()).reversed());
        List<String> result = new ArrayList<>();
        String sign = improved ? "+" : "-";
        for (int i = 0; i < Math.min(3, ranked.size()); i++) {
            result.add(label(ranked.get(i).getKey()) + " (" + sign
                    + (int) Math.round(ranked.get(i).getValue()) + ")");
        }
        return result;
    }

    private String label(String dim) {
        return dim.substring(0, 1).toUpperCase() + dim.substring(1);
    }
}
