---
trigger: model_decision
description: Follow this rule when developing TypeScript or JavaScript scripts in Node.js projects. Covers coding conventions and the test verification mechanism.
keywords:
  - 'typescript'
  - '.ts'
  - 'javascript'
  - '.js'
  - '测试'
  - 'test'
  - 'vitest'
  - 'jest'
  - '单元测试'
  - '集成测试'
  - '端到端'
  - 'e2e'
  - '测试金字塔'
---

# TypeScript Development Conventions

## Code Style

- Formatting is handled by the project's prettier config; style values (quotes, semicolons, indentation, line width) follow the project config, not hardcoded
- Do not use style enforcement tools other than ESLint/Prettier, to avoid conflicts between rules and tool config

## Naming Conventions

- Variables and functions: camelCase
- Classes and interfaces: PascalCase
- Constants: UPPER_SNAKE_CASE
- Private members: #privateField or _privateField

## Type Definitions

- Specify types for all function parameters and return values
- Use interfaces to define object types
- Use type aliases for complex types
- Prefer `interface` over `type`, unless union types or mapped types are needed

## Module Imports

- Use ES6 import/export
- Group in order: Node.js built-ins, third-party libraries, local modules
- Use named imports rather than default imports

## Async Operations

- Use async/await rather than Promise chains
- Handle errors properly (try/catch)
- Avoid using the `any` type

## Code Organization

- Export one primary functionality per file
- Place related functionality in the same directory
- Use index.ts to export the public API

## Test Verification Mechanism

The test infrastructure follows the general principles below, applicable to any vitest project.

### Layered Model

Adopt the test pyramid; the responsibilities of the three layers are determined by **dependency boundaries**, not by functional module division:

| Layer | Dependency Boundary | Characteristics |
|----|---------|------|
| Unit | All dependencies mockable; no network, no database, no filesystem | Millisecond-level, fully parallel, covers the vast majority of behavior |
| Integration | Local implementations real (e.g. real git), external boundaries mocked (localhost HTTP) | Second-level, confined to temporary directories, verifies multi-module collaboration |
| E2E | Real external systems (real API, real CLI, real credentials) | Minute-level, runs independently, few but focused |

Ratio and division of labor: Unit is primary (~70%), Integration secondary (~25%), E2E minimal (~5%); it is the second line of defense, not aiming to cover every command.

Layer assignment criteria: anything verifiable with mocks does not go to Integration; anything verifiable with local implementations does not go to E2E. Only behavior whose "external system-side semantics cannot be simulated locally" belongs in the E2E layer.

A higher-layer test failure reveals two problems — a functional bug and a missing unit test. Before fixing, first add the corresponding unit test to reproduce, then fix.

### Isolation Principle

Tests at all layers must be highly isolated, runnable in any order, and parallelizable:

- Each test creates and cleans up its own resources independently (managed in beforeEach/afterEach pairs), without relying on data left by other tests
- Temporary directories, mock services, and environment variables must be created and restored in pairs
- Sharing mutable state between tests is forbidden

Isolation mechanisms per layer: Unit replaces dependency modules with process-level mocks; Integration uses real local implementations (e.g. `git init` to set up a temporary repo) + mocked external boundaries (localhost HTTP) + temporary directories; E2E uses an isolated runtime environment + read-only reuse of persistent test assets + dynamically obtained accounts.

### Placement Rules

Test file organization is determined by three orthogonal dimensions:

- **Location** (where to put it): determined by the structure of the source under test, mirroring the source path; cross-module chains are grouped by functional domain
- **Layering** (how to express it): filename suffixes, no layered subdirectories
- **Filtering** (how to run it): the test framework's tag mechanism, not part of naming or placement

Naming conventions:

| Layer | Naming | Location |
|----|------|------|
| Unit | `<module>.test.ts` | Mirrors the source under test |
| Integration (single module) | `<module>.integration.test.ts` | Mirrors the source under test |
| Integration (cross-module chain) | `<chain>.test.ts` | Dedicated integration directory, grouped by functional domain |
| E2E | `<scenario>.e2e.test.ts` | Dedicated E2E directory |

Unit and integration tests for the same source under test must be in separate files, because their dependency boundaries differ (unit mocks everything, integration uses real local implementations); mixing files causes setup interference. Do not create subdirectories by layer (unit/ and integration/ directory layering is over-engineering and breaks source alignment).

### Framework Selection

- vitest is the default choice; the default config matches `tests/**/*.test.ts`
- Use vitest Test Tags (`--tags-filter`) for layer filtering, declaring each layer's tag in the config
- E2E uses a dedicated config (long timeouts + E2E directory only), ensuring it stays out of the default suite
- E2E is implemented with the test framework's native capabilities, not hand-rolled shell scripts: frameworks natively support long timeouts, tag filtering, structured assertions, failure diff output, and shared helpers — shell-scripted pass/fail counting and text matching are a degraded replica of these capabilities

### Run Gating

| Timing | Run Scope |
|------|---------|
| During coding (high frequency) | Unit only, for the current module |
| Before commit (medium frequency) | All Unit + Integration |
| Before release (low frequency) | Everything, including E2E |

CI gating: Unit + Integration block merging (fast, stable, no external dependencies); E2E does not block merging (depends on real credentials and network, unstable at PR level), instead triggered manually or run on a schedule.

### External System Test Assets

For E2E involving real external systems, the asset strategy follows two principles:

- Persistent assets are reused read-only, never created or cleaned up: the state of external systems (accounts, repos, network relationships) cannot be rebuilt; deleting them makes it impossible to restore the same topology
- Zero residue after the run: temporary artifacts (directories, branches, data) must be cleaned up at the end of the test; do not rely on one-off temporary resources (e.g. credentials-scoped temporary resources), because credentials become invalid when the resource is deleted

### Migrating Existing Tests

Existing test debt (scattered files, no layer annotations) follows the "migrate on touch" principle: only migrate a test to its target location and add the suffix when modifying that test or its corresponding source. Do not launch large-scale refactors, to avoid polluting history and increasing review burden.
