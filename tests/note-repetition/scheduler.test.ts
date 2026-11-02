import { moment } from "obsidian";

import { parseNoteRepetitionProperties } from "../../src/properties";
import { completeSpacedSchedule } from "../../src/scheduler";
import { DEFAULT_SETTINGS } from "../../src/settings";

describe("spaced scheduling", () => {
    const note = parseNoteRepetitionProperties(
        {
            "note-repetition": true,
            "repetition-mode": "spaced",
            "repetition-due": "2026-09-11",
            "repetition-interval": 10,
            "repetition-ease": 250,
        },
        DEFAULT_SETTINGS,
    );

    test("again returns the note to today and lowers ease", () => {
        expect(
            completeSpacedSchedule(note, "again", moment("2026-09-11T12:00:00"), DEFAULT_SETTINGS),
        ).toMatchObject({ due: "2026-09-11", last: "2026-09-11", interval: 0, ease: 230 });
    });

    test("good increases the interval", () => {
        expect(
            completeSpacedSchedule(note, "good", moment("2026-09-11T12:00:00"), DEFAULT_SETTINGS),
        ).toMatchObject({ due: "2026-10-06", interval: 25, ease: 250 });
    });

    test("never lets ease fall below the floor", () => {
        const lowEase = { ...note, ease: 130 };
        expect(
            completeSpacedSchedule(lowEase, "hard", moment("2026-09-11T12:00:00"), DEFAULT_SETTINGS)
                .ease,
        ).toBe(130);
    });
});
