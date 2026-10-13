// Isometric drawing helpers. x runs down-right, y runs down-left, z runs up; 30° axes.
export const C30 = Math.cos(Math.PI / 6);
export const iso = (x, y, z = 0) => [(x - y) * C30, (x + y) * 0.5 - z];
export const pts = (...ps) => ps.map((p) => p.join(',')).join(' ');
// Maps a flat drawing in plane coordinates onto the isometric ground plane.
export const PLANE = `matrix(${C30} 0.5 ${-C30} 0.5 0 0)`;
