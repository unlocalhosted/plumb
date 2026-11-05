// What the screens share. A screen is one file here (screens/NN-name.jsx): `export const n = NN`, the component as the
// default export with its statics (.names, .lesson, .measure, .stage), and `export const handsOn = true` when the
// viewer's own hand is the probe (principles/hands-on.jsx). A screen file takes the place of the old example for its n.

// a person's face, with their company's logo on its corner in the brand's colour: brand = { color, logo, glyph? }
export function Face({ src, brand, size = 'size-8' }) {
  return (
    <span className={'relative shrink-0 ' + size}>
      <img src={src} alt="" className="size-full rounded-full object-cover outline-1 -outline-offset-1 outline-black/10" />
      {brand ? (
        <span className="absolute -right-1 -bottom-1 grid size-[17px] place-items-center rounded-[5px] ring-2 ring-surface" style={{ background: brand.color }}>
          <span className="size-[9px]" style={{ background: brand.glyph ?? '#fff', mask: `url("${brand.logo}") center / contain no-repeat` }} />
        </span>
      ) : null}
    </span>
  );
}
