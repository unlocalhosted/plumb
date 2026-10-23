// Relay's frame: sidebar, top bar and the current screen. Screens arrive one layer at a time (docs/briefs/demo-relay.md).
import { TooltipProvider } from '@/components/ui/tooltip';
import { Specimen } from '@/Specimen';
import { Board } from '@/screens/Board';
import { Issues } from '@/screens/Issues';
import { routes, useRoute } from './router';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

function Placeholder({ title }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="flex max-w-sm flex-col items-center gap-1 text-center">
        <span className="text-base font-medium">{title}</span>
        <span className="text-sm text-muted-foreground">This screen arrives in a later layer.</span>
      </div>
    </div>
  );
}

export function Shell() {
  const route = useRoute();
  if (route === 'specimen') return <Specimen />;
  const title = routes.find((r) => r.path === route)?.title ?? 'Board';
  return (
    <TooltipProvider>
      <div className="flex h-full bg-background text-foreground">
        <Sidebar route={route} />
        <main className="flex min-w-0 flex-1 flex-col">
          <TopBar title={title} />
          {route === 'board' ? <Board /> : route === 'issues' ? <Issues /> : <Placeholder title={title} />}
        </main>
      </div>
    </TooltipProvider>
  );
}
