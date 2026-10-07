export default {
    preset: "ts-jest/presets/default-esm",
    extensionsToTreatAsEsm: [".ts"],
    testEnvironment: "node",
    testMatch: ["<rootDir>/tests/note-repetition/**/*.test.ts"],
    transform: {
        "^.+\\.tsx?$": ["ts-jest", { useESM: true, tsconfig: "tsconfig.json" }]
    },
    moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1"
    }
};
