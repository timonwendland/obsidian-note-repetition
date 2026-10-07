import { PluginSettingTab, Setting } from "obsidian";

import type NoteRepetitionPlugin from "./main";
import { parseInterval } from "./interval";

export class NoteRepetitionSettingTab extends PluginSettingTab {
    constructor(private readonly plugin: NoteRepetitionPlugin) {
        super(plugin.app, plugin);
    }

    public display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl("h1", { text: "Note Repetition" });
        containerEl.createEl("p", {
            cls: "setting-item-description",
            text: "Queue whole notes with dedicated recurring-review properties.",
        });

        this.heading("Scheduling");
        new Setting(containerEl)
            .setName("Default mode")
            .setDesc("Used when enabling a note from a command or file menu.")
            .addDropdown((dropdown) =>
                dropdown
                    .addOption("spaced", "Spaced repetition")
                    .addOption("interval", "Fixed interval")
                    .setValue(this.plugin.settings.defaultMode)
                    .onChange(async (value) => {
                        this.plugin.settings.defaultMode = value as "spaced" | "interval";
                        await this.plugin.saveSettings();
                    }),
            );
        new Setting(containerEl)
            .setName("Default fixed interval")
            .setDesc("Examples: 7d, 1w, 1m, 1y.")
            .addText((text) =>
                text.setValue(this.plugin.settings.defaultInterval).onChange(async (value) => {
                    if (!parseInterval(value)) return;
                    this.plugin.settings.defaultInterval = value.trim().toLowerCase();
                    await this.plugin.saveSettings();
                }),
            );
        new Setting(containerEl)
            .setName("Start of review day")
            .setDesc("Time in HH:mm:ss. Reviews before this time count as the previous day.")
            .addText((text) =>
                text.setValue(this.plugin.settings.startOfDay).onChange(async (value) => {
                    this.plugin.settings.startOfDay = value;
                    await this.plugin.saveSettings();
                }),
            );
        new Setting(containerEl)
            .setName("Upcoming horizon")
            .setDesc("How many future days the queue shows.")
            .addText((text) =>
                text
                    .setValue(String(this.plugin.settings.maxUpcomingDays))
                    .onChange(async (value) => {
                        const days = Number.parseInt(value, 10);
                        if (!Number.isFinite(days) || days < 1) return;
                        this.plugin.settings.maxUpcomingDays = days;
                        await this.plugin.saveSettings();
                    }),
            );

        this.heading("Queue and Obsidian");
        this.toggle(
            "Open queue on startup",
            "Reveal the note queue when Obsidian starts.",
            "enableReviewPaneOnStartup",
        );
        this.toggle(
            "Open next note after review",
            "Continue through due notes automatically.",
            "autoNextNote",
        );
        this.toggle(
            "Choose next note randomly",
            "Randomize the next due note instead of using due-date order.",
            "openRandomNote",
        );
        this.toggle(
            "Show file-menu actions",
            "Add repetition actions to Markdown note menus.",
            "showFileMenu",
        );
        this.toggle("Show status bar", "Show the current number of due notes.", "showStatusBar");
        new Setting(containerEl)
            .setName("Ignored paths")
            .setDesc("One glob per line.")
            .addTextArea((text) =>
                text
                    .setValue(this.plugin.settings.noteFoldersToIgnore.join("\n"))
                    .onChange(async (value) => {
                        this.plugin.settings.noteFoldersToIgnore = value
                            .split("\n")
                            .map((entry) => entry.trim())
                            .filter(Boolean);
                        await this.plugin.saveSettings();
                    }),
            );

        this.heading("Reminders");
        this.toggle(
            "Enable reminders",
            "Periodically notify you when notes are due.",
            "enableReviewReminders",
            true,
        );
        this.toggle(
            "Check on startup",
            "Run one reminder check after startup.",
            "reviewReminderCheckOnStartup",
            true,
        );
        new Setting(containerEl)
            .setName("Reminder interval")
            .setDesc("Minutes between checks.")
            .addText((text) =>
                text
                    .setValue(String(this.plugin.settings.reviewReminderIntervalMinutes))
                    .onChange(async (value) => {
                        const minutes = Number.parseInt(value, 10);
                        if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440) return;
                        this.plugin.settings.reviewReminderIntervalMinutes = minutes;
                        await this.plugin.saveSettings(true);
                    }),
            );
        new Setting(containerEl)
            .setName("Reminder message")
            .setDesc("Leave blank to use the due-note count.")
            .addText((text) =>
                text
                    .setValue(this.plugin.settings.reviewReminderMessage)
                    .onChange(async (value) => {
                        this.plugin.settings.reviewReminderMessage = value;
                        await this.plugin.saveSettings();
                    }),
            );
        this.toggle(
            "Show a notice",
            "Show an Obsidian notice when notes are due.",
            "reviewReminderShowNotice",
            true,
        );
        this.toggle("Play a sound", "Play a short reminder tone.", "reviewReminderPlaySound", true);
        this.toggle(
            "Bounce the dock icon",
            "Request attention on desktop when supported.",
            "reviewReminderBounceDock",
            true,
        );
    }

    private heading(text: string): void {
        this.containerEl.createEl("h2", { text });
    }

    private toggle(
        name: string,
        description: string,
        key: keyof typeof this.plugin.settings,
        restartReminders = false,
    ): void {
        new Setting(this.containerEl)
            .setName(name)
            .setDesc(description)
            .addToggle((toggle) =>
                toggle.setValue(Boolean(this.plugin.settings[key])).onChange(async (value) => {
                    (this.plugin.settings[key] as boolean) = value;
                    await this.plugin.saveSettings(restartReminders);
                }),
            );
    }
}
