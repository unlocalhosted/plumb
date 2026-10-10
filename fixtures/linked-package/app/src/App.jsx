import React from 'react';
import { LibButton } from 'plumb-linked-library';
import { Unchecked, unowned } from './Unchecked.jsx';
export default function App() {
  return <main>
    <LibButton id="linked" className="gap-[13px]">Linked button</LibButton>
    <Unchecked id="unchecked-owner" className="gap-[19px]">Unchecked wrapper</Unchecked>
    {unowned}
  </main>;
}
