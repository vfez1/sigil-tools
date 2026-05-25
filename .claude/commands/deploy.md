Deploy files with uncommitted changes (working tree edits) to the FoundryVTT server.

1. Run `git diff --name-only HEAD` to get the list of files with uncommitted changes.
   - If there are no uncommitted changes, tell the user and stop.
2. For each file, `scp` it to the corresponding path under `digital-ocean-foundry:/opt/foundrydata/Data/modules/sigil-tools/`.
   - Example: `submodules/roll-model/utils/ack.js` → `digital-ocean-foundry:/opt/foundrydata/Data/modules/sigil-tools/submodules/roll-model/utils/ack.js`
   - Group files by destination directory and use a single `scp` call per directory where possible.
3. Report which files were deployed and confirm success.
