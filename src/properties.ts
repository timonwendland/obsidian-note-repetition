import { parseReviewDate } from "./date-utils";
import { parseInterval } from "./interval";
import {
    NoteRepetitionDefinition,
    NoteRepetitionSettings,
    RepetitionMode,
} from "./note-repetition-types";

export const PROPERTY_NAMES = {
    enabled: "note-repetition",
    mode: "repetition-mode",
    every: "repetition-every",
    due: "repetition-due",
    last: "repetition-last",
    interval: "repetition-interval",
    ease: "repetition-ease",
} as const;

function isEnabled(value: unknown): boolean {
    if (value === true) return true;
    return typeof value === "string" && value.trim().toLowerCase() === "true";
}

function parseMode(value: unknown): RepetitionMode | null {
    if (typeof value !== "string") return null;
    const normalized = value.trim().toLowerCase();
    return normalized === "spaced" || normalized === "interval" ? normalized : null;
}

function parseNumber(value: unknown, fallback: number, minimum: number): number {
    const number = typeof value === "number" ? value : Number(value);
    return Number.isFinite(number) && number >= minimum ? number : fallback;
}

function textValue(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

export function parseNoteRepetitionProperties(
    frontmatter: Record<string, unknown> | undefined,
    settings: NoteRepetitionSettings,
): NoteRepetitionDefinition {
    const source = frontmatter ?? {};
    const enabled = isEnabled(source[PROPERTY_NAMES.enabled]);
    const explicitMode = source[PROPERTY_NAMES.mode] !== undefined;
    const parsedMode = parseMode(source[PROPERTY_NAMES.mode]);
    const mode = parsedMode ?? settings.defaultMode;
    const every = textValue(source[PROPERTY_NAMES.every]);
    const intervalSpec = parseInterval(every);
    const dueValue = source[PROPERTY_NAMES.due];
    const lastValue = source[PROPERTY_NAMES.last];
    const dueDate = dueValue === undefined ? null : parseReviewDate(dueValue);
    const lastDate = lastValue === undefined ? null : parseReviewDate(lastValue);
    const errors: string[] = [];

    if (enabled && explicitMode && parsedMode === null) {
        errors.push('Set "repetition-mode" to "spaced" or "interval".');
    }
    if (enabled && mode === "interval" && intervalSpec === null) {
        errors.push('Set "repetition-every" to a duration such as "1w" or "1m".');
    }
    if (enabled && dueValue !== undefined && dueDate === null) {
        errors.push('Set "repetition-due" to a date in YYYY-MM-DD format.');
    }
    if (enabled && lastValue !== undefined && lastDate === null) {
        errors.push('Set "repetition-last" to a date in YYYY-MM-DD format.');
    }

    return {
        enabled,
        mode,
        explicitMode,
        every: intervalSpec?.canonical ?? every,
        intervalSpec,
        due: dueDate?.format("YYYY-MM-DD") ?? null,
        last: lastDate?.format("YYYY-MM-DD") ?? null,
        interval: parseNumber(source[PROPERTY_NAMES.interval], 1, 0),
        ease: parseNumber(source[PROPERTY_NAMES.ease], settings.baseEase, 130),
        errors,
    };
}
