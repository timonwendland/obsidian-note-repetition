import type { Moment } from "moment";
import { moment } from "obsidian";

const DATE_FORMAT = "YYYY-MM-DD";
const START_OF_DAY_PATTERN = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;

export function isValidStartOfDay(value: string): boolean {
    const match = START_OF_DAY_PATTERN.exec(value);
    if (!match) return false;

    const hour = Number.parseInt(match[1], 10);
    const minute = Number.parseInt(match[2], 10);
    const second = Number.parseInt(match[3] ?? "0", 10);
    return hour <= 23 && minute <= 59 && second <= 59;
}

export function logicalToday(now: Moment, startOfDay: string): Moment {
    const safeStartOfDay = isValidStartOfDay(startOfDay) ? startOfDay : "00:00:00";
    const [hour, minute, second = "0"] = safeStartOfDay.split(":");
    const boundary = now
        .clone()
        .startOf("day")
        .hour(Number.parseInt(hour, 10))
        .minute(Number.parseInt(minute, 10))
        .second(Number.parseInt(second, 10));

    const result = now.clone().startOf("day");
    if (now.isBefore(boundary)) result.subtract(1, "day");
    return result;
}

export function parseReviewDate(value: unknown): Moment | null {
    if (value instanceof Date && !Number.isNaN(value.valueOf())) {
        return moment(value).startOf("day");
    }

    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;

    const parsed = moment(trimmed, DATE_FORMAT, true);
    return parsed.isValid() ? parsed.startOf("day") : null;
}

export function formatReviewDate(value: Moment): string {
    return value.format(DATE_FORMAT);
}
