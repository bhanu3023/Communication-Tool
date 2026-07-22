# Repository Map

File-level map so future sessions jump straight to the right place instead of scanning. Base backend
package: `backend/src/main/java/com/cloudfuze/trainer/`.

## Top level
```
CLAUDE.md · AGENTS.md · .mcp.json · README.md · docker-compose.yml · .env.example
backend/   Spring Boot 3 (Java 21, Maven)
frontend/  React 19 + Vite
docs/ARCHITECTURE.md
.claude/   project knowledge base (rules, commands, skills, agents, hooks, memory, workflows)
```

## Backend entry points
| Concern | File(s) |
|---|---|
| App bootstrap | `TrainerApplication.java` |
| Config | `config/SecurityConfig.java`, `config/AiConfig.java`, `config/OpenApiConfig.java` |
| Auth (Azure→JWT) | `security/AzureTokenVerifier`, `security/JwtService`, `security/JwtAuthenticationFilter`, `security/AppPrincipal`, `security/CurrentUser`; `service/AuthService`; `controller/AuthController` |
| Assessments | `controller/{Listening,Speaking,Writing}Controller` → `service/{Listening,Speaking,Writing}Service` (+ `SpeakingSetService`) |
| AI facade | `service/ai/AiService`, `OpenAiClient`, `MockAiEvaluator`, `AzureSpeechService`, and result records (`SpeakingEvaluation`, `WritingEvaluation`, `SpeechAssessment`, `ListeningSummary`, `OverallFeedback`, `AiDetection`) |
| Sessions/scoring | `entity/AssessmentSession`, `entity/SectionResult`; `service/SessionService`, `service/AttemptService`, `service/AttemptPolicy`, `entity/SectionAttemptControl`; `service/AttemptDetailService` |
| Manager/reporting | `controller/ManagerController` → `service/ManagerService`; `service/PdfService`; `service/DashboardService`; `entity/ManagerComment` |
| Proctoring | `controller/ProctorController` → `service/ProctorService`; `entity/ProctorEvent` |
| Content banks | `entity/{ListeningQuestion,ListeningStory,SpeakingSentence,SpeakingRecording,WritingPrompt}`; `service/ContentService`; matching `repository/*` |
| Core entities | `entity/{User,Department,Team,Notification,AuditLog,BaseEntity}` |
| DTOs (records) | `dto/<module>/<Module>Dtos.java` (auth, dashboard, listening, speaking, writing, manager, proctor) + top-level `SectionScoreResponse`, `ProfileDto`, `AttemptDetail`, `SectionScoreResponse` |
| Enums | `domain/{Role,Section,Difficulty,SessionStatus}` |
| Errors | `exception/{ApiException,ForbiddenException,ResourceNotFoundException,GlobalExceptionHandler}` |
| Misc | `mapper/ProfileMapper`, `util/JsonUtil`, `service/AuditService` |
| Resources | `resources/application.yml`, `resources/data.sql` (idempotent seed) |

## Frontend entry points (`frontend/src/`)
| Concern | File(s) |
|---|---|
| Bootstrap/routing | `main.jsx`, `App.jsx`, `layouts/AppLayout.jsx`, `components/ProtectedRoute.jsx` |
| Auth | `authConfig.js` (MSAL), `contexts/AuthContext.jsx`, `pages/Login.jsx` |
| API layer | `services/api.js` (axios instance), `services/assessmentService.js` |
| Employee | `pages/employee/Dashboard.jsx` |
| Assessment flow | `pages/assessment/{AssessmentHub,Listening,Speaking,Writing}.jsx` |
| Manager | `pages/manager/{ManagerDashboard,EmployeeDetail}.jsx` |
| Hooks | `hooks/{useCountdown,useAudioRecorder,useMicMeter,useSpeechRecognition,useSpeechSynthesis,useExamMode,useEscapeToEnd}.js` |
| UI components | `components/{CircularTimer,AssessmentTimers,ScoreGauge,FeedbackPanel,ScoringScreen,AttemptReview,ExamWarningDialog,LockedVideo,LoadingScreen,BrandLogo}.jsx` |
| Misc | `contexts/ToastContext.jsx`, `theme.js`, `utils/{format,fullscreen}.js`, `index.css` |

## Ops
`backend/Dockerfile`, `frontend/Dockerfile` (+ `frontend/nginx.conf`), `docker-compose.yml`.
