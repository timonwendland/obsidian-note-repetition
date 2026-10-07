import { readFile } from "node:fs/promises";

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const [packageJson, manifest, versions] = await Promise.all([
    readJson("package.json"),
    readJson("manifest.json"),
    readJson("versions.json"),
]);

const failures = [];
const expectedId = "obsidian-note-repetition";

if (packageJson.name !== expectedId) {
    failures.push(`package.json name must be ${expectedId}`);
}
if (manifest.id !== expectedId) {
    failures.push(`manifest.json id must be ${expectedId}`);
}
if (packageJson.version !== manifest.version) {
    failures.push("package.json and manifest.json versions must match");
}
if (versions[manifest.version] !== manifest.minAppVersion) {
    failures.push(
        `versions.json must map ${manifest.version} to ${manifest.minAppVersion}`,
    );
}

const releaseTag = process.env.RELEASE_TAG;
if (releaseTag) {
    const tagVersion = releaseTag.replace(/^v/, "");
    if (tagVersion !== manifest.version) {
        failures.push(
            `release tag ${releaseTag} must match manifest version ${manifest.version}`,
        );
    }
}

if (failures.length > 0) {
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
} else {
    console.log(`Version metadata is consistent for ${manifest.version}.`);
}
