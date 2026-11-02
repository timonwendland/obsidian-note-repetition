import { App, moment, Plugin, TFile } from "obsidian";
import { minimatch } from "minimatch";

import { NoteRepetitionSettings, ReviewAction, ReviewItem } from "./note-repetition-types";
import { PROPERTY_NAMES, parseNoteRepetitionProperties } from "./properties";
import { createReviewItem, sortReviewItems } from "./review-queue";
import { completeIntervalSchedule, completeSpacedSchedule } from "./scheduler";

export class ReviewManager {
    private items: ReviewItem[] = [];
    private listeners = new Set<() => void>();
    private refreshTimer: number | null = null;

    constructor(
        private readonly app: App,
        private readonly plugin: Plugin,
        private readonly getSettings: () => NoteRepetitionSettings,
    ) {}

    public initialize(): void {
        this.plugin.registerEvent(this.app.metadataCache.on("changed", () => this.queueRefresh()));
        this.plugin.registerEvent(this.app.vault.on("create", () => this.queueRefresh()));
        this.plugin.registerEvent(this.app.vault.on("delete", () => this.queueRefresh()));
        this.plugin.registerEvent(this.app.vault.on("rename", () => this.queueRefresh()));
        this.refresh();
    }

    public onChange(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    public getItems(): ReviewItem[] {
        return [...this.items];
    }

    public getItem(file: TFile): ReviewItem | null {
        return this.items.find((item) => item.note.path === file.path) ?? null;
    }

    public refresh(): void {
        const settings = this.getSettings();
        const now = moment();
        this.items = sortReviewItems(
            this.app.vault
                .getMarkdownFiles()
                .filter((file) => !this.isIgnored(file, settings))
                .map((file) => {
                    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
                    const definition = parseNoteRepetitionProperties(frontmatter, settings);
                    return definition.enabled
                        ? createReviewItem(
                              { path: file.path, basename: file.basename },
                              definition,
                              now,
                              settings,
                          )
                        : null;
                })
                .filter((item): item is ReviewItem => item !== null),
        );
        this.listeners.forEach((listener) => listener());
    }

    public queueRefresh(): void {
        if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
        this.refreshTimer = window.setTimeout(() => {
            this.refreshTimer = null;
            this.refresh();
        }, 120);
    }

    public async enable(file: TFile, mode?: "spaced" | "interval", every?: string): Promise<void> {
        const settings = this.getSettings();
        const selectedMode = mode ?? settings.defaultMode;
        await this.updateFrontmatter(file, (frontmatter) => {
            frontmatter[PROPERTY_NAMES.enabled] = true;
            frontmatter[PROPERTY_NAMES.mode] = selectedMode;
            if (selectedMode === "interval") {
                frontmatter[PROPERTY_NAMES.every] = every ?? settings.defaultInterval;
            }
        });
    }

    public async setMode(file: TFile, mode: "spaced" | "interval", every?: string): Promise<void> {
        const settings = this.getSettings();
        await this.updateFrontmatter(file, (frontmatter) => {
            frontmatter[PROPERTY_NAMES.enabled] = true;
            frontmatter[PROPERTY_NAMES.mode] = mode;
            if (mode === "interval") {
                frontmatter[PROPERTY_NAMES.every] = every ?? settings.defaultInterval;
            }
        });
    }

    public async complete(file: TFile, action: ReviewAction): Promise<void> {
        const settings = this.getSettings();
        const cached = this.app.metadataCache.getFileCache(file)?.frontmatter;
        const definition = parseNoteRepetitionProperties(cached, settings);
        if (!definition.enabled || definition.errors.length > 0) {
            throw new Error(definition.errors[0] ?? "This note is not enabled for repetition.");
        }

        const now = moment();
        const schedule =
            definition.mode === "interval"
                ? definition.intervalSpec && action === "reviewed"
                    ? completeIntervalSchedule(definition.intervalSpec, now, settings)
                    : null
                : action !== "reviewed"
                  ? completeSpacedSchedule(definition, action, now, settings)
                  : null;

        if (!schedule) throw new Error("That review action does not match this note's mode.");

        await this.updateFrontmatter(file, (frontmatter) => {
            if (!definition.explicitMode) {
                frontmatter[PROPERTY_NAMES.mode] = definition.mode;
            }
            frontmatter[PROPERTY_NAMES.due] = schedule.due;
            frontmatter[PROPERTY_NAMES.last] = schedule.last;
            if (schedule.interval !== undefined) {
                frontmatter[PROPERTY_NAMES.interval] = schedule.interval;
            }
            if (schedule.ease !== undefined) {
                frontmatter[PROPERTY_NAMES.ease] = schedule.ease;
            }
        });
    }

    public async reset(file: TFile): Promise<void> {
        await this.updateFrontmatter(file, (frontmatter) => this.deleteSchedule(frontmatter));
    }

    public async remove(file: TFile): Promise<void> {
        await this.updateFrontmatter(file, (frontmatter) => {
            Object.values(PROPERTY_NAMES).forEach((property) => delete frontmatter[property]);
        });
    }

    private async updateFrontmatter(
        file: TFile,
        update: (frontmatter: Record<string, unknown>) => void,
    ): Promise<void> {
        await this.app.fileManager.processFrontMatter(file, update);
        this.queueRefresh();
    }

    private deleteSchedule(frontmatter: Record<string, unknown>): void {
        delete frontmatter[PROPERTY_NAMES.due];
        delete frontmatter[PROPERTY_NAMES.last];
        delete frontmatter[PROPERTY_NAMES.interval];
        delete frontmatter[PROPERTY_NAMES.ease];
    }

    private isIgnored(file: TFile, settings: NoteRepetitionSettings): boolean {
        return settings.noteFoldersToIgnore.some((pattern) => minimatch(file.path, pattern));
    }
}
