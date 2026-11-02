import { ItemView, Menu, moment, setIcon, TFile, WorkspaceLeaf } from "obsidian";

import type NoteRepetitionPlugin from "./main";
import { describeInterval } from "./interval";
import { QueueSection, ReviewItem } from "./note-repetition-types";
import { dueReviewItems, formatDueLabel, visibleUpcomingItems } from "./review-queue";

export const NOTE_REPETITION_VIEW = "note-repetition-queue";

const SECTION_LABELS: Record<QueueSection, string> = {
    overdue: "Overdue",
    today: "Today",
    inbox: "Inbox",
    "needs-setup": "Needs attention",
    upcoming: "Upcoming",
};

export class ReviewQueueView extends ItemView {
    private removeListener: (() => void) | null = null;

    constructor(
        leaf: WorkspaceLeaf,
        private readonly plugin: NoteRepetitionPlugin,
    ) {
        super(leaf);
    }

    public getViewType(): string {
        return NOTE_REPETITION_VIEW;
    }

    public getDisplayText(): string {
        return "Note repetition";
    }

    public getIcon(): string {
        return "calendar-clock";
    }

    public onOpen(): Promise<void> {
        this.removeListener = this.plugin.reviewManager.onChange(() => this.render());
        this.render();
        return Promise.resolve();
    }

    public onClose(): Promise<void> {
        this.removeListener?.();
        this.removeListener = null;
        return Promise.resolve();
    }

    private render(): void {
        const container = this.contentEl;
        container.empty();
        container.addClass("note-repetition-view");

        const allItems = visibleUpcomingItems(
            this.plugin.reviewManager.getItems(),
            moment(),
            this.plugin.settings,
        );
        const dueCount = dueReviewItems(allItems).length;
        const header = container.createDiv({ cls: "note-repetition-summary" });
        header.createDiv({
            cls: "note-repetition-count",
            text: dueCount === 1 ? "1 note due" : `${dueCount} notes due`,
        });
        const nextButton = header.createEl("button", {
            cls: "mod-cta",
            text: "Review next",
            attr: { "aria-label": "Open the next due note" },
        });
        nextButton.disabled = dueCount === 0;
        nextButton.addEventListener("click", () => void this.plugin.openNextDueNote());

        for (const section of ["overdue", "today", "inbox", "needs-setup", "upcoming"] as const) {
            const items = allItems.filter((item) => item.section === section);
            if (items.length === 0) continue;
            this.renderSection(container, section, items);
        }

        if (allItems.length === 0) {
            const empty = container.createDiv({ cls: "note-repetition-empty" });
            empty.createEl("p", { text: "No notes are queued." });
            empty.createEl("p", {
                text: "Add the note-repetition property to a note to begin.",
            });
        }
    }

    private renderSection(
        container: HTMLElement,
        section: QueueSection,
        items: ReviewItem[],
    ): void {
        const group = container.createEl("details", {
            cls: "note-repetition-section",
            attr: section === "upcoming" ? {} : { open: "" },
        });
        group.createEl("summary", {
            text: `${SECTION_LABELS[section]} · ${items.length}`,
        });
        const list = group.createDiv({ cls: "note-repetition-list" });
        items.forEach((item) => this.renderItem(list, item));
    }

    private renderItem(container: HTMLElement, item: ReviewItem): void {
        const row = container.createDiv({ cls: "nav-file note-repetition-row" });
        const open = row.createEl("button", {
            cls: "tree-item-self nav-file-title note-repetition-open",
            attr: { "aria-label": `Open ${item.note.basename}` },
        });
        const text = open.createDiv({ cls: "tree-item-inner nav-file-title-content" });
        text.createDiv({ cls: "note-repetition-name", text: item.note.basename });
        text.createDiv({ cls: "note-repetition-meta", text: this.metaLabel(item) });
        open.addEventListener("click", () => void this.plugin.openNote(item.note.path));

        const more = row.createEl("button", {
            cls: "clickable-icon note-repetition-more",
            attr: { "aria-label": `Review actions for ${item.note.basename}` },
        });
        setIcon(more, "more-horizontal");
        more.addEventListener("click", (event) => {
            const file = this.plugin.app.vault.getAbstractFileByPath(item.note.path);
            if (!(file instanceof TFile)) return;
            const menu = new Menu();
            this.plugin.addNoteActions(menu, file);
            menu.showAtMouseEvent(event);
        });
    }

    private metaLabel(item: ReviewItem): string {
        const mode =
            item.definition.mode === "interval" && item.definition.intervalSpec
                ? `Every ${describeInterval(item.definition.intervalSpec)}`
                : "Spaced";
        return `${mode} · ${formatDueLabel(item, this.plugin.settings.preferredDateFormat)}`;
    }
}
