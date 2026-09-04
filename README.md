# Corpo — Corporate Finance Lab

A course-independent learning site for corporate finance. The new site lives in
`lab/`; the repository's original Pepperdine course site remains unchanged at
the root for preservation and comparison.

## Local preview

```sh
npm run dev
```

Open `http://127.0.0.1:4176/lab/`.

## Verification

```sh
npm run check
npm test
```

The finance engine is separated from the interface in `lab/finance.mjs`, so
cash-flow, valuation, bond, risk, capital-structure, and ratio calculations can
be tested without a browser.
