import { PluginSettingTab, Setting } from "obsidian";
import type { SettingDefinitionItem } from "obsidian";

import { isValidStartOfDay } from "./date-utils";
import { parseInterval } from "./interval";
import type NoteRepetitionPlugin from "./main";
import type { NoteRepetitionSettings } from "./note-repetition-types";
import { normalizeSettings } from "./settings";

type SettingKey = keyof NoteRepetitionSettings;
type Validate<V> = (value: V) => string | undefined;

// The same shapes as Obsidian's declarative settings (1.13+). They are declared
// here so that display() can read them on older versions without 1.13 types.
type Control =
    | { type: "toggle"; key: SettingKey }
    | { type: "dropdown"; key: SettingKey; options: Record<string, string> }
    | { type: "text"; key: SettingKey; validate?: Validate<string> }
    | { type: "textarea"; key: SettingKey }
    | {
          type: "number";
          key: SettingKey;
          min: number;
          max: number;
          step: number;
          validate: Validate<number>;
      };
interface ControlDefinition {
    name: string;
    desc: string;
    control: Control;
}
interface Group {
    type: "group";
    heading: string;
    items: ControlDefinition[];
}

/** Changing one of these settings restarts the reminder timer. */
const REMINDER_KEYS = new Set<string>([
    "enableReviewReminders",
    "reviewReminderCheckOnStartup",
    "reviewReminderIntervalMinutes",
    "reviewReminderShowNotice",
    "reviewReminderPlaySound",
    "reviewReminderBounceDock",
]);

function toggle(name: string, desc: string, key: SettingKey): ControlDefinition {
    return { name, desc, control: { type: "toggle", key } };
}

function wholeNumber(min: number, max: number): Validate<number> {
    return (value) =>
        Number.isInteger(value) && value >= min && value <= max
            ? undefined
            : `Enter a whole number from ${min} to ${max}.`;
}

const GROUPS: Group[] = [
    {
        type: "group",
        heading: "Scheduling",
        items: [
            {
                name: "Default mode",
                desc: "Used when enabling a note from a command or file menu.",
                control: {
                    type: "dropdown",
                    key: "defaultMode",
                    options: { spaced: "Spaced repetition", interval: "Fixed interval" },
                },
            },
            {
                name: "Default fixed interval",
                desc: "Examples: 7d, 1w, 1m, 1y.",
                control: {
                    type: "text",
                    key: "defaultInterval",
                    validate: (value) =>
                        parseInterval(value) ? undefined : "Enter a number and d, w, m or y.",
                },
            },
            {
                name: "Start of review day",
                desc: "A time such as 04:00:00. Reviews before it count as the previous day.",
                control: {
                    type: "text",
                    key: "startOfDay",
                    validate: (value) =>
                        isValidStartOfDay(value) ? undefined : "Enter a time such as 04:00:00.",
                },
            },
            {
                name: "Upcoming horizon",
                desc: "How many future days the queue shows.",
                control: {
                    type: "number",
                    key: "maxUpcomingDays",
                    min: 1,
                    max: 36525,
                    step: 1,
                    validate: wholeNumber(1, 36525),
                },
            },
        ],
    },
    {
        type: "group",
        heading: "Queue and Obsidian",
        items: [
            toggle(
                "Open queue on startup",
                "Reveal the note queue when Obsidian starts.",
                "enableReviewPaneOnStartup",
            ),
            toggle(
                "Open next note after review",
                "Continue through due notes automatically.",
                "autoNextNote",
            ),
            toggle(
                "Choose next note randomly",
                "Randomize the next due note instead of using due-date order.",
                "openRandomNote",
            ),
            toggle(
                "Show file-menu actions",
                "Add repetition actions to Markdown note menus.",
                "showFileMenu",
            ),
            toggle("Show status bar", "Show the current number of due notes.", "showStatusBar"),
            {
                name: "Ignored paths",
                desc: "One glob per line.",
                control: { type: "textarea", key: "noteFoldersToIgnore" },
            },
        ],
    },
    {
        type: "group",
        heading: "Reminders",
        items: [
            toggle(
                "Enable reminders",
                "Periodically notify you when notes are due.",
                "enableReviewReminders",
            ),
            toggle(
                "Check on startup",
                "Run one reminder check after startup.",
                "reviewReminderCheckOnStartup",
            ),
            {
                name: "Reminder interval",
                desc: "Minutes between checks.",
                control: {
                    type: "number",
                    key: "reviewReminderIntervalMinutes",
                    min: 1,
                    max: 1440,
                    step: 1,
                    validate: wholeNumber(1, 1440),
                },
            },
            {
                name: "Reminder message",
                desc: "Leave blank to use the due-note count.",
                control: { type: "text", key: "reviewReminderMessage" },
            },
            toggle(
                "Show a notice",
                "Show an Obsidian notice when notes are due.",
                "reviewReminderShowNotice",
            ),
            toggle("Play a sound", "Play a short reminder tone.", "reviewReminderPlaySound"),
            toggle(
                "Bounce the dock icon",
                "Request attention on desktop when supported.",
                "reviewReminderBounceDock",
            ),
        ],
    },
];

export class NoteRepetitionSettingTab extends PluginSettingTab {
    constructor(private readonly plugin: NoteRepetitionPlugin) {
        super(plugin.app, plugin);
    }

    /** Obsidian 1.13 and later render the tab from these definitions. */
    public getSettingDefinitions(): SettingDefinitionItem[] {
        return GROUPS;
    }

    public getControlValue(key: string): unknown {
        const value = this.plugin.settings[key as SettingKey];
        return Array.isArray(value) ? value.join("\n") : value;
    }

    public async setControlValue(key: string, value: unknown): Promise<void> {
        let next = value;
        if (typeof value === "string" && key === "noteFoldersToIgnore") {
            next = value
                .split("\n")
                .map((entry) => entry.trim())
                .filter(Boolean);
        } else if (typeof value === "string" && key === "defaultInterval") {
            next = value.trim().toLowerCase();
        }
        this.plugin.settings = normalizeSettings({ ...this.plugin.settings, [key]: next });
        await this.plugin.saveSettings(REMINDER_KEYS.has(key));
    }

    /** Earlier Obsidian versions call display() and get the same settings. */
    public display(): void {
        const { containerEl } = this;
        containerEl.empty();
        for (const { heading, items } of GROUPS) {
            new Setting(containerEl).setName(heading).setHeading();
            for (const definition of items) this.renderControl(definition);
        }
    }

    private renderControl({ name, desc, control }: ControlDefinition): void {
        const setting = new Setting(this.containerEl).setName(name).setDesc(desc);
        const current = this.getControlValue(control.key);
        switch (control.type) {
            case "toggle":
                setting.addToggle((toggle) =>
                    toggle
                        .setValue(Boolean(current))
                        .onChange((value) => this.persist(control.key, value)),
                );
                break;
            case "dropdown":
                setting.addDropdown((dropdown) =>
                    dropdown
                        .addOptions(control.options)
                        .setValue(String(current))
                        .onChange((value) => this.persist(control.key, value)),
                );
                break;
            case "number":
                setting.addText((text) =>
                    text
                        .setValue(String(current))
                        .onChange((value) =>
                            this.persist(control.key, Number(value), control.validate),
                        ),
                );
                break;
            case "textarea":
                setting.addTextArea((text) =>
                    text
                        .setValue(String(current))
                        .onChange((value) => this.persist(control.key, value)),
                );
                break;
            case "text":
                setting.addText((text) =>
                    text
                        .setValue(String(current))
                        .onChange((value) => this.persist(control.key, value, control.validate)),
                );
                break;
        }
    }

    private async persist<V>(key: string, value: V, validate?: Validate<V>): Promise<void> {
        if (validate?.(value)) return;
        await this.setControlValue(key, value);
    }
}
