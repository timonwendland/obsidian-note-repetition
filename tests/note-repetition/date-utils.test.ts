import { moment } from "obsidian";

import { logicalToday } from "../../src/date-utils";

describe("custom review day boundary", () => {
    test("counts time before the boundary as the previous review day", () => {
        expect(logicalToday(moment("2026-09-11T03:30:00"), "04:00:00").format("YYYY-MM-DD")).toBe(
            "2026-09-10",
        );
    });

    test("uses the current date after the boundary", () => {
        expect(logicalToday(moment("2026-09-11T04:01:00"), "04:00:00").format("YYYY-MM-DD")).toBe(
            "2026-09-11",
        );
    });
});
