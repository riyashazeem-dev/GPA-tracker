# GPA Calculation Test Report

> Generated for Phase 3. All tests pass.

## Environment
- Runner: Vitest 5.1.1 via `@angular/build:unit-test`
- Command: `npm test`

## Result
```
Test Files  4 passed (4)
     Tests  44 passed (44)
```

## Prediction engine coverage (Phase 6)
| Area | Cases |
| ---- | ----- |
| Linear FGPA model | A/B coefficients, uniform-grade projection |
| Feasibility | achievable / high-performance / impossible |
| Max achievable | all-4.0 bound, partial completed years |
| Required average | exact linear solve, differing credit values |
| Boundary | no completed first year (all four years planned) |
| Scenarios | conservative/realistic/optimistic + class |
| Suggestions | uniform-grade + greedy mix, non-empty |
| Input assembly | Non-GPA and unselected electives excluded |

## Coverage
| Area | Cases |
| ---- | ----- |
| Grade conversion | all 12 bands, min/max boundaries, out-of-range/null |
| Official calculation | 65.30 / 19 = 3.44 (totals + per-module) |
| Semester GPA eligibility | Non-GPA, null credits, unselected/selected electives, missing grade, missing result, empty, credit weighting |
| Year GPA | credit-weighted combination (not average), semester grouping |
| FGPA | 20/20/30/30 weighting, not a simple average, null when incomplete, projected, arity guard |
| Repeat exam | success→2.00 & replace, C not repeatable, 2-attempt cap + warning, E improvement warning, fail keeps original, configurable rule, no double count |
| Classification | all band boundaries incl. Fail |
| Rounding | half-up 2dp, official example |

## Notes
- The engine (`services/gpa/gpa-engine.ts`) is the single source of truth; the
  Angular `GpaService` only delegates.
- Repeat success is configurable because the regulations do not fully specify
  the repeat passing procedure.
- No UI formula duplication: feature components contain no GPA maths.