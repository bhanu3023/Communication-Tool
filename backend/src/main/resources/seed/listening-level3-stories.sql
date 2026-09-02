-- =====================================================================
-- Level 3 Listening story bank.
--
-- REWRITTEN AGAINST THE MIGRATION DOCUMENTATION (v4). The previous bank was audited against the
-- feature matrices and its opening story, Ardent Financial, stated that a Slack to Teams cutover
-- carried "channels, threads, reactions and pinned posts" -- reactions are No and pinned is NA for
-- that combination. A second story had Slack to Chat losing message formatting, which is inverted:
-- Slack to Chat carries code format, block quote and code block, and Slack to TEAMS is the
-- combination whose formatting stops at ordered lists. The bank also used six platform names in
-- total. All sixteen briefings below are built on a different documented combination, and every
-- limitation a briefing turns on is one the matrices actually record. The comment above each
-- story records the facts it depends on, so the next revision can be checked without re-reading
-- the source documents.
--
-- 16 briefings of about two and a half minutes, each with 10 questions.
--
-- WHAT MAKES THIS LEVEL 3, AND NOT A HARDER LEVEL 2. Every Level 1 and Level 2 story is ONE
-- situation. Every story here carries TWO migrations running at the same time for the same
-- customer, and the questions are written so that a candidate who followed only one of them
-- cannot answer. Several items ask which of the two an event belonged to; several ask a
-- comparison that exists in neither scenario alone. Holding two threads apart while listening
-- once is the skill this level tests.
--
-- US PROJECT LANGUAGE is deliberate and consistent, because it is what these candidates hear on
-- customer calls: kickoff, statement of work, change request, dry run, UAT, go-live, cutover
-- window, blackout period, sign-off, punch list, hypercare, escalation path, root cause analysis,
-- run book, stakeholder, checkpoint call, staging. What is NOT here is office idiom.
--
-- QUESTIONS TEST COMPREHENSION, NOT MEMORY. No item can be answered by recalling a number or a
-- name stated once. Every question turns on implication, trade-off, consequence or the speakers
-- own judgement. The one arithmetic item per story spans BOTH migrations, so it is a calculation
-- rather than a recall.
--
-- Question design, per story: item 1 is the cause of the FIRST scenario and item 2 the cause of
-- the SECOND, each with the plausible wrong hypothesis from the narrative among the options; at
-- least two items require the two scenarios to be compared or told apart; one is arithmetic
-- across both; one separates what was DEFERRED from what was RESOLVED; the last asks which
-- sentence best summarises the whole briefing, where the wrong options are true of one scenario
-- but not of both.
--
-- Seeded behind a seed_state marker. Bump the key to push a revision, and delete the old rows
-- first -- a title that already exists would otherwise attach its questions to the wrong story.
--
-- Avoid apostrophes: these are single-quoted SQL literals.
-- =====================================================================

DELETE FROM listening_question WHERE story_id IN (SELECT id FROM listening_story WHERE level = 3)
  AND NOT EXISTS (SELECT 1 FROM seed_state WHERE seed_key = 'l3-listening-bank-v4');
DELETE FROM listening_story WHERE level = 3
  AND NOT EXISTS (SELECT 1 FROM seed_state WHERE seed_key = 'l3-listening-bank-v4');

-- ---------- Stories 1 to 4 ----------
-- Story 1 facts: Box to OneDrive supports inner file permissions, external shares, shared links,
--   in-line comments and versions. Slack to Teams does NOT carry reactions, and replies inside
--   direct messages are not migrated because of a destination API limitation.
-- Story 2 facts: ShareFile supports NO delta in any of its four destinations, and no shared
--   links. Teams to Slack migrates live because Slack has no import mode, so the visible
--   timestamp is the migration time; channel mentions arrive as plain text.
-- Story 3 facts: Dropbox to Google carries Dropbox Paper, but Paper tables migrate only to about
--   62 or 63 columns and Paper comments and mentions do not migrate; in-line comments are No for
--   every Dropbox destination. Chat to Slack does not carry reactions.
-- Story 4 facts: Egnyte to SharePoint has folder display No and in-line comment No, and names are
--   capped at 200 characters. Gmail to Outlook drops junk mail and calendar event attachments,
--   and no mail direction supports a second delta.
INSERT INTO listening_story (created_at, updated_at, title, script, level, difficulty)
SELECT now(), now(), v.title, v.script, 3, 'HARD'
FROM (VALUES
    ('Halvorsen Group: The Easy Side and the Hard Side',
     'Halvorsen Group ran two migrations across the same six weeks. The content side moved Box for Business into OneDrive for four hundred and twenty staff. The message side moved eleven hundred Slack channels into Teams. Project lead Ines Marchetti had budgeted her difficult conversations for the content workstream and spent almost none of them there. Box into OneDrive supported everything Halvorsen had asked for: version history, the permissions on individual files sitting inside shared folders, the external shares to their audit firm, and the comments people had left on documents. It finished four days early. The message side was where the project was actually decided. Two things were true about Slack to Teams from the day the statement of work was signed, and only one of them had been explained to anybody outside the project team. The first was that reactions do not migrate on that route. Halvorsen used them as a control: a supervisor put a tick on a shift handover to confirm they had read it, and the operations group treated that tick as the record. The second was that replies inside direct messages do not come across either, which is a limit of the destination rather than a choice anyone made. Engineer Rasmus Kohl raised the reactions in week two. Ines decided not to escalate it, on the grounds that it was in the signed scope and the project had bigger problems. It became the bigger problem in week five, when the operations director found out during a walkthrough and asked, reasonably, how his supervisors were supposed to prove they had read anything. What was resolved was the direct messages: the team pulled a full export before the cutover, so the replies exist as a searchable file even though they are not in Teams. What was deferred was the handover control itself. Halvorsen agreed to design a replacement process after go-live and nobody has yet been named to do it. The content workstream came in eleven thousand dollars under its estimate. The message workstream ran twenty-six thousand over, almost all of it the export work and the extra hypercare that followed the walkthrough. In her closing note Ines wrote one line: the cheap workstream was the one nobody had to be persuaded about.'),

    ('Corriveau Manufacturing: One Chance at the Copy',
     'Corriveau Manufacturing had two workstreams and one hard constraint that only applied to one of them. The content side was ShareFile into SharePoint Online, sixteen terabytes of engineering drawings. The message side was Teams into Slack for nine hundred users, following a merger with a company that had standardised on Slack years earlier. Consultant Marguerite Oyelaran spent the kickoff on a single point, and repeated it at every checkpoint call: ShareFile does not support a delta pass. Not a slow one, not an expensive one. The copy happens once, and anything created in ShareFile after that copy begins is not in SharePoint unless somebody moves it by hand. That made the freeze date the most important date in the programme. Corriveau agreed to it, communicated it once by email, and did not enforce it. Three engineering teams kept working in ShareFile for nine days after the freeze, and the drawings they produced in those nine days had to be moved manually afterwards, which took two people most of a fortnight. The message side had no such constraint. Teams to Slack can be re-run as often as you like. What it cannot do is choose when a message appears to have been sent. Slack has no import mode, so every migrated message is posted live as the migration runs, and the timestamp a user sees is the migration date rather than the original one. Corriveau discovered this when their legal team ran a date-range search for a warranty dispute and got nothing. The original dates existed in the export the whole time. What was resolved was the search: the legal team was given the export and shown how to query it, which took an afternoon. What was deferred was the question underneath it, which is whether a system where the visible date is wrong can be the system of record at all. Corriveau has not decided. Marguerite recorded two lessons. The first was that a freeze date needs an owner and not an email. The second was that the workstream everybody worried about, the one with no second chance, was not the one that produced the escalation.'),

    ('Nakagawa Retail: Two Kinds of Missing',
     'Nakagawa Retail moved content from Dropbox into a Google Shared Drive and messaging from Google Chat into Slack, for the same eight hundred head office staff. Both workstreams reported complete inside their windows. Both then produced a complaint in the same week, and migration manager Oluwaseun Adeyemi spent some time working out that they were not the same complaint at all. The content one came from the merchandising team. They plan each season inside a Dropbox Paper document that is essentially a very wide table, one column per week, and in Google the right-hand end of it was gone. That is a documented boundary rather than a fault: Paper tables migrate up to about sixty-two or sixty-three columns, and where a table runs past that the extra columns collapse into the last one. Merchandising had built a table of seventy-one. The second complaint came from store operations, who said the acknowledgements were missing from their migrated Slack messages. Reactions are not carried on Chat to Slack, and unlike the table, there was nothing on the other side of the boundary to recover. Oluwaseun was careful with the difference when he wrote back, because Nakagawa had begun to talk about both as data loss, and only one of them was. The Paper table was recoverable: the source still existed, the columns were still in it, and the team rebuilt the plan as two documents rather than one, which they now say they prefer. The reactions were not recoverable in any form. What was resolved was the seasonal plan, in four days. What was deferred was a decision about the eleven other wide Paper documents that nobody has opened yet, which may or may not have the same problem, and which nobody has been funded to check. There was a third thing that neither team raised and that Oluwaseun put in the report himself: comments left on Dropbox files do not migrate to Google at all, on any Dropbox route, and Nakagawa has three years of review comments on contract documents. Nobody has asked about them yet.'),

    ('Piedra Valley Schools: The Name Limit and the Second Pass',
     'Piedra Valley Schools ran an Egnyte to SharePoint Online content migration alongside a Gmail to Outlook mail migration, two thousand four hundred staff, over one summer. The two workstreams shared nothing except a deadline: the first day of the school year. The content side ran into a limit on the first pass. SharePoint accepts a shorter name than Egnyte does, and Piedra Valley had a decade of files named after the meeting, the school, the date and the person who took the minutes. Several thousand of them exceeded the two hundred character limit at the destination and had to be renamed before they would copy. Analyst Bettina Halloran built a rename script and had it done in three days, which was faster than anyone expected and slower than the plan allowed. The other thing about the content side surprised the customer more. Egnyte to SharePoint does not reproduce folder display the way Egnyte shows it, so the files are all present and the structure is all present, but it does not look like what staff were used to. Nobody had prepared them. The mail side ran clean and then produced the only real argument of the project. Piedra Valley IT manager Dov Ferreira had planned a second delta pass a fortnight after cutover, to sweep up anything the summer holidays had hidden, and had told his superintendent it would happen. Mail does not support a second delta in any direction: run one and calendar events and contacts duplicate or conflict. Bettina had to tell him this eleven days before the date he had committed to. What was resolved was the naming: every file copied. What was deferred was the folder display problem, which Piedra Valley decided to handle with training in the first week of term rather than by restructuring, a decision Bettina disagreed with in writing. Two smaller things were accepted rather than fixed: junk mail does not migrate into Outlook, and neither do attachments on calendar events. Both were in the scope document. Neither had been read by anyone who would notice.')
    ) AS v(title, script)
WHERE NOT EXISTS (SELECT 1 FROM seed_state WHERE seed_key = 'l3-listening-bank-v4');

INSERT INTO listening_question (created_at, updated_at, story_id, ordinal, question_text,
                                option_a, option_b, option_c, option_d, correct_option)
SELECT now(), now(), s.id, v.ordinal, v.q, v.a, v.b, v.c, v.d, v.correct
FROM (VALUES
    -- Story 1 -- key: B A C A D B C A D B
    ('Halvorsen Group: The Easy Side and the Hard Side', 1, 'Why did the content workstream cause Ines so little difficulty?',
     'It was much smaller than the message workstream',
     'The route she chose happened to support everything the customer had asked for',
     'It was started earlier and had more time',
     'The customer cared less about documents than about messages', 'B'),
    ('Halvorsen Group: The Easy Side and the Hard Side', 2, 'Which best describes why the missing reactions became serious?',
     'Halvorsen had been using them as a record that something had been read',
     'They were not mentioned anywhere in the statement of work',
     'They took a large amount of storage that was then wasted',
     'The operations director had asked for them specifically at kickoff', 'A'),
    ('Halvorsen Group: The Easy Side and the Hard Side', 3, 'What does the briefing suggest was wrong with Ines decision in week two?',
     'She should have refused to sign a scope containing that limitation',
     'She was wrong that reactions were in the signed scope',
     'Being contractually covered is not the same as the customer knowing',
     'She should have delayed the cutover until reactions could be migrated', 'C'),
    ('Halvorsen Group: The Easy Side and the Hard Side', 4, 'The direct message replies and the reactions were both losses. What separated them?',
     'One could be preserved outside the destination and the other could not',
     'One was in the scope document and the other was not',
     'One affected operations staff and the other affected everybody',
     'One was a destination limit and the other was a source limit', 'A'),
    ('Halvorsen Group: The Easy Side and the Hard Side', 5, 'What was deferred rather than resolved?',
     'The export of the direct message replies',
     'The renaming of the migrated channels',
     'The permissions on files inside shared folders',
     'Designing a replacement for the handover control', 'D'),
    ('Halvorsen Group: The Easy Side and the Hard Side', 6, 'Taking both workstreams together, what was the net effect on budget?',
     'A saving of eleven thousand dollars',
     'An overrun of fifteen thousand dollars',
     'An overrun of thirty-seven thousand dollars',
     'The two cancelled each other out exactly', 'B'),
    ('Halvorsen Group: The Easy Side and the Hard Side', 7, 'Why does the briefing call the direct message limitation a limit rather than a choice?',
     'Because the customer declined to pay for it',
     'Because it was discovered too late to change',
     'Because it comes from the destination platform and no option would have changed it',
     'Because Ines decided not to escalate it', 'C'),
    ('Halvorsen Group: The Easy Side and the Hard Side', 8, 'What made the walkthrough in week five a turning point?',
     'Someone outside the project team learned what the scope had always said',
     'A new technical fault was discovered in the migration',
     'The content workstream finished early and freed up attention',
     'The export of direct messages failed during the demonstration', 'A'),
    ('Halvorsen Group: The Easy Side and the Hard Side', 9, 'Which of these would most likely have prevented the week five escalation?',
     'Choosing a different content platform',
     'Running the two workstreams in sequence rather than together',
     'Migrating the reactions using a different tool',
     'Walking the operations director through the scope limits at kickoff', 'D'),
    ('Halvorsen Group: The Easy Side and the Hard Side', 10, 'Which sentence best summarises the whole briefing?',
     'A content migration that succeeded and a message migration that failed technically',
     'The workstream with no technical difficulty was the one that cost the least trouble, and the one that was contractually covered was not',
     'A project undone by a destination platform that could not carry direct messages',
     'A budget overrun caused by running two migrations at the same time', 'B'),

    -- Story 2 -- key: C B A D A C B D A C
    ('Corriveau Manufacturing: One Chance at the Copy', 1, 'Why was the freeze date the most important date in the content programme?',
     'Because the destination could only accept data on that day',
     'Because the engineering teams had been told to stop work on it',
     'Because nothing created after the copy began would reach the destination automatically',
     'Because the merger agreement required it', 'C'),
    ('Corriveau Manufacturing: One Chance at the Copy', 2, 'Why did the legal date-range search return nothing?',
     'The messages had not finished migrating when the search was run',
     'The visible dates were the migration dates rather than the original ones',
     'The warranty dispute predated the messages that were migrated',
     'Slack does not support searching by date range', 'B'),
    ('Corriveau Manufacturing: One Chance at the Copy', 3, 'What does the briefing imply about how Corriveau handled the freeze?',
     'Agreeing to a constraint is not the same as making it happen',
     'The freeze date was set too early in the programme',
     'Marguerite had not explained the constraint clearly enough',
     'The engineering teams deliberately ignored an instruction', 'A'),
    ('Corriveau Manufacturing: One Chance at the Copy', 4, 'The two workstreams had opposite properties. Which pair is correct?',
     'One could be paused and the other could not',
     'One preserved permissions and the other did not',
     'One was in scope and the other was a change request',
     'One could be repeated as often as needed and the other could happen only once', 'D'),
    ('Corriveau Manufacturing: One Chance at the Copy', 5, 'What was resolved rather than deferred?',
     'Giving the legal team the export and showing them how to query it',
     'Whether Slack can serve as the system of record',
     'The nine days of drawings created after the freeze',
     'The enforcement of freeze dates on future programmes', 'A'),
    ('Corriveau Manufacturing: One Chance at the Copy', 6, 'Roughly how much manual effort did the unenforced freeze create?',
     'Nine days of work for one person',
     'A fortnight of work for one person',
     'About two person-weeks',
     'Sixteen days spread across three teams', 'C'),
    ('Corriveau Manufacturing: One Chance at the Copy', 7, 'Why does the briefing say the original dates existed the whole time?',
     'Because Slack stores both the original and the migration date',
     'Because the export retained them even though the destination display did not',
     'Because the legal team had been searching the wrong workspace',
     'Because the migration was re-run with corrected dates', 'B'),
    ('Corriveau Manufacturing: One Chance at the Copy', 8, 'Which question does the briefing say Corriveau has not answered?',
     'Whether to re-run the ShareFile copy',
     'Who should have owned the freeze date',
     'How much the manual recovery cost',
     'Whether a system whose visible dates are wrong can be the system of record', 'D'),
    ('Corriveau Manufacturing: One Chance at the Copy', 9, 'What is Marguerite second lesson really about?',
     'Risk turning up where nobody was watching for it',
     'The need for better legal review of statements of work',
     'The importance of choosing Slack over Teams',
     'Freezing sources earlier than the plan requires', 'A'),
    ('Corriveau Manufacturing: One Chance at the Copy', 10, 'Which sentence best summarises the whole briefing?',
     'A content migration that failed because the customer ignored instructions',
     'A message migration undermined by a destination that could not set timestamps',
     'The constraint everyone prepared for cost the least, and the one nobody thought about produced the escalation',
     'Two migrations that both completed successfully inside their windows', 'C'),

    -- Story 3 -- key: A D B C D A C B A D
    ('Nakagawa Retail: Two Kinds of Missing', 1, 'What actually happened to the merchandising seasonal plan?',
     'Its table ran past the column limit the destination could carry, so the extra columns collapsed',
     'It failed to migrate at all and stayed in Dropbox',
     'It migrated but the merchandising team could not find it',
     'Its permissions were lost so nobody could open it', 'A'),
    ('Nakagawa Retail: Two Kinds of Missing', 2, 'Why were the store operations acknowledgements missing?',
     'They were removed by the source before the migration ran',
     'The migration was still running when they checked',
     'Store operations had been migrated in a later wave',
     'That message route does not carry reactions at all', 'D'),
    ('Nakagawa Retail: Two Kinds of Missing', 3, 'Why was Oluwaseun careful to distinguish the two complaints?',
     'Because one team was more senior than the other',
     'Because only one of them involved anything that could be recovered',
     'Because one was inside scope and the other was not',
     'Because they arrived on the same day and confused the report', 'B'),
    ('Nakagawa Retail: Two Kinds of Missing', 4, 'What does the merchandising outcome suggest about the original document?',
     'It should never have been migrated',
     'The migration tool was the wrong choice for it',
     'It had been built past a boundary the team did not know existed',
     'Its columns were duplicated rather than lost', 'C'),
    ('Nakagawa Retail: Two Kinds of Missing', 5, 'What was deferred rather than resolved?',
     'The rebuilding of the seasonal plan',
     'The explanation given to store operations',
     'The distinction between the two complaints',
     'Checking the eleven other wide documents nobody has opened', 'D'),
    ('Nakagawa Retail: Two Kinds of Missing', 6, 'By roughly how much did the merchandising table exceed what the route could carry?',
     'By eight or nine columns',
     'By about twenty columns',
     'By seventy-one columns',
     'By half of its width', 'A'),
    ('Nakagawa Retail: Two Kinds of Missing', 7, 'Why does the briefing describe the third issue as one nobody raised?',
     'Because the review comments had already been archived elsewhere',
     'Because it affected only one small team',
     'Because the loss is real but nobody has yet gone looking for it',
     'Because Oluwaseun decided it was not worth reporting', 'C'),
    ('Nakagawa Retail: Two Kinds of Missing', 8, 'What do the Paper columns and the file comments have in common?',
     'Both were caused by the same configuration error',
     'Both are limits of the content route rather than faults in the migration',
     'Both were recovered from the source within four days',
     'Both were raised by the merchandising team', 'B'),
    ('Nakagawa Retail: Two Kinds of Missing', 9, 'Why did the merchandising team end up saying they preferred the outcome?',
     'Rebuilding the plan as two documents worked better than the single wide one',
     'The migration restored more columns than they expected',
     'They were given extra time to complete the season plan',
     'Google handles wide tables better than Dropbox did', 'A'),
    ('Nakagawa Retail: Two Kinds of Missing', 10, 'Which sentence best summarises the whole briefing?',
     'Two migrations that both lost data because of poor planning',
     'A content migration that succeeded and a message migration that did not',
     'A customer who complained about problems that were all documented in advance',
     'Two losses that looked identical to the customer, where only one had anything left to recover', 'D'),

    -- Story 4 -- key: B C A D C B A D C A
    ('Piedra Valley Schools: The Name Limit and the Second Pass', 1, 'What caused the first pass of the content copy to reject files?',
     'The files had been locked by staff over the summer',
     'Their names were longer than the destination would accept',
     'The Egnyte source had run out of licences',
     'The rename script had not yet been written', 'B'),
    ('Piedra Valley Schools: The Name Limit and the Second Pass', 2, 'Why could Dov not have the second mail pass he had promised?',
     'The summer holidays had left too little time',
     'The budget for it had been spent on the rename work',
     'Running one would duplicate or conflict calendar events and contacts',
     'Bettina had not been given access to the mail tenant', 'C'),
    ('Piedra Valley Schools: The Name Limit and the Second Pass', 3, 'What was the real problem with the folder display issue?',
     'Everything arrived intact but did not look like what staff were used to',
     'A number of folders failed to migrate entirely',
     'Permissions on the folders were lost during the copy',
     'The folders were renamed by the script and could not be found', 'A'),
    ('Piedra Valley Schools: The Name Limit and the Second Pass', 4, 'What does the briefing suggest about Bettina rename work?',
     'It should have been avoided by choosing a different destination',
     'It was the most serious problem the project faced',
     'It was slower than it needed to be',
     'It solved the problem well and still cost time the plan had not allowed', 'D'),
    ('Piedra Valley Schools: The Name Limit and the Second Pass', 5, 'What was deferred rather than resolved?',
     'The renaming of the files that exceeded the limit',
     'The mail cutover itself',
     'The folder display problem, handled by training instead',
     'The conversation with the superintendent', 'C'),
    ('Piedra Valley Schools: The Name Limit and the Second Pass', 6, 'How much warning did Dov get before his committed date?',
     'Three days',
     'Eleven days',
     'A fortnight',
     'A full term', 'B'),
    ('Piedra Valley Schools: The Name Limit and the Second Pass', 7, 'What do the junk mail and the calendar attachments have in common with the folder display?',
     'All were known limits that nobody outside the project had absorbed',
     'All were caused by the rename script',
     'All were resolved before the start of term',
     'All affected only the mail workstream', 'A'),
    ('Piedra Valley Schools: The Name Limit and the Second Pass', 8, 'Why did Bettina record her disagreement in writing?',
     'To protect herself if the rename script failed',
     'Because she had been overruled on the second mail pass',
     'Because the superintendent had asked for a written record',
     'Because she believed training would not fix a structural problem', 'D'),
    ('Piedra Valley Schools: The Name Limit and the Second Pass', 9, 'What did the two workstreams actually share?',
     'The same technical constraint',
     'The same engineering team',
     'A single deadline and nothing else',
     'A common source platform', 'C'),
    ('Piedra Valley Schools: The Name Limit and the Second Pass', 10, 'Which sentence best summarises the whole briefing?',
     'Two migrations delivered on time, where every difficulty came from limits that were documented and unread',
     'A content migration delayed by a naming problem nobody could have predicted',
     'A mail migration that failed because a second pass could not be run',
     'A project undone by a summer deadline that was never realistic', 'A')
    ) AS v(story_title, ordinal, q, a, b, c, d, correct)
JOIN listening_story s ON s.level = 3 AND s.title = v.story_title
WHERE NOT EXISTS (SELECT 1 FROM seed_state WHERE seed_key = 'l3-listening-bank-v4');

-- ---------- Stories 5 to 8 ----------
-- Story 5 facts: Amazon WorkDocs to SharePoint carries versions, external shares and timestamps
--   but NOT inner file permissions, and email notification suppression is not supported. Slack to
--   Slack is the ONLY message combination that carries pinned messages; archived channels cannot
--   be created through the API in any combination, so they arrive as ordinary channels.
-- Story 6 facts: NFS to SharePoint Online has no versions, no external shares, no shared links
--   and no root file permissions. Outlook to Gmail cannot carry rules or forwarding settings
--   (Microsoft does not expose them), categories, Outlook Notes or To-Do, and past calendar
--   events are migrated only for the organiser, so attendees never receive them.
-- Story 7 facts: Google file versions cannot carry their original timestamps into SharePoint --
--   the system stamps upload time and there is no API to override it. Slack to Chat carries
--   reactions, code blocks and forwarded channel messages, but Google Chat cannot fully reproduce
--   mentions, has no pinned concept, and a message carrying several files arrives with the first
--   as a file and the rest as links.
-- Story 8 facts: Dropbox to Azure Blob is a data dump -- one time, delta, long path, special
--   characters and Dropbox Paper only, with no permissions, versions, timestamps or shares. Teams
--   to Teams does not carry reactions, forwarded messages, the Edited label, bot or Polly
--   messages, meeting chats or recordings, self DMs, or DMs involving external users.
INSERT INTO listening_story (created_at, updated_at, title, script, level, difficulty)
SELECT now(), now(), v.title, v.script, 3, 'HARD'
FROM (VALUES
    ('Ferngate Insurance: The Weekend Nobody Was Warned About',
     'Ferngate Insurance moved eleven terabytes from Amazon WorkDocs into SharePoint Online, and at the same time consolidated two Slack workspaces into one after acquiring a competitor. Programme manager Delphine Aubuchon scheduled the content copy for a Saturday specifically so that nobody would be inconvenienced, and that decision produced the only real incident of the project. Amazon WorkDocs into SharePoint carries a great deal: version history, the external shares to Ferngate reinsurers, the original timestamps. What it does not carry is the ability to suppress the email notifications the destination generates as permissions are applied. Nobody on the project had checked that particular row before choosing the date. Ferngate staff arrived on Monday morning to somewhere between four and nine hundred notification emails each, none of which they understood, and the service desk took four hundred calls before eleven. Delphine spent Monday apologising for something that was not a fault in the migration at all. The Slack side ran quietly and produced a different kind of surprise. Slack to Slack is the only route of its kind that carries pinned messages, and Ferngate had a great many of them, so the claims teams found their reference material exactly where they expected it. What did not survive was the archive. Ferngate had closed about two hundred old claim channels over the years, deliberately, and expected them to appear closed in the new workspace. Archived channels cannot be created through the interface the migration uses, in any combination, so they arrived as ordinary open channels sitting in everybody list. That was a governance problem rather than a data one, and it was the acquired company compliance officer who noticed first. What was resolved was the notification flood: the second wave was scheduled for a Friday evening with a message sent to all staff two days ahead, and the service desk took eleven calls. What was deferred was the archive. Ferngate agreed to design a naming and permission convention that would make closed channels obviously closed, and put it on the punch list, where it remains. In her retrospective Delphine wrote that the workstream with the technical constraint went well and the workstream with the calendar decision did not.'),

    ('Bellweather Trust: What the API Would Not Give Up',
     'Bellweather Trust ran two migrations for four hundred and fifty staff: a Windows file server into SharePoint Online, and Outlook into Gmail. The file server side was understood early and understood correctly. That route carries folder permissions and original timestamps, and it does not carry version history, external shares or sharing links, because a file server has no real equivalent of any of them. Consultant Yusuf Bamigboye had that conversation at kickoff and Bellweather accepted it without difficulty. The mail side was where things were not understood, and the reason is worth stating precisely. Almost everything Bellweather lost on the mail side was lost because Microsoft does not expose it through its interface, not because anyone chose to leave it behind. Mail rules and forwarding settings are the clearest case: they exist, staff depend on them, and there is no way to read them out. The same is true of categories. Outlook Notes and the task list have a different reason, which is that the destination has nothing to put them in. Bellweather chief executive assistant, Marisol Iturbe, produced the escalation of the project, and it was none of those. She manages the calendars of four directors, and after the cutover the meetings those directors had accepted, organised by people outside Bellweather, were not in their calendars at all. Past events are migrated for the person who organised them, which means an attendee of an old meeting receives nothing. Marisol believed a years worth of scheduling history had been destroyed. Yusuf spent an hour on the phone establishing what actually existed and where, which was more than anyone had spent explaining it beforehand. What was resolved was the rules: Bellweather published a recipe for the twenty most common and ran two sessions, and most people rebuilt theirs inside a week. What was deferred was the calendar history. The directors decided they could live without the past and asked for nothing to be done, a decision Marisol did not agree with and did not have the standing to overturn. Yusuf single recommendation in the closing report was that the mail limitations should be walked through with the people who use the mailboxes rather than with the people who own the contract.'),

    ('Sableridge Legal: The Date That Could Not Be Set',
     'Sableridge Legal moved nine hundred users from Slack into Google Chat, and at the same time moved twenty-two terabytes out of Google Shared Drives into SharePoint Online. Both migrations were considered successful by everybody involved for about three weeks. The message side had gone unusually well, which surprised the team, because Slack into Chat is often the route people are most anxious about. Reactions came across, which they do on that route. The code blocks in the technology group runbooks came across as code blocks. Even forwarded messages came across, which they do on no other Slack route. The two things that did not go well were both known: user mentions arrive in a reduced form, because Google Chat cannot fully reproduce them, and where a message carried several files the first arrived as a file and the rest as links. Sableridge accepted both at kickoff and neither generated a complaint. The content side generated the complaint, and it came from the person best placed to make it hurt. Sableridge compliance partner asked her team to show, for a single policy document, when each version had been created, which is a routine request in a regulated firm. Every version in SharePoint carried the same date, which was the date of the migration. Google file versions cannot carry their original creation times into the destination. The system stamps them with the upload time and there is no interface available to override it, so this is not something that can be fixed with a better run or a different setting. Analyst Konstantin Marek had known this and had recorded it in the technical design. Nobody had put it in front of anybody who would recognise what it meant. What was resolved was the immediate audit: the source Shared Drives had not yet been decommissioned, so the original dates were still retrievable, and Konstantin produced an extract covering the nine hundred documents the auditors cared about. What was deferred, and is now urgent, is the decommissioning date, which was three weeks away when the request arrived and has been suspended while Sableridge decides what its record of original dates should be.'),

    ('Corvallis Media: An Archive That Was Not a Record',
     'Corvallis Media had two workstreams that looked unrelated and turned out to share a single wrong assumption. The first was a consolidation of two Microsoft tenants after a merger, moving messaging from Teams into Teams. The second was the retirement of a Dropbox estate into Azure Blob storage, which the finance director had approved as a cheap way to keep nine years of material without paying for a collaboration licence. The Teams consolidation produced the usual list, and the project team had set expectations on all of it. Reactions do not migrate on that route. Forwarded messages do not. The label that shows a message was edited does not, although the edited content itself arrives correctly. Meeting chats and recordings are not carried, because they belong to the meeting rather than the conversation. Bot messages do not come across, and neither do the weekly polls one department had run for years through a third-party application. Corvallis absorbed all of it. What Corvallis had not absorbed was what the Azure archive actually is. Migration lead Aurelie Nkemelu had described it accurately at kickoff as a data dump, and everybody had heard the word cheap rather than the words data dump. It carries the files, it can be re-run to pick up changes, it handles long paths and awkward characters, and it carries Dropbox Paper documents. It does not carry permissions, versions, timestamps or any record of who a file was shared with. Three weeks after the copy the Corvallis general counsel asked whether the archive satisfied their retention obligation, which requires them to show who had access to a document at a given time. It does not, and cannot. What was resolved was the messaging side, which closed on schedule with a punch list of four cosmetic items. What was deferred, and then escalated, was the retention question. Corvallis has not yet decided whether to keep the Dropbox tenant open at the licence cost they were trying to avoid, or to build a separate record of permissions from the source before it is closed. Aurelie has recommended the second and been asked to price it.')
    ) AS v(title, script)
WHERE NOT EXISTS (SELECT 1 FROM seed_state WHERE seed_key = 'l3-listening-bank-v4');

INSERT INTO listening_question (created_at, updated_at, story_id, ordinal, question_text,
                                option_a, option_b, option_c, option_d, correct_option)
SELECT now(), now(), s.id, v.ordinal, v.q, v.a, v.b, v.c, v.d, v.correct
FROM (VALUES
    -- Story 5 -- key: C A D B A C B D A C
    ('Ferngate Insurance: The Weekend Nobody Was Warned About', 1, 'What made the Saturday copy a mistake?',
     'The migration ran more slowly at weekends',
     'The service desk was not staffed on Saturdays',
     'That route cannot suppress the notifications the destination sends, and nobody was warned',
     'Weekend work cost more than the budget allowed', 'C'),
    ('Ferngate Insurance: The Weekend Nobody Was Warned About', 2, 'Why did the old claim channels arrive open?',
     'Archived channels cannot be created through the interface the migration uses',
     'The acquired company had never actually archived them',
     'The migration was configured to reopen them for validation',
     'They were reopened by staff after the cutover', 'A'),
    ('Ferngate Insurance: The Weekend Nobody Was Warned About', 3, 'What kind of problem does the briefing say the open channels were?',
     'A data loss problem',
     'A performance problem',
     'A licensing problem',
     'A governance problem rather than a data one', 'D'),
    ('Ferngate Insurance: The Weekend Nobody Was Warned About', 4, 'Why does the briefing say Delphine was apologising for something that was not a fault?',
     'The notifications were sent by mistake and later withdrawn',
     'The behaviour was working as designed; the failure was in choosing the date without checking it',
     'The service desk had misrouted the calls',
     'The emails came from the source rather than the destination', 'B'),
    ('Ferngate Insurance: The Weekend Nobody Was Warned About', 5, 'What was resolved rather than deferred?',
     'The approach to the second wave of the content copy',
     'The convention for making closed channels obviously closed',
     'The pinned reference material for the claims teams',
     'The compliance officer concerns about the archive', 'A'),
    ('Ferngate Insurance: The Weekend Nobody Was Warned About', 6, 'Roughly how much did the change of approach reduce the call volume?',
     'By about half',
     'By about three quarters',
     'From hundreds of calls to about a dozen',
     'It made no measurable difference', 'C'),
    ('Ferngate Insurance: The Weekend Nobody Was Warned About', 7, 'Why did the claims teams find their reference material where they expected it?',
     'The content migration had copied it into SharePoint first',
     'Their route was the one kind that carries pinned messages',
     'The claims channels had been excluded from the migration',
     'They rebuilt the pins manually before the cutover', 'B'),
    ('Ferngate Insurance: The Weekend Nobody Was Warned About', 8, 'Who noticed the archive problem first, and why does that matter?',
     'The service desk, because they took the calls',
     'Delphine, during her retrospective',
     'The claims teams, because it was their material',
     'The acquired company compliance officer, so it surfaced as a governance concern rather than a support ticket', 'D'),
    ('Ferngate Insurance: The Weekend Nobody Was Warned About', 9, 'What is Delphine closing observation really about?',
     'A technical constraint that is understood is safer than a scheduling decision that is not examined',
     'Content migrations are inherently riskier than message migrations',
     'Weekend cutovers should always be avoided',
     'The acquired company should have been consulted earlier', 'A'),
    ('Ferngate Insurance: The Weekend Nobody Was Warned About', 10, 'Which sentence best summarises the whole briefing?',
     'A content migration that failed and a message migration that succeeded',
     'A project derailed by an acquisition that had not been properly scoped',
     'Two migrations that worked, undone by a date chosen without reading one row of the specification and an archive nobody had thought about',
     'A service desk overwhelmed by a migration that generated too much email', 'C'),

    -- Story 6 -- key: B D A C B A D C A B
    ('Bellweather Trust: What the API Would Not Give Up', 1, 'Why was the file server side accepted so easily?',
     'It was much smaller than the mail migration',
     'What it could not carry were things a file server never really had',
     'The customer had migrated a file server before',
     'It was delivered ahead of the mail workstream', 'B'),
    ('Bellweather Trust: What the API Would Not Give Up', 2, 'Why could the mail rules not be migrated?',
     'They were too numerous to move in the window',
     'Bellweather had not licensed that part of the product',
     'The destination refused to accept them',
     'The source does not expose them in any form that can be read out', 'D'),
    ('Bellweather Trust: What the API Would Not Give Up', 3, 'The briefing distinguishes two reasons for loss on the mail side. What are they?',
     'The source will not give something up, and the destination has nowhere to put it',
     'The scope excluded it, and the budget excluded it',
     'It failed technically, and it was never attempted',
     'The customer refused it, and the consultant advised against it', 'A'),
    ('Bellweather Trust: What the API Would Not Give Up', 4, 'Why were the directors past meetings missing from their calendars?',
     'The mail migration had not finished when Marisol checked',
     'The directors mailboxes were migrated in a later wave',
     'Past events are carried for the organiser, and the directors were attendees',
     'The external organisers had cancelled the meetings', 'C'),
    ('Bellweather Trust: What the API Would Not Give Up', 5, 'What does the briefing suggest about Marisol reaction?',
     'She had been given inaccurate information by the project team',
     'Her conclusion was wrong but reasonable given what she could see',
     'She was overstating the problem to force a response',
     'She should have raised it before the cutover', 'B'),
    ('Bellweather Trust: What the API Would Not Give Up', 6, 'What was resolved rather than deferred?',
     'Rebuilding the mail rules, with a published recipe and two sessions',
     'The directors calendar history',
     'The file server version history',
     'Marisol disagreement with the directors decision', 'A'),
    ('Bellweather Trust: What the API Would Not Give Up', 7, 'Yusuf spent an hour establishing what existed and where. What is the briefing point about that?',
     'The hour should have been billed to the customer',
     'The problem could have been solved faster by a specialist',
     'Marisol should have been able to find it herself',
     'That hour was more than anyone had spent explaining it in advance', 'D'),
    ('Bellweather Trust: What the API Would Not Give Up', 8, 'Why does Yusuf recommend walking the limitations through with mailbox users?',
     'Because the contract owners had not read the scope',
     'Because users can approve change requests faster',
     'Because the people who own the contract are not the people who notice the loss',
     'Because the mail workstream was larger than the content one', 'C'),
    ('Bellweather Trust: What the API Would Not Give Up', 9, 'What do the mail rules and the file server version history have in common?',
     'Both were absent for reasons outside the migration teams control',
     'Both were restored from a source export',
     'Both were raised by Marisol',
     'Both were deferred to a later phase', 'A'),
    ('Bellweather Trust: What the API Would Not Give Up', 10, 'Which sentence best summarises the whole briefing?',
     'A file server migration that succeeded and a mail migration that failed',
     'Two migrations with comparable limits, where the one explained to the right people caused no trouble and the one explained to the wrong people did',
     'A calendar failure that destroyed a years worth of scheduling history',
     'A project undermined by a source platform that would not release its data', 'B'),

    -- Story 7 -- key: D B A C D A C B D A
    ('Sableridge Legal: The Date That Could Not Be Set', 1, 'Why did the message migration go better than the team expected?',
     'It was smaller than the content migration',
     'The runbooks had been simplified before the move',
     'Sableridge had migrated between the two platforms before',
     'That route carries reactions, code blocks and even forwarded messages', 'D'),
    ('Sableridge Legal: The Date That Could Not Be Set', 2, 'Why did every document version show the migration date?',
     'The versions were re-uploaded manually after the copy',
     'Google file versions cannot carry their original times and there is no way to override the stamp',
     'The migration ran with the wrong system clock',
     'SharePoint discards version dates older than a certain age', 'B'),
    ('Sableridge Legal: The Date That Could Not Be Set', 3, 'Why does the briefing say this cannot be fixed by a better run?',
     'Because no interface exists to set those dates at all',
     'Because the source has already been decommissioned',
     'Because the budget for a second run was refused',
     'Because the auditors would not accept a re-run', 'A'),
    ('Sableridge Legal: The Date That Could Not Be Set', 4, 'What was the failure in how the version limitation was handled?',
     'It was discovered only after the migration ran',
     'It was recorded in the wrong document',
     'It was recorded correctly but never shown to anyone who would recognise its significance',
     'Konstantin had not understood it himself', 'C'),
    ('Sableridge Legal: The Date That Could Not Be Set', 5, 'What made the immediate audit recoverable?',
     'The auditors accepted the migration dates',
     'A second copy had been kept in a separate tenant',
     'The versions were rebuilt from the SharePoint history',
     'The source Shared Drives had not yet been decommissioned', 'D'),
    ('Sableridge Legal: The Date That Could Not Be Set', 6, 'What was deferred rather than resolved?',
     'The decommissioning date and what the permanent record of original dates should be',
     'The extract covering the documents the auditors wanted',
     'The reduced form of the user mentions',
     'The handling of messages that carried several files', 'A'),
    ('Sableridge Legal: The Date That Could Not Be Set', 7, 'Why did the two accepted message limitations produce no complaint?',
     'They affected only the technology group',
     'They were fixed during hypercare',
     'They were understood and agreed before the migration began',
     'They were too small for anyone to notice', 'C'),
    ('Sableridge Legal: The Date That Could Not Be Set', 8, 'Why does the briefing say the complaint came from the person best placed to make it hurt?',
     'She was the most senior person at the firm',
     'A compliance partner in a regulated firm asks the question the migration cannot answer',
     'She had opposed the migration from the start',
     'She controlled the budget for the second phase', 'B'),
    ('Sableridge Legal: The Date That Could Not Be Set', 9, 'What would have changed the outcome most?',
     'Choosing a different destination for the content',
     'Migrating the content before the messages',
     'Running the content copy in more waves',
     'Putting the version limitation in front of the compliance partner before the copy', 'D'),
    ('Sableridge Legal: The Date That Could Not Be Set', 10, 'Which sentence best summarises the whole briefing?',
     'The workstream everybody feared went well, and the one nobody questioned produced a problem that cannot be repaired after the source is gone',
     'A message migration that succeeded because the right platform was chosen',
     'A content migration that failed because of a technical fault in the tooling',
     'A regulated firm that should not have attempted two migrations at once', 'A'),

    -- Story 8 -- key: C A B D A C D B A C
    ('Corvallis Media: An Archive That Was Not a Record', 1, 'What did the two workstreams actually share?',
     'The same engineering team',
     'The same destination platform',
     'A single wrong assumption',
     'A common deadline', 'C'),
    ('Corvallis Media: An Archive That Was Not a Record', 2, 'Why did Corvallis absorb the messaging limitations without difficulty?',
     'The project team had set expectations on all of them beforehand',
     'None of them affected more than one department',
     'They were discovered too late to argue about',
     'The finance director had approved them in writing', 'A'),
    ('Corvallis Media: An Archive That Was Not a Record', 3, 'What does the briefing say went wrong in how the archive was described?',
     'Aurelie described it inaccurately at kickoff',
     'Aurelie described it accurately and the customer heard the word cheap',
     'The description was buried in a technical document',
     'The finance director was never given a description', 'B'),
    ('Corvallis Media: An Archive That Was Not a Record', 4, 'Why does the archive fail the retention obligation?',
     'It cannot be re-run to pick up changes',
     'It cannot handle long file paths',
     'It does not carry Dropbox Paper documents',
     'It carries no record of who had access to a document', 'D'),
    ('Corvallis Media: An Archive That Was Not a Record', 5, 'What is the difference between the edited content and the edited label?',
     'The corrected text arrives; the marker showing it was changed does not',
     'The marker arrives; the corrected text does not',
     'Neither arrives on that route',
     'Both arrive but only in channels, not direct messages', 'A'),
    ('Corvallis Media: An Archive That Was Not a Record', 6, 'How many of the messaging limitations named in the briefing concern meetings?',
     'None',
     'One',
     'Two',
     'Four', 'C'),
    ('Corvallis Media: An Archive That Was Not a Record', 7, 'What was deferred rather than resolved?',
     'The four cosmetic items on the messaging punch list',
     'The description of what the archive contains',
     'The migration of the weekly polls',
     'Whether to keep the Dropbox tenant open or build a separate permissions record', 'D'),
    ('Corvallis Media: An Archive That Was Not a Record', 8, 'Why does the briefing call the two workstreams only apparently unrelated?',
     'They were run by the same team at the same time',
     'Both suffered from the customer hearing a summary rather than the substance',
     'Both moved data between Microsoft tenants',
     'Both were approved by the finance director', 'B'),
    ('Corvallis Media: An Archive That Was Not a Record', 9, 'What does the general counsel question reveal about the original approval?',
     'It was made on cost grounds without anyone testing it against the obligation',
     'It was made without the finance director authority',
     'It was based on a competitor recommendation',
     'It was made after the migration had already started', 'A'),
    ('Corvallis Media: An Archive That Was Not a Record', 10, 'Which sentence best summarises the whole briefing?',
     'A messaging consolidation that failed because too many features were unsupported',
     'An archive project that failed for technical reasons during the copy',
     'A messaging migration whose limits were explained and absorbed, beside an archive whose limits were stated and not heard',
     'A merger that should have been completed before either migration began', 'C')
    ) AS v(story_title, ordinal, q, a, b, c, d, correct)
JOIN listening_story s ON s.level = 3 AND s.title = v.story_title
WHERE NOT EXISTS (SELECT 1 FROM seed_state WHERE seed_key = 'l3-listening-bank-v4');

-- ---------- Stories 9 to 12 ----------
-- Story 9 facts: Box to Google is a rich content route, but Box Notes degrade -- tables break,
--   checklists and numbered lists lose their format, mentions are not migrated, tags do not
--   migrate and shared links created for Notes do not migrate. Whiteboard from Mural or Lucid into
--   Miro never carries comments, hand drawing, tables or voting; Lucid additionally loses icons,
--   frames, GIFs and files.
-- Story 10 facts: Outlook to Outlook keeps flagged mail and both importance levels, but drops junk
--   mail, calendar event attachments, categories and contact labels, and supports no second delta.
--   SharePoint to SharePoint carries the standard content checklist.
-- Story 11 facts: LinkEX identifies link files, linked files and paths for My Drive and Shared
--   Drive into OneDrive and SharePoint, produces pre-scan and fix-scan reports and repairs broken
--   links. Workplace from Meta to Google Chat does not carry channel or DM threads, custom emoji,
--   DM reactions, external-user messages, self messaging, bot integrations or pre-scan; pinned
--   posts and mentions arrive as plain text.
-- Story 12 facts: Egnyte carries in-line comments to its two GOOGLE destinations only -- not to
--   SharePoint or OneDrive, where the row is No. Slack into an EXISTING Teams tenant does not carry channel members, direct
--   messages, DM threads, channel renaming or time-period filtering.
INSERT INTO listening_story (created_at, updated_at, title, script, level, difficulty)
SELECT now(), now(), v.title, v.script, 3, 'HARD'
FROM (VALUES
    ('Ashcombe Design: Everything Arrived and Nothing Was Usable',
     'Ashcombe Design ran two migrations for a studio of three hundred people. Content moved from Box into Google, both My Drive and Shared Drives. The whiteboard estate, which at Ashcombe is not a side concern but the place the work actually happens, moved from Mural and Lucid into Miro. On paper both went well. The content route is one of the better ones: version history, permissions inside shared folders, external shares, in-line comments, and Box Notes all carried. Migration lead Theo Vasquez reported ninety-nine point six percent on the content side and was asked, at the following steering committee, why the design teams were so unhappy. The answer was in the detail of two things that had both technically succeeded. Box Notes did migrate, and inside them the tables broke, the checklists and numbered lists lost their formatting, and the mentions vanished entirely. Ashcombe used Notes as project briefs, and a project brief whose task list has lost its structure and whose named owners have disappeared is a document that arrived rather than a document that works. On the whiteboard side, sticky notes, text, connectors, shapes and images all came across. What never comes across on that route, from either source, is comments and voting. Ashcombe ran its design decisions by putting options on a board and having the team vote, and the record of every decision made in the last four years was in exactly those two features. From Lucid there was a further loss, because that source also gives up its frames, icons and any files placed on the board, and Ashcombe used frames to separate one project from another. Theo had listed all of this at kickoff. Studio director Nell Fairbanks had read it and, by her own account, had understood it as a list of minor formatting differences rather than as a description of losing the studio decision history. What was resolved was the project briefs: the Box source was still available, and the team rebuilt forty-one active briefs by hand over two weeks. What was deferred was the four years of board history, because nobody has yet decided whether it is worth the cost of reconstructing, or indeed whether it can be reconstructed at all.'),

    ('Kettleridge Bank: Both Outlook, Both Different',
     'Kettleridge Bank acquired a smaller competitor and had to consolidate two Microsoft estates. Mail moved Outlook to Outlook, nine hundred mailboxes. Content moved SharePoint to SharePoint, sixteen terabytes across two hundred site collections. Migration manager Ottoline Sarr expected the mail side to be the simple one, on the reasonable grounds that both ends were the same product. It was simple in the ways that matter and surprising in the ways that annoy. Flagged mail survived, and so did the high and low importance markers, which are carried on that direction and on no other. What did not survive were the colour categories, and neither did contact labels, junk mail, or the attachments on calendar events. The acquired company office manager, Winifred Achebe, had run her filing on colour categories for eleven years and could not understand how a move between two copies of Outlook could lose something Outlook itself had invented. Ottoline had no good answer beyond the true one, which is that the interface between the two does not expose them. The content side was the opposite shape. It went as designed, and its one difficulty was entirely of Kettleridge own making. The bank had scheduled the release of both source tenants for the end of the month, to stop paying for them, and had done so before anybody established whether a second mail pass would be needed. It would have been, because two acquired departments were still moving work into their old mailboxes during the cutover weekend. Mail supports no second delta in any direction: run one and calendar events and contacts duplicate or conflict. Ottoline found this out four days before the release date. What was resolved was the release: it was pushed by three weeks, at a licence cost Kettleridge absorbed without much argument once the alternative was explained. What was deferred was the categories, and the decision there was to do nothing. Winifred was asked to rebuild her filing using folders. She has, under protest, and has told anyone who asks that the migration was a step backwards, which in her specific case Ottoline privately agrees it was.'),

    ('Marchetti Foods: The Links and the Threads',
     'Marchetti Foods ran two workstreams that between them produced the same complaint from opposite directions. Content moved from Google My Drive into OneDrive for eleven hundred staff, and the internal communications platform moved from Workplace by Meta into Google Chat. The content side had a known characteristic that the project had planned for properly. When Google documents move, links inside them that point at other Google files keep pointing at the old location, which means a migrated document can look perfect and still lead the reader back to a place they no longer have access to. Marchetti bought the link remediation service alongside the migration. The scan found fourteen thousand links needing repair across the estate, which was roughly three times what the pre-sales estimate had suggested, and the fix pass took two evenings. Communications lead Bruno Estrada described that workstream afterwards as the only part of the programme where a problem was found before a user found it. The Workplace side was where the trouble was. Posts, chats, group messages, attachments and the reactions on posts all migrated. What does not migrate on that route is the threads underneath the posts, in channels or in direct messages, and Marchetti head of communications, Delia Ferraro, considered those threads to be the entire point. A post announcing a policy is an announcement. The forty replies underneath it, where the policy was argued about and then modified, are the decision. Also absent were the messages from external users, which mattered because Marchetti ran two supplier groups inside Workplace, and there is no pre-scan available on that route, so nobody could have produced a sizing of what would be lost before committing. What was resolved was the links, completely. What was deferred, and has since become a live problem, is the supplier conversation history, because Marchetti has an open regulatory request that may need it and Workplace is scheduled to close in eleven days. Bruno has asked for the closure to be suspended. He has not yet had an answer.'),

    ('Sonderby Group: Into a House Already Occupied',
     'Sonderby Group acquired a company of four hundred people and had two things to bring across. Content moved from Egnyte into Google Shared Drives, and messaging moved from the acquired company Slack into the Teams tenant Sonderby already ran, which had been in daily use by two thousand people for six years. Consultant Amara Delacroix spent most of her effort explaining the difference between migrating into an empty destination and migrating into an occupied one, and she was not always believed. The content workstream was straightforward and had one pleasant surprise. Egnyte carries in-line comments to its Google destinations and to no others, so the acquired company review history on its supplier contracts came across intact, which their legal team had assumed would be lost and had budgeted three weeks to reconstruct. The messaging workstream was constrained in ways that had nothing to do with the migration tool and everything to do with the destination already being someone home. Migrating into an existing Teams tenant does not bring channel members across, so every migrated channel arrived empty of people and had to be populated afterwards. It does not bring direct messages at all. It does not allow channels to be renamed on the way in, which mattered because both companies had a channel called general and several called projects. Nor can the migration be filtered to a time period, so nine years of history arrived whole into a tenant where Sonderby own retention policy is three years. The acquired company head of operations, Rustam Iskandarov, raised the direct messages as a failure. It is in the scope document, on a page he signed, and Amara had walked him through it at kickoff, which he does not dispute and which did not help. What was resolved was the channel membership: a script populated the migrated channels from the source membership lists in an afternoon. What was deferred was the retention conflict, which Sonderby legal team is still examining, and which nobody had identified as a question until the history was already in the tenant.')
    ) AS v(title, script)
WHERE NOT EXISTS (SELECT 1 FROM seed_state WHERE seed_key = 'l3-listening-bank-v4');

INSERT INTO listening_question (created_at, updated_at, story_id, ordinal, question_text,
                                option_a, option_b, option_c, option_d, correct_option)
SELECT now(), now(), s.id, v.ordinal, v.q, v.a, v.b, v.c, v.d, v.correct
FROM (VALUES
    -- Story 9 -- key: B D A C B A D C A B
    ('Ashcombe Design: Everything Arrived and Nothing Was Usable', 1, 'Why were the design teams unhappy despite a 99.6 percent content result?',
     'Most of their files had failed to migrate',
     'The documents arrived but the parts that made them work did not',
     'The migration ran later than the studio expected',
     'Their permissions had not been carried across', 'B'),
    ('Ashcombe Design: Everything Arrived and Nothing Was Usable', 2, 'Why was the whiteboard result worse than it first appeared?',
     'The boards themselves failed to migrate',
     'The migration was still running when the teams checked',
     'The boards were migrated into the wrong workspace',
     'The two features that never carry are the two that held the decision record', 'D'),
    ('Ashcombe Design: Everything Arrived and Nothing Was Usable', 3, 'What does the briefing mean by a document that arrived rather than a document that works?',
     'It is present and complete but no longer does the job it was made for',
     'It is corrupted and cannot be opened',
     'It arrived in the wrong folder',
     'It is a draft rather than a final version', 'A'),
    ('Ashcombe Design: Everything Arrived and Nothing Was Usable', 4, 'What extra loss came from one of the two whiteboard sources?',
     'Its sticky notes and connectors did not migrate',
     'Its boards could not be opened by internal collaborators',
     'It also gives up frames, icons and files placed on the board',
     'Its comments migrated but its text did not', 'C'),
    ('Ashcombe Design: Everything Arrived and Nothing Was Usable', 5, 'What went wrong in how Nell understood the kickoff list?',
     'She was never shown it',
     'She read it as formatting differences rather than as loss of the decision history',
     'She was given a different list from the one Theo used',
     'She understood it correctly and chose to proceed anyway', 'B'),
    ('Ashcombe Design: Everything Arrived and Nothing Was Usable', 6, 'What was resolved rather than deferred?',
     'Rebuilding the active project briefs from the still-available source',
     'The four years of board decision history',
     'The missing mentions inside the Notes',
     'The frames used to separate one project from another', 'A'),
    ('Ashcombe Design: Everything Arrived and Nothing Was Usable', 7, 'Roughly what rate did the brief rebuild run at?',
     'About forty briefs a day',
     'About one brief a day',
     'About ten briefs a day',
     'About four briefs a day', 'D'),
    ('Ashcombe Design: Everything Arrived and Nothing Was Usable', 8, 'What do the Box Notes and the whiteboard boards have in common?',
     'Both failed to migrate and had to be re-run',
     'Both were excluded from the original scope',
     'Both migrated successfully by any technical measure and failed the people using them',
     'Both were affected by the same destination limit', 'C'),
    ('Ashcombe Design: Everything Arrived and Nothing Was Usable', 9, 'Why is the board history harder to deal with than the briefs?',
     'The source still holds the briefs; the votes and comments may not be reconstructable at all',
     'The briefs were fewer in number',
     'The board history belonged to a different department',
     'The whiteboard sources had already been decommissioned', 'A'),
    ('Ashcombe Design: Everything Arrived and Nothing Was Usable', 10, 'Which sentence best summarises the whole briefing?',
     'A content migration that succeeded and a whiteboard migration that failed',
     'Two migrations that met every technical measure while losing exactly what the studio used them for',
     'A studio that should have kept its whiteboards on the original platform',
     'A project undone by a steering committee that asked the wrong questions', 'B'),

    -- Story 10 -- key: C A D B A C B D A C
    ('Kettleridge Bank: Both Outlook, Both Different', 1, 'Why did Ottoline expect the mail side to be simple?',
     'It was smaller than the content workstream',
     'She had run the same migration for the acquired company before',
     'Both ends were the same product',
     'The acquired company had already prepared its mailboxes', 'C'),
    ('Kettleridge Bank: Both Outlook, Both Different', 2, 'What was the real cause of the difficulty on the content side?',
     'A release date set before anyone had established whether a second mail pass was needed',
     'A technical fault in the SharePoint copy',
     'The two hundred site collections were too many for the window',
     'The acquired company refused to release its content', 'A'),
    ('Kettleridge Bank: Both Outlook, Both Different', 3, 'Why could Ottoline not simply run a second mail pass?',
     'The licence for the source tenant had already expired',
     'The window was too short',
     'The acquired departments had not finished their work',
     'A second pass duplicates or conflicts calendar events and contacts', 'D'),
    ('Kettleridge Bank: Both Outlook, Both Different', 4, 'What is notable about the flags and importance markers?',
     'They were the only things Winifred cared about',
     'They are carried on that mail direction and on no other',
     'They were restored manually after the cutover',
     'They arrived but could not be searched', 'B'),
    ('Kettleridge Bank: Both Outlook, Both Different', 5, 'Why did Ottoline have no good answer for Winifred?',
     'The true answer, that the interface does not expose them, does not help someone who has lost eleven years of filing',
     'She did not know why the categories were missing',
     'She had promised Winifred they would migrate',
     'The categories could have been migrated with a different tool', 'A'),
    ('Kettleridge Bank: Both Outlook, Both Different', 6, 'What was resolved rather than deferred?',
     'Winifred filing system',
     'The attachments on calendar events',
     'The tenant release date, pushed by three weeks',
     'The retention of junk mail', 'C'),
    ('Kettleridge Bank: Both Outlook, Both Different', 7, 'Why did Kettleridge absorb the licence cost without much argument?',
     'It was small relative to the programme',
     'The alternative had been explained to them',
     'The acquired company paid for it',
     'They had budgeted for it at the start', 'B'),
    ('Kettleridge Bank: Both Outlook, Both Different', 8, 'What does the briefing imply by calling the two workstreams opposite shapes?',
     'One moved mail and the other moved documents',
     'One was on schedule and the other was late',
     'One was larger in volume than the other',
     'One was surprising in itself; the other went as designed and was undone by a decision around it', 'D'),
    ('Kettleridge Bank: Both Outlook, Both Different', 9, 'Why does Ottoline privately agree with Winifred?',
     'For her specific way of working, the result genuinely is worse than before',
     'Because the migration had a technical fault',
     'Because she believes the wrong destination was chosen',
     'Because the categories could have been preserved with more time', 'A'),
    ('Kettleridge Bank: Both Outlook, Both Different', 10, 'Which sentence best summarises the whole briefing?',
     'A mail migration that failed because two Outlook systems are not really the same',
     'A content consolidation delayed by a technical fault in the copy',
     'A consolidation where the same-product assumption cost the mail side, and a decision taken too early cost the schedule',
     'An acquisition that should have been completed before either migration began', 'C'),

    -- Story 11 -- key: A C B D A B D C A B
    ('Marchetti Foods: The Links and the Threads', 1, 'What is the characteristic of migrated Google documents that Marchetti planned for?',
     'Links inside them keep pointing at the old location',
     'Their version history is discarded at the destination',
     'They convert to a different format on arrival',
     'Their permissions are reset to private', 'A'),
    ('Marchetti Foods: The Links and the Threads', 2, 'Why were the Workplace threads the serious loss?',
     'They contained the only copy of the company policies',
     'They were the largest part of the data by volume',
     'The argument and modification of a policy lived in the replies, not the post',
     'They were the only content the regulator had asked about', 'C'),
    ('Marchetti Foods: The Links and the Threads', 3, 'What does Bruno mean by the only part where a problem was found before a user found it?',
     'The migration ran without any errors at all',
     'The scan surfaced the broken links in advance rather than leaving users to hit them',
     'The users were trained before the cutover',
     'The problem was found by the supplier rather than by Marchetti', 'B'),
    ('Marchetti Foods: The Links and the Threads', 4, 'Why could nobody size the Workplace loss before committing?',
     'The Workplace estate was too large to survey',
     'Marchetti had not paid for a survey',
     'The threads were not visible to administrators',
     'There is no pre-scan available on that route', 'D'),
    ('Marchetti Foods: The Links and the Threads', 5, 'What made the supplier conversation history urgent rather than merely regrettable?',
     'An open regulatory request may need it and the source closes in eleven days',
     'The suppliers have asked for it to be returned',
     'It was the largest group in the Workplace estate',
     'It contained the only record of pricing agreements', 'A'),
    ('Marchetti Foods: The Links and the Threads', 6, 'How did the link scan compare with what had been sold?',
     'It found about the same number as estimated',
     'It found roughly three times the estimate',
     'It found about half the estimate',
     'It found fourteen times the estimate', 'B'),
    ('Marchetti Foods: The Links and the Threads', 7, 'What was deferred rather than resolved?',
     'The repair of the fourteen thousand links',
     'The migration of posts and attachments',
     'The reactions on Workplace posts',
     'The fate of the supplier conversation history', 'D'),
    ('Marchetti Foods: The Links and the Threads', 8, 'What is the contrast the briefing draws between the two workstreams?',
     'One was cheap and the other expensive',
     'One was in scope and the other a change request',
     'One had a known risk that was bought out in advance; the other had a known loss with no way to measure it beforehand',
     'One affected staff and the other affected suppliers', 'C'),
    ('Marchetti Foods: The Links and the Threads', 9, 'What does the phrase a migrated document can look perfect and still lead the reader back describe?',
     'A file that arrived intact but whose internal links still point at the source',
     'A file that failed to migrate but appears in the destination index',
     'A file whose formatting was lost during conversion',
     'A file that was migrated twice', 'A'),
    ('Marchetti Foods: The Links and the Threads', 10, 'Which sentence best summarises the whole briefing?',
     'A content migration that failed and a communications migration that succeeded',
     'A programme where the risk that was paid for was contained, and the risk that could not even be measured was not',
     'A regulatory failure caused by closing a platform too early',
     'A communications migration that lost data because of a fault in the tooling', 'B'),

    -- Story 12 -- key: D B C A D A B C D A
    ('Sonderby Group: Into a House Already Occupied', 1, 'What was Amara main point, and why was it hard to get across?',
     'That Slack and Teams work differently',
     'That the acquired company should keep its own tenant',
     'That two migrations should never run together',
     'That migrating into an occupied destination is not the same as migrating into an empty one', 'D'),
    ('Sonderby Group: Into a House Already Occupied', 2, 'Why did the migrated channels arrive empty of people?',
     'The membership lists had not been exported',
     'Migrating into an existing tenant does not bring channel members across',
     'The acquired company staff had not yet been given licences',
     'The channels were migrated before the users were created', 'B'),
    ('Sonderby Group: Into a House Already Occupied', 3, 'Why did the channel naming matter?',
     'Sonderby policy forbids duplicate channel names',
     'The acquired company channels had unsupported characters',
     'Channels cannot be renamed on the way in, and both companies had channels with the same names',
     'The destination tenant had run out of channel capacity', 'C'),
    ('Sonderby Group: Into a House Already Occupied', 4, 'What was the pleasant surprise on the content side?',
     'The review history on supplier contracts came across, which legal had budgeted to rebuild',
     'The migration finished three weeks early',
     'The Egnyte source needed no renaming work',
     'The Google Shared Drives cost less than expected', 'A'),
    ('Sonderby Group: Into a House Already Occupied', 5, 'Why did Amara walking Rustam through the scope not help?',
     'He had not attended the kickoff',
     'He disputes that the conversation took place',
     'The scope document was written after the kickoff',
     'Understanding a limitation in advance does not make losing the data acceptable', 'D'),
    ('Sonderby Group: Into a House Already Occupied', 6, 'What was resolved rather than deferred?',
     'Populating the migrated channels from the source membership lists',
     'The retention conflict on nine years of history',
     'The direct messages Rustam raised',
     'The duplicate channel names', 'A'),
    ('Sonderby Group: Into a House Already Occupied', 7, 'Why did nine years of history become a problem?',
     'It exceeded the storage available in the destination tenant',
     'The route cannot be filtered to a time period, and Sonderby retention policy is three years',
     'The acquired company had not archived it correctly',
     'It slowed the migration beyond the window', 'B'),
    ('Sonderby Group: Into a House Already Occupied', 8, 'What do the missing members, the naming and the retention issue have in common?',
     'All were caused by the same configuration error',
     'All were raised by Rustam',
     'All follow from the destination already being in use rather than from the tool',
     'All were resolved before go-live', 'C'),
    ('Sonderby Group: Into a House Already Occupied', 9, 'How much work had the acquired company legal team expected on the review history?',
     'An afternoon',
     'Eleven days',
     'Six years',
     'Three weeks', 'D'),
    ('Sonderby Group: Into a House Already Occupied', 10, 'Which sentence best summarises the whole briefing?',
     'A content migration that exceeded expectations, and a messaging migration whose limits all came from moving into a tenant somebody already lived in',
     'A messaging migration that failed because direct messages could not be carried',
     'An acquisition where the acquired company was not properly consulted',
     'A retention policy that made the migration impossible to complete', 'A')
    ) AS v(story_title, ordinal, q, a, b, c, d, correct)
JOIN listening_story s ON s.level = 3 AND s.title = v.story_title
WHERE NOT EXISTS (SELECT 1 FROM seed_state WHERE seed_key = 'l3-listening-bank-v4');

-- ---------- Stories 13 to 16 ----------
-- Story 13 facts: Dropbox to OneDrive carries versions, permissions, external shares, shared
--   links, timestamps and embedded links, but in-line comments are No on every Dropbox route.
--   Chat to Teams carries reactions and channel threads; custom emoji and reactions do not
--   migrate, and time-period filtering works on channels only.
-- Story 14 facts: ShareFile to Google My Drive has no delta, no folder display, no shared links
--   and no external shares. The Slack to Teams DMs-to-Channels variant deliberately migrates no
--   channels at all -- no public or private channels, no channel members, no channel threads --
--   and does not carry reactions or forwarded messages.
-- Story 15 facts: Box to Dropbox loses inner file permissions and embedded links but keeps
--   versions, external shares, shared links, timestamps and Box Notes. Chat to Chat carries
--   reactions and threads, has no pinned message concept at all, does not carry custom emoji, and
--   can filter only channels by time period.
-- Story 16 facts: SharePoint Online to Egnyte preserves hierarchy but caps names at 200
--   characters, and Egnyte itself forbids names that start or end with a space. The Slack to Chat
--   DMs-to-Spaces variant migrates no channels, carries DM threads, but no reactions and no
--   pinned messages.
INSERT INTO listening_story (created_at, updated_at, title, script, level, difficulty)
SELECT now(), now(), v.title, v.script, 3, 'HARD'
FROM (VALUES
    ('Thornbury Pharma: The Comments Nobody Asked About',
     'Thornbury Pharma ran a Dropbox to OneDrive content migration for six hundred staff alongside a Google Chat to Teams messaging migration. Both were delivered inside their windows and the closing report described both as clean. Migration lead Sanjay Ravikumar has since said he would write that report differently. The messaging side was genuinely clean. Chat into Teams carries reactions, which mattered because Thornbury quality team used them to mark a review as complete, and it carries the threads underneath channel messages, which is where their investigations are discussed. Two things did not carry and neither caused a problem: the custom emoji Thornbury had made for its site names, which arrive as plain names, and the ability to filter direct messages by date, because on that route the time filter applies to channels only. Thornbury wanted everything anyway. The content side is where Sanjay report was too confident. Dropbox into OneDrive is a strong route. Version history, folder and file permissions, external shares to Thornbury contract research organisations, sharing links and original timestamps all came across. What does not come across, on any Dropbox route at all, is the comments left on files. Thornbury regulatory affairs group had spent four years reviewing protocol documents by commenting on them in Dropbox, and treating the comment thread as the review record. Nobody asked about comments during scoping, because nobody on the project team thought of them as content and nobody in regulatory affairs thought of them as anything other than obviously part of the document. The loss was found eleven weeks after go-live by an auditor. What was resolved was the immediate audit finding: the Dropbox tenant had not been closed, and the comments were exported to a structured file that regulatory affairs now maintains alongside the documents. What was deferred is whether that file is an acceptable long-term record, which Thornbury quality assurance function has not ruled on. Sanjay lesson, recorded in the retrospective, was that the scoping conversation asks what data you have and should ask what you would need to prove.'),

    ('Larkspur Consulting: A Migration That Moved No Channels',
     'Larkspur Consulting had an unusual pair of workstreams. The content side moved ShareFile into Google My Drive. The messaging side used the Slack to Teams route that migrates direct messages into channels, which Larkspur had chosen deliberately: the firm ran almost all of its client work through private conversations between consultants, and wanted those conversations to become searchable team channels in Teams. Consultant Beatrix Nwachukwu was clear at kickoff about what that route does and does not do, and the second half of that sentence is longer than the first. It migrates direct messages. It does not migrate channels at all. Not the public ones, not the private ones, not their members and not the threads underneath them. Larkspur had about ninety channels, mostly administrative, and accepted losing them. What they had not thought through was that reactions and forwarded messages do not come across on that route either, and the consultants used forwarded messages constantly, moving a client question from one conversation to another rather than retyping it. In the destination those forwards are simply absent, which leaves a number of conversations that no longer make sense on their own. The content side had a constraint Beatrix had also stated plainly and which Larkspur also underestimated. ShareFile supports no delta pass to any destination, and to Google specifically it carries no external shares and no sharing links. Larkspur shares draft reports with clients by link as a matter of routine. Every one of those links stopped working, and reissuing them was a manual exercise across four hundred and ten active engagements. What was resolved was the links, over three weeks, by two people working through the engagement list. What was deferred was the conversation coherence problem, because there is nothing to do about it: the forwarded content exists in the source Slack, which Larkspur is contractually obliged to close at the end of the quarter. Beatrix has recommended they export it first. The managing partner has not yet decided whether that is worth the cost.'),

    ('Oriel Publishing: The Pin That Had Nowhere To Go',
     'Oriel Publishing moved content from Box into Dropbox and messaging from Google Chat into a second Google Chat tenant, following the sale of one of its imprints. Both migrations were between platforms the customer already knew, which programme manager Isolde Kavanagh later identified as the reason nobody asked enough questions. The content route is decent but not complete. Versions, external shares, sharing links, original timestamps and Box Notes all carried. Two things did not: the permissions on individual files sitting inside shared folders, and the embedded links inside documents. The first mattered because Oriel editorial teams had used exactly that mechanism to keep an author contract visible to three people inside a folder the whole department could see. After the migration those contracts inherited the folder permission, which is to say the whole department could read them. Nobody noticed for nine days. The messaging side was between two copies of the same product, which Oriel took to mean nothing could go wrong. Reactions carried. Threads carried. What Oriel had not considered is that Google Chat has no pinned message concept at all, so the pinning they had done in the source had nothing to arrive as, and the custom emoji they had built for each imprint arrived as plain names. The pinning mattered more than it sounds: each editorial space pinned its current schedule, and after the migration those schedules were ordinary messages somewhere in the history. What was resolved, and quickly, was the contract exposure. Isolde escalated it the day it was found, the folders were restructured over a weekend, and Oriel data protection officer accepted the nine-day window as a reportable but contained incident. What was deferred was the schedules, and the decision was to change the practice rather than restore it: each space now keeps its schedule as a document in the migrated content estate, which several editors say is better and one says is worse. Isolde retrospective makes one point. The two platforms being familiar made the customer confident, and confidence is what stopped anybody reading the feature list.'),

    ('Vantry Housing: Two Hundred Characters and a Space',
     'Vantry Housing moved fourteen terabytes from SharePoint Online into Egnyte and, in the same programme, moved its Slack direct messages into Google Chat spaces using the route designed for that purpose. The content side ran into two naming problems that sound like one and are not. The first is a length limit: Egnyte accepts a shorter file and folder name than SharePoint does, capped at two hundred characters, and Vantry had a housing case management practice of naming every document after the property address, the tenant, the case reference and the date. Several thousand exceeded it. The second is stricter and less well known. Egnyte does not permit a name that begins or ends with a space, and will not let one be created, so files whose names had a trailing space in SharePoint could not be written at all rather than merely being truncated. Analyst Ekaterina Volkova had to handle the two differently: the long names were shortened by rule, and the space-terminated ones had to be identified and trimmed before anything else would work. The messaging side did exactly what that route is designed to do and nothing more. Direct messages became spaces, and the threads underneath them came with them, which is the whole reason Vantry chose it. Channels are not migrated on that route at all, which Vantry knew and accepted, having decided their channels were transient. Reactions are not carried and neither are pinned messages. The housing officers used reactions to indicate they had picked up a case, and this was raised as a defect four days after go-live by a team leader who had not been at any of the briefings. What was resolved was the naming, entirely: every file eventually copied, and Ekaterina rule set has since been reused on two other projects. What was deferred was the case pickup practice, which Vantry is redesigning around a shared list rather than reactions, and which will not be ready before the end of the quarter. Ekaterina noted in the closing report that the two naming problems needed different fixes and that treating them as one would have wasted a fortnight.')
    ) AS v(title, script)
WHERE NOT EXISTS (SELECT 1 FROM seed_state WHERE seed_key = 'l3-listening-bank-v4');

INSERT INTO listening_question (created_at, updated_at, story_id, ordinal, question_text,
                                option_a, option_b, option_c, option_d, correct_option)
SELECT now(), now(), s.id, v.ordinal, v.q, v.a, v.b, v.c, v.d, v.correct
FROM (VALUES
    -- Story 13 -- key: C A B D A C D B A C
    ('Thornbury Pharma: The Comments Nobody Asked About', 1, 'Why does Sanjay say he would write the closing report differently?',
     'The messaging migration turned out to have failed',
     'The budget was reported incorrectly',
     'He described the content side as clean when a significant loss had not yet surfaced',
     'The windows had been missed on both workstreams', 'C'),
    ('Thornbury Pharma: The Comments Nobody Asked About', 2, 'Why did the two messaging limitations cause no problem?',
     'Neither affected anything Thornbury actually relied on',
     'They were fixed during hypercare',
     'They were discovered before the migration ran',
     'They affected only the quality team', 'A'),
    ('Thornbury Pharma: The Comments Nobody Asked About', 3, 'Why did nobody raise the file comments during scoping?',
     'They were listed in the scope document and overlooked',
     'Each side assumed the other had a different view of what a document is',
     'Regulatory affairs was not consulted at all',
     'The project team knew and decided not to mention them', 'B'),
    ('Thornbury Pharma: The Comments Nobody Asked About', 4, 'What made the audit finding recoverable?',
     'The comments had been backed up separately',
     'The auditor accepted the documents without them',
     'OneDrive retained a hidden copy',
     'The source tenant had not been closed', 'D'),
    ('Thornbury Pharma: The Comments Nobody Asked About', 5, 'What was deferred rather than resolved?',
     'Whether the exported comment file is an acceptable long-term record',
     'The export of the comments themselves',
     'The migration of the reactions used by the quality team',
     'The handling of the custom emoji', 'A'),
    ('Thornbury Pharma: The Comments Nobody Asked About', 6, 'How long after go-live was the loss found, and by whom?',
     'Four days, by regulatory affairs',
     'Nine days, by the quality team',
     'Eleven weeks, by an auditor',
     'Four years, by Sanjay', 'C'),
    ('Thornbury Pharma: The Comments Nobody Asked About', 7, 'What is the point of Sanjay lesson about scoping?',
     'Scoping should be done by the customer rather than the vendor',
     'Scoping should include a technical inventory of every file type',
     'Scoping should always be repeated after go-live',
     'Asking what data exists misses what has to be provable', 'D'),
    ('Thornbury Pharma: The Comments Nobody Asked About', 8, 'What separates the comment loss from the two messaging losses?',
     'The comment loss was outside the signed scope',
     'The comments carried an obligation; the messaging items carried only convenience',
     'The comments were larger in volume',
     'The messaging losses were recoverable and the comments were not', 'B'),
    ('Thornbury Pharma: The Comments Nobody Asked About', 9, 'What does the briefing suggest about calling a migration clean?',
     'It can be true of everything measured and still miss what was never looked for',
     'It should never be said before hypercare ends',
     'It requires sign-off from an auditor',
     'It is a judgement only the customer can make', 'A'),
    ('Thornbury Pharma: The Comments Nobody Asked About', 10, 'Which sentence best summarises the whole briefing?',
     'A messaging migration that succeeded and a content migration that failed technically',
     'A regulatory failure caused by closing a source platform too early',
     'Two migrations that delivered what was asked for, where the loss that mattered was the one nobody thought to ask about',
     'A project undone by a route that could not carry reactions', 'C'),

    -- Story 14 -- key: B D A C B A C D B A
    ('Larkspur Consulting: A Migration That Moved No Channels', 1, 'Why did Larkspur choose a route that migrates no channels?',
     'It was the cheapest option available',
     'Their client work lived in private conversations they wanted to become searchable channels',
     'Their channels had already been archived',
     'It was the only route their Slack licence supported', 'B'),
    ('Larkspur Consulting: A Migration That Moved No Channels', 2, 'What had Larkspur not thought through about that route?',
     'That it would take longer than a standard migration',
     'That their channels would be lost',
     'That direct messages would become channels',
     'That reactions and forwarded messages do not come across either', 'D'),
    ('Larkspur Consulting: A Migration That Moved No Channels', 3, 'Why do some migrated conversations no longer make sense?',
     'The forwarded content that gave them their context is absent',
     'The messages arrived out of order',
     'The consultants who wrote them have left the firm',
     'The threads were flattened into a single list', 'A'),
    ('Larkspur Consulting: A Migration That Moved No Channels', 4, 'Why did every client draft-report link stop working?',
     'The links pointed at a tenant that had been closed',
     'Google requires links to be recreated after any migration',
     'That content route carries no sharing links to the destination',
     'The clients had not been re-invited', 'C'),
    ('Larkspur Consulting: A Migration That Moved No Channels', 5, 'What do the missing forwards and the missing links have in common?',
     'Both were caused by the same configuration error',
     'Both were documented limits that Larkspur underestimated rather than misunderstood',
     'Both were resolved within three weeks',
     'Both were raised by clients rather than by staff', 'B'),
    ('Larkspur Consulting: A Migration That Moved No Channels', 6, 'What was resolved rather than deferred?',
     'Reissuing the client links across the active engagements',
     'The coherence of the migrated conversations',
     'The loss of the ninety channels',
     'The export of the source Slack workspace', 'A'),
    ('Larkspur Consulting: A Migration That Moved No Channels', 7, 'Why is there nothing to do about the conversation coherence problem?',
     'The consultants cannot remember what was forwarded',
     'The destination cannot display forwarded content',
     'The forwarded content exists only in a source the firm must close',
     'The clients have refused permission to restore it', 'C'),
    ('Larkspur Consulting: A Migration That Moved No Channels', 8, 'Roughly what rate did the link reissue work run at?',
     'About four hundred engagements a day',
     'About forty engagements a day',
     'About four engagements a day',
     'About seventy engagements per person per week', 'D'),
    ('Larkspur Consulting: A Migration That Moved No Channels', 9, 'What is Beatrix recommendation really protecting against?',
     'The cost of keeping the Slack tenant open',
     'Losing the only remaining copy of the forwarded content when the source closes',
     'A dispute with the clients over the draft reports',
     'The managing partner changing the scope again', 'B'),
    ('Larkspur Consulting: A Migration That Moved No Channels', 10, 'Which sentence best summarises the whole briefing?',
     'A firm that chose both routes deliberately and was caught by the second half of what each route does not do',
     'A migration that failed because the wrong route was selected',
     'A content migration that succeeded and a messaging migration that failed',
     'A consultancy that should not have closed its source platforms', 'A'),

    -- Story 15 -- key: D B A C D A B C A D
    ('Oriel Publishing: The Pin That Had Nowhere To Go', 1, 'What did the familiarity of the platforms actually cause?',
     'The migration was completed faster than planned',
     'The customer chose the wrong destination',
     'The project team skipped the technical design',
     'Nobody asked enough questions about what the routes carry', 'D'),
    ('Oriel Publishing: The Pin That Had Nowhere To Go', 2, 'Why did the author contracts become readable by the whole department?',
     'The folder permission was changed during the migration',
     'The permission on individual files inside a shared folder does not carry on that route',
     'The contracts were moved into a different folder',
     'The editorial teams had shared them deliberately', 'B'),
    ('Oriel Publishing: The Pin That Had Nowhere To Go', 3, 'Why did the pinned schedules have nothing to arrive as?',
     'The destination platform has no pinned message concept at all',
     'The pins were removed from the source before the migration',
     'The schedules were stored as attachments rather than messages',
     'Pinning is only supported in channels, not spaces', 'A'),
    ('Oriel Publishing: The Pin That Had Nowhere To Go', 4, 'Why does the briefing say the pinning mattered more than it sounds?',
     'The pins were the only record of who had read a schedule',
     'The pins carried the imprint branding',
     'A pinned schedule became an ordinary message lost somewhere in the history',
     'The editors had spent years building them', 'C'),
    ('Oriel Publishing: The Pin That Had Nowhere To Go', 5, 'What was resolved rather than deferred?',
     'The custom emoji for each imprint',
     'The embedded links inside documents',
     'The current editorial schedules',
     'The contract exposure, by restructuring the folders', 'D'),
    ('Oriel Publishing: The Pin That Had Nowhere To Go', 6, 'How was the schedule problem eventually handled?',
     'By changing the practice rather than restoring what was lost',
     'By re-running the messaging migration',
     'By pinning the schedules again in the destination',
     'By reverting to the source tenant', 'A'),
    ('Oriel Publishing: The Pin That Had Nowhere To Go', 7, 'What made the contract exposure containable?',
     'The contracts were encrypted',
     'It was escalated the day it was found and the window was defined',
     'Nobody in the department opened them',
     'The data protection officer had approved it in advance', 'B'),
    ('Oriel Publishing: The Pin That Had Nowhere To Go', 8, 'What do the file permissions and the pinned messages have in common?',
     'Both were restored from the source platforms',
     'Both were raised by Oriel data protection officer',
     'Both were losses the customer did not think to check because the platforms felt familiar',
     'Both were caused by the same route limitation', 'C'),
    ('Oriel Publishing: The Pin That Had Nowhere To Go', 9, 'What is the significance of one editor saying the new practice is worse?',
     'The change was a genuine trade-off rather than a clean improvement',
     'The migration should be reversed',
     'The other editors were not consulted',
     'The schedules should have been migrated as messages', 'A'),
    ('Oriel Publishing: The Pin That Had Nowhere To Go', 10, 'Which sentence best summarises the whole briefing?',
     'A content migration that exposed confidential documents through a technical fault',
     'A messaging migration that failed because two Chat tenants are not identical',
     'A publisher that should have kept its imprint on the original platforms',
     'Two migrations between familiar platforms, where familiarity replaced the checking that would have caught both problems', 'D'),

    -- Story 16 -- key: A C B D A B D C A B
    ('Vantry Housing: Two Hundred Characters and a Space', 1, 'What made Vantry naming practice a problem at the destination?',
     'Their naming convention produced names longer than the destination accepts',
     'Their names contained characters the source had generated',
     'The case references duplicated across properties',
     'The destination required names to be unique across the estate', 'A'),
    ('Vantry Housing: Two Hundred Characters and a Space', 2, 'Why were the two naming problems not really one problem?',
     'One affected files and the other affected folders',
     'One was found before the copy and the other after it',
     'One could be truncated by rule; the other prevented the file being written at all',
     'One came from the source and the other from Vantry own policy', 'C'),
    ('Vantry Housing: Two Hundred Characters and a Space', 3, 'Why did Vantry choose the direct-message route for messaging?',
     'It was the fastest option available',
     'They wanted direct messages and their threads to become spaces',
     'Their channels could not be migrated by any route',
     'It was the only route that carried reactions', 'B'),
    ('Vantry Housing: Two Hundred Characters and a Space', 4, 'Why was the missing reaction practice raised as a defect?',
     'The route was expected to carry reactions',
     'The housing officers had not been trained on the destination',
     'The team leader had been told reactions would migrate',
     'The person raising it had not attended any of the briefings', 'D'),
    ('Vantry Housing: Two Hundred Characters and a Space', 5, 'What was resolved rather than deferred?',
     'The naming, with every file eventually copied',
     'The case pickup practice',
     'The migration of the channels',
     'The pinned messages in the housing spaces', 'A'),
    ('Vantry Housing: Two Hundred Characters and a Space', 6, 'What does Ekaterina say treating the two naming problems as one would have cost?',
     'Three weeks',
     'A fortnight',
     'Four days',
     'A quarter', 'B'),
    ('Vantry Housing: Two Hundred Characters and a Space', 7, 'Why does the briefing say the messaging route did what it was designed to do and nothing more?',
     'It migrated fewer messages than expected',
     'It ran faster than the content workstream',
     'It carried channels as well as direct messages',
     'It carried the direct messages and their threads and left everything else behind', 'D'),
    ('Vantry Housing: Two Hundred Characters and a Space', 8, 'Why does the reuse of Ekaterina rule set on two other projects matter?',
     'It reduced the cost of the Vantry programme',
     'It proved the naming problem was not Vantry fault',
     'A difficulty handled properly once became an asset rather than a repeated cost',
     'It allowed the channels to be migrated later', 'C'),
    ('Vantry Housing: Two Hundred Characters and a Space', 9, 'What separates the naming difficulty from the case pickup difficulty?',
     'One had a technical fix and the other needs a change in how people work',
     'One affected the content side and the other the customer budget',
     'One was in scope and the other was not',
     'One was found before go-live and the other during the copy', 'A'),
    ('Vantry Housing: Two Hundred Characters and a Space', 10, 'Which sentence best summarises the whole briefing?',
     'A content migration blocked by a destination that could not accept the customer file names',
     'A programme where the content problems were solved by rules and the messaging problem needed a new working practice',
     'A messaging migration that failed because reactions could not be carried',
     'A housing provider that chose the wrong route for its direct messages', 'B')
    ) AS v(story_title, ordinal, q, a, b, c, d, correct)
JOIN listening_story s ON s.level = 3 AND s.title = v.story_title
WHERE NOT EXISTS (SELECT 1 FROM seed_state WHERE seed_key = 'l3-listening-bank-v4');

INSERT INTO seed_state (seed_key) VALUES ('l3-listening-bank-v4') ON CONFLICT DO NOTHING;
