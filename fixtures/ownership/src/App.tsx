import './styles.css';
import { Action as Renamed, Surface } from './components/ui';
import * as UI from './components/ui';
import { Again, Decorative } from './wrappers';
export function App() {
  return <>
    <Renamed className="mt-4" />
    <Renamed className="bg-brand" />
    <Again className="bg-brand" />
    <UI.Button className="bg-brand" />
    <Renamed render={<a className="bg-brand mt-4" />} />
    <Renamed render={props => <a {...props} style={{ color: 'red' }} />} />
    <Renamed style={{ backgroundColor: measured, marginTop: 4 }} />
    <Surface className="p-4 w-10" />
    <Decorative className="bg-brand" />
  </>;
}
