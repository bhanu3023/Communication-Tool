-- =====================================================================
-- Level 3 Speaking: spoken ANSWER questions, graduated length.
--
-- Replaces the first cut of these questions, which ran 56 to 100 words in no particular order
-- inside a set. They open shorter now and grow: roughly two lines, two and a half, three, three
-- and a half, four. A candidate meets a compact question first and the longest one last, which is
-- the same warm-up principle the Level 1 and Level 2 sentence sets use.
--
--   Q1  ~30 words   two lines
--   Q2  ~38 words   two and a half
--   Q3  ~45 words   three
--   Q4  ~52 words   three and a half
--   Q5  ~60 words   four
--
-- One trade-off is worth recording. The earlier rule was two full lines of SCENARIO and then the
-- ask, which cannot fit inside a two-line question. So Q1 and Q2 carry one tight scenario sentence
-- plus the ask, and from Q3 on there are two or more full lines of scenario before the ask. The
-- ladder wins at the short end because a candidate who meets a hundred-word question cold spends
-- their first thirty seconds reading rather than thinking.
--
-- Everything else from the specification holds in every question: TWO connected migration
-- workstreams, a real dependency between them, the cause never stated, no platform pairing used
-- twice, failure patterns rotated, and the ten question types spread across the sets.
--
-- 12 sets of 5. Level 3 speaking is scored by AiService.scoreSpokenAnswer -- the candidate answers
-- aloud in their own words and the ANSWER is judged, not an echo.
--
-- Avoid apostrophes: these are single-quoted SQL literals.
-- =====================================================================
DELETE FROM speaking_sentence WHERE level = 3
  AND NOT EXISTS (SELECT 1 FROM seed_state WHERE seed_key = 'l3-speaking-questions-v2');

-- ---------- Sets 1 to 6 ----------
INSERT INTO speaking_sentence (created_at, updated_at, text, set_number, level, difficulty)
SELECT now(), now(), v.text, v.set_number, 3, 'HARD'
FROM (VALUES
    -- Set 1: Slack to Teams + Shared Drive to SPO
    ('A Slack to Teams cutover and a Shared Drive to SPO copy share one change window. The content copy is running behind. What would you check before agreeing to keep that window?', 1),
    ('Users in migrated Teams channels can open some files and not others, with no pattern by department or by file type. The SharePoint workstream reports no failures and its reconciliation matches. How would you start investigating?', 1),
    ('Messaging has moved to Teams but content stays in Shared Drives for another fortnight, and staff are posting Drive links into Teams channels. The customer asks whether that matters before the content migration runs. What is your assessment, and what would you recommend?', 1),
    ('You are sequencing two workstreams for an acquisition: Slack to Teams for 900 users, and their project libraries from Shared Drive to SPO. The customer wants content first so people find their files on day one; your colleague argues for messaging first. Which would you choose, and what does your choice depend on?', 1),
    ('After the Slack to Teams cutover a department says three years of conversation history is missing, while the SharePoint content migrated with nothing reported. The migration logs show those channels completed with no errors, and the customer has asked for an explanation on a call this afternoon. How would you handle that call, and what would you establish before offering any explanation at all?', 1),

    -- Set 2: Gmail to Outlook + OneDrive tenant-to-tenant
    ('A Gmail to Outlook migration is in its second wave, and the parallel OneDrive tenant move keeps re-copying items it has already moved. What would you look at first?', 2),
    ('Some users say mail filed under several labels now appears in one folder only. At the same time a group of users has no OneDrive content in the destination. Are these one problem or two, and how would you find out?', 2),
    ('The customer wants the final OneDrive delta pass to run in the same window as the Gmail to Outlook mail cutover, to keep disruption to one evening. Their IT director has approved it. Talk me through the dependencies, and what you would raise before the go-ahead.', 2),
    ('Two weeks after both cutovers, a shared mailbox the finance team relies on is accessible to nobody, and separately an external auditor can no longer open files that were shared with them. Both worked before the migration. How would you investigate each, and what do they have in common?', 2),
    ('You are on a go or no-go call. Mail has passed user acceptance testing with two cosmetic defects. The OneDrive tenant move has finished copying but validation has only run against three of twelve departments, and the business owner who signs off is on leave until after the planned cutover. What is your recommendation, and how would you justify it to a customer who wants to proceed?', 2),

    -- Set 3: Teams to Google Chat + SharePoint tenant-to-tenant
    ('A Teams to Chat cutover is three days away, and a site collection used by the same 800 users will not finish copying before it. Can the messaging cutover proceed?', 3),
    ('Users say conversations that were threaded now read as a flat list, and files shared inside those conversations are unreachable from the message. The SharePoint workstream reports full success. What is happening in each case?', 3),
    ('During the Chat cutover the migration account loses access mid-wave and the job stops. The same account is used by the SharePoint tenant move, which is mid-delta and also stops. Both resume once it is restored. What would you investigate before the final wave?', 3),
    ('Two hundred external collaborators work inside Teams channels today and also hold access to documents in the SharePoint tenant being consolidated. The customer wants to migrate messaging now and deal with those collaborators after go-live. Assess that across both workstreams and give your recommendation.', 3),
    ('A customer moved 800 users from Teams to Chat while consolidating two SharePoint tenants. The Chat workstream took six weeks before a single message moved; the SharePoint one started copying two days after kickoff. At the steering committee, a director with no technical background asks why. How would you explain that difference so they can use it when budgeting the next programme?', 3),

    -- Set 4: Outlook tenant-to-tenant + OneDrive to SharePoint
    ('A tenant-to-tenant mailbox cutover is booked for Saturday, and the security team has just enabled a policy blocking sign-in from unrecognised locations. What would you do before the weekend?', 4),
    ('Mailboxes moved on Saturday. On Monday a group of users can send and receive mail but cannot open any document link a colleague sends them. Neither migration log shows an error. How would you investigate?', 4),
    ('You have six hours for a change window that must hold a tenant-to-tenant mailbox cutover and the final incremental copy of a OneDrive to SharePoint migration. The customer will not extend it. How would you order the activities, and what would you have ready if one overruns?', 4),
    ('Post-migration validation showed every mailbox present and item counts matching. Two weeks later, meeting invitations from one group show the wrong organiser, and a library migrated from OneDrive has lost a team permission. The customer says both prove the migration was rushed. How would you respond, and what would you actually investigate?', 4),
    ('An acquisition needs 1,200 mailboxes moved between Microsoft tenants and the same peoples OneDrive content reorganised into SharePoint team libraries. One option is both in a single weekend; the other is mail first and content four weeks later with coexistence in between. Both are technically possible and the customer wants a recommendation today. Which would you recommend, and what would you need answered before committing?', 4),

    -- Set 5: Chat to Teams + Shared Drive to OneDrive
    ('Two days into the Shared Drive to OneDrive pre-stage, throughput is a third of what the pilot achieved. The Chat to Teams workstream is unaffected. What would you check first?', 5),
    ('An operations team says their daily handover, once posted as replies under one message, is now spread across the channel. Separately, six percent of files did not migrate. The customer has escalated both as one failure. How would you separate them?', 5),
    ('The customer wants Shared Drive content moved into personal OneDrive areas so each file has one owner, and their Chat to Teams migration is already complete. Discovery shows many of those drives are used daily by whole teams. How would you raise this, and what would you recommend?', 5),
    ('You are three weeks from go-live on both workstreams for 1,100 users. The customer proposes freezing the source Shared Drives now, a fortnight early, so the content copy has a stable source to work from. Assess that proposal across both workstreams, including what it costs the business, and give your recommendation.', 5),
    ('Chat to Teams is complete for 1,100 users and the Shared Drive to OneDrive workstream is a week from cutover, where files move in full but a number of sharing arrangements must be reissued. The business owner is not technical and cannot see why one migration is complete and the other is not. How would you explain the difference, and what would you give her to repeat?', 5),

    -- Set 6: Slack to Chat + SPO to Shared Drive
    ('The Slack to Chat pilot has finished and the engineering team is unhappy: their runbooks arrived as plain text. The content pilot has not started. What would you do about each?', 6),
    ('The customer legal team runs a date-range search across migrated messages and migrated content for a regulatory request, and says the results no longer match what they got before. Both migrations reported success. How would you approach this?', 6),
    ('Documents converting to Google format on arrival have lost comments and tracked changes, and the Slack to Chat workstream is holding at 95 percent with private channels not yet moved. The customer asks which should worry them more. How would you answer, and what would you do about each?', 6),
    ('The customer wants both source platforms decommissioned two weeks after go-live to stop licence spend. Your own data from previous projects shows genuine recovery requests continuing past that point, though most could have been served from the destination. Make the case to the customer and say what you would recommend.', 6),
    ('You are giving a go or no-go recommendation for one weekend that contains both a Slack to Chat messaging cutover and a SharePoint to Shared Drive content cutover. Messaging has passed validation. Content has 4,000 files failing on their names, unremediated, which the customer says belong to an archive nobody uses. What is your recommendation, and how would you defend it if the customer disagrees?', 6)
    ) AS v(text, set_number)
WHERE NOT EXISTS (SELECT 1 FROM seed_state WHERE seed_key = 'l3-speaking-questions-v2');

-- ---------- Sets 7 to 12 ----------
INSERT INTO speaking_sentence (created_at, updated_at, text, set_number, level, difficulty)
SELECT now(), now(), v.text, v.set_number, 3, 'HARD'
FROM (VALUES
    -- Set 7: Teams tenant-to-tenant + Shared Drive tenant-to-tenant
    ('Two merged companies are moving Teams between Microsoft tenants and Shared Drives between Google tenants. The sponsor calls both simple because nothing changes platform. Where do you expect the difficulty?', 7),
    ('After the Teams tenant move, some users find their channels owned by somebody else and a few find channels missing. Fourteen shared drives ended up owned by a service account. What would you investigate first?', 7),
    ('The customer wants the Shared Drive copy and the Teams cutover in one weekend to reduce production changes. Both depend on the same destination accounts existing beforehand, and their own IT team is creating them. What would you clarify, and how does that change the plan?', 7),
    ('Halfway through the programme, the customer HR team supplies an updated list showing 90 people who have left since discovery. Both workstreams have already had their mapping files signed off. Talk me through the impact on each, and what you would ask the customer to decide.', 7),
    ('A customer is unhappy that this same-platform tenant-to-tenant programme has taken nine days longer than a cross-platform project they ran last year, and says the estimate must have been wrong. Both the Teams and the Shared Drive workstreams are affected, and the complaint has gone to your director. How would you handle that conversation, and what would you examine before responding to the claim?', 7),

    -- Set 8: Gmail tenant-to-tenant + SPO to OneDrive
    ('The Gmail tenant consolidation cannot start until account mapping is signed off, and the SPO to OneDrive workstream has already begun. Quarter end is five weeks away. Is that achievable?', 8),
    ('Delegated access to colleagues mailboxes has stopped working, and files shared from SharePoint before the OneDrive move can no longer be opened by the people they were shared with. What is the likely common factor?', 8),
    ('The content workstream needs the source read-only for six hours, and the mail cutover needs a different six hours the same night. The customer wants files in place before mail moves. How would you coordinate the two, and what would you tell them about the risk?', 8),
    ('Two weeks after go-live, some documents show a migration service account as the last editor and some migrated messages show a sender name that is not the original author. The compliance officer has asked in writing whether the audit trail has been compromised. How would you respond to her, and what would you verify before saying anything definite?', 8),
    ('You have to recommend whether a Gmail tenant-to-tenant consolidation runs as one cutover for 900 users or three waves of 300, with the SPO to OneDrive workstream running in parallel either way and finishing in week three. The customer helpdesk has four people and no weekend cover. Give your recommendation, your reasoning, and what would make you change your mind.', 8),

    -- Set 9: Outlook to Gmail + OneDrive to Shared Drive
    ('Two weeks after the Outlook to Gmail cutover, the helpdesk has a steady stream of calls describing mail as missing. The migration reported no failures and counts reconcile. What would you investigate?', 9),
    ('The customer wants OneDrive content moved into Shared Drives before the mail cutover so staff face one change rather than two. Your colleague recommends the opposite order. Which would you choose, and what would make the other order right?', 9),
    ('A business team reports recurring meetings appearing twice in their new calendars, and in the same week a migrated folder structure arrived intact but reachable by fewer people than before. The customer wants one root cause analysis covering both. How would you respond to that request?', 9),
    ('The communication for the mail workstream tells every member of staff they must rebuild their own mail rules, while the content note asks them to do nothing at all. An executive has seen both and wants to know whether his team is absorbing an avoidable cost. Explain the difference and what you would offer.', 9),
    ('You are running a go or no-go call for the Outlook to Gmail cutover. Content migration to Shared Drives is complete and validated, and mail testing is complete except that the pilot group never exercised delegate access. Three of the customer executives rely on assistants who manage their calendars, and the customer wants to proceed tonight. What is your recommendation, and what would you require before agreeing to go?', 9),

    -- Set 10: Slack consolidation + OneDrive tenant-to-tenant
    ('Three Slack workspaces are being consolidated into one, and all three contain channels with identical names. The OneDrive tenant move is ready and waiting on a date. What has to be resolved first?', 10),
    ('Two days after the Slack consolidation, some conversations users expected are missing, and a group of users OneDrive content arrived but cannot be opened. The customer suspects one migration damaged the other. How would you establish whether they are related?', 10),
    ('Two workspaces have moved and the third goes next week. The customer asks whether the OneDrive tenant migration can start now rather than wait, arguing the two touch different systems. Do you agree, and what would you want in place before running them concurrently?', 10),
    ('External partners can no longer post in the consolidated workspace and cannot open the files they were sent. The customer regards this as a single failure by your team. How would you explain what has happened across the two workstreams, and what would you need from them to fix it?', 10),
    ('You have to recommend how long the three source Slack workspaces and the source OneDrive tenant stay alive after go-live. Licences for both cost real money, the finance director is pressing to switch everything off at day seven, and your own evidence on recovery requests is mixed. Make your recommendation, say what evidence you would bring, and explain how you would handle it if the customer overrules you.', 10),

    -- Set 11: Chat tenant-to-tenant + Shared Drive to SharePoint
    ('Four legal holds cover conversations in the source Chat tenant, and retention labels must survive on the content side. How does each requirement affect its workstream?', 11),
    ('A business unit reports that documents they expect to be restricted are visible to more people than before. The Chat workstream alongside reports no issues, and the customer wants both migrations stopped immediately. How would you respond in that moment?', 11),
    ('Two workstreams share a change window: a Chat tenant cutover and the final delta pass of a Shared Drive to SharePoint migration. On the night, the content delta is four hours behind and will overlap the cutover. How would you handle that, and who would you involve?', 11),
    ('The records manager has to defend two outcomes to an auditor: a block of conversations staying in the source tenant rather than moving, and documents arriving unchanged while the way they are shared does not. How would you explain each, and what would you put in writing for her?', 11),
    ('The programme is eight days from go-live for 700 users and 18 terabytes. The punch list has four open items: retention rules not yet rebuilt at the destination, 30 external collaborators not re-invited, 2,000 files failing on their names, and the migration account access expiring in ten days. The customer wants to hold the date. Which are blockers and which can run into hypercare, and why?', 11),

    -- Set 12: Teams to Chat + Gmail to Outlook
    ('Messaging is moving from Teams to Chat while mail moves from Gmail to Outlook, because two parts of the business decided separately. Can those two decisions coexist?', 12),
    ('Meeting invitations sent from the new mail platform are not appearing in the calendars of colleagues who have already moved messaging. Both migrations report normal operation. How would you investigate, and what would you check about migration order?', 12),
    ('Staff are receiving mail correctly in Outlook but continue posting in Teams, which is no longer the supported platform, and files shared there are not reaching the people who need them. Both migrations are complete and validated. How would you approach this, and is it a migration problem?', 12),
    ('A customer of 1,000 staff wants messaging and mail cut over in the same week to get the disruption over with. Their helpdesk has six people, no weekend cover, and took 90 calls after a much smaller migration last year. Assess that plan, say when you would expect the load to arrive from each workstream, and give your recommendation.', 12),
    ('You have to recommend a sequence for a customer moving messaging from Teams to Chat and mail from Gmail to Outlook. Mail first leaves staff with new mail and old messaging for a period; messaging first inverts that, and neither is free. Which would you recommend, what does your choice depend on, and what would you need to know about this customer first?', 12)
    ) AS v(text, set_number)
WHERE NOT EXISTS (SELECT 1 FROM seed_state WHERE seed_key = 'l3-speaking-questions-v2');

INSERT INTO seed_state (seed_key) VALUES ('l3-speaking-questions-v2') ON CONFLICT DO NOTHING;
