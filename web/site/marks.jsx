// The pictures in the site's bar and under its install, drawn as toys (docs/design/visual-language.md).
// Every link is one tile: the same 24 body and corner, its mark cut out of it and sized by eye, so the four read as
// one set. The marks are other companies' own, in the cut that holds at 20:
//   GitHub     the Invertocat as published (Simple Icons, CC0)
//   X          the bold cut: the published outline is under 1px here and breaks up (Phosphor Icons, MIT)
//   LinkedIn   the "in" alone, the tile being its square (Phosphor Icons, MIT)
// Phosphor's licence ships with the site (web/licenses/phosphor-icons.txt).

const Tile = ({ hue, children }) => (
  <svg className="tile" viewBox="0 0 24 24" aria-hidden="true">
    <rect width="24" height="24" rx="7" fill={`var(--pl-${hue})`} />
    {children}
  </svg>
);

// a download: an arrow landing on its line
export const Download = () => (
  <Tile hue="sky">
    <path d="M12 5.4v8M8.2 9.9l3.8 3.8 3.8-3.8M7.2 18.2h9.6" fill="none" stroke="var(--pl-cut)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </Tile>
);
export const GitHub = () => (
  <Tile hue="lilac">
    <path transform="translate(2.9 3.05) scale(.758)" fill="var(--pl-cut)" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </Tile>
);
export const X = () => (
  <Tile hue="pink">
    <path transform="translate(2.5 2.5) scale(.0742)" fill="var(--pl-cut)" d="M218.12,209.56l-61-95.8,59.72-65.69a12,12,0,0,0-17.76-16.14L143.81,92.77,106.12,33.56A12,12,0,0,0,96,28H48A12,12,0,0,0,37.88,46.44l61,95.8L39.12,207.93a12,12,0,1,0,17.76,16.14l55.31-60.84,37.69,59.21A12,12,0,0,0,160,228h48a12,12,0,0,0,10.12-18.44ZM166.59,204,69.86,52H89.41l96.73,152Z" />
  </Tile>
);
export const LinkedIn = () => (
  <Tile hue="sky">
    <path transform="translate(-5.82 -5.01) scale(.135)" fill="var(--pl-cut)" d="M96,176a8,8,0,0,1-16,0V112a8,8,0,0,1,16,0ZM88,96a12,12,0,1,1,12-12A12,12,0,0,1,88,96Zm96,80a8,8,0,0,1-16,0V140a20,20,0,0,0-40,0v36a8,8,0,0,1-16,0V112a8,8,0,0,1,15.79-1.78A36,36,0,0,1,184,140Z" />
  </Tile>
);

// a star is one butter body
export const Star = () => (
  <svg className="star" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3.6l2.5 5.3 5.8.7-4.3 4 1.2 5.7-5.2-2.9-5.2 2.9L8 13.6l-4.3-4 5.8-.7z" fill="var(--pl-butter)" stroke="var(--pl-butter)" strokeWidth="2.6" strokeLinejoin="round" />
  </svg>
);

// a disc and eight short rays with round ends
export const Sun = () => (
  <svg className="sky-toy sun" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="5.6" fill="var(--pl-butter)" />
    <g stroke="var(--pl-butter)" strokeWidth="2.6" strokeLinecap="round">
      <path d="M12 2.4v1.4M12 20.2v1.4M2.4 12h1.4M20.2 12h1.4M5.2 5.2l1 1M17.8 17.8l1 1M18.8 5.2l-1 1M6.2 17.8l-1 1" />
    </g>
  </svg>
);
// a crescent with round horns
export const Moon = () => (
  <svg className="sky-toy moon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M10.2 3.6a8.7 8.7 0 1 0 10.2 10.2 6.7 6.7 0 0 1-10.2-10.2z" fill="var(--pl-lilac)" stroke="var(--pl-lilac)" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);
