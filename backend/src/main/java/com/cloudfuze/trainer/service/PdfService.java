package com.cloudfuze.trainer.service;

import com.cloudfuze.trainer.dto.manager.ManagerDtos;
import com.cloudfuze.trainer.exception.ApiException;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;

/** Renders a manager's employee report to a PDF via openhtmltopdf. */
@Service
public class PdfService {

    public byte[] employeeReport(ManagerDtos.EmployeeDetail d) {
        String html = buildHtml(d);
        try (ByteArrayOutputStream os = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            builder.withHtmlContent(html, null);
            builder.toStream(os);
            builder.run();
            return os.toByteArray();
        } catch (Exception e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to generate PDF: " + e.getMessage());
        }
    }

    private String buildHtml(ManagerDtos.EmployeeDetail d) {
        StringBuilder rows = new StringBuilder();
        for (var c : d.sections()) {
            String name = c.section().charAt(0) + c.section().substring(1).toLowerCase();
            String improvement = c.improvement() == null ? "—"
                    : (c.improvement() >= 0 ? "+" : "") + c.improvement();
            rows.append("<tr>")
                    .append(td(name))
                    .append(td(c.attemptsUsed() + " / " + c.attemptsAllowed()))
                    .append(td(fmt(c.latestScore())))
                    .append(td(fmt(c.bestScore())))
                    .append(td(improvement))
                    .append("</tr>");
        }

        return """
                <?xml version="1.0" encoding="UTF-8"?>
                <html xmlns="http://www.w3.org/1999/xhtml">
                <head><style>
                  body { font-family: Helvetica, Arial, sans-serif; color: #1a2233; font-size: 12px; }
                  h1 { color: #3000ae; font-size: 22px; margin-bottom: 2px; }
                  h2 { color: #3000ae; font-size: 15px; border-bottom: 1px solid #cfd8e3; padding-bottom: 4px; margin-top: 22px; }
                  .brand { color: #90a4ae; font-size: 11px; margin-bottom: 16px; }
                  table { width: 100%%; border-collapse: collapse; margin-top: 8px; }
                  th, td { border: 1px solid #cfd8e3; padding: 6px 8px; text-align: left; }
                  th { background: #ece6fb; }
                  ul { margin: 6px 0 6px 18px; }
                  .kv { margin: 2px 0; }
                </style></head>
                <body>
                  <h1>Communication Skills Report</h1>
                  <div class="brand">CloudFuze — AI Communication Skills Trainer</div>
                  <div class="kv"><strong>Employee:</strong> %s (%s)</div>
                  <div class="kv"><strong>Team:</strong> %s</div>
                  <div class="kv"><strong>Manager:</strong> %s</div>

                  <h2>Per-Section Summary</h2>
                  <table>
                    <tr><th>Section</th><th>Attempts</th><th>Latest</th><th>Best</th><th>Change vs previous</th></tr>
                    %s
                  </table>

                  <h2>AI Recommendations</h2>
                  %s
                </body></html>
                """.formatted(
                esc(d.name()), esc(d.email()),
                esc(d.team()), esc(d.manager()),
                rows, list(d.recommendations()));
    }

    private String list(java.util.List<String> items) {
        if (items == null || items.isEmpty()) return "<p>None.</p>";
        StringBuilder sb = new StringBuilder("<ul>");
        items.forEach(i -> sb.append("<li>").append(esc(i)).append("</li>"));
        return sb.append("</ul>").toString();
    }

    private String td(String v) {
        return "<td>" + esc(v) + "</td>";
    }

    private String fmt(Double v) {
        return v == null ? "—" : String.valueOf(v);
    }

    private String esc(String v) {
        if (v == null) return "—";
        return v.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
