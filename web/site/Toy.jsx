// A toy from the overlay's set (overlay/src/toys.js), by name. The svg is the product's own string.
import { toyOf } from '../../overlay/src/toys.js';

export function Toy({ name, size = 24, className = '' }) {
  return <i className={`toy ${className}`} style={{ width: size, height: size }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: toyOf(name) }} />;
}
