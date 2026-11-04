// A live example re-renders its own classes (a highlight that travels), which would wipe a fix patched onto the DOM.
// So, as plumber does when it writes, the stage hands the fix over as a source edit: an example passes its class
// strings through useTaken(), which applies plumber's class edit to the string that holds the finding's class.
import { createContext, useContext } from 'react';

export const Taken = createContext((cls) => cls);
export const useTaken = () => useContext(Taken);
