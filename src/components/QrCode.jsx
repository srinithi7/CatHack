// Deterministic pseudo-QR visual — CSS/SVG only, no external library or network call.
function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FINDER_CELLS = (() => {
  const cells = new Set();
  const stamp = (ox, oy) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const border = x === 0 || x === 6 || y === 0 || y === 6;
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        if (border || core) cells.add(`${ox + x},${oy + y}`);
      }
    }
  };
  stamp(0, 0);
  stamp(14, 0);
  stamp(0, 14);
  return cells;
})();

function isFinderZone(x, y) {
  return (x < 8 && y < 8) || (x >= 13 && y < 8) || (x < 8 && y >= 13);
}

export default function QrCode({ value, size = 132, color = "#1A1A1A" }) {
  const grid = 21;
  const rand = mulberry32(hashString(value) || 1);
  const cells = [];
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      if (isFinderZone(x, y)) {
        if (FINDER_CELLS.has(`${x},${y}`)) cells.push([x, y]);
      } else if (rand() > 0.58) {
        cells.push([x, y]);
      }
    }
  }
  const cellSize = size / grid;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${grid} ${grid}`} role="img" aria-label={`QR code for ${value}`}>
      <rect width={grid} height={grid} fill="#FFFFFF" rx={1} />
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} />
      ))}
    </svg>
  );
}
