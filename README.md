# Kernel Quest

A Pokémon Red/Blue–style RPG that teaches the **fundamentals of computational thinking** — no real programming language, just plain-English pseudo-blocks. You're a rookie debugger in the region of Kernelia; earn eight badges (one per concept), climb Kernel Peak, and reboot the crashed Mainframe.

Built for adult beginners. Desktop keyboard + mobile touch. Runs fully offline, zero runtime dependencies.

## The curriculum

| Badge | Town | Concept |
|-------|------|---------|
| Order | Stepwick | Sequencing |
| Loop | Loophollow | Loops |
| Fork | Forkbridge | Conditionals |
| Cache | Cacheford | Variables & state |
| Call | Routine Row | Functions |
| Module | Modula Heights | Decomposition |
| Trace | Tracewell | Debugging |
| Big-O | Big-O City | Efficiency |

Each gym's puzzle is **effectively impossible without that gym's concept and easy with it** — the concept is introduced at the moment it becomes the tool you're desperate for.

## Two kinds of battle

- **Wild encounters** — quick reasoning puzzles (trace the variable, predict the output, spot the broken line, order the steps). ~15–30s. Every puzzle's answer is *derived by running it through the VM*, never hand-typed; wrong options come from modelled misconceptions, so the explanations are genuinely diagnostic.
- **Gym & trainer battles** — assemble a program from blocks against a *visible* enemy pattern, press RUN, watch it execute one block per turn with the program counter highlighting each step. Lose? Edit and re-run instantly.

## Running it

```bash
npm install
npm run dev        # play at localhost:5199
npm test           # 104 tests
npm run build      # static bundle in dist/ (GitHub Pages ready)
```

## How it stays honest

One pure, deterministic battle VM (`src/battle/vm.ts`) drives gameplay, the wild-puzzle answer derivation, **and** a brute-force fairness solver. The test suite machine-proves, for every gym:

1. the authored solution wins within the slot budget,
2. a win is *discoverable* with the player's vocabulary, and
3. each gym genuinely requires its concept:
   - **primitive gyms** (loops, conditionals, variables) are **provably unwinnable** without their new block — an exhaustive search over the *complete* editor grammar (the solver's grammar matches the editor's exactly, so the proof is about programs a player can actually build);
   - **function gyms** are proven **un-fittable** without functions — the intended solution's slot cost exceeds the budget once its routines are inlined, so naming is required to make it fit.

So all eight badges are machine-checked fair and correctly gated — without a human play-testing each one. Content bugs are CI failures.

## Architecture

TypeScript + Vite, no runtime deps. A hand-rolled canvas engine renders the world at a fixed 160×144, integer-scaled with `image-rendering: pixelated`; menus and battle UIs are DOM overlays in the same 4-shade palette (real text, keyboard focus, ARIA, reduced-motion). All art is compact pixel-string sprites decoded at boot; all audio is procedural chiptune. Content (maps, creatures, gyms, dialogue, story) is pure data under `src/content/`, fully decoupled from the engine.
