export function Rings() {
  return <main>
    <button className="focus-visible:ring-1 focus-visible:ring-brand/50 aria-invalid:ring-1 aria-invalid:ring-brand/20" />
    <button className="inset-ring-1 inset-ring-brand/50" />
    <button className="ring-1 ring-[#123456] inset-ring-1 inset-ring-[#123456]" />
    <button className="ring-1 ring-brand/50 shadow-[0_4px_8px_rgba(0,0,0,.2)]" />
    <button className="ring-1 ring-brand/50 shadow-md inset-shadow-sm" />
    <button className="ring-1 ring-brand/50 shadow-lift token-shadow" />
    <button className="ring-1 ring-brand/50" style={{ boxShadow: '0 4px 8px rgba(0,0,0,.2)' }} />
  </main>;
}
