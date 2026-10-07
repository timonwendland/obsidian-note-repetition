import { parseNoteRepetitionProperties } from "../../src/properties";
import { DEFAULT_SETTINGS } from "../../src/settings";

describe("note repetition properties", () => {
    test("does not enroll a note through the separate one-time ToReview property", () => {
        const result = parseNoteRepetitionProperties({ ToReview: true }, DEFAULT_SETTINGS);
        expect(result.enabled).toBe(false);
    });

    test("enrolls with the dedicated checkbox", () => {
        const result = parseNoteRepetitionProperties(
            { "note-repetition": true, "repetition-mode": "spaced" },
            DEFAULT_SETTINGS,
        );
        expect(result.enabled).toBe(true);
        expect(result.mode).toBe("spaced");
        expect(result.errors).toEqual([]);
    });

    test("requires a valid interval for interval notes", () => {
        const result = parseNoteRepetitionProperties(
            { "note-repetition": true, "repetition-mode": "interval" },
            DEFAULT_SETTINGS,
        );
        expect(result.errors[0]).toContain("repetition-every");
    });

    test("reports invalid managed dates instead of silently dropping the note", () => {
        const result = parseNoteRepetitionProperties(
            { "note-repetition": true, "repetition-due": "tomorrow" },
            DEFAULT_SETTINGS,
        );
        expect(result.errors[0]).toContain("YYYY-MM-DD");
    });
});
