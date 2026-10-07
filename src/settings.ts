import { isValidStartOfDay } from "./date-utils";
import { parseInterval } from "./interval";
import {
    NoteRepetitionData,
    NoteRepetitionSettings,
    RepetitionMode,
} from "./note-repetition-types";

export const DEFAULT_SETTINGS: NoteRepetitionSettings = {
    defaultMode: "spaced",
    defaultInterval: "1w",
    startOfDay: "00:00:00",
    baseEase: 250,
    lapsesIntervalChange: 0.5,
    easyBonus: 1.3,
    maximumIntervalDays: 36525,
    maxUpcomingDays: 365,
    openRandomNote: false,
    autoNextNote: false,
    enableReviewPaneOnStartup: true,
    showFileMenu: true,
    showStatusBar: true,
    noteFoldersToIgnore: ["**/*.excalidraw.md"],
    preferredDateFormat: "MMM DD YYYY",
    enableReviewReminders: false,
    reviewReminderIntervalMinutes: 30,
    reviewReminderCheckOnStartup: false,
    reviewReminderMessage: "",
    reviewReminderShowNotice: true,
    reviewReminderPlaySound: true,
    reviewReminderBounceDock: true,
};

export const DEFAULT_DATA: NoteRepetitionData = {
    version: 1,
    settings: DEFAULT_SETTINGS,
};

function recordValue(value: unknown): Record<string, unknown> {
    return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function booleanValue(value: unknown, fallback: boolean): boolean {
    return typeof value === "boolean" ? value : fallback;
}

function numberValue(value: unknown, fallback: number, minimum: number, maximum: number): number {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

function textValue(value: unknown, fallback: string): string {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function modeValue(value: unknown): RepetitionMode {
    return value === "interval" || value === "spaced" ? value : DEFAULT_SETTINGS.defaultMode;
}

export function normalizeSettings(value: unknown): NoteRepetitionSettings {
    const container = recordValue(value);
    const source = recordValue(container.settings ?? container);
    const defaultInterval = textValue(source.defaultInterval, DEFAULT_SETTINGS.defaultInterval);
    const startOfDay = textValue(source.startOfDay, DEFAULT_SETTINGS.startOfDay);
    const ignoredFolders = Array.isArray(source.noteFoldersToIgnore)
        ? source.noteFoldersToIgnore.filter(
              (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
          )
        : [...DEFAULT_SETTINGS.noteFoldersToIgnore];

    return {
        defaultMode: modeValue(source.defaultMode),
        defaultInterval: parseInterval(defaultInterval)
            ? defaultInterval
            : DEFAULT_SETTINGS.defaultInterval,
        startOfDay: isValidStartOfDay(startOfDay) ? startOfDay : DEFAULT_SETTINGS.startOfDay,
        baseEase: numberValue(source.baseEase, DEFAULT_SETTINGS.baseEase, 130, 500),
        lapsesIntervalChange: numberValue(
            source.lapsesIntervalChange,
            DEFAULT_SETTINGS.lapsesIntervalChange,
            0.1,
            1,
        ),
        easyBonus: numberValue(source.easyBonus, DEFAULT_SETTINGS.easyBonus, 1, 3),
        maximumIntervalDays: numberValue(
            source.maximumIntervalDays ?? source.maximumInterval,
            DEFAULT_SETTINGS.maximumIntervalDays,
            1,
            36525,
        ),
        maxUpcomingDays: numberValue(
            source.maxUpcomingDays ?? source.maxNDaysNotesReviewQueue,
            DEFAULT_SETTINGS.maxUpcomingDays,
            1,
            36525,
        ),
        openRandomNote: booleanValue(source.openRandomNote, DEFAULT_SETTINGS.openRandomNote),
        autoNextNote: booleanValue(source.autoNextNote, DEFAULT_SETTINGS.autoNextNote),
        enableReviewPaneOnStartup: booleanValue(
            source.enableReviewPaneOnStartup ?? source.enableNoteReviewPaneOnStartup,
            DEFAULT_SETTINGS.enableReviewPaneOnStartup,
        ),
        showFileMenu: booleanValue(
            source.showFileMenu ?? source.showFileMenuReviewOptions,
            DEFAULT_SETTINGS.showFileMenu,
        ),
        showStatusBar: booleanValue(source.showStatusBar, DEFAULT_SETTINGS.showStatusBar),
        noteFoldersToIgnore: ignoredFolders,
        preferredDateFormat: textValue(
            source.preferredDateFormat ?? source.preferredDateFormatForNoteReviewQueue,
            DEFAULT_SETTINGS.preferredDateFormat,
        ),
        enableReviewReminders: booleanValue(
            source.enableReviewReminders,
            DEFAULT_SETTINGS.enableReviewReminders,
        ),
        reviewReminderIntervalMinutes: numberValue(
            source.reviewReminderIntervalMinutes,
            DEFAULT_SETTINGS.reviewReminderIntervalMinutes,
            1,
            1440,
        ),
        reviewReminderCheckOnStartup: booleanValue(
            source.reviewReminderCheckOnStartup,
            DEFAULT_SETTINGS.reviewReminderCheckOnStartup,
        ),
        reviewReminderMessage:
            typeof source.reviewReminderMessage === "string"
                ? source.reviewReminderMessage
                : DEFAULT_SETTINGS.reviewReminderMessage,
        reviewReminderShowNotice: booleanValue(
            source.reviewReminderShowNotice,
            DEFAULT_SETTINGS.reviewReminderShowNotice,
        ),
        reviewReminderPlaySound: booleanValue(
            source.reviewReminderPlaySound,
            DEFAULT_SETTINGS.reviewReminderPlaySound,
        ),
        reviewReminderBounceDock: booleanValue(
            source.reviewReminderBounceDock,
            DEFAULT_SETTINGS.reviewReminderBounceDock,
        ),
    };
}
