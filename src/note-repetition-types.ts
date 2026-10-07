export type RepetitionMode = "spaced" | "interval";

export type SpacedRating = "again" | "hard" | "good" | "easy";

export type ReviewAction = SpacedRating | "reviewed";

export type QueueSection = "overdue" | "today" | "upcoming" | "inbox" | "needs-setup";

export type IntervalUnit = "d" | "w" | "m" | "y";

export interface IntervalSpec {
    amount: number;
    unit: IntervalUnit;
    canonical: string;
}

export interface NoteRepetitionSettings {
    defaultMode: RepetitionMode;
    defaultInterval: string;
    startOfDay: string;
    baseEase: number;
    lapsesIntervalChange: number;
    easyBonus: number;
    maximumIntervalDays: number;
    maxUpcomingDays: number;
    openRandomNote: boolean;
    autoNextNote: boolean;
    enableReviewPaneOnStartup: boolean;
    showFileMenu: boolean;
    showStatusBar: boolean;
    noteFoldersToIgnore: string[];
    preferredDateFormat: string;
    enableReviewReminders: boolean;
    reviewReminderIntervalMinutes: number;
    reviewReminderCheckOnStartup: boolean;
    reviewReminderMessage: string;
    reviewReminderShowNotice: boolean;
    reviewReminderPlaySound: boolean;
    reviewReminderBounceDock: boolean;
}

export interface NoteRepetitionDefinition {
    enabled: boolean;
    mode: RepetitionMode;
    explicitMode: boolean;
    every: string | null;
    intervalSpec: IntervalSpec | null;
    due: string | null;
    last: string | null;
    interval: number;
    ease: number;
    errors: string[];
}

export interface ReviewNoteRef {
    path: string;
    basename: string;
}

export interface ReviewItem {
    note: ReviewNoteRef;
    definition: NoteRepetitionDefinition;
    section: QueueSection;
    dueTimestamp: number | null;
}

export interface ScheduleResult {
    due: string;
    last: string;
    interval?: number;
    ease?: number;
}

export interface NoteRepetitionData {
    version: number;
    settings: NoteRepetitionSettings;
}
