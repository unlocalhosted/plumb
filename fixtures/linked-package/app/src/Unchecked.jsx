import React from 'react';
import { LibButton } from 'plumb-linked-library';
export function Unchecked(props) { return <LibButton {...props} />; }
export const unowned = <LibButton id="unchecked-only">Unowned button</LibButton>;
