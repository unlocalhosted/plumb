export function Textarea({ className, ...props }) {
  return <textarea className={`kit-well shared ${className}`} style={{ background: 'var(--kit-well-fill)' }} {...props} />;
}
// Entire component source is exempt, including local helper markup.
const internal = <div className="kit-well" />;
