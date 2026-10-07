import { IntervalSpec, IntervalUnit } from "./note-repetition-types";

const INTERVAL_PATTERN = /^([1-9]\d*)\s*([dwmy])$/i;

export function parseInterval(value: unknown): IntervalSpec | null {
    if (typeof value !== "string") return null;
    const match = INTERVAL_PATTERN.exec(value.trim());
    if (!match) return null;

    const amount = Number.parseInt(match[1], 10);
    if (!Number.isSafeInteger(amount) || amount <= 0) return null;

    const unit = match[2].toLowerCase() as IntervalUnit;
    return { amount, unit, canonical: `${amount}${unit}` };
}

export function describeInterval(spec: IntervalSpec): string {
    const singular = spec.amount === 1;
    const unitName: Record<IntervalUnit, [string, string]> = {
        d: ["day", "days"],
        w: ["week", "weeks"],
        m: ["month", "months"],
        y: ["year", "years"],
    };
    return `${spec.amount} ${singular ? unitName[spec.unit][0] : unitName[spec.unit][1]}`;
}
