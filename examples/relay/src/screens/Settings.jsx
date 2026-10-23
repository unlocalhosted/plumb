// Workspace settings: general, members, billing and notifications, with a confirm dialog for the dangerous action.
// Forms, toggles and plan cards: where type rhythm and spacing show, and where habits (focus, transitions) matter.
import { Check, CreditCard, Mail, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { people, workspace } from '@/data';
import { cn } from '@/lib/utils';
import { PersonAvatar } from '@/app/PersonAvatar';

function Section({ title, description, children }) {
  return (
    <section className="grid grid-cols-[220px_1fr] gap-8 border-b py-6 last:border-b-0">
      <div className="flex flex-col gap-1">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="flex flex-col gap-[10px]">{children}</div>
    </section>
  );
}

function Field({ label, children }) {
  return <label className="flex flex-col gap-1.5"><span className="text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}

function Toggle({ title, detail, defaultChecked }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md px-3 py-2 transition-all hover:bg-muted/60">
      <div className="flex flex-col">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{detail}</span>
      </div>
      <Switch defaultChecked={defaultChecked} aria-label={title} />
    </div>
  );
}

const plans = [
  { name: 'Free', price: '$0', detail: 'For trying Relay with a small team', features: ['Up to 10 members', '250 issues', 'Community support'] },
  { name: 'Team', price: '$8', detail: 'Per member per month', features: ['Unlimited issues', 'Automations', 'Integrations'], popular: true },
  { name: 'Business', price: '$14', detail: 'Per member per month', features: ['Everything in Team', 'SAML and audit log', 'Priority support'], current: true },
];

function Plans() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {plans.map((p) => (
        <Card key={p.name} className={cn(p.current && 'border-primary')}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>{p.name}</CardTitle>
              {p.popular && <span className="rounded-sm bg-[#7a5af5] px-1.5 py-0.5 text-xs font-medium text-white">Most popular</span>}
              {p.current && <Badge variant="secondary">Current</Badge>}
            </div>
            <CardDescription>{p.detail}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <span className="text-2xl font-semibold tabular-nums">{p.price}</span>
            <ul className="flex flex-col gap-1 text-sm">{p.features.map((f) => <li key={f} className="flex items-center gap-2"><Check className="size-3.5 text-primary" />{f}</li>)}</ul>
          </CardContent>
          <CardFooter><Button variant={p.current ? 'outline' : 'default'} className="w-full" disabled={p.current}>{p.current ? 'Your plan' : `Switch to ${p.name}`}</Button></CardFooter>
        </Card>
      ))}
    </div>
  );
}

function DeleteWorkspace() {
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="destructive"><Trash2 />Delete workspace</Button></DialogTrigger>
      <DialogContent className="ease-in">
        <DialogHeader>
          <DialogTitle>Delete {workspace.name}?</DialogTitle>
          <DialogDescription>This removes every issue, automation and member. It can't be undone.</DialogDescription>
        </DialogHeader>
        <Field label={`Type ${workspace.name} to confirm`}>
          <input className="h-8 rounded-md border border-input bg-card px-2.5 text-sm focus:outline-none" placeholder={workspace.name} />
        </Field>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button variant="destructive">Delete workspace</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Settings() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-8 py-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground">{workspace.name} · {workspace.plan} plan</p>
        </div>
        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Section title="Workspace" description="How your workspace appears to members and in links.">
              <Field label="Name"><Input defaultValue={workspace.name} /></Field>
              <Field label="URL"><Input defaultValue="relay.app/northwind" /></Field>
              <div className="flex justify-end"><Button>Save changes</Button></div>
            </Section>
            <Section title="Danger zone" description="Irreversible actions.">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-[#f5c2c2] p-4">
                <div className="flex flex-col"><span className="text-sm font-medium">Delete this workspace</span><span className="text-xs text-muted-foreground">Removes everything for every member.</span></div>
                <DeleteWorkspace />
              </div>
            </Section>
          </TabsContent>

          <TabsContent value="members">
            <Section title="Members" description={`${people.length} people in ${workspace.name}.`}>
              <div className="flex gap-2"><Input placeholder="name@company.com" /><Button><Mail />Invite</Button></div>
              <ul className="flex flex-col rounded-lg border">
                {people.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-3 border-b px-3 py-2 last:border-b-0">
                    <PersonAvatar person={p} className="size-7" />
                    <div className="flex min-w-0 flex-1 flex-col"><span className="text-sm font-medium">{p.name}</span><span className="text-xs text-muted-foreground">{p.id}@northwind.dev</span></div>
                    <Badge variant={i === 0 ? 'default' : 'outline'}>{i === 0 ? 'Admin' : 'Member'}</Badge>
                  </li>
                ))}
              </ul>
            </Section>
          </TabsContent>

          <TabsContent value="billing">
            <Section title="Plan" description="Billed yearly. Change any time.">
              <Plans />
            </Section>
            <Section title="Payment method">
              <div className="flex items-center gap-3 rounded-lg border p-3 text-sm"><CreditCard className="size-4 text-muted-foreground" />Visa ending 4242<span className="text-muted-foreground">· expires 08/28</span><Button variant="outline" size="sm" className="ml-auto">Update</Button></div>
            </Section>
          </TabsContent>

          <TabsContent value="notifications">
            <Section title="Email" description="What Relay sends to your inbox.">
              <Toggle title="Assigned to me" detail="When an issue is assigned to you" defaultChecked />
              <Toggle title="Mentions" detail="When someone @mentions you" defaultChecked />
              <Toggle title="Weekly digest" detail="A summary every Monday" />
            </Section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
