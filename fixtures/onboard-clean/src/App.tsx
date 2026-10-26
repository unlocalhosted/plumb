import './index.css';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';

export function App() {
  return (
    <main className="flex flex-col gap-4 bg-background p-4 text-foreground">
      <Card title="Billing">
        <p className="text-sm text-muted-foreground">Your plan renews on the first of the month.</p>
        <Badge label="Active" />
        <div className="flex gap-2 border-t border-border p-2">
          <Button>Change plan</Button>
          <Button variant="outline" size="sm">Cancel</Button>
          <Button variant="ghost" size="sm" className="p-[13px]">Help</Button>
        </div>
      </Card>
    </main>
  );
}
