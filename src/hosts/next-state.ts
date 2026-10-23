interface NextState { token: string; handler?: Promise<(request: Request) => Promise<Response>> }
const key = Symbol.for('@unlocalhosted/plumb/next');
const globals = globalThis as typeof globalThis & { [key]?: NextState };

/** Shared by the rendered script and native route, including across hot reloads. */
export function state(): NextState {
  return globals[key] ??= { token: Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('') };
}
