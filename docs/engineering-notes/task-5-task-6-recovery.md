# Task 5 / Task 6 recovery record

## Context

Feature Task 5 (hourly and multi-day forecast) originally completed on branch
`module_5_hourly_multiday_forecast` at commit `2f42415`.

## Incident and detection

The initial Task 6 wind implementation unintentionally removed Task 5's hourly and multi-day
forecast functionality and its three dedicated tests. During review, `npm test` fell from 10
tests after Task 5 to 9 tests during Task 6.

## Impact

The regression affected v1 24-hour and 4-day forecast enrichment, nearest-region mapping, and
the responsive hourly and daily forecast UI.

## Recovery

Task 5 implementation and tests were restored while retaining Task 6's independent wind-speed
and wind-direction enrichment and accessible wind UI. Recovery used targeted source-code and test restoration; no destructive Git recovery was used.

## Verification

The final test inventory contained 12 tests, all of which passed. `npm run build`, `npm run
doctor`, and `git diff --check` also passed. A direct comparison confirmed that main contains the
recovered Task 5 behaviour together with the Task 6 additions.

## Decision

Retain `module_5_hourly_multiday_forecast` as the archived original Task 5 branch. Do not merge
it later, because main is the functional superset.

## Lesson learned

Protect both test counts and the test inventory during AI-assisted changes. A passing suite is not
sufficient when tests may have been removed.
