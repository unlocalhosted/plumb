import "./index.css"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function App() {
  return (
    <main className="flex flex-col gap-4 p-6">
      <Button className="h-[38px]">Taller than its size</Button>
      <Button size="sm" className="px-7">Wider than sm</Button>
      <Button variant="ghost" className="mt-2">Spaced, not overridden</Button>
      <Dialog>
        <DialogTrigger asChild><Button variant="outline">Open</Button></DialogTrigger>
        <DialogContent className="p-[29px]"><DialogTitle>Title</DialogTitle></DialogContent>
      </Dialog>
      <Popover>
        <PopoverTrigger asChild><Button>Pop</Button></PopoverTrigger>
        <PopoverContent className="w-96">Popover</PopoverContent>
      </Popover>
      <Tooltip>
        <TooltipTrigger asChild><Button>Tip</Button></TooltipTrigger>
        <TooltipContent className="text-[11px]">Tooltip</TooltipContent>
      </Tooltip>
      <Select>
        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Pick" /></SelectTrigger>
        <SelectContent><SelectItem value="a">A</SelectItem></SelectContent>
      </Select>
    </main>
  )
}
