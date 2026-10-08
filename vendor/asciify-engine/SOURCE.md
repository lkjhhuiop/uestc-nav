# asciify-engine source

- Project: <https://github.com/ayangabryl/asciify-engine>
- Version declared by source: `3.0.1`
- Pinned commit: `bb0bbdc314350678d06b98d4b6d85ef271c68bbc`
- License: MIT, copied as `LICENSE`
- Imported files: `src/backgrounds/wave.ts` and `src/backgrounds/_shared.ts`

`wave.global.js` is a classic-script browser adaptation of those two upstream
files and the lifecycle code in `src/backgrounds/index.ts`. It removes TypeScript
types and ES module imports so the demo continues to work from `file://` without
a package manager or build step. The wave/noise/vortex/character-selection
algorithm remains the upstream implementation. The wrapper adds a DPR cap,
visibility pause, project colours, and a `pointermove` listener.
