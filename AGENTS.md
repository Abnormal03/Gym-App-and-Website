# Repository contribution instructions

Before planning or implementing any product, API, data-model, or cross-client change, read [`PROJECT_SOURCE_OF_TRUTH.md`](./PROJECT_SOURCE_OF_TRUTH.md) in full and follow it as the shared project contract.

## Required rules

- The source-of-truth document governs current-system descriptions, feature scope, roles, and agreed cross-project behavior. Do not treat a proposed feature or an open question as an approved requirement.
- Do not invent or silently change API paths, request/response shapes, role permissions, payment behavior, or trainer relationship rules. Confirm the relevant contract in `PROJECT_SOURCE_OF_TRUTH.md` and the current backend implementation.
- Before implementing a roadmap feature, complete its decision record in `PROJECT_SOURCE_OF_TRUTH.md` with agreed behavior, API/data contract, and acceptance criteria. If a needed decision is unresolved, work only on independent, non-dependent tasks and ask the project owner to resolve it before proceeding with dependent changes.
- When implementation reveals a mismatch or new decision, update the source-of-truth document in the same change and coordinate the corresponding backend, mobile, and web updates.
- Backend authorization and validation are authoritative. Client-side guards are for navigation and presentation only.
- Preserve existing behavior and contracts unless a documented decision explicitly changes them. Do not use the older backend snapshot or project guides as authority when they conflict with the expanded backend or this document.
- Read and follow any more specific `AGENTS.md` files in the directories you modify. In particular, the Expo application instructions in `application/AGENTS.md` apply to mobile app changes.

## Before handoff

Summarize affected clients, API/data-contract changes, relevant source-of-truth updates, and what was or was not verified. Do not claim runtime verification unless it was performed.
