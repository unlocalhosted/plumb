// Something the old docs drew that hasn't been redrawn for this site yet. It says so in the language's own way of
// saying "not there": pale and flat.
import { Toy } from '../site/Toy.jsx';

export const Later = ({ what }) => (
  <div className="later"><Toy name="skeleton" size={34} /><span><b>{what} hasn’t moved in yet.</b> It is in the old docs and is being redrawn.</span></div>
);
