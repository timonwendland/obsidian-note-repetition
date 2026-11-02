import type { Moment } from "moment";
import { moment } from "obsidian";

import { logicalToday, parseReviewDate } from "./date-utils";
import {
    NoteRepetitionDefinition,
    NoteRepetitionSettings,
    QueueSection,
    ReviewItem,
    ReviewNoteRef,
} from "./note-repetition-types";

const SECTION_ORDER: Record<QueueSection, number> = {
    overdue: 0,
    today: 1,
    inbox: 2,
    "needs-setup": 3,
    upcoming: 4,
};

export function createReviewItem(
    note: ReviewNoteRef,
    definition: NoteRepetitionDefinition,
    now: Moment,
    settings: NoteRepetitionSettings,
): ReviewItem {
    const due = definition.due ? parseReviewDate(definition.due) : null;
    let section: QueueSection;

    if (definition.errors.length > 0) {
        section = "needs-setup";
    } else if (!due) {
        section = "inbox";
    } else {
        const today = logicalToday(now, settings.startOfDay);
        if (due.isBefore(today, "day")) section = "overdue";
        else if (due.isSame(today, "day")) section = "today";
        else section = "upcoming";
    }

    return {
        note,
        definition,
        section,
        dueTimestamp: due?.valueOf() ?? null,
    };
}

export function sortReviewItems(items: ReviewItem[]): ReviewItem[] {
    return [...items].sort((left, right) => {
        const sectionDifference = SECTION_ORDER[left.section] - SECTION_ORDER[right.section];
        if (sectionDifference !== 0) return sectionDifference;

        const leftDue = left.dueTimestamp ?? Number.MAX_SAFE_INTEGER;
        const rightDue = right.dueTimestamp ?? Number.MAX_SAFE_INTEGER;
        if (leftDue !== rightDue) return leftDue - rightDue;

        return left.note.path.localeCompare(right.note.path);
    });
}

export function dueReviewItems(items: ReviewItem[]): ReviewItem[] {
    return items.filter((item) => item.section === "overdue" || item.section === "today");
}

export function visibleUpcomingItems(
    items: ReviewItem[],
    now: Moment,
    settings: NoteRepetitionSettings,
): ReviewItem[] {
    const horizon = logicalToday(now, settings.startOfDay)
        .add(settings.maxUpcomingDays, "days")
        .valueOf();
    return items.filter(
        (item) => item.section !== "upcoming" || (item.dueTimestamp ?? 0) <= horizon,
    );
}

export function formatDueLabel(item: ReviewItem, preferredFormat: string): string {
    if (item.section === "inbox") return "Not scheduled yet";
    if (item.section === "needs-setup") return item.definition.errors[0] ?? "Needs setup";
    if (!item.dueTimestamp) return "";
    return moment(item.dueTimestamp).format(preferredFormat);
}
