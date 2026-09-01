-- =====================================================================
-- Level 3 Speaking sentence bank.
--
-- 30 sets of 10 sentences, disjoint: no sentence appears twice, so no two candidates are ever
-- served the same set. Sized for the population that actually reaches Level 3 -- it opens only
-- on three Level 2 passes -- with room to grow by adding set numbers.
--
-- WHAT MAKES THIS LEVEL 3. Every set carries TWO migrations for one customer, not one. The
-- first five sentences belong to the first scenario, the next four to the second, and the tenth
-- ties them together -- so the candidate has to switch context mid-set and then hold both at
-- once in a single long sentence. Level 2 sets run one situation from start to finish.
--
-- LENGTH. Level 2 ran 13 words to 57. These run 15 words to 77, ordered shortest to longest
-- inside each set so a candidate warms up rather than meeting the hardest sentence cold.
-- Position within the set IS the order the candidate sees; SpeakingSetService reads by id.
--
-- VOCABULARY is the real step up, and it is drawn from the migration documentation tool, so a
-- candidate rehearses the words they will actually use on a call:
--   Message  -- channels, private channels, direct and group direct messages, threads, replies,
--              reactions, pinned posts, message fidelity, posted-as attribution, workspace,
--              tenant, guest members, bots and app integrations.
--   Mail     -- mailboxes, shared mailboxes, aliases, distribution lists, labels against
--              folders, delegates, rules and filters, out-of-office, recurring series, archive,
--              MX cutover, coexistence.
--   Content  -- shared drives, site collections, document libraries, permissions, sharing links,
--              external sharing, version history, metadata, path length, native-format
--              conversion, quota, delta pass, checksum.
--
-- US PROJECT LANGUAGE runs through every set because it is what these calls sound like:
-- kickoff, statement of work, change request, dry run, UAT, go-live, cutover window, blackout
-- period, sign-off, punch list, hypercare, escalation path, service level agreement, root cause
-- analysis, run book, stakeholder, checkpoint call, staging, coexistence, decommission.
-- Every term is used in a sentence that explains it by context. No office idiom: that was tried
-- at Level 2 and removed, because it tested vocabulary nobody had been taught.
--
-- Avoid apostrophes: these are single-quoted SQL literals.
-- =====================================================================

-- ---------- Sets 1 to 6 ----------
-- 1: Slack to Teams + Shared Drive to SPO        4: Chat to Teams + SPO to OneDrive
-- 2: Gmail to Outlook + OneDrive to OneDrive     5: Slack to Chat + Shared Drive to OneDrive
-- 3: Teams to Teams + SPO to SPO                 6: Outlook to Gmail + OneDrive to SPO
INSERT INTO speaking_sentence (created_at, updated_at, text, set_number, level, difficulty)
SELECT now(), now(), v.text, v.set_number, 3, 'HARD'
FROM (VALUES
    ('Our Slack to Teams migration begins on Friday evening, and every public channel moves first.', 1),
    ('Private channels move only where the migration account has been added as a member by the channel owner.', 1),
    ('Threads, replies, reactions and pinned posts all carry across, so a channel should read exactly as it reads today.', 1),
    ('Direct messages and group direct messages are the slowest objects in this migration, and they are also the ones your users will check first.', 1),
    ('Forty-one of your Slack app integrations have no direct equivalent in Teams, so those go on the punch list and we replace them one by one after go-live.', 1),
    ('On the content side, we are moving sixty terabytes from Shared Drive to SPO in the same weekend.', 1),
    ('Every sharing link that was set to anyone-with-the-link becomes company-only at the destination, which is a change your security team asked for.', 1),
    ('Version history moves with each document, so a reviewer can still open the draft that was approved rather than only the file as it stands today.', 1),
    ('If throughput drops during the copy, our first check is the folder structure rather than the destination, because a single flat folder with two hundred thousand files will slow a whole library.', 1),
    ('So to summarise both sides in one sentence: your conversations move on Friday night with full fidelity except for the app integrations, your documents move across the same window with their version history intact, and the only thing you will need to tell staff about on Monday morning is that external sharing links now stop at the company boundary.', 1),

    ('The Gmail to Outlook cutover for your twelve hundred mailboxes is planned for the first weekend of May.', 2),
    ('Labels are not folders, so a message carrying three labels in Gmail has to be mapped to a single folder path in Outlook.', 2),
    ('We will keep your filing intact by mapping the primary label to the folder and carrying the rest as categories on the message.', 2),
    ('Rules do not migrate into Outlook, so each user rebuilds their own, and we publish the twenty most common ones as a one-page recipe.', 2),
    ('Out-of-office messages and email signatures are stored per user rather than on the mailbox, which means both need to be set again after cutover and neither can be moved for you.', 2),
    ('Alongside the mail work, we are running a tenant-to-tenant move of your OneDrive personal areas for the same people.', 2),
    ('Each personal area keeps its folder structure, and files shared directly with a colleague keep those permissions where the colleague also moves.', 2),
    ('Anything shared with somebody outside the company has to be re-shared at the destination, because an external guest is issued by the receiving tenant and cannot be carried across.', 2),
    ('We schedule the delta pass seven days after the main copy, and the source must be read-only before it runs, or work done in the old system will overwrite newer work in the new one.', 2),
    ('Putting the two together: on the Monday your mail will look familiar but your rules and your out-of-office will not be there, your own files will be exactly where you left them, and anything you had shared with a client will need one new link before they can open it again.', 2),

    ('This is a tenant-to-tenant consolidation, so both companies are already on Teams and on SharePoint.', 3),
    ('Same platform to same platform is not the easy case, and the reason is identity rather than content.', 3),
    ('A user in the old tenant and the same person in the new one are two different accounts, and every permission refers to the old identifier.', 3),
    ('We therefore need a reconciled mapping file, signed by your HR team, before a single channel or document moves.', 3),
    ('Where a person changed their corporate email address at some point over the years, the accounts match by name and not by address, and those are the ones that fail quietly rather than loudly.', 3),
    ('On the SharePoint side, we are moving two hundred site collections between the same two tenants.', 3),
    ('Document library permissions map cleanly, but any site that was shared with an external partner needs that partner re-invited by the destination tenant.', 3),
    ('We run a permission comparison after cutover rather than trusting the migration report, because a delegate that is silently missing does not appear as an error anywhere.', 3),
    ('The channel conversations themselves are the straightforward half: posts, replies and files carry across, and the message shows a posted-as attribution with the original timestamp preserved in the body.', 3),
    ('The honest summary for your steering committee is this: the objects will move almost without incident, the entire risk of this project sits in the identity mapping, and the nine days we are asking for to reconcile that mapping will be the most valuable nine days in the plan.', 3),

    ('We are moving your Google Chat spaces into Teams for fourteen hundred staff across three sites.', 4),
    ('Spaces become channels, and the members of each space become the members of the channel that replaces it.', 4),
    ('Threaded replies inside a space map into Teams as replies to the parent post, so a long handover thread stays readable as one conversation.', 4),
    ('Direct messages migrate too, but a group direct message with more than twenty participants converts into a channel, and we will list those for you before we run it.', 4),
    ('If a space has been shared with somebody outside your domain, that person is a guest in the destination and has to accept a fresh invitation before they can post anything at all.', 4),
    ('In parallel we are moving eleven hundred personal work areas out of SPO and into individual OneDrive storage.', 4),
    ('This is a filing change rather than a platform change: the content is already in the right tenant and simply sits in the wrong place.', 4),
    ('Because a personal area sits one level deeper than a site library, about eleven thousand files will breach the path-length limit, and we flatten one folder level to fix nine thousand of them.', 4),
    ('The remaining two thousand carry project codes in their folder names, and we will not truncate a project code, so your project leads rename those against a list we provide.', 4),
    ('Taken together, this is a fortnight where your conversations change address and your documents change shelf: the Teams side needs your space owners to confirm membership, the OneDrive side needs your project leads to rename about two thousand folders, and neither of those is work my team can do on your behalf.', 4),

    ('Your Slack workspace is moving to Google Chat for nine hundred users at the end of the month.', 5),
    ('Channels become spaces, and channel membership carries across for every member who has an account in the destination.', 5),
    ('Message formatting is the one real loss here: Slack posts written with headings and code blocks arrive in Chat as plain text.', 5),
    ('We raised that at kickoff as an out-of-scope item, and I am raising it again now, because your engineering team writes its runbooks as formatted Slack posts.', 5),
    ('Direct messages are in scope and they carry their timestamps exactly, which matters because your legal team runs date-range searches and a search that shifts by a day is a different search.', 5),
    ('The second workstream moves twenty-two terabytes out of Shared Drive and into the personal OneDrive area of each owner.', 5),
    ('A shared drive carries group-level permissions, so before we move anything we translate each group into the individual people who will own the content at the destination.', 5),
    ('Files that nobody has opened in three years are the largest single block of this volume, and I would rather ask you now whether they need to move at all than migrate them and bill you for it.', 5),
    ('Where a Google document is converted into its Microsoft equivalent, the content is preserved but the revision history is not, so anything with a live approval trail should be exported rather than converted.', 5),
    ('So the two decisions I need from you this week are these: whether your engineering team can live with plain-text runbooks or wants a fortnight to re-author them first, and whether the three-year-old content on the shared drives is migrated, archived in place, or left behind entirely.', 5),

    ('We are taking your nine hundred Outlook mailboxes across to Gmail over two weekends, split by department.', 6),
    ('Folders become labels, which is the direction that works well, because a label can sit on a message without moving it.', 6),
    ('Calendar events move with their attendees, and a recurring meeting with a fixed end date arrives exactly as it stands.', 6),
    ('A recurring series with no end date and one moved occurrence is the case that produces duplicates, and it affects about four percent of series, which we clear during hypercare.', 6),
    ('Shared mailboxes and delegate access are preserved, but each delegate has to sign in once before the destination will honour their permission, and that step belongs in your user notice rather than in our run book.', 6),
    ('Running beside the mail work, your OneDrive content moves into SPO document libraries so that teams own their files rather than individuals.', 6),
    ('That change is deliberate: when a person leaves, a file in a document library stays with the team, and a file in a personal area leaves with them.', 6),
    ('Sharing links are rewritten at the destination, so anything you have circulated internally keeps working, while links you sent to clients before the move will need reissuing.', 6),
    ('We keep the source read-only for thirty days after go-live, which is the window in which almost every genuine recovery request arrives, and then we decommission it on a date you sign off.', 6),
    ('If you want the whole programme in one sentence for your board: your mail moves to Gmail with folders becoming labels and a small number of recurring meetings to tidy up afterwards, your files move from personal storage into team libraries so they outlast the people who created them, and thirty days after go-live we switch the old estate off for good.', 6)
    ) AS v(text, set_number)
WHERE NOT EXISTS (SELECT 1 FROM seed_state WHERE seed_key = 'l3-speaking-bank-v1');

-- ---------- Sets 7 to 12 ----------
-- 7: Teams to Chat + SPO to Shared Drive       10: Chat to Chat + SPO to SPO
-- 8: Slack to Slack + OneDrive to Shared Drive 11: Gmail to Gmail + Shared Drive to SPO
-- 9: Outlook to Outlook + Shared Drive to Shared Drive  12: Slack to Teams + OneDrive to SPO
INSERT INTO speaking_sentence (created_at, updated_at, text, set_number, level, difficulty)
SELECT now(), now(), v.text, v.set_number, 3, 'HARD'
FROM (VALUES
    ('Thank you all for joining this checkpoint call, which covers both the Teams to Chat migration and the content workstream behind it.', 7),
    ('We completed the dry run last Thursday and it surfaced two issues, neither of which changes the go-live date.', 7),
    ('Channel posts and their replies convert into spaces and threads cleanly, and reactions are preserved on the parent message.', 7),
    ('Teams meetings recorded inside a channel do not move, because the recording lives in the site behind the channel rather than in the conversation itself.', 7),
    ('We will export those recordings separately and place them in a folder your team owns, and I will send the inventory of them before the weekend.', 7),
    ('The second workstream takes your SPO document libraries across into Google Shared Drives, one business unit at a time.', 7),
    ('A document library and a shared drive both hold files for a team, but a library carries metadata columns that a shared drive has no place to put.', 7),
    ('Where those columns carry something you rely on, such as a review date or a contract number, we write the value into the file description so that it is searchable rather than lost.', 7),
    ('Native format conversion happens on arrival, so a Word document becomes a Google document, and anything with tracked changes should be finalised before the move rather than after it.', 7),
    ('The action I need from this call is a single owner on your side for each workstream, one for the meeting recordings and one for the metadata columns, because both decisions are about your business rules rather than about our tooling, and neither of them can be taken by an engineer.', 7),

    ('This is a workspace consolidation rather than a platform change: three separate Slack workspaces becoming a single one.', 8),
    ('Same platform on both ends, which sounds simple and is the reason it is usually underestimated.', 8),
    ('All three of your workspaces have a channel called general, a channel called projects and a channel called site-issues, and Slack cannot merge two channels into one.', 8),
    ('We migrate them as separate channels with a suffix, and you then decide whether to archive the duplicates or let them fall out of use naturally.', 8),
    ('My advice is to archive them on a date you announce, because a channel that is left to die quietly stays half-alive for a year and nobody knows which one is current.', 8),
    ('The content workstream moves personal OneDrive areas into Google Shared Drives, which changes who owns a file.', 8),
    ('Today a document belongs to the person who created it, and after this move it belongs to the team, which is exactly why your leadership asked for it.', 8),
    ('Anything genuinely personal should be moved out before we start, and we will send every user a two-line notice asking them to do that, with a deadline on it.', 8),
    ('Files currently shared by link to people outside your company will need to be re-shared by account, because a shared drive grants access to a named member rather than to whoever holds the link.', 8),
    ('Both halves of this programme are really the same decision written twice: you are moving from ownership by individual to ownership by team, and the only work that cannot be automated is the naming and the archiving, which is yours to decide and ours to execute.', 8),

    ('Following the acquisition, we are running a tenant-to-tenant move for nine hundred mailboxes and everything attached to them.', 9),
    ('Both estates are already on Microsoft, so nothing is being translated and everything is being re-homed.', 9),
    ('Your shared mailboxes, aliases and distribution lists all migrate, but each of them refers to identities and identities do not travel.', 9),
    ('That is why we ask for a signed mapping file first: a mailbox arriving without its delegate looks perfectly healthy and is quietly broken.', 9),
    ('Both companies own a mail domain ending in the same corporate suffix, and a domain can exist in only one tenant, which gives us a gap of about four hours that we intend to spend on almost nobody.', 9),
    ('The content side is the same shape: shared drives moving between two tenants that both already run Google.', 9),
    ('Drive membership is by group, so before anything moves we translate each group into named individuals in the destination and have you confirm the list.', 9),
    ('Where a contractor has left and their files are owned by an account that no longer exists, that content goes to an orphan drive with a review date rather than being deleted or guessed at.', 9),
    ('We move the users onto a temporary routing address first, let them work for two weeks, and only then move the domain, so the four-hour gap lands on six mailboxes instead of six hundred.', 9),
    ('If your finance director asks why a same-platform migration needs nine days of preparation before a single object moves, the answer is that the objects are the easy half, the identities are the project, and every hour we spend reconciling them now is an hour we do not spend explaining a missing delegate to a director in week three.', 9),

    ('Both of your operating companies are already on Google, so this is a consolidation rather than a platform change.', 10),
    ('Chat spaces, threads, reactions and direct messages all move between the two tenants without any conversion at all.', 10),
    ('Messages under an active legal hold cannot be migrated while the hold stands, and you have four holds covering roughly nine thousand messages.', 10),
    ('We are not going to delay the programme for them: those conversations stay in the source tenant, which you keep licensed until the holds lift.', 10),
    ('The two companies also have different retention settings, one deleting chat after eighteen months and one keeping everything, and when you merge tenants exactly one of those settings wins.', 10),
    ('On the SharePoint side we are merging two hundred site collections into a single tenant.', 10),
    ('Where both companies have a site called Operations, we do not overwrite: we migrate into a renamed target and let your records manager decide what merges afterwards.', 10),
    ('Version history, metadata columns and permissions all carry across, because nothing is being translated between platforms in either workstream.', 10),
    ('The one genuine risk is that everything looks identical on both sides, which makes it easy for somebody to assume a site has already been migrated when what they are looking at is the source.', 10),
    ('So the message for your programme board is that the technology here is low risk and the governance is not: you have one retention setting to choose, four legal holds to leave behind deliberately, and a records manager who needs to sign a target structure before we merge a single site collection.', 10),

    ('This is a Gmail to Gmail move between two separate tenants, which your merger agreement requires us to complete this quarter.', 11),
    ('Mailboxes, labels, filters and calendars all carry across, since we are not translating between two different mail models.', 11),
    ('Delegated access to another mailbox is granted per account, so every delegation has to be reissued once the destination accounts exist.', 11),
    ('Any address that is a group rather than a person needs recreating in the destination, and we reconcile the membership of each group against the source before we hand it over.', 11),
    ('Users who had a different email address earlier in their career will match by name but not by address, and those are precisely the accounts where a permission fails quietly rather than visibly.', 11),
    ('The content workstream is a genuine platform change, taking eleven terabytes out of Shared Drive and into SPO document libraries.', 11),
    ('Group permissions on a shared drive become SharePoint group memberships, and we map each one explicitly rather than by inference.', 11),
    ('Google native files are converted on arrival, so a spreadsheet with linked formulas across two files needs checking, because the link points at the old location until it is repointed.', 11),
    ('Path length is the constraint that catches people: a folder path that is comfortable in Drive can exceed the destination limit once the site and library names are added in front of it.', 11),
    ('To put the whole picture in front of your steering group: the mail side is a low-risk consolidation whose only real work is reissuing delegations, the content side is a genuine platform change with permission mapping and format conversion in it, and if either workstream is going to slip it will be the one where the file paths were measured optimistically.', 11),

    ('We start the Slack to Teams migration for eleven hundred users on the fifteenth, beginning with your smallest department.', 12),
    ('Public channels move first, then private channels, then direct messages, in three waves over two weekends.', 12),
    ('Each private channel needs its owner to add our migration account, and we will send that request with a deadline and a reminder.', 12),
    ('Your Slack app integrations are the part that does not simply move, and for each one we either find the Teams equivalent, rebuild it, or agree with you that it retires.', 12),
    ('Message fidelity is high but it is not photocopying: a migrated message shows a posted-as attribution, and your users need to be told that once, in writing, before they see it.', 12),
    ('Alongside that, your OneDrive personal areas are moving into SPO team libraries so that content outlives the person who created it.', 12),
    ('Files shared internally keep working because their links are rewritten, and files shared with clients before the move will need one new link issued.', 12),
    ('We keep both estates running side by side through hypercare, which is two weeks here rather than one, because two migrations in one month produces two waves of questions.', 12),
    ('The delta pass runs seven days after each main copy, and the source has to be read-only before it does, or work done in the old place will quietly overwrite newer work in the new one.', 12),
    ('So the sequence I would like you to repeat back to your department heads is this: channels in wave one, private channels in wave two once their owners have acted, direct messages in wave three, files moving in parallel into team libraries, and one company-wide notice on the Friday before that explains the posted-as attribution so that nobody opens a channel on Monday and thinks their history has been rewritten.', 12)
    ) AS v(text, set_number)
WHERE NOT EXISTS (SELECT 1 FROM seed_state WHERE seed_key = 'l3-speaking-bank-v1');

-- ---------- Sets 13 to 18 ----------
-- 13: Chat to Teams + Shared Drive to OneDrive   16: Slack to Chat + SPO to SPO
-- 14: Outlook to Gmail + SPO to OneDrive         17: Gmail to Outlook + Shared Drive to Shared Drive
-- 15: Teams to Teams + OneDrive to OneDrive      18: Teams to Chat + OneDrive to Shared Drive
INSERT INTO speaking_sentence (created_at, updated_at, text, set_number, level, difficulty)
SELECT now(), now(), v.text, v.set_number, 3, 'HARD'
FROM (VALUES
    ('I want to walk you through where both workstreams stand before we agree the go-live date.', 13),
    ('The Chat to Teams migration has completed its pilot with twenty-eight users across three departments.', 13),
    ('Every space in the pilot converted into a channel with its membership intact, and threaded replies stayed threaded.', 13),
    ('The pilot found one thing worth changing: your operations team posts shift handovers as replies to a single daily message, and that pattern needs a channel of its own rather than a general one.', 13),
    ('We have adjusted the mapping for the eleven spaces that work that way, and I would rather find eleven of those now than have a store manager find them on the first Monday.', 13),
    ('The content workstream moves twenty-two terabytes from Shared Drive into individual OneDrive areas, drive by drive and owner by owner.', 13),
    ('This is a change of ownership as much as location, so the first question for each drive is who its content should belong to afterwards.', 13),
    ('Files that no one has opened in two years make up almost half the volume, and migrating them costs real money for content that may simply need archiving in place.', 13),
    ('We will give you an access report by drive before you decide, because that decision should be made against evidence rather than against instinct or the fear of deleting something.', 13),
    ('So the two things I am asking for by Friday are these: confirmation that the eleven handover spaces map the way we have now designed them, and a decision from each drive owner on whether their dormant content moves, archives in place, or is left behind with a written note that says so.', 13),

    ('Your nine hundred Outlook mailboxes move to Gmail across two weekends in March, with a delta pass between them.', 14),
    ('Folders become labels, which is the easier direction, and your existing folder tree is preserved as a label hierarchy.', 14),
    ('Rules do not become filters, so every user rebuilds their own, and we will publish the twenty most common rules as a short recipe.', 14),
    ('Shared mailboxes migrate with their permissions, and each delegate signs in once before the destination honours the access they already had.', 14),
    ('Recurring meetings without an end date are the item to watch, because a series that has had one occurrence moved can arrive twice, and that affects roughly four series in every hundred.', 14),
    ('The second workstream moves eleven hundred users out of SPO libraries into their own OneDrive areas.', 14),
    ('That direction reduces sprawl but increases personal ownership, so anything the team relies on should stay in a library rather than follow one person.', 14),
    ('Path length grows by the depth of the personal area, and about eleven thousand files will breach the limit unless we flatten one level of folders first.', 14),
    ('We will not truncate folder names to solve it, because your folder names carry project codes and a truncated code is a file nobody can find again.', 14),
    ('The honest position to put to your sponsor is that neither workstream is technically risky, that both create work for your own people rather than for mine, and that the two dates I need from you are when your project leads can rename two thousand folders and when your users can be told that their rules and their out-of-office will not follow them.', 14),

    ('This is the third checkpoint call on the tenant-to-tenant Teams consolidation, and both workstreams are now past their halfway point.', 15),
    ('Channels, posts, replies and files have all migrated for the first two departments without an error worth reporting.', 15),
    ('Guest members are the outstanding item, because a guest account belongs to the destination tenant and cannot be carried across from the source.', 15),
    ('Forty of your supplier contacts hold guest access today, and each of them will receive an invitation that looks exactly like a phishing message unless we warn them first.', 15),
    ('So before we re-invite anyone, your procurement team sends a signed notice from an address the suppliers already recognise, and we then invite in waves rather than all at once.', 15),
    ('The OneDrive workstream is the same tenant-to-tenant move for the same eleven hundred people, running one week behind the Teams side.', 15),
    ('Personal content moves in full, and any file a user had shared with a colleague keeps that permission wherever the colleague is also moving.', 15),
    ('Files shared with someone who is not part of this migration lose that share, and we produce a report of every such file so that owners can reissue what still matters.', 15),
    ('We will run a permission comparison after cutover rather than relying on the migration report, since a share that has silently vanished is not an error and will not appear in any log.', 15),
    ('The summary I would give your programme board is that both halves of this consolidation are behaving exactly as designed, that the only real risk left is the human one, and that a supplier who deletes an invitation as suspicious costs us more time than any technical fault we have hit so far.', 15),

    ('We move your Slack workspace into Google Chat over the first weekend of next month.', 16),
    ('Channels become spaces, members carry across, and direct messages migrate with their original timestamps preserved.', 16),
    ('Formatting is the known loss: headings, bold text and code blocks arrive as plain text, and we flagged that as out of scope at kickoff.', 16),
    ('I am raising it again because your engineering runbooks are written as formatted posts, and I would rather have that conversation now than during hypercare.', 16),
    ('If you want those runbooks to survive as documents, the right answer is to export them into your content platform before the migration rather than to try to preserve the formatting inside the message.', 16),
    ('The second workstream is a SharePoint tenant-to-tenant move of two hundred site collections between two estates that look identical.', 16),
    ('Nothing is translated there, so libraries, metadata columns, version history and permissions all arrive as they left.', 16),
    ('External partners with access to a site have to be re-invited by the destination tenant, and we will hand you that list a fortnight before cutover.', 16),
    ('Because the source and the destination look identical, we rename each migrated site with a temporary marker until sign-off, so that nobody edits the copy they were not supposed to be in.', 16),
    ('Putting it plainly for your leadership: the SharePoint move carries almost no functional risk and a real risk of people working in the wrong copy, while the Slack move carries no risk of confusion and a certain loss of formatting, so the mitigations are opposite in kind and both are mostly about telling people the right thing at the right time.', 16),

    ('The Gmail to Outlook cutover is scheduled for the weekend after your quarter end, deliberately clear of your finance close.', 17),
    ('Every mailbox, label and calendar moves, and labels become folders with categories carrying the extra classifications.', 17),
    ('Delegates and shared mailboxes are preserved, though each delegate signs in once before the permission takes effect at the destination.', 17),
    ('Your archive mail sits in a separate export today, and importing it adds four days that are not in the current plan, so I need a decision on whether it comes with us in this phase or the next.', 17),
    ('Out-of-office replies do not migrate, and in a quarter-end week that matters more than usual, so we will send the reminder on the Thursday rather than leaving it to the run book.', 17),
    ('The content workstream is a same-platform consolidation of shared drives between two Google tenants, which is a governance exercise more than a copy.', 17),
    ('Drive membership is granted to groups, and every group has to exist in the destination with the same members before the first file moves.', 17),
    ('We reconcile that membership against your HR list rather than against the source directory, because a group in the source may still contain people who left the company two years ago.', 17),
    ('Content owned by accounts that no longer exist goes to an orphan drive with a named owner and a review date rather than being deleted or reassigned by guesswork.', 17),
    ('If your sponsor wants one sentence on each workstream: the mail cutover is a straightforward platform change whose only open question is whether the archive comes now or later, and the drive consolidation is a governance exercise dressed as a migration, where the work is agreeing who owns what before anything is copied.', 17),

    ('We are moving your Teams estate into Google Chat for four hundred users following the divestiture.', 18),
    ('Channel conversations move as spaces, and the membership follows the users who are transferring with the division.', 18),
    ('One-to-one chats are the question the contract does not answer, because a conversation between somebody leaving and somebody staying belongs, in a sense, to both companies.', 18),
    ('Our recommendation, which your legal teams have accepted before, is that a one-to-one chat migrates only where both participants transfer with the division.', 18),
    ('That rule leaves about nine hundred conversations behind, and I would rather write that number into the sale documentation now than have it discovered by an auditor in eighteen months.', 18),
    ('The content side moves personal OneDrive areas into Google shared drives owned by the buying company.', 18),
    ('We copy first, then have the buyer confirm receipt against a manifest, and only then remove the content from your systems.', 18),
    ('Expect the two counts to differ slightly, because the destination merges duplicate files on arrival, and a difference of a few hundred documents is usually that rather than a failed transfer.', 18),
    ('We check the difference before we recopy anything, since a recopy of merged duplicates produces exactly the same number and costs two days of everybody time.', 18),
    ('So the three commitments I am giving you today are these: nothing is deleted from your systems until the buyer has confirmed receipt in writing, the one-to-one chat rule goes into the sale documentation rather than staying a verbal understanding, and every count that does not reconcile is investigated before anyone reaches for a recopy.', 18)
    ) AS v(text, set_number)
WHERE NOT EXISTS (SELECT 1 FROM seed_state WHERE seed_key = 'l3-speaking-bank-v1');

-- ---------- Sets 19 to 24 ----------
-- 19: Slack to Teams + SPO to Shared Drive     22: Outlook to Outlook + SPO to OneDrive
-- 20: Gmail to Gmail + OneDrive to SPO         23: Slack to Slack + Shared Drive to OneDrive
-- 21: Chat to Chat + Shared Drive to SPO       24: Chat to Teams + OneDrive to OneDrive
INSERT INTO speaking_sentence (created_at, updated_at, text, set_number, level, difficulty)
SELECT now(), now(), v.text, v.set_number, 3, 'HARD'
FROM (VALUES
    ('I am calling with an update on last night, and the headline is that we recovered inside the window.', 19),
    ('The Slack to Teams copy stalled at just after one in the morning and restarted at ten past two.', 19),
    ('The cause was not throttling, which was our first assumption, but a private channel with a hundred and forty thousand messages in a single thread.', 19),
    ('We excluded that channel, let the rest of the wave complete, and moved it separately as its own job later in the night.', 19),
    ('Nothing was lost and nothing needs repeating, but I want you to hear it from me before you see the gap in tonight report.', 19),
    ('The content workstream ran in parallel and moved eighteen terabytes from SPO into Google shared drives without incident.', 19),
    ('The metadata columns on four of your libraries have no equivalent at the destination, so we wrote those values into the file descriptions as agreed.', 19),
    ('Version history came across for every document, which is the item your compliance team asked about at the last checkpoint call.', 19),
    ('External sharing is the one thing that changed shape: links became named members, and forty-one people outside your company will need re-adding by their account.', 19),
    ('So the position this morning is that both workstreams are inside plan, the only anomaly was a single oversized channel that has now been handled separately, and the only work outstanding on either side is yours rather than mine, which is nominating the forty-one external people so we can grant them access by account.', 19),

    ('This is a same-platform mail consolidation between two Google tenants, which removes an entire category of translation risk.', 20),
    ('Every mailbox, label, filter and calendar moves without translation, which removes an entire category of risk.', 20),
    ('What does not travel is identity: a delegation, a group membership or a shared calendar permission points at an account in the old tenant.', 20),
    ('We therefore reconcile a mapping file against your HR records first, and I would ask you to treat that as project work rather than as an administrative formality.', 20),
    ('People whose email address changed at some point in their career match by name and not by address, and those are the accounts where a permission fails silently rather than throwing an error anybody can see.', 20),
    ('The content workstream takes personal OneDrive areas into SPO document libraries, which changes who owns a file after somebody leaves.', 20),
    ('That is a deliberate change of ownership: a document in a library belongs to the team, and a document in a personal area leaves when its owner does.', 20),
    ('Anything genuinely personal should be moved out first, and we will send a two-line notice with a deadline so that nobody discovers their private folder in a team library.', 20),
    ('Sharing links are rewritten so internal links keep working, and any link you sent a client before the move has to be reissued from the new location.', 20),
    ('If your executive sponsor asks what could still go wrong here, the answer is nothing technical: the mail move is a re-homing, the content move is a filing decision, and the only failure mode either of them has is an identity mapping signed off in a hurry by somebody who did not check whether the names still match the addresses.', 20),

    ('Both of your regional companies already run Google Chat, so this is a tenant consolidation.', 21),
    ('Spaces, threads, direct messages and reactions all carry across between the two tenants without conversion.', 21),
    ('The governance decisions are the real content of this project, and there are two of them.', 21),
    ('The first is retention: one company deletes chat after eighteen months and the other keeps everything, and after the merge exactly one of those policies applies to everybody.', 21),
    ('The second is what happens to conversations under legal hold, which cannot move while the hold stands and which I would leave in the source tenant rather than delay the whole programme for.', 21),
    ('Alongside that, eleven terabytes move from Google shared drives into SPO document libraries, with every group permission mapped explicitly.', 21),
    ('Drive-level group permissions become SharePoint groups, and we map each one explicitly rather than inferring it from the folder structure.', 21),
    ('Native Google files convert on arrival, so a document with tracked comments should be finalised beforehand, because comments do not survive conversion in the way authors expect.', 21),
    ('Path length is measured from the site and library name onwards, so a path that is comfortable in Drive can breach the limit at the destination before a single subfolder is added.', 21),
    ('The clearest way to put this to your board is that the chat consolidation is a policy exercise with a migration attached, the drive move is a genuine platform change with conversion and permission mapping in it, and if you only have capacity to supervise one of them closely this quarter, supervise the policy decisions rather than the file copy.', 21),

    ('We are running a tenant-to-tenant mailbox move for eighteen hundred users following the acquisition, inside your existing security regime.', 22),
    ('The estate is Microsoft on both sides, so no mail model is being translated and no folder is being reshaped.', 22),
    ('Our migration service account is subject to your conditional access policy, and that policy blocked it overnight last Tuesday because the migration servers are an unrecognised location.', 22),
    ('We lost eleven hours, and the exemption took forty minutes to arrange and two days to approve because the person who could approve it was on leave.', 22),
    ('I would ask you to raise the exemption for the class of accounts rather than for the one account, because the same policy will stop the content workstream in exactly the same way next week.', 22),
    ('That content workstream moves eleven hundred people out of SPO libraries into their own OneDrive areas.', 22),
    ('It is a filing change inside your own tenant, so nothing converts and the only real constraint is path length at the destination.', 22),
    ('About eleven thousand files will breach that limit, and flattening a single folder level resolves nine thousand of them without touching a file name.', 22),
    ('The remaining two thousand sit under folders named after project codes, which we will not truncate, so your project leads rename those against a list we provide.', 22),
    ('So the two asks from this call are administrative rather than technical: widen the security exemption to cover every account this programme uses, and give me one named person per department who will own the folder renaming, because both of those are on your side of the line and both of them will stop a workstream if they are late.', 22),

    ('This is a Slack workspace consolidation, three becoming one, with no platform change on either side.', 23),
    ('Channels, threads, reactions and pinned posts all migrate, and the members of each channel carry across.', 23),
    ('Duplicate channel names are the first decision, because Slack cannot merge two channels and your three workspaces each have a general and a projects channel.', 23),
    ('We migrate them with a suffix and then archive the duplicates on a date you announce, rather than leaving three half-alive channels for a year.', 23),
    ('Guest members belong to the workspace that issued them, so every external collaborator has to be re-invited into the consolidated workspace once it exists.', 23),
    ('The content workstream moves twenty-two terabytes from Google shared drives into individual OneDrive areas, which inverts your ownership model.', 23),
    ('That inverts the ownership model, so the first question for each drive is which single person should own its content afterwards.', 23),
    ('Where no one person should, that drive is a candidate for a team library instead, and I would rather revisit the design now than migrate it into the wrong shape.', 23),
    ('Files untouched for three years are the largest block of this volume, and I will send you an access report by drive before you decide whether they move, archive in place, or stay behind.', 23),
    ('The summary I would give your steering committee is that both workstreams are asking the same question in two different languages: who owns this, and who decides what is retired, and until those two answers exist in writing the migration is simply moving an unresolved argument from one platform to another.', 23),

    ('The Chat to Teams migration for fourteen hundred users starts a week on Friday and runs across three consecutive weekends.', 24),
    ('Spaces become channels, threaded replies stay threaded, and direct messages migrate with the timestamps your legal team searches on.', 24),
    ('A group direct message with more than twenty participants converts into a channel, and we will give you that list before the run so nobody is surprised.', 24),
    ('External participants become guests in your tenant, and each of them accepts a fresh invitation before they can post, which is why we send a warning notice first.', 24),
    ('Bots and app integrations are the part with no automatic equivalent, so for each one we either find its Teams counterpart, rebuild it, or agree with you that it retires at go-live.', 24),
    ('The OneDrive workstream is a tenant-to-tenant move of the same peoples personal areas, scheduled to finish in the same window.', 24),
    ('Content moves in full, and a file shared with a colleague keeps that permission wherever the colleague is also transferring.', 24),
    ('Anything shared outside the company loses its share, and we produce a report of every affected file so owners can reissue what still matters.', 24),
    ('The delta pass runs a week later, and the source must be read-only before it does, or a document edited in the old tenant will overwrite the newer version in the new one.', 24),
    ('For your communications team, the single most useful sentence to circulate is this: on the Monday your conversations and your files will both be in their new home, the things that will not be there are your bots and any link you shared with somebody outside the company, and both of those are on the punch list with a named owner rather than lost.', 24)
    ) AS v(text, set_number)
WHERE NOT EXISTS (SELECT 1 FROM seed_state WHERE seed_key = 'l3-speaking-bank-v1');

-- ---------- Sets 25 to 30 ----------
-- 25: Teams to Teams + Shared Drive to Shared Drive  28: Outlook to Gmail + Shared Drive to SPO
-- 26: Gmail to Outlook + SPO to SPO                  29: Teams to Chat + SPO to OneDrive
-- 27: Slack to Chat + OneDrive to SPO                30: Slack to Teams + Shared Drive to OneDrive
INSERT INTO speaking_sentence (created_at, updated_at, text, set_number, level, difficulty)
SELECT now(), now(), v.text, v.set_number, 3, 'HARD'
FROM (VALUES
    ('This is the post-migration review for both workstreams, and I will start with what went well.', 25),
    ('The Teams tenant-to-tenant move completed in three waves with an error rate below one tenth of one percent.', 25),
    ('Channel posts, replies, files and reactions all arrived intact, and no wave had to be repeated.', 25),
    ('What we underestimated was guest access, where forty suppliers each needed a fresh invitation and eleven of them reported it to their own security teams as suspicious.', 25),
    ('That cost us nine days of chasing, and the fix is not technical: it is a signed notice from your procurement team before the first invitation goes out, which is now in the run book.', 25),
    ('The shared drive consolidation on the Google side finished two days early and needed no rework.', 25),
    ('The reason it went so smoothly is the nine days we spent reconciling group membership against your HR list before anything moved.', 25),
    ('Fourteen accounts had no match at all, and their content sits on an orphan drive with a named owner and a review date that has now passed once.', 25),
    ('I would like that review date closed out this quarter, because an orphan drive with no review is how content becomes permanently unowned.', 25),
    ('The lesson I want recorded from both workstreams is the same one written twice: every technical object in this programme moved without drama, and every single day we lost was lost to a person outside the migration team who had not been told early enough what would be asked of them.', 25),

    ('Your Gmail estate moves to Outlook over two weekends, and your SharePoint sites move between tenants in the same period.', 26),
    ('On the mail side, labels become folders, and a message with several labels keeps the extras as categories.', 26),
    ('Rules do not convert, so users rebuild them, and we publish the twenty most common as a one-page recipe rather than pretending we can automate it.', 26),
    ('Recurring meetings without an end date can arrive twice where an occurrence has been moved, which affects about four series in a hundred and is cleared during hypercare.', 26),
    ('Shared mailboxes keep their delegates only after each delegate signs in once, and that step belongs in the notice you send your users rather than in a document only my team reads.', 26),
    ('The SharePoint workstream is a same-platform move of two hundred site collections between two tenants.', 26),
    ('Nothing converts, so libraries, columns, version history and permissions all arrive exactly as they left the source.', 26),
    ('The risk is confusion rather than data loss, because the source and destination look identical and somebody will inevitably work in the wrong one.', 26),
    ('We rename each migrated site with a temporary marker until you sign it off, and the marker comes off as part of that sign-off rather than before it.', 26),
    ('If you want the two workstreams contrasted in a single sentence for your board: the mail migration changes how everything looks and loses a few things your users will notice on day one, and the SharePoint migration changes nothing at all and will cost you more if anybody edits the copy they were not supposed to be in.', 26),

    ('We are moving nine hundred users from Slack into Google Chat at the end of this month.', 27),
    ('Channels become spaces, membership carries across in full, and direct messages keep the original timestamps they were posted with.', 27),
    ('Rich formatting does not survive, so posts written with headings or code blocks arrive as plain text, which we declared out of scope at kickoff and read aloud on the call.', 27),
    ('If your engineering runbooks live as formatted posts, my recommendation is to export them into your content platform first rather than accept the loss and rewrite them later.', 27),
    ('Direct message history matters here more than usual, because your legal team runs date-range searches, and a timestamp that shifts by a day turns one search into a different search.', 27),
    ('The parallel workstream moves personal OneDrive content into SPO team libraries, so a project file no longer leaves with its author.', 27),
    ('That change makes the team the owner rather than the individual, which is what your leadership asked for after two people left with project files.', 27),
    ('Internal links are rewritten and keep working, while any link shared with a client before the move has to be reissued once from the new location.', 27),
    ('We hold both estates side by side through a two-week hypercare period, because running two migrations in one month produces two waves of questions rather than one.', 27),
    ('The one decision I still need from you this week is about the runbooks: if they are exported first, this programme has no functional loss at all, and if they are not, then plain-text runbooks are a permanent outcome that your engineering team should agree to rather than discover.', 27),

    ('Your Outlook mailboxes move to Gmail, and your Google shared drives move into SPO, over the same six weeks.', 28),
    ('Those two directions are opposite, which sounds strange until you remember that mail and content were chosen by different parts of your business.', 28),
    ('On the mail side, folders become labels cleanly, and the losses are rules, signatures and out-of-office replies, all of which are per user rather than per mailbox.', 28),
    ('We will publish a recipe for the twenty most common rules and accept that the long tail gets rebuilt by people as they notice what is missing.', 28),
    ('On the content side, group permissions on each shared drive become SharePoint groups, which we map explicitly rather than infer, because an inferred permission is a permission nobody has approved.', 28),
    ('Google native files convert on arrival, so a document with tracked comments should be finalised beforehand.', 28),
    ('Path length is measured from the site and library name onwards, so paths that were comfortable in Drive can breach the destination limit before a subfolder is added.', 28),
    ('We flatten one folder level to resolve most of those and give your project leads a list of the rest to rename.', 28),
    ('Both workstreams share a delta pass, and in both cases the source has to be read-only before it runs, or work done in the old system overwrites newer work in the new one.', 28),
    ('So when your sponsor asks why one workstream is moving to Google and the other away from it, the answer to give is that this programme is following two separate business decisions rather than one technical strategy, and my job is to make sure that neither of them costs your users their filing, their permissions or a week of their time.', 28),

    ('I want to give you the position on both workstreams before the go or no-go decision tomorrow.', 29),
    ('The Teams to Chat migration has completed its dry run for two hundred users and the results are clean.', 29),
    ('Channel conversations, threads and reactions all convert, and the only structural change is that very large group chats become spaces.', 29),
    ('Meeting recordings stored inside a channel do not move with the conversation, because they live in the site behind the channel rather than in the messages themselves.', 29),
    ('We have inventoried those recordings and will place them in a folder your team owns, and that inventory goes out with tonight report so nobody assumes they were lost.', 29),
    ('The second workstream moves eleven hundred people from SPO libraries into their own OneDrive areas.', 29),
    ('It is a filing change within your own tenant, so no format converts and no permission is translated between platforms.', 29),
    ('The constraint is path length, and about eleven thousand files exceed it until we flatten one level of folders, which resolves most of them without renaming anything.', 29),
    ('We will not truncate folder names, because your folders carry project codes and a truncated code is a drawing nobody can find again.', 29),
    ('My recommendation for tomorrow is a conditional go: proceed with both workstreams on the dates as planned, on the single condition that the meeting-recording inventory is acknowledged in writing by your operations lead, because that is the one item in this programme that a user could reasonably believe had been lost when in fact it has simply been moved somewhere they were not told about.', 29),

    ('This is the final checkpoint call before we begin, and I will summarise both workstreams once more.', 30),
    ('Eleven hundred users move from Slack to Teams across two weekends, in three waves by channel type.', 30),
    ('Public channels move first, private channels second once their owners have added our migration account, and direct messages third.', 30),
    ('Threads, reactions and pinned posts all carry across, and every migrated message carries a posted-as attribution that your users should be told about before they see it.', 30),
    ('Your forty-one Slack app integrations have no automatic equivalent, so each one is replaced, rebuilt or retired by agreement, and that list has a named owner against every line.', 30),
    ('The content workstream moves sixty terabytes from Google shared drives into individual OneDrive areas, against the ownership list you signed.', 30),
    ('Group permissions become individual ownership, which is a business decision rather than a technical one, and we have your signed list of who owns what.', 30),
    ('External sharing links become named members, so forty-one people outside your company will need adding by account rather than by link.', 30),
    ('The delta pass follows a week after each main copy, the source goes read-only before it runs, and we decommission the old estate thirty days after go-live on a date you sign.', 30),
    ('So the commitment I am giving you and the commitment I am asking for are these: my team will move every channel, every message and every file inside the window you have approved, and your team will confirm the private channel owners, the file owners and the external members on the dates in the plan, because every single delay this programme has had on projects like it has come from that second list rather than the first.', 30)
    ) AS v(text, set_number)
WHERE NOT EXISTS (SELECT 1 FROM seed_state WHERE seed_key = 'l3-speaking-bank-v1');

INSERT INTO seed_state (seed_key) VALUES ('l3-speaking-bank-v1') ON CONFLICT DO NOTHING;
