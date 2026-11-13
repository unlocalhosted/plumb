/* ─────────────────────────────────────────────────────────
 * FORMS RULES · React Plumber overlay
 *
 * The forms pack's rules (pack-forms.js says what the pack is and where each rule comes from). The same rule object
 * craft uses: it reads facts and the element, never writes, and says nothing when its evidence is ambiguous.
 * Each rule is one bullet of Chrome's Modern Web Guidance, forms guide, that the drawn page shows; the section is
 * beside its code. Every rule begins with the cheapest test of whether the element is its kind.
 * ───────────────────────────────────────────────────────── */
import { say } from './words.js';
import { accessibleName, trimmed, hiddenFromAT, drawn, shown, named, page } from './a11y-rules.js';

const FIELD = 'input:not([type="hidden"]), select, textarea';
const found = (rule, el, n, { value = el.localName, confidence = 0.9, advice }) => [{
  ...say(rule.id, n), key: rule.id, text: el.localName, props: [], value, n: 0,
  evidence: n, confidence, guide: 'forms', suggest: { kind: 'advice', text: advice },
}];
const rule = (short, owns, check, extra = {}) => ({ id: `forms/${short}`, family: 'craft', owns: [owns], once: 'ancestor', reads: ['rect', 'style'], ...extra, check({ el, facts }) { return check.call(this, el, facts) ?? []; } });
const typeOf = (el) => (el.getAttribute('type') ?? 'text').toLowerCase();
const isText = (el) => el.localName === 'input' && /^(?:text|email|tel|url|password|search|number)$/.test(typeOf(el));
const isSubmit = (el) => el.localName === 'button' ? !/^(?:button|reset)$/.test((el.getAttribute('type') ?? '').toLowerCase()) : el.localName === 'input' && /^(?:submit|image)$/.test(typeOf(el));
// what a field calls itself, for rules that go by what it asks for: its name, id, autocomplete and label
const hint = (el) => `${el.getAttribute('name') ?? ''} ${el.id} ${el.getAttribute('autocomplete') ?? ''} ${accessibleName(el).name}`;
// a label's words, without a keyboard hint drawn inside it (<kbd>/</kbd> beside a search field is not its name)
const labelText = (el) => trimmed([...(el.labels ?? [])].map((l) => { let t = l.textContent; for (const k of l.querySelectorAll('kbd, [aria-hidden="true"]')) t = t.replace(k.textContent, ' '); return t; }).join(' '));
const fieldsOf = (form, facts) => [...form.elements].filter((f) => f.matches(FIELD) && !/^(?:submit|button|reset|image)$/.test(typeOf(f)) && shown(f, facts));

// §1: "DON'T nest <form> elements inside other <form> elements"
export const nestedForm = rule('nested-form', 'form', function (el, facts) {
  if (el.localName !== 'form' || !el.parentElement?.closest('form') || !drawn(el, facts)) return;
  return found(this, el, {}, { advice: 'Move it out of the other form, or make it a group of fields in that form.' });
});
// §1: "DO explicitly set type="button" on secondary or helper buttons so they don't default to type="submit""
// A button that says it is a helper (Cancel, Show, Add, an icon alone) and has no type. The form's one untyped button
// with a sending word is its submit, and is left be.
const HELPER = /^(?:cancel|close|back|previous|prev|show|hide|add|remove|delete|clear|reset|toggle|edit|copy|paste|browse|upload|attach|more|less|expand|collapse|dismiss|skip|generate|×|✕|\+|−|-)\b/i;
export const buttonType = rule('button-type', 'type', function (el, facts) {
  if (el.localName !== 'button' || el.hasAttribute('type') || !el.form || !shown(el, facts)) return;
  const name = accessibleName(el).name, visible = trimmed(el.innerText);
  if (!HELPER.test(name) && visible) return;
  // an icon-only button that is the form's only button is its submit (a search or send arrow)
  if (!visible && [...el.form.elements].filter(isSubmit).length < 2) return;
  return found(this, el, { name: name || 'This button' }, { value: 'no type', confidence: 0.85, advice: 'Add type="button".' });
});
// §1: "DON'T use type="button" for primary submission buttons"
export const submitMissing = rule('submit-missing', 'submit', function (el, facts) {
  if (el.localName !== 'form' || !drawn(el, facts)) return;
  const all = [...el.elements];
  if (all.some(isSubmit) || !all.some((b) => b.localName === 'button' && shown(b, facts))) return;
  if (!fieldsOf(el, facts).some((f) => isText(f) || f.localName === 'textarea')) return;
  return found(this, el, {}, { value: 'type="button"', confidence: 0.8, advice: 'Make the button that sends it type="submit" and handle the form’s submit event.' });
});
// §1: "DO use <fieldset> and <legend> (with <legend> as the first child) … DON'T use <fieldset> for visual styling without a <legend>"
export const fieldsetLegend = rule('fieldset-legend', 'legend', function (el, facts) {
  if (el.localName !== 'fieldset' || el.firstElementChild?.localName === 'legend' || named(el) || !shown(el, facts)) return;
  const late = !!el.querySelector(':scope > legend');
  return found(this, el, { late }, { advice: late ? 'Move the <legend> to be the first thing in the <fieldset>.' : 'Add a <legend> as its first child, or use a <div> if this is only for looks.' });
});
// §1: "DO specify a name attribute for every form control to identify data on submission"
// Judged where the form is sent by the browser (it has an action): a form handled in script may read its fields another way.
export const fieldName = rule('field-name', 'name', function (el, facts) {
  if (!el.matches(FIELD) || el.hasAttribute('name') || !el.form?.hasAttribute('action') || /^(?:submit|button|reset|image)$/.test(typeOf(el)) || !shown(el, facts)) return;
  return found(this, el, {}, { value: 'no name', confidence: 0.8, advice: 'Add a name: it is the key the value is sent under.' });
});
// §1: "DO use the <form> element to wrap interactive controls for data collection" (and the sign-in guide: a form is what a password manager fills)
export const passwordNoForm = rule('password-no-form', 'form', function (el, facts) {
  if (el.localName !== 'input' || typeOf(el) !== 'password' || el.form || !shown(el, facts)) return;
  return found(this, el, {}, { confidence: 0.85, advice: 'Wrap the sign-in fields and their button in a <form>, and handle its submit event.' });
});
// §1: "DO wrap search forms and filtering controls in a <search> element"
export const searchLandmark = rule('search-landmark', 'landmark', function (el, facts) {
  if (!(el.localName === 'input' && typeOf(el) === 'search') && el.getAttribute('role') !== 'searchbox') return;
  if (el.closest('search, [role="search"]') || !shown(el, facts)) return;
  return found(this, el, {}, { confidence: 0.8, advice: 'Wrap it (and its button) in <search>.' });
});
// §1: "DO give <form> elements an accessible name … when a page has multiple forms"
export const formUnnamed = rule('form-unnamed', 'name', function (el, facts) {
  if (el.localName !== 'form' || named(el) || !shown(el, facts)) return;
  const count = page(facts, 'forms/forms', () => [...document.querySelectorAll('form')].filter((f) => shown(f, facts)).length);
  if (count < 2) return;
  return found(this, el, { count }, { confidence: 0.8, advice: 'Add aria-labelledby pointing at the form’s heading, or an aria-label.' });
});
// §1: "DON'T use GET for sensitive data (it exposes data in history/logs)"
export const getSensitive = rule('get-sensitive', 'method', function (el, facts) {
  if (el.localName !== 'form' || el.method !== 'get' || !el.querySelector('input[type="password"], input[autocomplete^="cc-"]') || !drawn(el, facts)) return;
  return found(this, el, {}, { value: 'method="get"', advice: 'Add method="post".' });
});
// §1: "DON'T disable textarea resizing without alternate layout provisions"
export const textareaResize = rule('textarea-resize', 'resize', function (el, facts) {
  if (el.localName !== 'textarea' || !shown(el, facts)) return;
  const s = facts.style(el);
  // a box that grows with its content, by CSS or by a script setting its height, has its provision
  if (s.resize !== 'none' || s.fieldSizing === 'content' || el.style.height || el.readOnly) return;
  return found(this, el, {}, { value: 'resize: none', confidence: 0.8, advice: 'Add field-sizing: content (with a max-height), or allow resize: vertical.' });
});
// §2: "DO always associate <label> with its input using for and id"
export const labelUnbound = rule('label-unbound', 'label', function (el, facts) {
  if (el.localName !== 'label' || el.control || !trimmed(el.textContent) || !shown(el, facts)) return;
  const target = el.getAttribute('for');
  if (target) return document.getElementById(target) ? undefined : found(this, el, { dangling: target }, { value: `for="${target}"`, advice: `Give the field id="${target}", or point the label at the field’s id.` });
  // a label with no field of its own, right beside a field that has no label: the pair was meant
  const near = el.nextElementSibling?.matches(FIELD) ? el.nextElementSibling : el.parentElement?.querySelector(FIELD);
  if (!near || near.labels?.length || near.getAttribute('aria-label') || near.getAttribute('aria-labelledby')) return;
  return found(this, el, { dangling: '' }, { confidence: 0.8, advice: 'Give the field an id and the label a matching for (htmlFor in JSX).' });
});
// §2: "DO ensure the vertical margin between a label and its input is less than the margin between form groups (Gestalt Proximity Rule)"
export const labelProximity = rule('label-proximity', 'gap', function (el, facts) {
  if (el.localName !== 'label' || !el.control || !shown(el, facts) || !drawn(el.control, facts)) return;
  const l = facts.rect(el), c = facts.rect(el.control), own = Math.round(c.top - l.bottom);
  if (own < 4) return; // beside its field, or tight against it
  const fields = page(facts, 'forms/fields', () => [...document.querySelectorAll(FIELD)].filter((f) => drawn(f, facts)));
  let other = Infinity;
  for (const f of fields) {
    if (f === el.control) continue;
    const r = facts.rect(f);
    if (r.bottom <= l.top + 1 && r.left < l.right && r.right > l.left) other = Math.min(other, Math.round(l.top - r.bottom));
  }
  if (!(other < own)) return;
  return found(this, el, { own, other }, { value: `${own}px / ${other}px`, confidence: 0.8, advice: `Bring the label within ${Math.max(2, Math.floor(other / 2))}px of its field, or give the groups more room.` });
});
// §2: "DO use aria-describedby to link inputs with help text or error messages" (on a field already marked invalid)
export const invalidUndescribed = rule('invalid-undescribed', 'error', function (el, facts) {
  if (el.getAttribute('aria-invalid') !== 'true' || el.getAttribute('aria-describedby') || el.getAttribute('aria-errormessage') || !shown(el, facts)) return;
  return found(this, el, {}, { value: 'aria-invalid', confidence: 0.85, advice: 'Give the message an id and name it in aria-describedby.' });
});
// §2: "DO indicate clearly which fields are required both visually in the label and programmatically with the required attribute"
const SAYS_REQUIRED = /\*|required|mandatory/i;
const isRequired = (el) => el.required || el.getAttribute('aria-required') === 'true';
export const requiredUnmarked = rule('required-unmarked', 'required', function (el, facts) {
  if (!el.matches(FIELD) || !isRequired(el) || /^(?:checkbox|radio)$/.test(typeOf(el)) || !shown(el, facts)) return;
  const label = labelText(el);
  if (!label || SAYS_REQUIRED.test(label)) return;
  // a form that marks the optional ones instead, or says so once for all, has told people
  const scope = el.form ?? el.closest('fieldset, section, main') ?? document.body;
  if (/optional|all fields|\*\s*(?:indicates|=|required)/i.test(scope.textContent) || fieldsOf(el.form ?? { elements: [] }, facts).length === 1) return;
  return found(this, el, {}, { value: 'required', confidence: 0.7, advice: 'Show it in the label ("Email (required)"), or mark the optional ones instead.' });
});
export const requiredUnsaid = rule('required-unsaid', 'required', function (el, facts) {
  if (!el.matches(FIELD) || isRequired(el) || !el.labels?.length || !shown(el, facts)) return;
  if (!/\*\s*$|\(required\)/i.test(labelText(el))) return;
  return found(this, el, {}, { value: labelText(el).slice(0, 40), confidence: 0.85, advice: 'Add the required attribute.' });
});
// §2: "DON'T use aria-label when a visible <label> can be used or override visible text with a mismatched aria-label"
export const labelOverridden = rule('label-overridden', 'name', function (el, facts) {
  if (!el.matches(FIELD) || !el.labels?.length || !shown(el, facts)) return;
  const label = trimmed(el.getAttribute('aria-label')), visible = labelText(el).replace(/\s*\*$/, '');
  // one or two characters is a mark or a shortcut, not a name someone would say
  if (!label || visible.length < 3 || label.toLowerCase().includes(visible.toLowerCase())) return;
  return found(this, el, { visible: visible.slice(0, 40), label: label.slice(0, 40) }, { value: `aria-label="${label}"`, confidence: 0.85, advice: 'Remove the aria-label: the <label> already names it.' });
});
// §3: "DON'T … disable autocomplete on passwords, verification codes, or other authentication fields"
export const autocompleteOff = rule('autocomplete-off', 'autocomplete', function (el, facts) {
  if (el.localName !== 'input' || !/^(?:off|false|nope)$/i.test(el.getAttribute('autocomplete') ?? '') || !shown(el, facts)) return;
  const what = typeOf(el) === 'password' ? 'password' : /user.?name|login|e-?mail/i.test(hint(el)) || typeOf(el) === 'email' ? 'sign-in' : /otp|one.?time|verification|passcode/i.test(hint(el)) ? 'code' : null;
  if (!what) return;
  return found(this, el, { what }, { value: 'autocomplete="off"', advice: `Use autocomplete="${what === 'password' ? 'current-password' : what === 'code' ? 'one-time-code' : 'username'}".` });
});
// §3: "DO use inputmode to optimize on-screen keyboards (e.g., inputmode="numeric" for PINs)"
const DIGITS = /\b(?:otp|pin|passcode|one.?time|verification code|security code|cvc|cvv|card.?number)\b/i;
export const numericKeyboard = rule('numeric-keyboard', 'inputmode', function (el, facts) {
  if (el.localName !== 'input' || !/^(?:text|password)$/.test(typeOf(el)) || el.hasAttribute('inputmode') || !DIGITS.test(hint(el)) || !shown(el, facts)) return;
  return found(this, el, {}, { value: 'no inputmode', confidence: 0.8, advice: 'Add inputmode="numeric".' });
});
// §3: "DON'T use type="number" for credit cards, ZIP codes, or one-time passcodes"
const CODES = [[/card/i, 'card number'], [/zip|postal|postcode/i, 'postal code'], [/otp|one.?time|passcode|verification|\bpin\b|\bcode\b/i, 'code'], [/phone|mobile|\btel\b/i, 'phone number'], [/cvc|cvv/i, 'security code']];
export const numberForCode = rule('number-for-code', 'type', function (el, facts) {
  if (el.localName !== 'input' || typeOf(el) !== 'number' || !shown(el, facts)) return;
  const what = CODES.find(([re]) => re.test(hint(el)))?.[1];
  if (!what) return;
  return found(this, el, { what }, { value: 'type="number"', advice: `Use type="${what === 'phone number' ? 'tel' : 'text'}"${what === 'phone number' ? '' : ' with inputmode="numeric"'}.` });
});
// §3: "DON'T split a single value (such as a 6-digit OTP, phone number, or credit card) across multiple <input> boxes"
const ONE_CHAR = 'input[maxlength="1"]';
export const splitCode = rule('split-code', 'field', function (el, facts) {
  if (el.localName !== 'input' || el.getAttribute('maxlength') !== '1' || !shown(el, facts)) return;
  const group = el.parentElement?.querySelectorAll(ONE_CHAR).length >= 4 ? el.parentElement : el.parentElement?.parentElement;
  const boxes = group ? [...group.querySelectorAll(ONE_CHAR)] : [];
  if (boxes.length < 4 || boxes[0] !== el) return; // said once, on the first box
  return found(this, el, { count: boxes.length }, { value: `${boxes.length} boxes`, advice: 'Use one <input inputmode="numeric" autocomplete="one-time-code">; CSS can draw it as boxes.' });
});
// §3: "DO turn off text correction on fields that hold identifiers rather than prose"
export const identifierCorrection = rule('identifier-correction', 'autocorrect', function (el, facts) {
  if (el.localName !== 'input' || typeOf(el) !== 'text' || !shown(el, facts)) return;
  if (!/user.?name|user.?id|\bhandle\b|coupon|promo|invite.?code|\bslug\b/i.test(hint(el))) return;
  if (/^(?:none|off)$/i.test(el.getAttribute('autocapitalize') ?? '') || el.getAttribute('autocorrect') === 'off') return;
  return found(this, el, {}, { value: 'autocapitalize', confidence: 0.8, advice: 'Add autocapitalize="none" autocorrect="off" spellcheck="false".' });
});
// §4: "DON'T use the raw :invalid CSS pseudo-class alone for error styling" (an empty required field is :invalid from the start)
// The page's own stylesheets say whether it is styled: a rule whose selector has :invalid (not :user-invalid) and matches this field.
function invalidSelectors() {
  const out = [];
  const read = (rules) => { for (const r of rules) { if (r.selectorText?.includes(':invalid')) out.push(...r.selectorText.split(/,(?![^()]*\))/).filter((s) => /(?<!user-):invalid/.test(s))); if (r.cssRules?.length) read(r.cssRules); } };
  for (const sheet of document.styleSheets) { try { read(sheet.cssRules); } catch { /* another origin's sheet cannot be read */ } }
  return out;
}
export const invalidOnLoad = rule('invalid-on-load', 'validity', function (el, facts) {
  if (!el.matches(FIELD) || !el.required || el.value || !shown(el, facts)) return;
  const selectors = page(facts, 'forms/invalid', invalidSelectors);
  // :focus:invalid and :not(:placeholder-shown):invalid wait for the person in their own way
  const raw = selectors.find((s) => !/:focus|:placeholder-shown|:user-/.test(s) && (() => { try { return el.matches(s); } catch { return false; } })());
  if (!raw) return;
  return found(this, el, {}, { value: trimmed(raw).slice(0, 60), confidence: 0.85, advice: 'Use :user-invalid in that selector.' });
});
// §4: "DON'T disable submit buttons to block validation; let users submit and highlight errors"
export const submitDisabled = rule('submit-disabled', 'disabled', function (el, facts) {
  if (!isSubmit(el) || !el.disabled || !el.form || !shown(el, facts)) return;
  // disabled while it is being sent is the guide's own advice
  if (el.getAttribute('aria-busy') === 'true' || el.form.getAttribute('aria-busy') === 'true' || /ing\b|…|\.\.\./i.test(accessibleName(el).name)) return;
  const fields = fieldsOf(el.form, facts);
  if (!fields.length) return;
  // sure when the form itself says it is incomplete; a doubt when the button may be off for another reason
  const incomplete = !el.form.checkValidity() || fields.some((f) => isRequired(f) && !f.value);
  return found(this, el, {}, { value: 'disabled', confidence: incomplete ? 0.8 : 0.7, advice: 'Leave it enabled; on submit, show what is missing and move focus to the first problem.' });
});
// §6: "DO hide inputs visually using the canonical .visually-hidden recipe … NOT display: none, which removes them from the accessibility tree"
export const controlHidden = rule('control-hidden', 'hidden', function (el, facts) {
  if (el.localName !== 'label' || !shown(el, facts)) return;
  const c = el.control;
  if (!c || c.localName !== 'input' || !/^(?:checkbox|radio|file)$/.test(typeOf(c))) return;
  const s = facts.style(c);
  if (s.display !== 'none' && s.visibility !== 'hidden' && !c.hidden) return;
  // a hidden input beside a control with a role that does its job (a library's switch) is that library's form plumbing
  if (el.querySelector('[role="checkbox"], [role="switch"], [role="radio"], button') || c.getAttribute('aria-hidden') === 'true') return;
  return found(this, el, { type: typeOf(c) === 'file' ? 'file picker' : typeOf(c) }, { value: s.display === 'none' ? 'display: none' : 'visibility: hidden', advice: 'Hide it with a visually-hidden class (1px, clip-path: inset(50%)) so it still takes focus.' });
});
// §9: "DON'T split name inputs into rigid variables ("First", "Last") for global audiences"
export const nameSplit = rule('name-split', 'field', function (el, facts) {
  if (el.localName !== 'input' || !/given-name|first.?name|fname/i.test(hint(el)) || !shown(el, facts)) return;
  const scope = el.form ?? el.parentElement?.parentElement;
  if (!scope || ![...scope.querySelectorAll('input')].some((f) => f !== el && /family-name|last.?name|surname|lname/i.test(hint(f)))) return;
  return found(this, el, {}, { value: 'first / last', confidence: 0.65, advice: 'Ask for the name in one field with autocomplete="name".' });
});
// §9: "DON'T enforce Latin-only characters for names and usernames"
export const latinOnly = rule('latin-only', 'pattern', function (el, facts) {
  if (el.localName !== 'input' || !el.hasAttribute('pattern') || !shown(el, facts)) return;
  const pattern = el.getAttribute('pattern');
  if (!/^\^?\[(?:A-Za-z|a-zA-Z|a-z|A-Z)[\s\\s'’.\- -]*\][+*]?(?:\{\d*,?\d*\})?\$?$/.test(pattern) || !/name/i.test(hint(el))) return;
  return found(this, el, {}, { value: `pattern="${pattern}"`, advice: 'Use \\p{L} for letters (pattern="[\\p{L}\\p{M}\' .-]+"), or drop the pattern.' });
});
// §1: "DO use actionable language on submit buttons (e.g., "Save changes")"
export const submitWording = rule('submit-wording', 'words', function (el, facts) {
  if (!isSubmit(el) || !el.form || !shown(el, facts)) return;
  const name = accessibleName(el).name;
  if (!/^(?:submit|ok|okay|go|done|enter)$/i.test(name)) return;
  return found(this, el, { name }, { value: name, confidence: 0.8, advice: 'Say what it does: "Save changes", "Create account", "Send message".' });
});
// §1: "DO use <fieldset> and <legend> … to group related controls" (radio buttons that share a name are one question)
export const radioGroup = rule('radio-group', 'group', function (el, facts) {
  if (el.localName !== 'input' || typeOf(el) !== 'radio' || !el.name || !shown(el, facts)) return;
  const group = [...(el.form ?? document).querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`)];
  if (group.length < 2 || group[0] !== el || el.closest('fieldset, [role="radiogroup"], [role="group"]')) return;
  return found(this, el, { count: group.length }, { value: `name="${el.name}"`, confidence: 0.85, advice: 'Wrap them in a <fieldset> with a <legend> that asks the question.' });
});
// §2: "DO use aria-describedby to link inputs with help text or error messages" (the link has to land)
export const describedbyMissing = rule('describedby-missing', 'error', function (el, facts) {
  if (!el.matches(FIELD) || !shown(el, facts)) return;
  for (const attr of ['aria-describedby', 'aria-errormessage']) {
    const ids = trimmed(el.getAttribute(attr));
    if (!ids) continue;
    // a message that is drawn only while there is an error is not there yet: judged when the field is marked invalid
    const missing = ids.split(' ').find((id) => !document.getElementById(id));
    if (missing && (attr === 'aria-describedby' ? ids.split(' ').every((id) => !document.getElementById(id)) && el.getAttribute('aria-invalid') === 'true' : el.getAttribute('aria-invalid') === 'true')) return found(this, el, { attr, id: missing }, { value: `${attr}="${ids}"`, confidence: 0.85, advice: `Give the message id="${missing}".` });
  }
});
// §1: "DO use … specific <input> types"
export const inputType = rule('input-type', 'type', function (el, facts) {
  if (el.localName !== 'input' || typeOf(el) !== 'text' || el.hasAttribute('inputmode') || el.hasAttribute('list') || el.getAttribute('role') || !shown(el, facts)) return;
  const own = `${el.getAttribute('name') ?? ''} ${el.id} ${el.getAttribute('autocomplete') ?? ''}`;
  // a field that takes "email or username" is rightly plain text
  const type = /e-?mail/i.test(own) && !/user|login|\bor\b/i.test(hint(el)) ? 'email' : /\b(?:phone|mobile|tel)\b|^tel/i.test(own) ? 'tel' : /\b(?:url|website|homepage)\b/i.test(own) ? 'url' : null;
  if (!type) return;
  return found(this, el, { type }, { value: 'type="text"', confidence: 0.8, advice: `Use type="${type}".` });
});
// §1: "DON'T use CSS to visually reorder form controls away from their DOM/keyboard Tab order"
const TABBABLE = 'input:not([type="hidden"]), select, textarea, button, a[href]';
export const visualOrder = rule('visual-order', 'order', function (el, facts) {
  if (!el.closest('form') || !drawn(el, facts)) return;
  const s = facts.style(el);
  if (/reverse/.test(s.flexDirection) && /flex/.test(s.display)) {
    if ([...el.children].filter((c) => c.matches(TABBABLE) || c.querySelector(TABBABLE)).length < 2) return;
    return found(this, el, { how: 'reverse' }, { value: `flex-direction: ${s.flexDirection}`, confidence: 0.8, advice: 'Write the controls in the order they are drawn and drop the reverse.' });
  }
  if (s.order === '0' || !s.order || !(el.matches(TABBABLE) || el.querySelector(TABBABLE))) return;
  const parent = el.parentElement && facts.style(el.parentElement);
  if (!parent || !/flex|grid/.test(parent.display) || [...el.parentElement.children].filter((c) => c.matches(TABBABLE) || c.querySelector(TABBABLE)).length < 2) return;
  return found(this, el, { how: 'order' }, { value: `order: ${s.order}`, confidence: 0.75, advice: 'Move it in the markup to where it is drawn and drop order.' });
});
// §2: "keep critical format instructions (e.g., 3-12 characters) in the label or persistent helper text; do not rely on placeholder alone"
const INSTRUCTION = /\b(?:\d+\s*(?:-|–|to)\s*\d+\s+\w+|at least \d+|min(?:imum)?\.? \d+|max(?:imum)?\.? \d+|must (?:be|contain|include)|dd\/mm|mm\/dd|yyyy|characters?\b.*\d|\d.*\bcharacters?)\b/i;
export const placeholderInstruction = rule('placeholder-instruction', 'placeholder', function (el, facts) {
  if (!el.matches('input, textarea') || !el.placeholder || !INSTRUCTION.test(el.placeholder) || !shown(el, facts)) return;
  // said again where it stays: in the label, or in text the field points at
  const said = `${labelText(el)} ${trimmed(el.getAttribute('aria-describedby')).split(' ').map((id) => document.getElementById(id)?.textContent ?? '').join(' ')}`;
  if (INSTRUCTION.test(said)) return;
  return found(this, el, { text: el.placeholder.slice(0, 50) }, { value: el.placeholder.slice(0, 50), confidence: 0.8, advice: 'Put it in the label, or in a line under the field named by aria-describedby.' });
});
// §8: "DON'T use inline JavaScript (e.g., onclick="...") directly within form markup"
export const inlineHandler = rule('inline-handler', 'script', function (el, facts) {
  if (!el.matches(FIELD + ', button, form') || !el.closest('form')) return;
  const attr = el.getAttributeNames().find((a) => /^on[a-z]+$/.test(a));
  if (!attr || !drawn(el, facts)) return;
  return found(this, el, { attr }, { value: attr, confidence: 0.85, advice: 'Attach it with addEventListener from a script file.' });
});

export const FORMS_RULES = [nestedForm, buttonType, submitMissing, fieldsetLegend, fieldName, passwordNoForm, searchLandmark, formUnnamed, getSensitive, textareaResize, labelUnbound, labelProximity,
  invalidUndescribed, requiredUnmarked, requiredUnsaid, labelOverridden, autocompleteOff, numericKeyboard, numberForCode, splitCode, identifierCorrection, invalidOnLoad, submitDisabled, controlHidden,
  nameSplit, latinOnly, submitWording, radioGroup, describedbyMissing, inputType, visualOrder, placeholderInstruction, inlineHandler];
