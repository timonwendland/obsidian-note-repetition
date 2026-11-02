import { Menu, Notice, Plugin, setIcon, TAbstractFile, TFile, WorkspaceLeaf } from "obsidian";

import { NoteRepetitionSettings, ReviewAction } from "./note-repetition-types";
import { ReviewManager } from "./review-manager";
import { dueReviewItems } from "./review-queue";
import { NOTE_REPETITION_VIEW, ReviewQueueView } from "./review-queue-view";
import { NoteRepetitionSettingTab } from "./settings-tab";
import { DEFAULT_SETTINGS, normalizeSettings } from "./settings";
import "./styles.css";

export default class NoteRepetitionPlugin extends Plugin {
    public settings: NoteRepetitionSettings = { ...DEFAULT_SETTINGS };
    public reviewManager!: ReviewManager;

    private statusBar: HTMLElement | null = null;
    private removeManagerListener: (() => void) | null = null;
    private reminderTimer: number | null = null;

    public async onload(): Promise<void> {
        this.settings = normalizeSettings(await this.loadData());
        this.reviewManager = new ReviewManager(this.app, this, () => this.settings);
        this.registerView(
            NOTE_REPETITION_VIEW,
            (leaf: WorkspaceLeaf) => new ReviewQueueView(leaf, this),
        );
        this.reviewManager.initialize();
        this.removeManagerListener = this.reviewManager.onChange(() => this.updateStatusBar());

        this.addSettingTab(new NoteRepetitionSettingTab(this));
        this.addRibbonIcon("calendar-clock", "Open review queue", () => {
            void this.openQueue();
        });
        this.statusBar = this.addStatusBarItem();
        this.statusBar.addClass("note-repetition-status");
        this.statusBar.setAttribute("role", "button");
        this.statusBar.setAttribute("tabindex", "0");
        this.statusBar.addEventListener("click", () => void this.openQueue());
        this.statusBar.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") void this.openQueue();
        });

        this.registerCommands();
        this.registerEvent(
            this.app.workspace.on("file-menu", (menu, file) => {
                if (
                    this.settings.showFileMenu &&
                    file instanceof TFile &&
                    file.extension === "md"
                ) {
                    this.addNoteActions(menu, file);
                }
            }),
        );

        this.app.workspace.onLayoutReady(() => {
            this.updateStatusBar();
            this.restartReminders();
            if (this.settings.enableReviewPaneOnStartup) void this.openQueue();
        });
    }

    public onunload(): void {
        this.removeManagerListener?.();
        if (this.reminderTimer !== null) window.clearInterval(this.reminderTimer);
    }

    public async saveSettings(restartReminders = false): Promise<void> {
        await this.saveData({ version: 1, settings: this.settings });
        this.reviewManager.refresh();
        this.updateStatusBar();
        if (restartReminders) this.restartReminders();
    }

    public async openQueue(): Promise<void> {
        let leaf = this.app.workspace.getLeavesOfType(NOTE_REPETITION_VIEW)[0];
        if (!leaf) {
            leaf = this.app.workspace.getRightLeaf(false) ?? this.app.workspace.getLeaf("tab");
            await leaf.setViewState({ type: NOTE_REPETITION_VIEW, active: true });
        }
        await this.app.workspace.revealLeaf(leaf);
    }

    public async openNote(path: string): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file instanceof TFile) await this.app.workspace.getLeaf(false).openFile(file);
    }

    public async openNextDueNote(): Promise<void> {
        const due = dueReviewItems(this.reviewManager.getItems());
        if (due.length === 0) {
            new Notice("No notes are due.");
            return;
        }
        const item = this.settings.openRandomNote
            ? due[Math.floor(Math.random() * due.length)]
            : due[0];
        await this.openNote(item.note.path);
    }

    public addNoteActions(menu: Menu, file: TFile): void {
        const item = this.reviewManager.getItem(file);
        if (!item) {
            menu.addItem((entry) =>
                entry
                    .setTitle("Add to review queue")
                    .setIcon("calendar-plus")
                    .onClick(() => void this.reviewManager.enable(file)),
            );
            menu.addItem((entry) =>
                entry
                    .setTitle("Repeat weekly")
                    .setIcon("calendar-clock")
                    .onClick(() => void this.reviewManager.enable(file, "interval", "1w")),
            );
            menu.addItem((entry) =>
                entry
                    .setTitle("Repeat monthly")
                    .setIcon("calendar-days")
                    .onClick(() => void this.reviewManager.enable(file, "interval", "1m")),
            );
            return;
        }

        menu.addItem((entry) =>
            entry
                .setTitle("Open for review")
                .setIcon("file-clock")
                .onClick(() => void this.openNote(file.path)),
        );
        if (item.definition.mode === "spaced") {
            for (const [action, label, icon] of [
                ["again", "Again", "rotate-ccw"],
                ["hard", "Hard", "chevron-right"],
                ["good", "Good", "check"],
                ["easy", "Easy", "fast-forward"],
            ] as const) {
                menu.addItem((entry) =>
                    entry
                        .setTitle(label)
                        .setIcon(icon)
                        .onClick(() => void this.completeReview(file, action)),
                );
            }
        } else {
            menu.addItem((entry) =>
                entry
                    .setTitle("Mark reviewed")
                    .setIcon("check")
                    .onClick(() => void this.completeReview(file, "reviewed")),
            );
        }
        menu.addSeparator();
        menu.addItem((entry) =>
            entry
                .setTitle("Reset schedule")
                .setIcon("refresh-cw")
                .onClick(() => void this.reviewManager.reset(file)),
        );
        menu.addItem((entry) =>
            entry
                .setTitle("Remove from review queue")
                .setIcon("calendar-x")
                .onClick(() => void this.reviewManager.remove(file)),
        );
    }

    private registerCommands(): void {
        this.addCommand({
            id: "open-review-queue",
            name: "Open review queue",
            callback: () => void this.openQueue(),
        });
        this.addCommand({
            id: "review-next-due-note",
            name: "Review next due note",
            callback: () => void this.openNextDueNote(),
        });
        this.addCommand({
            id: "enable-current-note",
            name: "Add current note to review queue",
            checkCallback: (checking) => {
                const file = this.activeMarkdownFile();
                if (!file || this.reviewManager.getItem(file)) return false;
                if (!checking) void this.reviewManager.enable(file);
                return true;
            },
        });
        for (const [id, name, every] of [
            ["weekly", "Repeat current note weekly", "1w"],
            ["monthly", "Repeat current note monthly", "1m"],
        ] as const) {
            this.addCommand({
                id: `repeat-current-note-${id}`,
                name,
                checkCallback: (checking) => {
                    const file = this.activeMarkdownFile();
                    if (!file) return false;
                    if (!checking) void this.reviewManager.setMode(file, "interval", every);
                    return true;
                },
            });
        }
        this.addCommand({
            id: "mark-current-note-reviewed",
            name: "Mark current interval note reviewed",
            checkCallback: (checking) => this.commandReview(checking, "reviewed", "interval"),
        });
        for (const [action, label] of [
            ["again", "Again"],
            ["hard", "Hard"],
            ["good", "Good"],
            ["easy", "Easy"],
        ] as const) {
            this.addCommand({
                id: `review-current-note-${action}`,
                name: `Review current spaced note: ${label}`,
                checkCallback: (checking) => this.commandReview(checking, action, "spaced"),
            });
        }
        this.addCommand({
            id: "reset-current-note-schedule",
            name: "Reset current note schedule",
            checkCallback: (checking) => {
                const file = this.activeMarkdownFile();
                if (!file || !this.reviewManager.getItem(file)) return false;
                if (!checking) void this.reviewManager.reset(file);
                return true;
            },
        });
    }

    private commandReview(
        checking: boolean,
        action: ReviewAction,
        mode: "spaced" | "interval",
    ): boolean {
        const file = this.activeMarkdownFile();
        if (!file || this.reviewManager.getItem(file)?.definition.mode !== mode) return false;
        if (!checking) void this.completeReview(file, action);
        return true;
    }

    private activeMarkdownFile(): TFile | null {
        const file: TAbstractFile | null = this.app.workspace.getActiveFile();
        return file instanceof TFile && file.extension === "md" ? file : null;
    }

    private async completeReview(file: TFile, action: ReviewAction): Promise<void> {
        try {
            await this.reviewManager.complete(file, action);
            new Notice(`Reviewed ${file.basename}`);
            if (this.settings.autoNextNote) await this.openNextDueNote();
        } catch (error) {
            new Notice(error instanceof Error ? error.message : "Could not update this note.");
        }
    }

    private updateStatusBar(): void {
        if (!this.statusBar) return;
        const count = dueReviewItems(this.reviewManager.getItems()).length;
        this.statusBar.empty();
        setIcon(this.statusBar, "calendar-clock");
        this.statusBar.appendText(` ${count}`);
        this.statusBar.setAttribute(
            "aria-label",
            count === 1 ? "1 note due" : `${count} notes due`,
        );
        this.statusBar.toggleClass("is-hidden", !this.settings.showStatusBar);
    }

    private restartReminders(): void {
        if (this.reminderTimer !== null) window.clearInterval(this.reminderTimer);
        this.reminderTimer = null;
        if (!this.settings.enableReviewReminders) return;

        if (this.settings.reviewReminderCheckOnStartup) void this.checkReminder();
        const minutes = Math.max(1, Math.min(1440, this.settings.reviewReminderIntervalMinutes));
        this.reminderTimer = window.setInterval(() => void this.checkReminder(), minutes * 60_000);
        this.registerInterval(this.reminderTimer);
    }

    private checkReminder(): void {
        this.reviewManager.refresh();
        const due = dueReviewItems(this.reviewManager.getItems());
        if (due.length === 0 || this.isEditingText()) return;

        const message =
            this.settings.reviewReminderMessage.trim() ||
            (due.length === 1
                ? "1 note is due for review."
                : `${due.length} notes are due for review.`);
        if (this.settings.reviewReminderShowNotice) new Notice(message, 8000);
        if (this.settings.reviewReminderPlaySound) this.playReminderTone();
        if (this.settings.reviewReminderBounceDock) this.requestDesktopAttention();
    }

    private isEditingText(): boolean {
        const active = activeDocument.activeElement;
        return (
            active instanceof HTMLInputElement ||
            active instanceof HTMLTextAreaElement ||
            (active instanceof HTMLElement &&
                (active.isContentEditable || active.closest(".cm-editor") !== null))
        );
    }

    private playReminderTone(): void {
        const context = new AudioContext();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        gain.gain.value = 0.04;
        oscillator.frequency.value = 660;
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.12);
        oscillator.addEventListener("ended", () => void context.close());
    }

    private requestDesktopAttention(): void {
        const electronWindow = window as unknown as {
            electron?: { remote?: { app?: { dock?: { bounce: () => void } } } };
        };
        electronWindow.electron?.remote?.app?.dock?.bounce();
    }
}
