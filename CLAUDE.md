# React Plumber

## State

State: every phase field has a `/** @machine */` table in its file; change it only through `#send(event)`; before
writing async code or a test, ask `npm run sm -- on|paths|gaps <machine> …`; `sm check` runs on every edit and its
JSON is the fix list.
