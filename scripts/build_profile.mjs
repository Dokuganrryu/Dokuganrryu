import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "assets");
fs.mkdirSync(OUT, { recursive: true });

// Timeline clock: builds per-element @keyframes in seconds on a shared timeline.
function clock(T) {
  const rules = [];
  let n = 0;
  return {
    css: () => rules.join(""),
    anim(stops, extra = "") {
      const id = `a${n++}`;
      const frames = stops.map(([t, p, ease]) => {
        const body = [
          p.o !== undefined && `opacity:${p.o}`,
          p.t && `transform:${p.t}`,
          ease && `animation-timing-function:${ease}`,
        ]
          .filter(Boolean)
          .join(";");
        return `${+((t / T) * 100).toFixed(3)}%{${body}}`;
      });
      const first = stops[0][1];
      const last = stops[stops.length - 1][1];
      if (stops[0][0] > 0) {
        frames.unshift(
          `0%{${first.o !== undefined ? `opacity:${first.o};` : ""}${first.t ? `transform:${first.t}` : ""}}`
        );
      }
      frames.push(
        `100%{${last.o !== undefined ? `opacity:${last.o};` : ""}${last.t ? `transform:${last.t}` : ""}}`
      );
      rules.push(`@keyframes ${id}{${frames.join("")}}.${id}{animation:${id} ${T}s linear both;${extra}}`);
      return id;
    },
  };
}

// 3D Lambertian-shaded interlocking gyroscope (outer silver ring + inner teal ring + core)
const ART = { cols: 40, rows: 18, size: 9.6, frames: 60, loop: 5 };
const RAMP = ".,-~:;=!*#$@";
const LIGHT = (() => {
  const v = [-0.4, 0.78, -1];
  const l = Math.hypot(...v);
  return v.map((x) => x / l);
})();

function rotX(x, y, z, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [x, y * c - z * s, y * s + z * c];
}
function rotY(x, y, z, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [x * c + z * s, y, -x * s + z * c];
}
function rotZ(x, y, z, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [x * c - y * s, x * s + y * c, z];
}

function gyroFrames() {
  const { cols, rows, frames } = ART;
  const aspect = 0.6; // Geist Mono cell width/height ratio
  const K2 = 6.2;
  const K1 = 19.5;
  const out = [];

  for (let f = 0; f < frames; f++) {
    const A = (f / frames) * Math.PI * 2;
    const zbuf = new Float32Array(cols * rows);
    const chars = new Array(cols * rows).fill(" ");
    const tones = new Array(cols * rows).fill("");

    const plot = (x, y, z, nx, ny, nz, pal) => {
      const ooz = 1 / (z + K2);
      const col = Math.round(cols / 2 + (K1 * x * ooz) / aspect);
      const row = Math.round(rows / 2 - K1 * y * ooz);
      if (col < 0 || col >= cols || row < 0 || row >= rows) return;
      const k = row * cols + col;
      if (ooz <= zbuf[k]) return;
      zbuf[k] = ooz;

      const lum = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
      const v = Math.max(0, Math.min(1, ((lum + 1) / 2) ** 1.75));
      const ch = RAMP[Math.min(RAMP.length - 1, Math.floor(v * RAMP.length))];
      chars[k] = ch;
      if (pal === "t") {
        tones[k] = v > 0.58 ? "ah" : v > 0.26 ? "am" : "ad";
      } else {
        tones[k] = v > 0.58 ? "h" : v > 0.26 ? "m" : "d";
      }
    };

    const drawTorus = (R, r, ax, ay, az, pal, uSteps, vSteps) => {
      for (let iu = 0; iu < uSteps; iu++) {
        const u = (iu / uSteps) * Math.PI * 2;
        const cu = Math.cos(u), su = Math.sin(u);
        for (let iv = 0; iv < vSteps; iv++) {
          const v = (iv / vSteps) * Math.PI * 2;
          const cv = Math.cos(v), sv = Math.sin(v);
          let x = (R + r * cv) * cu;
          let y = (R + r * cv) * su;
          let z = r * sv;
          let nx = cv * cu;
          let ny = cv * su;
          let nz = sv;
          [x, y, z] = rotX(x, y, z, ax);
          [nx, ny, nz] = rotX(nx, ny, nz, ax);
          [x, y, z] = rotY(x, y, z, ay);
          [nx, ny, nz] = rotY(nx, ny, nz, ay);
          [x, y, z] = rotZ(x, y, z, az);
          [nx, ny, nz] = rotZ(nx, ny, nz, az);
          plot(x, y, z, nx, ny, nz, pal);
        }
      }
    };

    // Outer monochrome ring (1 full turn per loop, crisp sculpted profile)
    drawTorus(2.02, 0.24, 0.62 + 0.26 * Math.sin(A), A, 0.24 * Math.cos(A), "m", 120, 32);

    // Inner orthogonal teal ring (smooth counter-rotation with clear gap)
    drawTorus(1.24, 0.18, Math.PI / 2 + A, -A + 0.45, 0.38, "t", 96, 28);

    // Shaded central sphere core
    const coreR = 0.34;
    for (let ip = 0; ip < 28; ip++) {
      const phi = -Math.PI / 2 + (ip / 27) * Math.PI;
      const cp = Math.cos(phi), sp = Math.sin(phi);
      for (let it = 0; it < 48; it++) {
        const th = (it / 48) * Math.PI * 2;
        const nx = cp * Math.cos(th);
        const ny = sp;
        const nz = cp * Math.sin(th);
        plot(nx * coreR, ny * coreR, nz * coreR, nx, ny, nz, "m");
      }
    }

    const lines = [];
    for (let r = 0; r < rows; r++) {
      lines.push({
        chars: chars.slice(r * cols, (r + 1) * cols),
        tones: tones.slice(r * cols, (r + 1) * cols),
      });
    }
    out.push(lines);
  }
  return out;
}

const esc = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/·/g, "&#183;")
    .replace(/↓/g, "&#8595;");

function frameText(lines, cls, style) {
  const { size } = ART;
  const adv = size * 0.6;
  let body = "";
  lines.forEach(({ chars, tones }, r) => {
    let first = 0;
    while (first < chars.length && chars[first] === " ") first++;
    let last = chars.length - 1;
    while (last >= first && chars[last] === " ") last--;
    if (first > last) return;

    let runs = "";
    let cur = null;
    let buf = "";
    for (let i = first; i <= last; i++) {
      const ch = chars[i];
      const t = ch === " " ? cur : tones[i];
      if (t !== cur && buf) {
        runs += `<tspan class="${cur}">${esc(buf)}</tspan>`;
        buf = "";
      }
      cur = t;
      buf += ch;
    }
    if (buf) runs += `<tspan class="${cur}">${esc(buf)}</tspan>`;
    body += `<tspan x="${(first * adv).toFixed(1)}" y="${((r + 1) * size - 2).toFixed(1)}">${runs}</tspan>`;
  });
  return `<text class="${cls}"${style ? ` style="${style}"` : ""}>${body}</text>`;
}

function buildHero() {
  const W = 846, H = 378, L = 5, R = 841, TOP = 30;
  const T_TOTAL = 4.2; // crisp, snappy 4.2s intro
  const c = clock(T_TOTAL);
  const C = {
    screen: "#0c0c0e",
    bar: "#151518",
    ink: "#ededed",
    soft: "#a1a1aa",
    dim: "#6b6b73",
    line: "#33333b",
    accent: "#5eead4",
  };

  const mono = (w) =>
    fs
      .readFileSync(
        path.join(HERE, "node_modules", "@fontsource", "geist-mono", "files", `geist-mono-latin-${w}-normal.woff2`)
      )
      .toString("base64");

  const BOX = { x: 24, y: 46, w: 798, h: 248 };
  const DIV = 330;
  const show = (at, from = "translateY(4px)") =>
    c.anim([
      [at, { o: 0, t: from }, "cubic-bezier(.2,.8,.2,1)"],
      [at + 0.22, { o: 1, t: "none" }],
    ]);
  const txt = (x, y, s, fill, size = 13, extra = "") =>
    `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}"${extra}>${esc(s)}</text>`;

  // Spinning 3D ASCII Gyroscope
  const frames = gyroFrames();
  const dt = ART.loop / ART.frames;
  const art = frames
    .map((lines, i) => frameText(lines, i ? "f" : "f f0", `animation-delay:${(-(ART.loop - i * dt)).toFixed(3)}s`))
    .join("");

  const artW = ART.cols * ART.size * 0.6;
  const artH = ART.rows * ART.size;
  const small = 1;
  const big = 1.72;
  const cx = W / 2;
  const cy = (H + 8) / 2;
  const slotX = BOX.x + (DIV - BOX.x) / 2 - (artW * small) / 2;
  const slotY = BOX.y + 39;

  const at = (x, y, s) => `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${s})`;
  const centre = at(cx - (artW * big) / 2, cy - (artH * big) / 2, big);
  const deep = at(cx - (artW * 0.05) / 2, cy - (artH * 0.05) / 2, 0.05);
  const land = at(slotX, slotY, small);

  const gyroAnim = c.anim(
    [
      [0.32, { o: 0, t: deep }, "cubic-bezier(.16,1,.3,1)"],
      [1.35, { o: 1, t: centre }],
      [2.45, { o: 1, t: centre }, "cubic-bezier(.7,0,.25,1)"],
      [3.15, { o: 1, t: land }],
    ],
    "transform-origin:0 0"
  );

  // Subtle ASCII starfield warp intro
  let rnd = 19;
  const rand = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
  let stars = "";
  let starCss = "";
  for (let i = 0; i < 84; i++) {
    const a = rand() * Math.PI * 2;
    const reach = 360 + rand() * 260;
    const dx = Math.cos(a) * reach;
    const dy = Math.sin(a) * reach * 0.62;
    const deg = ((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(0);
    const dur = 0.45 + rand() * 0.5;
    const delay = 0.05 + rand() * dur;
    const streak = i % 3 !== 0;
    const ch = streak ? "-" : [".", "+", "*"][i % 9 === 0 ? 2 : i % 2];
    const end = streak ? "scale(5,1.1)" : "scale(2.3)";
    const fill = i % 11 === 0 ? C.accent : i % 4 ? C.soft : C.ink;
    starCss += `@keyframes w${i}{0%{opacity:0;transform:translate(${cx}px,${cy}px) rotate(${deg}deg) scale(.3)}30%{opacity:1}100%{opacity:0;transform:translate(${(cx + dx).toFixed(0)}px,${(cy + dy).toFixed(0)}px) rotate(${deg}deg) ${end}}}.w${i}{animation:w${i} ${dur.toFixed(2)}s cubic-bezier(.6,0,1,.5) ${delay.toFixed(2)}s ${Math.max(1, Math.ceil((2.35 - delay) / dur))} both}`;
    stars += `<text class="w${i}" font-size="14" text-anchor="middle" fill="${fill}">${ch}</text>`;
  }
  const warp = c.anim([
    [0, { o: 1 }],
    [2.15, { o: 1 }],
    [2.55, { o: 0 }],
  ]);

  // Titlebar chrome
  const chrome = c.anim([
    [2.25, { o: 0 }],
    [2.55, { o: 1 }],
  ]);
  const dots = [0, 1, 2]
    .map((i) => `<circle cx="${L + 20 + i * 18}" cy="15" r="5" fill="#33333b"/>`)
    .join("");
  const titlebar = `<g class="${chrome}"><path d="M${L} 12a12 12 0 0 1 12-12h${R - L - 24}a12 12 0 0 1 12 12v${TOP - 12}H${L}z" fill="${C.bar}"/>${dots}${txt(W / 2, 19.5, "~/Dokuganrryu", C.dim, 12, ' text-anchor="middle"')}</g>`;

  // Self-drawing bordered welcome panel (Claude Code CLI style)
  const label = "Dokuganrryu";
  const labelW = label.length * 13 * 0.6 + 14;
  const panel = `<rect x="${BOX.x}" y="${BOX.y}" width="${BOX.w}" height="${BOX.h}" rx="8" fill="none" stroke="${C.line}" stroke-width="1.2" pathLength="1" class="dr"/>
<g class="${show(2.85, "none")}"><rect x="${BOX.x + 14}" y="${BOX.y - 8}" width="${labelW.toFixed(1)}" height="16" fill="${C.screen}"/>${txt(BOX.x + 21, BOX.y + 4.5, label, C.soft, 13)}</g>
<path d="M${DIV} ${BOX.y + 22}V${BOX.y + BOX.h - 22}" stroke="${C.line}" stroke-width="1.2" class="${show(2.9, "scaleY(0)")}" style="transform-origin:${DIV}px ${BOX.y + BOX.h / 2}px"/>`;

  // Left column
  const leftMid = BOX.x + (DIV - BOX.x) / 2;
  const left = `<g class="${show(3.15)}">${txt(leftMid, BOX.y + 30, "Faris Aljamaan", C.ink, 14.5, ' text-anchor="middle" font-weight="700"')}</g>
<g class="${show(3.25)}">${txt(leftMid, BOX.y + BOX.h - 18, "@Dokuganrryu", C.dim, 12, ' text-anchor="middle"')}</g>`;

  // Right column: airy, minimal, subtle positioning (exact generous spacing)
  const RX = DIV + 24;
  const rows = [
    ["About", "h"],
    ["Builds practical AI-assisted tools,", "b"],
    ["low-level utilities, and network systems.", "b"],
    [null, "rule"],
    ["Focus", "h"],
    ["Applied AI · Coding Agents · Python", "s"],
    [null, "gap"],
    ["Elsewhere", "h"],
    ["linkedin.com/in/faris-aljamaan", "s"],
  ];

  let y = BOX.y + 34;
  let right = "";
  rows.forEach(([s, kind], i) => {
    const when = 3.18 + i * 0.055;
    if (kind === "rule") {
      right += `<path d="M${RX} ${y - 6}H${BOX.x + BOX.w - 24}" stroke="${C.line}" stroke-width="1" class="${show(when, "scaleX(0)")}" style="transform-origin:${RX}px 0"/>`;
      y += 22;
      return;
    }
    if (kind === "gap") {
      y += 8;
      return;
    }
    const fill = kind === "h" ? C.ink : C.soft;
    right += `<g class="${show(when)}">${txt(RX, y, s, fill, 13, kind === "h" ? ' font-weight="700"' : "")}</g>`;
    y += kind === "h" ? 22 : 20;
  });

  // Bottom CLI prompt bar
  const PY = BOX.y + BOX.h + 14;
  const PH = 38;
  const prompt = `<g class="${show(3.75)}"><rect x="${BOX.x}" y="${PY}" width="${BOX.w}" height="${PH}" rx="6" fill="none" stroke="#484852" stroke-width="1.2"/>
${txt(BOX.x + 14, PY + 24, ">", C.accent, 13.5, ' font-weight="700"')}<rect x="${BOX.x + 31}" y="${PY + 12}" width="8" height="16" fill="${C.ink}" class="bl"/>
${txt(BOX.x + 44, PY + 24, 'Try "explore pinned repositories"', C.dim, 13)}</g>
<g class="${show(3.9)}"><circle cx="${BOX.x + 18}" cy="${PY + PH + 14}" r="2.7" fill="${C.accent}" class="dot"/>${txt(BOX.x + 28, PY + PH + 18, "building", C.dim, 11.5)}${txt(BOX.x + BOX.w - 6, PY + PH + 18, "pinned ↓", C.dim, 11.5, ' text-anchor="end"')}</g>`;

  const css = `
@font-face{font-family:GM;font-weight:500;src:url(data:font/woff2;base64,${mono(500)}) format('woff2')}
@font-face{font-family:GM;font-weight:700;src:url(data:font/woff2;base64,${mono(700)}) format('woff2')}
text{font-family:GM,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-weight:500;white-space:pre}
.d{fill:#4c4c54}.m{fill:#9e9ea8}.h{fill:#f4f4f5}
.ad{fill:#134e4a}.am{fill:#2dd4bf}.ah{fill:#5eead4}
.f{font-size:${ART.size}px;opacity:0;animation:fr ${ART.loop}s step-end infinite}.f0{opacity:1}
@keyframes fr{0%{opacity:1}${(100 / ART.frames).toFixed(3)}%{opacity:0}100%{opacity:0}}
.dr{stroke-dasharray:1;animation:dr .75s cubic-bezier(.65,0,.35,1) 2.4s both}@keyframes dr{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
.bl{animation:bl 1.05s steps(1) infinite}@keyframes bl{50%{opacity:0}}
.dot{animation:dt 3.2s ease-in-out infinite}@keyframes dt{0%,100%{opacity:.4}50%{opacity:1}}
${starCss}${c.css()}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.intro{display:none}}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Terminal profile for Faris Aljamaan (@Dokuganrryu). Builds practical AI-assisted tools, low-level utilities, and network systems. Focus: Applied AI, Coding Agents, Python. Elsewhere: linkedin.com/in/faris-aljamaan.">
<title>Faris Aljamaan (@Dokuganrryu)</title>
<defs><clipPath id="win"><rect x="${L}" y="0" width="${R - L}" height="${H - 4}" rx="12"/></clipPath></defs>
<style>${css.replace(/\n/g, "")}</style>
<rect x="${L}" y="0" width="${R - L}" height="${H - 4}" rx="12" fill="${C.screen}" stroke="#24242b" stroke-width="1"/>
<g clip-path="url(#win)">
<g class="intro ${warp}">${stars}</g>
${panel}
<g class="${gyroAnim}" style="transform:${land};transform-origin:0 0">${art}</g>
${titlebar}${left}${right}${prompt}
</g>
</svg>`;
}

const svg = buildHero();
const outPath = path.join(OUT, "hero.svg");
fs.writeFileSync(outPath, svg, "utf8");
console.log(`Generated ${outPath} (${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB)`);
