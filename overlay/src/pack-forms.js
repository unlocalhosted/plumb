/* ─────────────────────────────────────────────────────────
 * PACK · FORMS · React Plumber overlay
 *
 * What the forms pack is (docs/briefs/rule-packs.md): its name, its ground, its rules' words and grounding. Plain data,
 * as pack-a11y.js is; the rules are in forms-rules.js.
 *
 * Where the rules come from: Chrome's Modern Web Guidance (npm modern-web-guidance, read at 1.0.0 on 2026-11-14,
 * Apache-2.0), its `forms` guide: 92 dos and don'ts in eleven sections. A rule here is one of those bullets that the
 * drawn page shows. Nothing of the guide's text is copied: `npx modern-web-guidance retrieve forms` has it.
 * What is not here: what only the source shows (a paste handler that blocks, Enter during text composition), what only
 * a server shows (CSRF, HTTPS), and what only a person can judge (testing, analytics, wording of errors).
 * ───────────────────────────────────────────────────────── */

const WCAG = (sc, name) => ({ id: `wcag-${sc}`, name: `WCAG ${sc} ${name}` });
const GUIDE = (section) => ({ id: 'mwg-forms', name: `Modern Web Guidance: forms, ${section}`, guide: 'forms' });
const ADVISORY = { tier: 'advisory' };

export const FORMS = {
  id: 'forms',
  title: 'Forms',
  ground: 'Chrome Modern Web Guidance 1.0.0, forms guide',
  source: { package: 'modern-web-guidance', version: '1.0.0', guide: 'forms' },
  runs: 'page',
  // (advisory: the guide's advice on how to do it well, where nothing is broken for anyone)
  spec: { access: {
    'nested-form': {}, 'button-type': {}, 'submit-missing': {}, 'fieldset-legend': {}, 'field-name': ADVISORY, 'password-no-form': {}, 'search-landmark': ADVISORY, 'form-unnamed': ADVISORY,
    'get-sensitive': {}, 'textarea-resize': ADVISORY, 'label-unbound': {}, 'label-proximity': ADVISORY, 'invalid-undescribed': {}, 'required-unmarked': ADVISORY, 'required-unsaid': {},
    'label-overridden': {}, 'autocomplete-off': {}, 'numeric-keyboard': ADVISORY, 'number-for-code': {}, 'split-code': {}, 'identifier-correction': ADVISORY, 'invalid-on-load': {},
    'submit-disabled': {}, 'control-hidden': {}, 'name-split': ADVISORY, 'latin-only': {}, 'submit-wording': ADVISORY, 'radio-group': {}, 'describedby-missing': {}, 'input-type': {},
    'visual-order': {}, 'placeholder-instruction': {}, 'inline-handler': ADVISORY,
  } },
  words: {
    'nested-form': () => ({ label: 'Form inside a form', line: 'This form sits inside another form.', reason: 'Browsers do not allow it: which one a button submits depends on how the page was built.' }),
    'button-type': ({ name }) => ({ label: 'Helper button submits the form', line: `"${name}" has no type, so pressing it submits the form.`, reason: 'A button in a form is a submit button unless it says otherwise.' }),
    'submit-missing': () => ({ label: 'Form with no submit button', line: 'Every button in this form is type="button".', reason: 'Enter in a field does nothing, and a screen reader finds no way to send the form.' }),
    'fieldset-legend': ({ late }) => ({ label: 'Group with no legend', line: late ? 'This group’s legend is not its first child.' : 'This group of fields has no legend.', reason: 'A screen reader says "group" and never what the fields in it are about.' }),
    'field-name': () => ({ label: 'Field the form does not send', line: 'This field has no name.', reason: 'A form sends only named fields: what is typed here is left behind.' }),
    'password-no-form': () => ({ label: 'Password outside a form', line: 'This password field is not in a <form>.', reason: 'Password managers look for a form to fill and to save from.' }),
    'search-landmark': () => ({ label: 'Search with no landmark', line: 'This search field is not inside a <search>.', reason: 'People who jump by landmarks cannot jump to it.' }),
    'form-unnamed': ({ count }) => ({ label: 'Form with no name', line: `This page has ${count} forms and this one has no name.`, reason: 'They are all read out as "form", so nobody can tell which is which.' }),
    'get-sensitive': () => ({ label: 'Password sent in the address', line: 'This form sends a password with GET.', reason: 'It ends up in the address bar, the history and the server’s logs.' }),
    'textarea-resize': () => ({ label: 'Text box that cannot grow', line: 'Resizing is turned off and the box does not grow with what is typed.', reason: 'A long message is written through a few lines’ window.' }),
    'label-unbound': ({ dangling }) => ({ label: 'Label tied to nothing', line: dangling ? `This label points at "${dangling}", which is not on the page.` : 'This label sits beside a field and is not tied to it.', reason: 'Clicking it does not focus the field, and a screen reader reads the field with no name.' }),
    'label-proximity': ({ own, other }) => ({ label: 'Label nearer the field above', line: `This label is ${own}px from its own field and ${other}px from the one above.`, reason: 'The eye pairs a label with whatever is closest.' }),
    'invalid-undescribed': () => ({ label: 'Error with no message tied to it', line: 'This field is marked invalid and points at no message.', reason: 'A screen reader says "invalid" and not what is wrong.' }),
    'required-unmarked': () => ({ label: 'Required, and does not say so', line: 'This field is required and its label does not show it.', reason: 'People find out when the form refuses them.' }),
    'required-unsaid': () => ({ label: 'Marked required only for the eye', line: 'The label marks this required and the field does not.', reason: 'A screen reader does not say it is required, and the browser lets it through empty.' }),
    'label-overridden': ({ visible, label }) => ({ label: 'aria-label hides the label shown', line: `The label says "${visible}" and the field is named "${label}".`, reason: 'A screen reader says one thing, the screen another; voice control answers to neither.' }),
    'autocomplete-off': ({ what }) => ({ label: 'Autofill turned off', line: `autocomplete="off" on a ${what} field.`, reason: 'A password manager cannot fill it, so people choose passwords they can type.' }),
    'numeric-keyboard': () => ({ label: 'Letters keyboard for a number', line: 'This field takes digits and asks for the full keyboard.', reason: 'On a phone people switch keyboards before they can type.' }),
    'number-for-code': ({ what }) => ({ label: 'Number field for a code', line: `type="number" on a ${what}.`, reason: 'It drops leading zeros, changes on scroll and shows spinner arrows. It is for amounts.' }),
    'split-code': ({ count }) => ({ label: 'One value in several boxes', line: `One value is split over ${count} one-character boxes.`, reason: 'Paste, autofill from a text message and screen readers all expect one field.' }),
    'identifier-correction': () => ({ label: 'Autocorrect on an identifier', line: 'This field holds a name the keyboard will try to correct.', reason: 'A phone capitalises and "fixes" a username as it is typed.' }),
    'invalid-on-load': () => ({ label: 'Shown as an error before typing', line: 'This empty field is styled as invalid before anyone has touched it.', reason: ':invalid is true from the start for a required field. :user-invalid waits for the person.' }),
    'submit-disabled': () => ({ label: 'Submit disabled until valid', line: 'The submit button is disabled while the form is incomplete.', reason: 'Nothing says why it cannot be pressed, and a disabled button cannot be focused to find out.' }),
    'control-hidden': ({ type }) => ({ label: 'Real control removed', line: `The ${type} behind this label is not rendered at all.`, reason: 'It cannot be reached by keyboard and a screen reader never hears of it.' }),
    'name-split': () => ({ label: 'Name split in two', line: 'The name is asked for as first and last.', reason: 'Many names do not divide that way. One field takes them all.' }),
    'latin-only': () => ({ label: 'Only A to Z allowed', line: 'This field accepts unaccented Latin letters only.', reason: 'José, Zoë and 李 are told their name is wrong.' }),
    'submit-wording': ({ name }) => ({ label: 'Button says only "' + name + '"', line: `The button says "${name}".`, reason: 'A button that says what happens ("Save changes") needs no reading of the form.' }),
    'radio-group': ({ count }) => ({ label: 'Options with no group', line: `These ${count} options are not in a group.`, reason: 'A screen reader reads each option and never the question they answer.' }),
    'describedby-missing': ({ attr, id }) => ({ label: 'Points at a message that is not there', line: `${attr} names "${id}", which is not on the page.`, reason: 'The help or error it promises is never read out.' }),
    'input-type': ({ type }) => ({ label: `Plain text field for ${type === 'tel' ? 'a phone number' : type === 'url' ? 'an address' : 'an email'}`, line: `This asks for ${type === 'tel' ? 'a phone number' : type === 'url' ? 'a web address' : 'an email'} in a plain text field.`, reason: `type="${type}" brings the right keyboard on a phone${type === 'tel' ? '' : ' and the browser’s own check'}.` }),
    'visual-order': ({ how }) => ({ label: 'Drawn in a different order', line: how === 'reverse' ? 'This row is drawn in reverse of its order in the page.' : 'This is moved out of its place in the page’s order.', reason: 'Tab follows the page’s order, so focus jumps against what the eye sees.' }),
    'placeholder-instruction': ({ text }) => ({ label: 'Instructions in the placeholder', line: `"${text}" is only in the placeholder.`, reason: 'It goes away at the first keystroke, just when it is needed.' }),
    'inline-handler': ({ attr }) => ({ label: 'Script written in the markup', line: `This has an inline ${attr} handler.`, reason: 'A strict content security policy blocks inline script, and the control stops working.' }),
  },
  laws: {
    'nested-form': [GUIDE('1. Semantic Structure and Form Element')],
    'button-type': [GUIDE('1. Semantic Structure and Form Element')],
    'submit-missing': [GUIDE('1. Semantic Structure and Form Element'), WCAG('2.1.1', 'Keyboard')],
    'fieldset-legend': [GUIDE('1. Semantic Structure and Form Element'), WCAG('1.3.1', 'Info and Relationships')],
    'field-name': [GUIDE('1. Semantic Structure and Form Element')],
    'password-no-form': [GUIDE('1. Semantic Structure and Form Element'), { id: 'mwg-autofill-sign-in-form', name: 'Modern Web Guidance: autofill-sign-in-form', guide: 'autofill-sign-in-form' }],
    'search-landmark': [GUIDE('1. Semantic Structure and Form Element')],
    'form-unnamed': [GUIDE('1. Semantic Structure and Form Element'), WCAG('1.3.1', 'Info and Relationships')],
    'get-sensitive': [GUIDE('1. Semantic Structure and Form Element'), GUIDE('8. Identity, Payments, and Advanced Security')],
    'textarea-resize': [GUIDE('1. Semantic Structure and Form Element')],
    'label-unbound': [GUIDE('2. Accessible Labeling and State'), WCAG('1.3.1', 'Info and Relationships'), WCAG('4.1.2', 'Name, Role, Value')],
    'label-proximity': [GUIDE('2. Accessible Labeling and State'), { id: 'gestalt-proximity', name: 'Gestalt law of proximity' }],
    'invalid-undescribed': [GUIDE('2. Accessible Labeling and State'), WCAG('3.3.1', 'Error Identification')],
    'required-unmarked': [GUIDE('2. Accessible Labeling and State'), WCAG('3.3.2', 'Labels or Instructions')],
    'required-unsaid': [GUIDE('2. Accessible Labeling and State'), WCAG('3.3.2', 'Labels or Instructions')],
    'label-overridden': [GUIDE('2. Accessible Labeling and State'), WCAG('2.5.3', 'Label in Name')],
    'autocomplete-off': [GUIDE('3. Autofill and Input Hints'), WCAG('3.3.8', 'Accessible Authentication (Minimum)')],
    'numeric-keyboard': [GUIDE('3. Autofill and Input Hints')],
    'number-for-code': [GUIDE('3. Autofill and Input Hints')],
    'split-code': [GUIDE('3. Autofill and Input Hints'), { id: 'mwg-sms-otp-form', name: 'Modern Web Guidance: sms-otp-form', guide: 'sms-otp-form' }],
    'identifier-correction': [GUIDE('3. Autofill and Input Hints')],
    'invalid-on-load': [GUIDE('4. Constraints and Validation'), { id: 'mwg-validate-input-after-interaction', name: 'Modern Web Guidance: validate-input-after-interaction', guide: 'validate-input-after-interaction' }],
    'submit-disabled': [GUIDE('4. Constraints and Validation')],
    'control-hidden': [GUIDE('6. Styling Form Controls'), WCAG('2.1.1', 'Keyboard')],
    'name-split': [GUIDE('9. Address Collection')],
    'latin-only': [GUIDE('9. Address Collection')],
    'submit-wording': [GUIDE('1. Semantic Structure and Form Element')],
    'radio-group': [GUIDE('1. Semantic Structure and Form Element'), WCAG('1.3.1', 'Info and Relationships')],
    'describedby-missing': [GUIDE('2. Accessible Labeling and State'), WCAG('1.3.1', 'Info and Relationships')],
    'input-type': [GUIDE('1. Semantic Structure and Form Element'), WCAG('1.3.5', 'Identify Input Purpose')],
    'visual-order': [GUIDE('1. Semantic Structure and Form Element'), WCAG('2.4.3', 'Focus Order')],
    'placeholder-instruction': [GUIDE('2. Accessible Labeling and State'), WCAG('3.3.2', 'Labels or Instructions')],
    'inline-handler': [GUIDE('8. Identity, Payments, and Advanced Security')],
  },
};
