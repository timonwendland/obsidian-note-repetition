export default {
    preset: "ts-jest/presets/default-esm",
    extensionsToTreatAsEsm: [".ts"],
    testEnvironment: "node",
    testMatch: ["<rootDir>/tests/note-repetition/**/*.test.ts"],
    transform: {
        "^.+\\.tsx?$": ["ts-jest", {
            useESM: true,
            tsconfig: "tsconfig.json",
            // The sources import moment from obsidian, which needs esModuleInterop off.
            diagnostics: { ignoreCodes: [151001] }
        }]
    },
    moduleNameMapper: {
        "^obsidian$": "<rootDir>/tests/note-repetition/obsidian-stub.ts",
        "^(\\.{1,2}/.*)\\.js$": "$1"
    }
};
