# Chapter 1: Review

Reviewed against the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html).

## Fixed during review

| #   | Finding                                                      | Fix                                                                  |
| --- | ------------------------------------------------------------ | -------------------------------------------------------------------- |
| 1   | `issue.path[0] as keyof FieldErrors` was an unchecked cast   | `isFieldName()` type guard in `toFieldErrors()`                      |
| 2   | `AuthForm` parsed the form twice (`safeParse`, then `parse`) | One parse, tagged with the mode so TypeScript narrows `data`         |
| 3   | Email schema validated before trimming                       | `z.string().trim().toLowerCase().pipe(z.email())` (caught by a test) |
| 4   | tsup CLI flag `--noExternal` does not exist                  | Moved build options into `tsup.config.ts`                            |
| 5   | Tailwind 4 does not support `rounded-[--var]`                | Used theme tokens `rounded-sm` / `rounded-md`                        |

## Accepted exceptions

- **Default exports** in `app/**/page.tsx` and `layout.tsx`: Next.js requires
  them. Everything else uses named exports.
- **`console.log` / `console.error`** in the API entry and error handler:
  replaced by pino in Chapter 11.

## Checked and fine

- No `any`, no `@ts-ignore`, no non-null assertions
- `eqeqeq`, `prefer-const`, `consistent-type-imports` enforced by ESLint
- JSDoc on every exported function
- Secrets only come from env; `.env` is git-ignored
