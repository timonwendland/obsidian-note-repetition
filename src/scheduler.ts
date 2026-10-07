import moment, { Moment } from "moment";

import { formatReviewDate, logicalToday } from "./date-utils";
import {
    IntervalSpec,
    NoteRepetitionDefinition,
    NoteRepetitionSettings,
    ScheduleResult,
    SpacedRating,
} from "./note-repetition-types";

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

export function completeIntervalSchedule(
    spec: IntervalSpec,
    now: Moment,
    settings: NoteRepetitionSettings,
): ScheduleResult {
    const today = logicalToday(now, settings.startOfDay);
    const calendarUnit = {
        d: "days",
        w: "weeks",
        m: "months",
        y: "years",
    }[spec.unit] as moment.unitOfTime.DurationConstructor;
    const due = today.clone().add(spec.amount, calendarUnit);
    return {
        due: formatReviewDate(due),
        last: formatReviewDate(today),
    };
}

export function completeSpacedSchedule(
    current: NoteRepetitionDefinition,
    rating: SpacedRating,
    now: Moment,
    settings: NoteRepetitionSettings,
): ScheduleResult {
    const today = logicalToday(now, settings.startOfDay);
    const currentDue = current.due ? moment(current.due, "YYYY-MM-DD", true) : null;
    const delayedDays =
        currentDue?.isValid() && today.isAfter(currentDue)
            ? Math.floor((today.valueOf() - currentDue.valueOf()) / MILLIS_PER_DAY)
            : 0;

    let interval = Math.max(1, current.interval || 1);
    let ease = Math.max(130, current.ease || settings.baseEase);

    switch (rating) {
        case "easy":
            ease += 20;
            interval = ((interval + delayedDays) * ease * settings.easyBonus) / 100;
            break;
        case "good":
            interval = ((interval + delayedDays / 2) * ease) / 100;
            break;
        case "hard":
            ease = Math.max(130, ease - 20);
            interval = Math.max(1, (interval + delayedDays / 4) * settings.lapsesIntervalChange);
            break;
        case "again":
            ease = Math.max(130, ease - 20);
            interval = 0;
            break;
    }

    interval = Math.min(settings.maximumIntervalDays, Math.round(interval * 10) / 10);
    const due = today.clone().add(Math.round(interval), "days");

    return {
        due: formatReviewDate(due),
        last: formatReviewDate(today),
        interval,
        ease,
    };
}
