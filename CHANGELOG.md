# Changelog

## 1.0.1

Fixes for the community plugin review.

- The settings appear in the settings search of Obsidian 1.13 and later. The section headings use the standard Obsidian style.
- The plugin does not save a setting that is not valid, for example a start of the review day that is not a time.
- The command names no longer repeat the plugin name. The command to open the queue is now **Open review queue** and has a new ID, so assign its hotkey again if you used one.
- The file menu says **Add to review queue** and **Remove from review queue**.
- Uses the moment library that Obsidian includes.
- Updates minimatch to 11.0.3, which fixes the advisories for minimatch and brace-expansion.
- Requires Obsidian 1.7.2 or later.

## 1.0.0

First version of Note Repetition.

- Adds whole notes to a review queue with the property `note-repetition: true`.
- Adds two modes: spaced repetition with ratings (Again, Hard, Good, Easy) and fixed intervals (`repetition-every`).
- Stores the schedule in note properties (`repetition-due`, `repetition-last`, `repetition-interval`, `repetition-ease`).
- Adds a review queue view, commands, file-menu actions, a status bar count and reminders.
- Removes the flashcard, deck and statistics functions of obsidian-spaced-repetition.

The fork starts from obsidian-spaced-repetition at commit 22fbea0.
