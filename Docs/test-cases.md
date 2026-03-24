# Test Cases

## Purpose

This file is the business truth layer for the eligibility engine.

It will later become the source for golden real-world cases.

## Instructions

For each case, capture:

- case id
- target context
- qualification type
- raw student profile summary
- expected result
- expected primary reason
- expected next step if relevant
- notes

---

## Case Template

### Case ID

TC-001

### Target context

- Country:
- University:
- Program:
- Offering:
- Degree:

### Qualification type

-

### Raw profile summary

- Overall score / GPA:
- Language:
- Subjects:
- Special conditions:

### Expected result

- eligible / conditional / not_eligible / needs_review

### Expected primary reason

-

### Expected next step

-

### Notes

-

---

## Initial case list to prepare

- Arabic secondary / direct eligible
- Arabic secondary / conditional
- Arabic secondary / not eligible
- American high school / eligible
- American high school / language gap
- British curriculum / enough A-Levels
- British curriculum / missing required subject
- British curriculum / insufficient countable A-Levels
- British curriculum / unsupported context
- IB / eligible
- IB / not eligible
- Bachelor degree / master program eligible
- Bachelor degree / wrong previous major
- Missing-rule context / should become needs_review
