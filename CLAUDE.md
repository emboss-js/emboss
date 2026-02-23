# CLAUDE.md — Instructions for Claude Code

You are building Emboss, a Gantt chart library. Read `docs/BUILD_SPEC.md` before writing any code. It is the architecture contract — every decision is made.

## Rules

1. **Everything is a Row.** One type, one array, one render cycle. Do not create Task, Phase, Milestone, or Subtask classes. They are all `Row` with a `type` field. See `src/core/types.ts`.

2. **Size constraint.** Core + free extensions: under 3,000 lines. Organize bundle: under 1,500. If you're creating abstraction layers, utility classes, base classes, or factories — stop. Plain functions, plain objects.

3. **Every file maps to a contract.** Before creating a module, identify which section of BUILD_SPEC.md it fulfills. If it doesn't map to a contract, it probably shouldn't exist.

4. **State lives in one place.** `EmbossState` in `src/core/state.ts`. Extensions never mutate state directly — they go through `emboss.setView()`, `emboss.updateRow()`, etc.

5. **Extensions are plain objects.** No plugin framework, no dependency resolution, no lifecycle hooks beyond `init`. Registration order is priority. See the `EmbossExtension` interface.

6. **Renderers are functions.** `SidebarRenderer`, `BarRenderer`, `HeaderRenderer` — they take data, return DOM. No virtual DOM, no diffing. Replace innerHTML each render.

7. **Frappe is the engine.** Date math, drag handling, dependency resolution, coordinate mapping — port these from Frappe Gantt v1. Don't rewrite them.

## Build Phases

Work phase by phase. Each phase's output is the input for the next. Don't build ahead.

- **Phase 1:** Fork Frappe, strip visual layer, implement Row model + State + render cycle + extension registration
- **Phase 2:** Core visual layer — glass bars, grid, header, drag handles, dark mode, density modes
- **Phase 3:** Free extensions — today marker, tooltips, dependency arrows
- **Phase 4:** Harden extension API — verify composition works
- **Phase 5:** Organize bundle — sidebar, phases, milestones, inline editing
- **Phase 6:** Package and publish to npm

## What NOT to Build

Swimlanes, critical path, baseline comparison, export, vivid template, subtask nesting, server-side validation, framework wrappers, undo/redo, keyboard nav, roadmap view. See Section 11 of BUILD_SPEC.md.
