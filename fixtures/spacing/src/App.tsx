import './styles.css';
export function App({ measured }: { measured: number }) {
  return <>
    <div className="gap-s2 gap-12 -m-12 gap-[13px] p-0 top-auto left-1/2 space-x-12" />
    <div style={{ padding: 10, marginInline: '-12px', scrollPaddingBlock: '16px', gap: measured }} />
    <div style={{ gap: 'var(--spacing-chain)', inset: '0 auto 12px 16px', paddingBlock: 'inherit' }} />
    <div style={{ gap: 'var(--cycle-a)', padding: 'var(--media-step)', margin: 'var(--dark-step)' }} />
  </>;
}
