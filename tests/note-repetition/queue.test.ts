import { moment } from "obsidian";

import { parseNoteRepetitionProperties } from "../../src/properties";
import { createReviewItem, dueReviewItems, sortReviewItems } from "../../src/review-queue";
import { DEFAULT_SETTINGS } from "../../src/settings";

function item(path: string, due?: string) {
    const definition = parseNoteRepetitionProperties(
        {
            "note-repetition": true,
            "repetition-mode": "spaced",
            ...(due ? { "repetition-due": due } : {}),
        },
        DEFAULT_SETTINGS,
    );
    return createReviewItem(
        { path, basename: path.replace(/\.md$/, "") },
        definition,
        moment("2026-09-11T12:00:00"),
        DEFAULT_SETTINGS,
    );
}

describe("review queue", () => {
    test("classifies overdue, today, upcoming, and unscheduled notes", () => {
        expect(item("old.md", "2026-09-10").section).toBe("overdue");
        expect(item("today.md", "2026-09-11").section).toBe("today");
        expect(item("future.md", "2026-09-12").section).toBe("upcoming");
        expect(item("new.md").section).toBe("inbox");
    });

    test("orders overdue notes before today and future notes", () => {
        const sorted = sortReviewItems([
            item("future.md", "2026-09-12"),
            item("today.md", "2026-09-11"),
            item("old.md", "2026-09-10"),
        ]);
        expect(sorted.map((entry) => entry.note.path)).toEqual(["old.md", "today.md", "future.md"]);
        expect(dueReviewItems(sorted)).toHaveLength(2);
    });
});
