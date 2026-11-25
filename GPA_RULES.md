# GPA Rules (Official)

> Source of truth: university examination regulations (supplied).
> Implemented in the authoritative engine `src/app/services/gpa/gpa-engine.ts`.
> The UI must never re-implement these formulas.

## 1. Grade Scale
| Grade | Marks | Grade Point |
| ----- | ----- | ----------: |
| A+ | 90–100 | 4.00 |
| A  | 80–89  | 4.00 |
| A- | 75–79  | 3.70 |
| B+ | 70–74  | 3.30 |
| B  | 65–69  | 3.00 |
| B- | 60–64  | 2.70 |
| C+ | 55–59  | 2.30 |
| C  | 50–54  | 2.00 |
| C- | 45–49  | 1.70 |
| D+ | 40–44  | 1.30 |
| D  | 30–39  | 1.00 |
| E  | 0–29   | 0.00 |

## 2. Semester GPA
`GPA = Σ(credit × gradePoint) / Σ(credits)` over eligible modules only.
Exclude: Non-GPA modules, unselected electives, modules without GPA credits,
modules without results. Display to two decimals.

## 3. Year GPA
- Year 1 = Semesters 1 + 2, Year 2 = 3 + 4, Year 3 = 5 + 6, Year 4 = 7 + 8.
- Combined **credit-weighted** result of both semesters — never an average of
  the two semester GPAs.

## 4. Official FGPA
`FGPA = 0.20·Y1 + 0.20·Y2 + 0.30·Y3 + 0.30·Y4`.
Missing future results are **not** zero. Official FGPA is reported only when all
four years are complete; otherwise it is `null`. A projected FGPA requires
explicit expected grades for unfinished modules/years.

## 5. Repeat Examination
- Max 2 attempts.
- E must be improved at the first opportunity.
- Grades below C may be repeated.
- Max awarded grade after a successful repeat is C.
- Successful repeat replaces the previous result and contributes 2.00.
- Never count the same module twice.
- Success determination is **configurable** (`DEFAULT_REPEAT_CONFIG`,
  default: mark ≥ 50).

## 6. Classification
- 3.70–4.00 First Class
- 3.30–3.69 Second Class Upper
- 2.70–3.29 Second Class Lower
- 2.00–2.69 Pass
- below 2.00 Fail

## 7. Rounding
Two decimal places, half-up (`round2`).

## Official check
`65.30 / 19 = 3.44` (verified by `gpa-engine.spec.ts`).