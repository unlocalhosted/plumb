import './index.css';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';

export function App() {
  return (
    <main className="flex flex-col gap-3 bg-background p-6 text-foreground">
      <Card title="Billing">
        <p className="text-sm text-muted-foreground">Your plan renews on the first of the month.</p>
        <p className="text-sm text-gray-500">Invoices are sent to the owner.</p>
        <p className="text-sm text-gray-600">Need a receipt? Ask support.</p>
        <p className="text-xs text-slate-400">Prices exclude tax.</p>
        <Button>Change plan</Button>
        <Button variant="outline">Cancel</Button>
      </Card>
    </main>
  );
}
