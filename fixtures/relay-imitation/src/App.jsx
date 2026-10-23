import './styles.css';
import { Button } from './components/ui/button';
export const App = () => <>
  <Button>Real</Button>
  <button className="inline-flex h-8 items-center gap-1.5 rounded-[7px] bg-primary px-[13px] text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90">New issue</button>
  <button className="block h-12 rounded-full border bg-card px-8 text-lg text-muted-foreground">Different</button>
  <button className="inline-flex h-8 items-center gap-1.5 rounded-md bg-destructive px-3 text-sm font-medium text-destructive-foreground shadow-xs hover:bg-destructive/90">Delete</button>
  <button className="inline-flex h-8 items-center gap-1.5 rounded-md bg-amber-500 px-3 text-sm font-medium text-black">Same geometry, different paint</button>
</>;
