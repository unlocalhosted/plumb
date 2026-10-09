import { Textarea as Alias } from './components/ui/textarea';
import { Field } from './components/ui/field';
export const Forward = props => <Alias {...props} />;
const looks = { well: 'kit-well' };
export const App = () => <>
  <textarea className="kit-well" />
  <Alias className="kit-well" />
  <Forward className="kit-well" />
  <div style={{ background: 'var(--kit-well-fill)' }} />
  <input className="kit-field-control" />
  <div className="kit-field-control" />
  <Field className="kit-field-control" />
  <textarea className={looks.well} />
  <div className="copied-well" />
  <div className="kit-wellness" />
</>;
