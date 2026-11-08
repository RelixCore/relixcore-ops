# The Relix Family

60 original SVG portraits: 15 species × four characters (two masculine, two
feminine). All use crimson backgrounds. The artwork uses vector primitives only.

Regenerate the checked-in SVGs with `npx tsx scripts/generate-avatars.ts`.
Rebuild the SVG/PNG contact sheet with `npx tsx scripts/preview-avatars.ts`.
The catalogue and canonical paths live in `src/lib/avatars.ts`.

Members choose on **My Profile**; managers can also assign through the member
create/edit form. Initials are available without claiming a character. Existing
photos can be retained. Changing an avatar or deleting its owner releases it.

Deployment must apply `20261108010000_exclusive_animal_avatars` before serving
the picker. The normal production build runs `prisma migrate deploy`. This
partial unique index is the concurrency guarantee; do not replace it with a
client-side availability check. It intentionally leaves old photo URLs outside
the collection unrestricted. Prisma does not represent partial indexes in its
schema, so keep the SQL migration when changing the data model.

Verification performed: production build, TypeScript, lint, all migrations in
isolated PostgreSQL (PGlite), simultaneous claims, same-owner retention,
switching/releasing/deleting, shared legacy photos and null avatars. A browser
harness using the actual picker checked taken/selected states, both filters,
form submission, initials and mobile overflow. No production accounts were
changed and this feature's migration has not been applied to production.
