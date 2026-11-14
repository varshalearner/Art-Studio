// Generates the demo artwork + avatar SVGs in /public.
// Deterministic per seed, warm studio palette. Run: npm run generate:art
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const artDir = join(root, "public", "art");
const avatarDir = join(root, "public", "avatars");
mkdirSync(artDir, { recursive: true });
mkdirSync(avatarDir, { recursive: true });

// deterministic PRNG
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTES = [
  ["#C96F4A", "#D9A441", "#8A9B6E", "#F3E6CF", "#3F3A35"],
  ["#8A9B6E", "#D9A441", "#C96F4A", "#FAF1DE", "#5C5248"],
  ["#D9A441", "#B5522E", "#6B7D52", "#F7EDD8", "#453E37"],
  ["#A8552F", "#EFCB85", "#8A9B6E", "#FBF4E4", "#3F3A35"],
  ["#6B7D52", "#E8A07E", "#D9A441", "#F6EFDF", "#4A4138"],
  ["#C96F4A", "#B5C49C", "#B5852B", "#FAF6EF", "#3F3A35"],
];

function blob(rand, cx, cy, r, color, opacity) {
  const points = [];
  const n = 8 + Math.floor(rand() * 4);
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2;
    const rr = r * (0.7 + rand() * 0.55);
    points.push([cx + Math.cos(angle) * rr, cy + Math.sin(angle) * rr]);
  }
  let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const next = points[(i + 1) % n];
    const mx = (p[0] + next[0]) / 2;
    const my = (p[1] + next[1]) / 2;
    d += ` Q ${p[0].toFixed(1)} ${p[1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  d += " Z";
  return `<path d="${d}" fill="${color}" opacity="${opacity}"/>`;
}

function stroke(rand, w, h, color) {
  const x1 = rand() * w, y1 = rand() * h;
  const x2 = x1 + (rand() - 0.5) * w * 0.9;
  const y2 = y1 + (rand() - 0.5) * h * 0.9;
  const cx = (x1 + x2) / 2 + (rand() - 0.5) * 120;
  const cy = (y1 + y2) / 2 + (rand() - 0.5) * 120;
  const sw = 6 + rand() * 22;
  return `<path d="M ${x1.toFixed(0)} ${y1.toFixed(0)} Q ${cx.toFixed(0)} ${cy.toFixed(0)} ${x2.toFixed(0)} ${y2.toFixed(0)}" stroke="${color}" stroke-width="${sw.toFixed(0)}" stroke-linecap="round" fill="none" opacity="${(0.5 + rand() * 0.4).toFixed(2)}"/>`;
}

function sun(rand, w, h, color) {
  const cx = w * (0.25 + rand() * 0.5), cy = h * (0.2 + rand() * 0.25);
  const r = 40 + rand() * 60;
  return `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${r.toFixed(0)}" fill="${color}" opacity="0.9"/>`;
}

function hills(rand, w, h, color, baseY) {
  let d = `M 0 ${h}`;
  let y = baseY;
  for (let x = 0; x <= w; x += w / 6) {
    y = baseY + (rand() - 0.5) * 120;
    d += ` L ${x.toFixed(0)} ${y.toFixed(0)}`;
  }
  d += ` L ${w} ${h} Z`;
  return `<path d="${d}" fill="${color}" opacity="0.85"/>`;
}

function makeArt(seed, style) {
  const rand = mulberry32(seed * 7919 + 13);
  const palette = PALETTES[seed % PALETTES.length];
  const w = 800, h = 1000;
  const [a, b, c, bg, ink] = palette;
  let body = "";
  if (style === "abstract") {
    for (let i = 0; i < 6; i++) {
      body += blob(rand, rand() * w, rand() * h, 90 + rand() * 180, [a, b, c][i % 3], 0.55 + rand() * 0.35);
    }
    for (let i = 0; i < 5; i++) body += stroke(rand, w, h, [a, b, c, ink][i % 4]);
  } else if (style === "landscape") {
    body += sun(rand, w, h, b);
    body += hills(rand, w, h, c, h * 0.55);
    body += hills(rand, w, h, a, h * 0.72);
    body += hills(rand, w, h, ink, h * 0.88);
  } else if (style === "portrait") {
    body += `<ellipse cx="${w / 2}" cy="${h * 0.42}" rx="${150 + rand() * 40}" ry="${190 + rand() * 50}" fill="${a}" opacity="0.92"/>`;
    body += `<ellipse cx="${w / 2}" cy="${h * 0.8}" rx="${230 + rand() * 60}" ry="${180}" fill="${c}" opacity="0.9"/>`;
    body += blob(rand, w / 2, h * 0.25, 120, b, 0.8);
    body += stroke(rand, w, h, ink);
  } else {
    // still life: vase + fruit shapes on a table line
    body += `<rect x="0" y="${h * 0.68}" width="${w}" height="${h * 0.32}" fill="${c}" opacity="0.5"/>`;
    body += `<path d="M ${w * 0.42} ${h * 0.68} C ${w * 0.36} ${h * 0.5} ${w * 0.48} ${h * 0.45} ${w * 0.45} ${h * 0.34} L ${w * 0.55} ${h * 0.34} C ${w * 0.52} ${h * 0.45} ${w * 0.64} ${h * 0.5} ${w * 0.58} ${h * 0.68} Z" fill="${a}"/>`;
    for (let i = 0; i < 3; i++) {
      body += `<circle cx="${w * (0.2 + rand() * 0.6)}" cy="${h * 0.64}" r="${30 + rand() * 25}" fill="${[b, a, ink][i]}" opacity="0.85"/>`;
    }
    for (let i = 0; i < 4; i++) body += stroke(rand, w, h * 0.4, b);
  }
  // paper grain
  const grain = `<filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.04 0"/><feComposite operator="over" in2="SourceGraphic"/></filter>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${grain}</defs><rect width="${w}" height="${h}" fill="${bg}"/><g filter="url(#g)">${body}</g><rect width="${w}" height="${h}" fill="none" stroke="${ink}" stroke-opacity="0.12" stroke-width="14"/></svg>`;
}

function makeAvatar(seed) {
  const rand = mulberry32(seed * 104729 + 7);
  const palette = PALETTES[seed % PALETTES.length];
  const [a, b, c, bg] = palette;
  const s = 240;
  let body = `<rect width="${s}" height="${s}" fill="${bg}"/>`;
  body += `<circle cx="${s / 2}" cy="${s * 0.42}" r="${s * 0.22}" fill="${a}"/>`;
  body += `<path d="M ${s * 0.18} ${s} Q ${s / 2} ${s * 0.55} ${s * 0.82} ${s} Z" fill="${c}"/>`;
  body += `<circle cx="${s * (0.25 + rand() * 0.5)}" cy="${s * 0.18}" r="${10 + rand() * 14}" fill="${b}" opacity="0.9"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">${body}</svg>`;
}

const styles = ["abstract", "landscape", "portrait", "still", "abstract", "landscape", "still", "portrait", "abstract", "landscape", "abstract", "still", "portrait", "landscape", "abstract", "still"];
styles.forEach((style, i) => {
  const n = String(i + 1).padStart(2, "0");
  writeFileSync(join(artDir, `art-${n}.svg`), makeArt(i + 1, style));
});
for (let i = 1; i <= 8; i++) {
  writeFileSync(join(avatarDir, `avatar-${i}.svg`), makeAvatar(i));
}
console.log(`Generated ${styles.length} artworks and 8 avatars in /public.`);
