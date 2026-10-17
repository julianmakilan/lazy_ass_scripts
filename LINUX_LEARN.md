# Linux learning cards for Scriptable

`linux_learn.js` reads `linux-deck.json` locally and teaches ten complete commands a day. Answers appear immediately. It never executes the Linux commands, connects to a Linux host, calls an AI service, or downloads learning content.

## Install on iPhone

1. Install **Scriptable**. Save `linux-deck.json` to Files on your iPhone.
2. Create a Scriptable script named **Linux Learn**, paste all of `linux_learn.js`, and run it in the app.
3. Choose **Choose JSON**, then select `linux-deck.json`. The script validates it and saves a private, local copy. An offline card viewer opens.
4. Add a **medium or large Scriptable Home Screen widget**, edit it, and select **Linux Learn**. The widget needs no parameter. Large gives more room for explanation; medium focuses on the task and monospace command. Long text may be clipped by widget size; tap for the complete card.
5. Tap the widget to open exactly the card it displayed, even if it was stale. The scrollable reader includes **Previous**, **Next**, **Copy Command**, **Open Source**, every breakdown item, output guidance, requirements, and all supporting source links. Previous/Next wrap within that date’s ten cards.

## Notifications and automation

Notifications start **off**. In the reader, scroll to **Settings / notifications**, choose a start time and horizon, then **Save · turn notifications ON**. Allow Scriptable notifications when iOS asks; check **Settings → Notifications → Scriptable** if delivery is disabled. Sound is separately configurable in the reader. Each notification contains the task and command; tapping opens its exact card. iOS can truncate previews.

The default window has **ten hourly slots, 09:00, 10:00, …, 18:00**, in the iPhone’s current local timezone. Set a different start hour (0–14) and minute (0–59); the last slot is nine hours later on the same date. This preserves ten hourly slots. If a custom overnight window crosses a DST spring-forward gap, the nonexistent slot is skipped instead of double-booking a notification; a repeated fall-back hour is scheduled once. The default daytime window avoids these transitions in usual DST regions. Before the window the widget selects card 1; after it, card 10. At midnight the next day’s set becomes current.

Each normal in-app run and each **Refill future notifications** action queues the remaining slots today plus the next four calendar days by default. The horizon is configurable from 1–5 days including today. These are **one-time future notifications**, with the correct future day’s command already attached. Missed slots are skipped. No background script is needed for notifications already queued, and delivery does not itself refill the queue. Scriptable supports future triggers and rescheduling by identifier ([Notification API](https://docs.scriptable.app/notification/)).

**Rerun at least every few days, preferably daily.** To automate refilling, create an iPhone Shortcuts personal **Time of Day** automation at, for example, **08:55 daily**. Add Scriptable’s **Run Script** action, select **Linux Learn**, and pass the text **`schedule`** as its parameter. Select **Run Immediately** where your iOS version offers it. Initialize the script and enable notifications in Scriptable first. This mode refills silently without opening the reader. Alternatively, open `scriptable:///run?scriptName=Linux%20Learn&action=schedule`. The parameter is the literal text `schedule`, not a JSON object.

The script reserves headroom by keeping at most **50 of its own** pending notifications and targeting at most 60 pending across Scriptable, accounting for other scripts’ existing requests. This is a conservative budget, not a guaranteed iOS quota. If other scripts occupy the queue, the learning horizon shrinks or can become empty; the reader reports the last queued trigger. Free capacity and refill if necessary. Other apps/scripts can schedule more requests later, outside this script’s control.

Stable date/slot identifiers replace matching requests on rerun. Obsolete requests in this script’s namespace are removed; other scripts’ notifications are preserved. Turning notifications off cancels this deck’s pending requests on save; already delivered notifications remain in Notification Center. One installation is intended: copies of this script share the same local data and notification namespace. Run once after renaming it to update tap URLs, and rerun after changing timezone, clock, settings, or deck. Avoid running overlapping copies while editing settings or importing decks.

Widget refreshes are independent of notifications. The script asks for the next slot boundary, but **iOS decides actual refresh timing**, so some hourly cards may never render automatically. Opening the reader always exposes all ten daily cards. Shortcuts refilling does not force widget refresh. Focus, Scheduled Summary, permission settings, battery policy, and automation policy can affect what you see. Scriptable documents that `refreshAfterDate` is an earliest refresh time, not an exact schedule ([ListWidget API](https://docs.scriptable.app/listwidget/)).

## Daily selection and local progress

The first successful run stores a local `anchorDate`. That date gets day 1. Each subsequent **local calendar date** advances to the next group of ten, and day 11 cycles to the first group. Selection uses calendar components, not elapsed 24-hour periods, so DST does not shift the day index. The same date, anchor and deck always select the same cards. No shuffle, quiz or grading is involved.

The cycle offers all 100 cards over ten calendar days. It advances even on days you do not use the phone; it does not claim that queued, rendered or opened cards were actually read. A local `seen` map records widget renders and reader opens, plus the most recently viewed card. Missed cards remain available on the next cycle. Manual browsing does not pin the widget or change the daily selection. Notifications store the original card ID and date, so opening an older notification does not show today’s unrelated card.

Local storage is `FileManager.local().documentsDirectory()/LinuxLearn/`:

- `linux-deck.json`: validated deck, copied at import.
- `settings.json`: start time, notification horizon, enablement and sound.
- `progress.json`: anchor, rendered/opened IDs, last viewed card and last scheduling summary.

There is no iCloud dependency after import. Invalid JSON is reported rather than silently resetting progress. Reinstalling Scriptable or deleting its local data loses these files. Back them up before changing them.

## Content, sources and extending the deck

The ten themes are files and paths; finding and filtering; permissions and identity; disk and filesystems; processes and memory; systemd services; logs; networking; Ubuntu/Debian packages and host; Bash diagnostic workflows.

The initial deck targets Ubuntu/Debian with Bash, GNU userland and systemd. Debian Bookworm’s official packaged manuals provide a fixed compatibility baseline for GNU Bash/Coreutils/Findutils/Grep, systemd, iproute2 and the other utilities. GNU upstream sections supplement pipelines, size tests, matching and numeric sorting. Explanations are original summaries, checked against those manuals; each card has an exact primary manual URL and additional URLs for pipeline stages and shell syntax. See [LINUX_SOURCES.md](LINUX_SOURCES.md) for verification scope and the source index.

**INSPECTION**, **SUDO**, **EXTRA** package and **CHANGES STATE** labels are explicit. Three cards change file content or permissions. Inspection is not a promise of zero incidental writes: reads may update access times and sudo may write audit logs. Example paths, packages, service units and retained logs may not exist on every machine. Ubuntu/Debian-specific SSH/cron service names and package tooling are labeled. Empty output and permission errors are explained where relevant.

To add content, copy an existing card in the workspace JSON and edit every field. Preserve existing IDs and give new cards unique stable IDs using lowercase letters, numbers and hyphens. Append **complete themed groups of ten**, in array order; set each group’s `day` to its 1-based group number. Supply `title`, complete `command`, `explanation`, nonempty `breakdown` array, `output`, `requirements` (platform, packages, additionalPackages, sudo, notes), boolean `changesSystemState`, `stateChange`, `sourceUrl`, and `sourceUrls` including that primary URL. Include sources for every pipeline stage; verify flags against the target tool version. Adding groups extends the calendar cycle automatically.

Run `node --test tests/linux_learn.test.js` while editing the initial 100-card deck. Its cardinality checks deliberately enforce this deliverable; update those expectations when intentionally extending the deck. The runtime validator supports any positive multiple of ten. Transfer the updated JSON to Files and use **Import replacement deck** in the reader: it validates, copies locally and rebuilds future notifications, preserving the anchor and retained IDs’ progress. Editing the original Files copy alone does not update the imported deck.

## Verification and device limits

Local tests cover unique IDs/required fields, ten themed groups, source URL structure, Bash syntax parsing for all 100 commands (`bash -n`, without execution), complete cycle coverage and wraparound, calendar boundaries, custom windows, DST, exact-card links, future-only scheduling, capacity, idempotent replacement, disabling/cleanup, reader actions and widget selection through Scriptable API mocks. Tests do not execute administration commands or contact a Linux server.

This environment has no iPhone or Scriptable runtime. Actual Files import, native table wrapping, medium/large widget layout, clipboard interaction, URL handoff, notification permission/delivery, refresh cadence, and locked-phone Shortcuts execution need an iPhone check. Suggested smoke check: import; browse/copy a card; tap a source; add both widget sizes; enable notifications with a start minute shortly ahead; rerun twice and confirm a single matching notification; open it and verify its card; turn notifications off. Notification previews may shorten long commands, but the full reader and Copy Command retain the entire command.
