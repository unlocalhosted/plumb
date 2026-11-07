// The declared machine, for TypeScript owners (spec 2.4).
export interface MachineState { on?: Record<string, string>; ignores?: string[]; flight?: string; final?: true }
export interface Machine {
  id: string; owner: string; field: string; token?: string; send?: string; initial: string;
  cancel?: string[]; states: Record<string, MachineState>; flights?: Record<string, { ifLeft: 'drop' | 'handOff' }>;
}
