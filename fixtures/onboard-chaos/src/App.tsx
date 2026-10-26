import './index.css';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';

export function App() {
  return (
    <main className="flex flex-col gap-[14px] bg-background p-[26px] text-foreground">
      <Card title="Billing">
        <p className="text-sm text-muted-foreground">Your plan renews on the first of the month.</p>
        <p className="text-[13px] text-[#6b7280]">Invoices are sent to the owner.</p>
        <p className="mt-[7px] text-[15px] leading-[21px] text-gray-600">Need a receipt? Ask support.</p>
        <div className="flex gap-[10px] rounded-[7px] border border-[#e5e7eb] p-[9px]">
          <Button>Change plan</Button>
          <Button variant="outline" className="px-[18px] py-[7px] text-[13px]">Cancel</Button>
        </div>
      </Card>
      <p className="legacy-note">Prices exclude tax.</p>
    </main>
  );
}
