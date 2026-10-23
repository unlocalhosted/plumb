import { Content as ModalContent } from '@radix-ui/react-dialog';
import { Command as Search } from 'cmdk';

export const AttributeReplacements = () => <>
  <button className="outline-none data-[highlighted]:bg-accent" />
  <button className="outline-none data-[selected=true]:text-accent-foreground" />
  <button className="outline-none aria-selected:bg-accent" />
  <button className="outline-none data-[state=open]:bg-accent" />
  <button className="outline-none border data-[state=active]:border-ring" />
  <button className="outline-none data-[highlighted]:border-2 data-[highlighted]:border-solid" />
</>;
export const ManagedFocus = () => <>
  <div tabIndex={-1} className="outline-none" />
  <section tabIndex="-1" className="outline-none" />
  <ModalContent className="outline-none" />
  <Search.Input autoFocus className="outline-none" />
</>;
export const MissingAttributeFocus = () => <>
  <button className="outline-none data-[selected=false]:bg-accent" />
  <button className="outline-none data-[state=closed]:bg-accent" />
  <button className="outline-none data-[highlighted]:bg-transparent" />
  <button className="outline-none data-[highlighted]:text-transparent" />
  <button className="outline-none bg-accent data-[highlighted]:bg-accent" />
  <button className="outline-none data-[highlighted]:border-ring" />
  <button className="outline-none border-0 data-[highlighted]:border-ring" />
  <button className="outline-none data-[state=closed]:border data-[state=open]:border-ring" />
  <button className="outline-none hover:data-[highlighted]:bg-accent" />
  <button className="outline-none md:data-[highlighted]:bg-accent" />
  <button className="outline-none before:data-[highlighted]:bg-accent" />
  <button className="outline-none [&_span[data-highlighted]]:bg-accent" />
  <button className="outline-none group-data-[highlighted]:bg-accent" />
  <button className="outline-none not-data-[highlighted]:bg-accent" />
  <button className={cn('outline-none', ready && 'data-[highlighted]:bg-accent')} />
  <button className="outline-none" /><button className="data-[highlighted]:bg-accent" />
</>;
export const MissingManagedFocus = () => <>
  <input autoFocus className="outline-none" />
  <input tabIndex={-1} className="outline-none" />
  <button tabIndex={-1} className="outline-none" />
  <div tabIndex={0} className="outline-none" />
  <ModalContent tabIndex={0} className="outline-none" />
  <Search.Input className="outline-none" />
  <Fake.Content className="outline-none" />
</>;
