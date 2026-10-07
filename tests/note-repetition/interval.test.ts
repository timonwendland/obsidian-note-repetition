import moment from "moment";

import { parseInterval } from "../../src/interval";
import { DEFAULT_SETTINGS } from "../../src/settings";
import { completeIntervalSchedule } from "../../src/scheduler";

describe("fixed interval scheduling", () => {
    test.each([
        ["7d", 7, "d"],
        ["1w", 1, "w"],
        ["2m", 2, "m"],
        ["1y", 1, "y"],
    ])("parses %s", (value, amount, unit) => {
        expect(parseInterval(value)).toMatchObject({ amount, unit, canonical: value });
    });

    test.each(["", "0d", "weekly", "1.5w", "-2m", "1h"])("rejects %s", (value) => {
        expect(parseInterval(value)).toBeNull();
    });

    test("uses calendar months instead of an approximate number of days", () => {
        const spec = parseInterval("1m");
        expect(spec).not.toBeNull();
        expect(
            completeIntervalSchedule(spec!, moment("2026-01-31T12:00:00"), DEFAULT_SETTINGS),
        ).toEqual({ due: "2026-02-28", last: "2026-01-31" });
    });
});
