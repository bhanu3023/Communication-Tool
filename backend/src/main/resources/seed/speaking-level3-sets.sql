-- =====================================================================
-- Level 3 Speaking: spoken ANSWER questions, graduated length.
--
-- REWRITTEN AGAINST THE MIGRATION DOCUMENTATION (v3). The previous bank was audited against the
-- feature matrices and three claims were wrong, one of them repeated eight times:
--   * "Slack to Chat loses message formatting, runbooks arrive as plain text" -- inverted. The
--     matrix gives Slack to Chat code format, block quote AND code block. Slack to TEAMS is the
--     combination whose formatting stops at ordered lists.
--   * "Threaded replies in Chat arrived in Teams as one flat post" -- channel threads are Yes for
--     Chat to Teams. Flattening is a DM behaviour, and a channel behaviour only in the
--     DMs-to-Channels and DMs-to-Spaces variants.
--   * Slack to Teams described as carrying "reactions and pinned posts" -- reactions are No and
--     pinned is NA for that combination.
-- It also used six platform names in total, leaving Box, Dropbox, Egnyte, ShareFile, Amazon
-- WorkDocs, NFS/SMB, Azure Blob, Whiteboard, Workplace, LinkEX, Teams to Slack and Chat to Slack
-- entirely unused. Every set below is now built on a different documented combination, and every
-- limitation named in a question is one the matrices actually record.
--
-- LENGTH LADDER -- a candidate meets a compact question first and the longest last. Roughly:
--   Q1 ~30 words - Q2 ~38 - Q3 ~45 - Q4 ~52 - Q5 ~62 - Q6 ~75 - Q7 ~86 - Q8 ~95
--
-- ASK ROTATION. The old bank asked the same five things in the same order in all twelve sets --
-- check first, investigate, assess, assess, go or no-go -- so one set taught a candidate the
-- shape of the other eleven. Ten ask types now rotate, and no two sets run them in the same order:
--   (A) where would you start  (B) one problem or two  (C) what do you say on the call now
--   (D) which do you sequence first  (E) assess this proposal  (F) explain to a non-technical
--   stakeholder  (G) go or no-go  (H) what would you have established before quoting
--   (I) you disagree with a colleague or the customer  (J) name the risk nobody has raised
--
-- Everything else from the specification holds: TWO connected migration workstreams, a real
-- dependency between them, the cause never stated, no platform pairing used twice, failure
-- patterns rotated.
--
-- 12 sets of 8, raised from 5 (2026-09-03). At five items each answer carried 20 percent of the
-- section score, against 10 percent at Levels 1 and 2 -- and Level 3 has the highest pass mark of
-- the three, so the level with the least tolerance for one weak answer had the highest bar. Eight
-- brings that to 12.5 percent. Eight at the 180-second advisory is 24 minutes, still inside the
-- 25-minute section timer in SpeakingService, and nothing reads a fixed count: the backend serves
-- whatever the set holds and the UI counts the list it is given.
--
-- Scored by AiService.scoreSpokenAnswer -- the candidate answers aloud in their own words and the
-- ANSWER is judged, not an echo.
--
-- Avoid apostrophes: these are single-quoted SQL literals.
-- =====================================================================
DELETE FROM speaking_sentence WHERE level = 3
  AND NOT EXISTS (SELECT 1 FROM seed_state WHERE seed_key = 'l3-speaking-questions-v3');

-- ---------- Sets 1 to 6 ----------
INSERT INTO speaking_sentence (created_at, updated_at, text, set_number, level, difficulty)
SELECT now(), now(), v.text, v.set_number, 3, 'HARD'
FROM (VALUES
    -- Set 1: Box for Business to OneDrive + Slack to Teams.  Asks A, C, E, J, F
    -- Docs: Box to OneDrive carries inner file permissions, external shares, shared links and
    -- in-line comments. Slack to Teams does NOT carry reactions, and DM replies are not migrated.
    ('A Box to OneDrive copy and a Slack to Teams cutover run the same fortnight. Box is on schedule; the Slack pre-scan has not been signed off. Where would you start?', 1),
    ('An hour into the Slack cutover a department lead calls to say the emoji responses their team used to sign off on shift changes are gone from every migrated channel. She wants them restored today. What do you say to her on that call?', 1),
    ('The customer proposes cutting the Box in-line comments out of scope to buy back three days, arguing that comments are not documents. Their legal team uses those comments to record review decisions. Assess that proposal and tell me what you would recommend.', 1),
    ('Both workstreams are green. Box has copied with permissions intact, Slack channels have moved, and the customer is preparing to tell staff the migration is complete. Reading only what I have told you, name the risk nobody on this project has raised yet, and say why it will surface after go-live rather than before.', 1),
    ('A finance director who has never run a migration asks you why the Box side could reproduce every permission exactly, right down to who could see one file inside a shared folder, while the Slack side could not bring across something as simple as a thumbs-up on a message. Explain that difference to her in a way she can repeat to her board.', 1),
    ('Two complaints land on the same morning. The finance team says a folder they could reach last week now shows them nothing at all, and the operations group says a set of conversations they were promised in Teams are not there. The content workstream reports every permission applied successfully and the message workstream reports every channel complete. Are these one problem or two, and what would you establish first to find out?', 1),
    ('You are asked for a go or no-go on switching Box to read-only at the end of the week. The copy into OneDrive has completed with permissions, external shares and comments intact, and validation has been signed off by two of five departments. The Slack to Teams side is finished but the operations group is still working out how it records that a handover has been read. What is your recommendation, and what would you want in writing before the switch?', 1),
    ('Your colleague has told the customer that the two workstreams are independent and that a delay on one cannot affect the other. On paper he is right, and you think the answer is misleading, because the people absorbing the change are the same people in both cases and their capacity to absorb it is not unlimited. How would you raise this with him, what would you say to the customer instead, and how would you keep him on side while correcting the record?', 1),

    -- Set 2: ShareFile to SharePoint Online + Teams to Slack.  Asks H, B, D, I, G
    -- Docs: ShareFile supports NO delta in any destination, no folder display, no shared links.
    -- Teams to Slack migrates live (no import mode), channel mentions become plain text,
    -- reactions are not carried, and conflicted messages cannot be retried from the UI.
    ('A customer has signed for ShareFile to SharePoint and Teams to Slack, and has asked for a weekly incremental copy on the content side. What would you have established before that was quoted?', 2),
    ('Two weeks after go-live the customer reports that files created in ShareFile since the copy are missing, and separately that timestamps on migrated Slack messages all show the migration date. Is that one problem or two, and how would you tell them apart?', 2),
    ('You have one weekend and both workstreams to land. One of them can only ever be done once, and the other will post every message live into the destination as it runs. Which would you sequence first, and what does your answer depend on?', 2),
    ('Your colleague wants to promise the customer a second ShareFile pass close to go-live to pick up late changes, on the grounds that it has worked on other projects. You do not think that promise can be kept. How would you handle that disagreement with him, and what would you propose instead?', 2),
    ('It is the go or no-go call. The Teams to Slack workstream has passed validation with channel mentions arriving as plain text, which the customer has accepted in writing. The ShareFile side has copied everything, but the business has kept working in ShareFile for the last nine days and nobody has agreed what happens to that work. What is your recommendation, and how would you defend it?', 2),
    ('Throughput on the ShareFile copy has dropped to a fifth of what the pilot achieved, and it dropped in the same hour that the Teams to Slack migration began working through its largest channel. The two workstreams run on different infrastructure and share only the customer network and the migration account between them, so the obvious explanation is also the one you can least afford to assume. Where would you start, and what would you rule out first and why?', 2),
    ('The customer has just discovered that nine days of engineering drawings created after the freeze are not in SharePoint, and that they cannot be picked up by running the copy again, because this route has no second pass of any kind. Their engineering director is on the phone now. He was not at the meeting where the freeze was agreed, his teams produced those drawings in good faith, and he is being asked by his own director what happened. What do you say to him, in what order, and what do you commit to before that call ends?', 2),
    ('Both workstreams are closing out. The content copy is complete and counted, the messages are in Slack, the punch list is down to three cosmetic items, and the customer has begun talking about decommissioning both ShareFile and their old Teams tenant at the end of the quarter to stop the licence spend on two systems nobody is meant to be using any more. Name the risk that nobody on either side has raised, say which group of people will run into it first and roughly when, and explain what you would want established before that decommissioning date goes into anybody plan.', 2),

    -- Set 3: Dropbox to Google Shared Drive + Chat to Slack.  Asks C, J, A, F, E
    -- Docs: Dropbox to Google carries Dropbox Paper, but Paper tables migrate only to about 62 or
    -- 63 columns, Paper comments and mentions do not migrate, and in-line comments are No for every
    -- Dropbox destination. Chat to Slack does not carry reactions and cannot retry conflicts on UI.
    ('A customer has just been told by their own staff that comments on Dropbox files did not arrive in Google. The Chat to Slack side is mid-migration. What do you say to the customer now?', 3),
    ('Dropbox Paper documents have migrated, the Chat to Slack workstream reports every channel complete, and the customer is happy enough to be talking about sign-off. Name the risk nobody has raised, and say who will find it first.', 3),
    ('A planning team says the Dropbox Paper document they run their quarter from is missing most of its columns in Google, and on the same morning a group of Slack users say old reactions are gone. Where would you start with each, and which would you pick up first?', 3),
    ('The customer operations manager is not technical and is angry that two things she calls basic did not survive: the right-hand columns of a wide Paper document, and the reactions people used to acknowledge messages. Explain to her what happened in each case, and what you can and cannot do about them.', 3),
    ('The customer wants to keep Dropbox live for another month so staff can go back for anything that did not look right, and to run a Dropbox delta at the end of it, while treating the Chat to Slack side as finished. Assess that proposal on both workstreams, say what it costs them, and give me your recommendation.', 3),
    ('You have two workstreams left to schedule and a customer who wants both inside the next three weeks. One of them can be re-run as often as you like and the other has documents whose structure may not survive in a way people will notice for months. Which would you sequence first, what does your choice depend on, and what would you do differently in each case because of the order you picked?', 3),
    ('It is the go or no-go call for closing Dropbox. Every file has copied and been counted. The wide planning documents have been rebuilt by hand, the Chat to Slack side is complete, and three years of review comments on contract documents have not migrated and were never in scope. The customer legal team has not been asked whether they need them. What is your recommendation, and what would you insist happens before anybody agrees a closure date?', 3),
    ('A customer has asked you to quote for moving their Dropbox estate into Google and their Chat tenant into Slack, and has attached a requirements list written by someone who has clearly used a different vendor before. It asks for comments on files to be preserved and for message reactions to carry across. What would you have established before that quote was written, and how would you handle the two requirements that cannot be met?', 3),

    -- Set 4: Egnyte to SharePoint Online + Gmail to Outlook.  Asks D, A, G, B, I
    -- Docs: Egnyte to SPO has folder display No, selective versions No and in-line comment No;
    -- names are limited to 200 characters and Egnyte itself forbids leading or trailing spaces.
    -- Gmail to Outlook drops junk mail and calendar event attachments, carries orphaned labels,
    -- and supports no second delta.
    ('You are sequencing Egnyte to SharePoint and Gmail to Outlook for the same 700 people, in two windows a fortnight apart. Which would you put first, and why?', 4),
    ('Three days before the mail cutover, the Egnyte copy is rejecting several thousand files on their names, and the mail dry run has come back with calendar attachments missing. Where would you start with each?', 4),
    ('You are asked for a go or no-go on the mail cutover. The mailboxes have passed testing, the Egnyte workstream is four days behind, and the customer has already told staff that both will be done by Monday. What is your recommendation, and what would you ask the customer to communicate?', 4),
    ('A week after both cutovers the customer raises two things in one email: mail filed under several labels now appears in only one place, and a set of folders they expected in SharePoint is not there at all. Are these related, and how would you establish that before you reply?', 4),
    ('The customer wants a second mail delta run a fortnight after cutover to sweep up anything left behind, and their IT manager has already put it in his plan. You know why that is a bad idea. How would you raise it with him without undermining him in front of his own team, and what would you offer instead?', 4),
    ('The customer proposes shortening the content window by excluding every file whose name is too long for the destination, on the grounds that anything with a name that unwieldy is probably obsolete, and running the mail cutover in the time that frees up. Assess that proposal, say what it would actually exclude, and give me your recommendation and what you would offer instead.', 4),
    ('A head teacher who has never thought about any of this wants to know two things. Why did the files all arrive but the folders no longer look the way her staff are used to, and why can she not simply have the mail migration run a second time in a fortnight to catch anything the summer hid. Explain both to her in language she can repeat to her staff without getting either of them wrong.', 4),
    ('Both cutovers are done. The files copied, the mailboxes moved, staff are back for the start of term, and the project is being written up as a success by the customer own communications team. Reading only what I have told you, name the risk nobody has raised yet, say when it is most likely to surface, and explain what you would put in place now while there is still attention on the project to deal with it.', 4),

    -- Set 5: Amazon WorkDocs to SharePoint Online + Slack to Slack.  Asks B, F, H, E, C
    -- Docs: WorkDocs to SPO carries versions, external shares and timestamps, but NOT inner file
    -- permissions, and email notifications cannot be suppressed. Slack to Slack is the only
    -- combination that carries pinned messages; archived channels still cannot be created by API.
    ('Users report a flood of sharing notifications from SharePoint the morning after the WorkDocs copy, and separately that some Slack channels are missing. One problem or two?', 5),
    ('An operations director asks why a whole archive of old Slack channels, which her team deliberately closed but kept for reference, is not in the new workspace as she left it. Explain what happened and what her options are.', 5),
    ('A customer wants WorkDocs moved into SharePoint with permissions exactly as they are today, including who can reach individual files inside a shared folder, and has said so in the requirements. What would you have established before agreeing to that?', 5),
    ('To keep the notification noise down, the customer proposes running the WorkDocs copy overnight on a Saturday and telling nobody until Monday, while the Slack to Slack move runs in the same window. Assess that, including what it does to the helpdesk, and give me your recommendation.', 5),
    ('It is Monday morning. Staff have arrived to a mailbox full of SharePoint notifications they do not understand, their Slack pins are intact but a set of closed channels has come back as ordinary open ones, and the customer sponsor is on the phone asking whether the weekend went wrong. What do you say to him, in what order, and what do you commit to before the call ends?', 5),
    ('The service desk has taken four hundred calls before eleven on Monday, almost all of them about notification emails nobody can make sense of, and while that is going on the acquired company compliance officer has raised a formal concern that channels her organisation had deliberately closed are now sitting open in front of two thousand people. One of these is loud and one is quiet. Where would you start, which of the two would you put a named owner on first, and why that order?', 5),
    ('You have a second wave of both workstreams to schedule, covering the two thirds of the business that has not moved yet. One of them generates a large volume of notification email to every affected user and cannot be told not to, which is what produced Monday. The other moves quietly and preserves more than the customer expects it to. Which would you sequence first, what would you change about the way the first wave was run, and what does your answer depend on that you do not know yet?', 5),
    ('Go or no-go on the second wave, which covers the remaining two thirds of the business. The first wave completed with all of its data intact and every count reconciled. The notification problem has a plan behind it now and the service desk has been briefed. The archived channels are still arriving as ordinary open ones, and the naming and permission convention that was meant to make a closed channel obviously closed is still on the punch list with nobody assigned against it. What is your recommendation, and what single thing would change your answer?', 5),

    -- Set 6: Google Shared Drive to SharePoint Online + Slack to Google Chat.  Asks J, I, C, D, G
    -- Docs: Google file versions cannot carry their original timestamps into SPO -- the system
    -- stamps upload time and there is no API to override it. Slack to Chat carries reactions and
    -- code blocks, but Chat cannot fully migrate mentions, has no pinned concept, and the
    -- out-of-scope list covers self-DMs, workflows, custom emoji and multi-file messages.
    ('A Shared Drive to SharePoint copy and a Slack to Chat cutover are both reporting complete, and the customer is preparing sign-off. What is the risk nobody has raised?', 6),
    ('Your colleague has told the customer that version history came across intact from Google. It did come across, but not in the way the customer will understand by that sentence. How would you handle that?', 6),
    ('The customer compliance officer calls: an auditor has asked her to show when each version of a policy document was created, and the dates in SharePoint are all the migration date. She wants to know what you did wrong. What do you say?', 6),
    ('You have both workstreams and one change window that will not hold both. One of them ends with people talking to each other somewhere new; the other ends with documents in a place nobody has to visit until Monday. Which do you cut over first, and what would make you change your mind?', 6),
    ('Go or no-go. The Slack to Chat side has passed testing, with mentions arriving in a reduced form the customer has accepted. The Shared Drive side has copied every file, but version dates are all showing as the migration date and the customer regulator requires the original dates on one library of about nine hundred documents. What is your recommendation, and what would you put in front of the customer to support it?', 6),
    ('Two things are raised in the same week. The compliance team says document dates are wrong across a whole library, and a department says that messages which used to carry a list of attached files now show one file and several links. Both migrations reported success and neither team has spoken to the other. Are these one problem or two, and how would you establish that before you answer either of them?', 6),
    ('The customer proposes decommissioning the Google Shared Drives at the end of the month as originally planned, and keeping a spreadsheet of original version dates extracted beforehand as their evidence for any future audit. It is cheap, it is quick, and it lets them stop paying for the source. Assess that proposal properly, including what it is actually like to rely on a spreadsheet in a real audit two years from now when the people who made it have left, and give me your recommendation.', 6),
    ('The compliance partner is not technical and is not interested in hearing about interfaces. She wants to know why a migration that moved every document correctly, with every version present and in the right order, cannot also record when each of those versions was made, when that information plainly existed in the source and she was looking at it herself last month. Explain it to her in terms she can act on rather than terms she has to take on trust, and tell her clearly what you can give her and what you cannot.', 6)
    ) AS v(text, set_number)
WHERE NOT EXISTS (SELECT 1 FROM seed_state WHERE seed_key = 'l3-speaking-questions-v3');

-- ---------- Sets 7 to 12 ----------
INSERT INTO speaking_sentence (created_at, updated_at, text, set_number, level, difficulty)
SELECT now(), now(), v.text, v.set_number, 3, 'HARD'
FROM (VALUES
    -- Set 7: Dropbox to Azure Blob + Teams to Teams.  Asks H, C, B, F, E
    -- Docs: Dropbox to Azure Blob is copy-only -- one time, delta, long path, special characters
    -- and Dropbox Paper, and nothing else: no permissions, no versions, no timestamps, no shares.
    -- Teams to Teams does not carry reactions, forwarded messages, the Edited label, bot or Polly
    -- messages, meeting chats or recordings, self DMs, or DMs involving external users.
    ('A customer wants Dropbox archived into Azure Blob while their Teams tenants are consolidated. They have asked for permissions to be preserved on the archive. What would you establish first?', 7),
    ('The customer has opened the Azure archive and found no version history and no sharing, and in the same call says forwarded messages are missing from the migrated Teams channels. What do you tell them?', 7),
    ('A department says two things went wrong: nobody can tell which of their migrated Teams messages were edited, and files pulled out of the Azure archive have lost the dates they were created. Are these the same kind of problem or two different ones?', 7),
    ('The customer programme manager is not technical. He wants to know why you were able to move nine years of Dropbox content into Azure without much difficulty, but could not bring across a poll their team ran every week in Teams. Explain both in terms he can use.', 7),
    ('The customer proposes treating the Azure Blob archive as their compliance record of record, and decommissioning Dropbox at the end of the month to stop the licence spend, while the Teams consolidation carries on into next quarter. Assess that proposal against what the archive actually contains rather than what they believe it contains, say what would have to change before it could hold, and give me your recommendation.', 7),
    ('The general counsel has asked, in writing, whether the archive satisfies the retention obligation the business is subject to, and on the same day a department has reported that a years worth of the weekly polls they ran through a third-party application is missing from their migrated Teams channels. One of these questions has a clear answer you will not enjoy giving. Where would you start with each, and which one would you take to the sponsor first?', 7),
    ('You have two pieces of work left. One is building a record of who had access to what, from a source that is scheduled to be switched off. The other is finishing the remaining Teams consolidation waves, which staff can see and are asking about weekly. The customer wants the consolidation finished first, because it is visible and the archive work is not, and because the licence saving depends on the source going away. Which would you sequence first, and what does your answer depend on?', 7),
    ('The messaging consolidation has closed with a punch list of four cosmetic items, and the archive copy has completed and been counted against the source. The finance director is pleased, because the licence saving he approved the whole exercise for is now within reach, and he is asking when Dropbox can be switched off so it can be booked. Name the risk that nobody on this project has raised, say who inside the business will discover it and roughly when, and explain what you would want established before that switch-off date goes into any plan.', 7),

    -- Set 8: Box to Google (My Drive and Shared Drive) + Mural and Lucid to Miro.  Asks A, J, I, G, F
    -- Docs: Box to Google is a rich combination, but Box Notes degrade -- tables break, checklists
    -- and numbered lists lose their format, mentions are not migrated at all, tags do not migrate
    -- and shared links created for Notes do not migrate. Whiteboard never carries comments, hand
    -- drawing, tables or voting; Lucid to Miro additionally loses icons, frames, GIFs and files.
    ('Box to Google is running for 600 users, and a Mural and Lucid estate is moving to Miro alongside it. The design team has raised a defect on both. Where would you start?', 8),
    ('Both workstreams report complete. Files are in Google, boards are in Miro, and the customer design lead has signed off on a sample of five boards she chose herself. Name the risk nobody has raised.', 8),
    ('A colleague has written to the customer that Box Notes migrate to Google Docs and that whiteboards migrate to Miro, both of which are true and both of which will be read as more than they mean. How would you handle that before the customer reads it?', 8),
    ('Go or no-go on decommissioning Box and the whiteboard tools at the end of the month. Content has migrated. Box Notes have arrived with their tables broken and their mentions gone, and the Lucid boards have lost the frames the teams used to structure them. The customer says both are cosmetic. What is your recommendation?', 8),
    ('A workshop facilitator who is not technical wants to know why the sticky notes and connectors on her Mural boards came across perfectly, but the comments her team left on them and the votes they cast to pick a direction did not. Explain it to her, and tell her what you would do about the record of those decisions.', 8),
    ('A design lead says the project briefs in Google have lost their task lists and the named owners are gone, and a workshop facilitator says the boards in Miro are missing the record of what was decided on them. Both workstreams reported complete and both losses were on the kickoff list. Are these one problem or two, and what would you establish before you reply to either of them?', 8),
    ('The studio director has called. She read the kickoff list, she signed it, and she has just understood that four years of her studio design decisions were recorded in exactly the two features that never migrate on that route. She is not shouting, which is worse than if she were. She wants to know how this was allowed to happen when she did everything she was asked to do. What do you say to her on that call, what do you carefully avoid saying, and what do you commit to before it ends?', 8),
    ('The customer proposes two things to close this out. Rebuild only the currently active project briefs by hand and leave the rest as they arrived, and reconstruct the board decision history from the recollections of whoever happens to still be at the studio and was in the room at the time. One of those is a reasonable piece of triage and one of them is not a record at all. Assess both halves honestly, say which you would support and which you would not, and give me your recommendation.', 8),

    -- Set 9: NFS and SMB file server to SharePoint Online + Outlook to Gmail.  Asks D, B, E, C, H
    -- Docs: NFS to SPO has no versions, no external shares, no shared links and no root file
    -- permissions. Outlook to Gmail cannot carry rules and forwarding settings, categories,
    -- Outlook Notes, To-Do, or contact groups, does not keep pinned mail pinned, and past calendar
    -- events are migrated only for the organiser, so attendees never receive them.
    ('An NFS file server is moving to SharePoint Online while mail moves from Outlook to Gmail, for the same 450 staff. Which would you cut over first, and why?', 9),
    ('A team says their old file versions are not in SharePoint, and on the same day the finance group says the rules that sorted their mail have stopped working. Are these one problem or two, and how would you establish that?', 9),
    ('The customer wants the file server left online, read-only, for six months after cutover, and asks you to migrate their Outlook rules as part of the same change so nobody has to rebuild them. Assess both requests, and give me a recommendation on each.', 9),
    ('The customer executive assistant calls in some distress. The meetings she manages for four directors are in Gmail, but none of the attendees can see the ones already in the past, and she thinks she has lost a years worth of scheduling. What do you say to her?', 9),
    ('You are reviewing a statement of work another consultant drafted for this customer. It promises version history on the file server content and a like-for-like move of mail rules and categories, and the customer has not signed yet. What would you have established before any of that was written, and how do you put it right now without losing the deal?', 9),
    ('A department says their old file versions are not in SharePoint, a group of users say the rules that sorted their mail have stopped working, and the customer has bundled the two together into a single escalation that calls the whole migration incomplete and asks what you intend to do about it. Both of these have documented causes and neither of them is a defect. Where would you start, and what would you separate out before you write anything back at all?', 9),
    ('The executive assistant who manages the calendars of four directors is not technical, has had a very bad morning, and is convinced that a years worth of scheduling has been destroyed by something you did. What she is seeing is real, and the explanation is not one she is going to find reassuring on its own. Explain to her what actually happened to the past meetings, why it happened, and what still exists and where, in a way that lets her get back to work today rather than tomorrow.', 9),
    ('You have read a statement of work drafted by a colleague for this customer. It promises version history on the file server content, which that route does not carry, and a like-for-like move of mail rules and categories, which the source will not release. It has not been signed yet, but he is more senior than you, he has already presented it to the customer, and the customer liked it. How would you handle that, what would you say to him first and in what setting, and what would you propose is put in front of the customer instead?', 9),

    -- Set 10: SharePoint Online to SharePoint Online + Outlook to Outlook.  Asks C, F, A, J, I
    -- Docs: Outlook to Outlook keeps flagged mail and high and low importance, but drops junk
    -- mail, calendar event attachments, categories and contact labels, and supports no second
    -- delta. SharePoint to SharePoint has the standard content checklist behind it.
    ('Two Microsoft tenants are being consolidated after an acquisition: SharePoint to SharePoint and Outlook to Outlook. The customer has found something missing in each. What do you tell them first?', 10),
    ('The acquired company office manager wants to know why the colour categories she used to run her filing for eleven years did not survive a move between two systems that are, as she puts it, both Outlook. Explain it to her.', 10),
    ('Mailboxes moved on Saturday and every item count reconciles against the source. On Monday a group of users say meeting invitations they had already accepted have lost their attachments, and separately a SharePoint library that worked on Friday is missing a permission the finance team relies on. Where would you start with each?', 10),
    ('Both migrations have completed, every count reconciles, the punch list is down to three cosmetic items and the customer is ready to sign off and release both source tenants at the end of the month to stop the licence spend. Name the risk nobody on this project has raised, and say what you would want done about it before that release date arrives.', 10),
    ('The customer IT lead has told his own leadership that a second delta will run in four weeks to catch anything the business missed, and that commitment is now in a board pack. You know it cannot be done on the mail side. How would you handle that, given he made the promise in good faith and will lose face?', 10),
    ('The acquired company reports two things in the same message: colour categories they used for years are gone from their mail, and a SharePoint library is missing a permission their finance team relied on. One of these is a limit of the route and one is not. Are they one problem or two, and how would you establish which is which before you reply?', 10),
    ('You have a mail cutover and a content cutover to place, and a customer whose acquired departments are still moving work into their old systems as you speak. One of the two can be topped up afterwards and one cannot. Which would you sequence first, what would you require from the customer either way, and what does your answer depend on?', 10),
    ('Go or no-go on releasing both source tenants at the end of the month as planned. Mail and content have both completed and every count reconciles. Two acquired departments were still working in their old mailboxes during the cutover weekend and no second mail pass is possible. What is your recommendation, and how would you put the licence cost of a delay into a form the finance director will accept?', 10),

    -- Set 11: Google My Drive to OneDrive with LinkEX + Workplace from Meta to Google Chat.
    -- Asks B, H, E, F, G
    -- Docs: LinkEX identifies link files, linked files and paths, produces pre-scan and fix-scan
    -- reports and repairs broken links for My Drive and Shared Drive into OneDrive and SharePoint.
    -- Workplace to Chat does not carry custom emoji, channel or DM threads, DM reactions,
    -- external-user messages, self messaging, bot integrations or pre-scan; pinned posts arrive as
    -- normal text and mentions arrive as plain text.
    ('Staff report that links inside migrated Google documents still point back at the old drive, and separately that Workplace threads are not in Chat. One problem or two?', 11),
    ('A customer is moving My Drive to OneDrive and Workplace to Google Chat, and has asked for a pre-scan on both so they can size the work before committing. What would you have established before promising that?', 11),
    ('The customer wants to run the link remediation once, at the very end, after every workstream is finished, on the grounds that fixing links twice is waste. Assess that, say what it depends on, and give me your recommendation.', 11),
    ('The head of communications wants to know why the posts and reactions from Workplace came across to Chat, but the discussion threads underneath those posts, which she says are where the actual decisions were made, did not. Explain what happened and what she can do to preserve that record.', 11),
    ('Go or no-go on closing Workplace at the end of next week. Posts, chats and attachments have migrated. Threads on channels are not there, external partners who posted in two groups have not come across, and the customer has an open regulatory request that may need those conversations. What is your recommendation, and what would you need from the customer before you would change it?', 11),
    ('The link repair pass has come back having found roughly three times the number of broken links that was estimated when the work was sold, which changes both the timeline and the price. Separately, and on the same afternoon, the communications team has realised that the discussion threads underneath their Workplace posts are not in Chat and were never going to be. Where would you start, which of the two would you escalate, and to whom?', 11),
    ('The head of communications has just worked out that the replies underneath her policy posts, which is where each policy was argued about and then modified before anyone agreed to it, did not migrate and cannot be made to. She has also worked out that the platform still holding them is scheduled to close in eleven days. She is asking you, quite directly, what she should do about it. What do you say to her, what do you tell her to do today, and what do you commit to before that call ends?', 11),
    ('The link remediation is complete and signed off, the posts, chats and attachments are in Chat, the communications team has stopped raising tickets, and Workplace is scheduled to close at the end of next week to stop a licence the finance director has been asking about for two quarters. Everybody involved considers this finished. Name the risk that nobody on this project has raised, say which part of the business will discover it and roughly when, and explain what you would want decided, and by whom, before that closure date is allowed to stand.', 11),

    -- Set 12: Egnyte to Google Shared Drive + Slack into an EXISTING Teams tenant.  Asks A, C, D, J, E
    -- Docs: Egnyte carries in-line comments to its two Google destinations only; the same row is No
    -- for Egnyte to SharePoint and Egnyte to OneDrive. Slack into an existing Teams tenant does NOT carry channel members, direct
    -- messages, DM threads, channel renaming or time-period filtering, and archived channels are
    -- not supported.
    ('An Egnyte to Google Shared Drive copy is running while Slack is merged into a Teams tenant the customer already uses. Members are missing from the migrated channels. Where would you start?', 12),
    ('The customer has realised their direct messages are not in Teams and says nobody told them. It is in the scope document, on a page they signed. What do you say on the call?', 12),
    ('You have two workstreams and a customer who wants both finished before their quarter closes in three weeks. One of them will land in a tenant that is already in daily use by five hundred people. Which do you do first, and what makes that the right order?', 12),
    ('Content has copied with its in-line comments intact, the Slack channels are sitting in the existing Teams tenant, the customer is pleased with both, and their project manager is already drafting the completion notice for the steering committee. Name the risk nobody on this project has raised, and say which group of people will run into it first.', 12),
    ('The customer proposes keeping Slack open for direct messages only, indefinitely, so that nothing anybody has ever said is lost, while every channel and all of the content moves into the Teams tenant they already run. They present this to you as the safe compromise. Assess it on cost, on how people will actually end up working, and on what it does to any future request for records, then tell me what you would recommend instead.', 12),
    ('The acquired company reports two things in one message. Their migrated channels have arrived with no members in them, so nobody can find the conversations they were told would be waiting. And nine years of history has landed in a tenant whose retention policy is three years, which their compliance lead noticed and your team had not. Are these one problem or two, and how would you establish which is which?', 12),
    ('Go or no-go on closing the acquired company Slack workspace at the end of the month. The channels are in the Teams tenant and have been populated from the source membership lists. The content has copied with its in-line comments intact and legal have confirmed they are satisfied with it. Direct messages were never in scope and are not migrated, so whatever is in them stays in Slack. The retention question on nine years of channel history is still open with the customer legal team. What is your recommendation, and what single fact would change it?', 12),
    ('The acquired company head of operations has told his own leadership, in a meeting you were not in, that the direct messages were lost through an oversight by your team. It is in the scope document, on a page he signed, and you walked him through it at kickoff, which he does not dispute when you raise it with him privately. He is not being dishonest. He genuinely did not absorb what it meant at the time, and he has now repeated it to people who will act on it. How would you handle that, what would you put in writing, and how would you correct the record without making him look foolish in front of his own people?', 12)
    ) AS v(text, set_number)
WHERE NOT EXISTS (SELECT 1 FROM seed_state WHERE seed_key = 'l3-speaking-questions-v3');

INSERT INTO seed_state (seed_key) VALUES ('l3-speaking-questions-v3') ON CONFLICT DO NOTHING;
