import { Action } from './components/ui';
export const Forward = ({ className: extra, ...props }) => <Action className={extra} {...props} />;
export function Again(props) { return <Forward {...props} />; }
export const Decorative = () => <Action className="bg-brand" />;
