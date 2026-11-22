import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "assets");
const DATA_PATH = path.join(HERE, "activity.json");
fs.mkdirSync(OUT, { recursive: true });

// Load real GitHub contribution activity (can refresh live via `--fetch` using `gh`)
function loadActivity() {
  if (process.argv.includes("--fetch")) {
    const query = `{ viewer { contributionsCollection { contributionCalendar { totalContributions weeks { firstDay contributionDays { contributionCount } } } } } }`;
    const raw = execSync(`gh api graphql -f query="${query}"`, { encoding: "utf8" });
    const cal = JSON.parse(raw).data.viewer.contributionsCollection.contributionCalendar;
    const weeks = cal.weeks.slice(-26).map((w) => ({
      week: w.firstDay,
      count: w.contributionDays.reduce((s, d) => s + d.contributionCount, 0),
    }));
    const data = { total: cal.totalContributions, weeks };
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
    return data;
  }
  return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
}

const b64 = (pkg, file) =>
  fs
    .readFileSync(path.join(HERE, "node_modules", "@fontsource", pkg, "files", file))
    .toString("base64");

const FONTS = {
  sans400: b64("geist-sans", "geist-sans-latin-400-normal.woff2"),
  sans600: b64("geist-sans", "geist-sans-latin-600-normal.woff2"),
  mono500: b64("geist-mono", "geist-mono-latin-500-normal.woff2"),
};

// Build a seamlessly repeating 2-period smooth SVG wave path over width = 2 * periodW.
// Because y(x + periodW) === y(x), CSS translateX(0 -> -periodW) loops at 60 FPS with zero seam.
function buildPeriodicWave(periodW, baseY, amp, harmonics, closeToY = null) {
  const samples = 96; // 96 samples per period -> 192 across 2 periods
  const totalSamples = samples * 2;
  const pts = [];
  for (let i = 0; i <= totalSamples; i++) {
    const x = (i / samples) * periodW;
    const t = (i / samples) * Math.PI * 2;
    let dy = 0;
    for (const [freq, weight, phase] of harmonics) {
      dy += Math.sin(t * freq + phase) * weight;
    }
    const y = baseY - dy * amp;
    pts.push([x, y]);
  }
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
  }
  if (closeToY !== null) {
    d += ` L ${(periodW * 2).toFixed(1)} ${closeToY} L 0 ${closeToY} Z`;
  }
  return d;
}

const THEMES = {
  dark: {
    id: "dark",
    bgTop: "#0e1117",
    bgBot: "#090b10",
    border: "#21262d",
    tick: "#30363d",
    screenBgTop: "#080a0f",
    screenBgBot: "#06080c",
    screenBorder: "#1d222b",
    divider: "#1f242c",
    dotGrid: "#1c222c",
    reticle: "#1b212b",
    ink: "#f0f6fc",
    body: "#8b949e",
    muted: "#7d8590",
    faint: "#5c6672",
    accent: "#2dd4bf",
    accentSoft: "#14b8a6",
    waveFar: "#1e2632",
    waveMid: "#334155",
    waveNear: "#64748b",
    waveLead: "#cbd5e1",
    barZero: "#1a1f27",
    barLow: "#30363d",
    barMid: "#6e7681",
    barHigh: "#cbd5e1",
    barPeak: "#2dd4bf",
  },
  light: {
    id: "light",
    bgTop: "#ffffff",
    bgBot: "#f6f8fa",
    border: "#d0d7de",
    tick: "#afb8c1",
    screenBgTop: "#f3f6f9",
    screenBgBot: "#eef2f6",
    screenBorder: "#d8dee4",
    divider: "#d8dee4",
    dotGrid: "#d5dde6",
    reticle: "#d0d7de",
    ink: "#1f2328",
    body: "#57606a",
    muted: "#656d76",
    faint: "#8c959f",
    accent: "#0d9488",
    accentSoft: "#0f766e",
    waveFar: "#cbd5e1",
    waveMid: "#94a3b8",
    waveNear: "#64748b",
    waveLead: "#1f2328",
    barZero: "#dde3ea",
    barLow: "#afb8c1",
    barMid: "#656d76",
    barHigh: "#24292f",
    barPeak: "#0d9488",
  },
};

function renderHero(theme, activity) {
  const T = THEMES[theme];
  const W = 846;
  const H = 340;

  // Recessed instrument screen bounds (right column)
  const SX = 472;
  const SY = 28;
  const SW = 342;
  const SH = 284;
  const SIG_H = 182; // top signal field height
  const ACT_Y = SY + SIG_H; // activity spectrum starts here (y = 210)

  // 7 perspective depth-layered harmonic waves (seamless 60 FPS parallax field)
  const waveLayers = [
    {
      y: SY + 72,
      amp: 9,
      harmonics: [[1, 0.7, 0.2], [2, 0.3, 1.4]],
      stroke: T.waveFar,
      sw: 0.9,
      op: 0.55,
      dur: 22,
      dir: "fwd",
      fill: false,
    },
    {
      y: SY + 86,
      amp: 12,
      harmonics: [[1, 0.6, 1.1], [2, 0.4, 0.3], [3, 0.15, 2.1]],
      stroke: T.waveFar,
      sw: 0.95,
      op: 0.72,
      dur: 18,
      dir: "rev",
      fill: false,
    },
    {
      y: SY + 101,
      amp: 15,
      harmonics: [[1, 0.55, 2.3], [2, 0.35, 1.0], [3, 0.2, 0.5]],
      stroke: T.waveMid,
      sw: 1.05,
      op: 0.78,
      dur: 14.5,
      dir: "fwd",
      fill: false,
    },
    {
      y: SY + 116,
      amp: 18,
      harmonics: [[1, 0.55, 0.6], [2, 0.38, 2.6], [3, 0.18, 1.4]],
      stroke: T.waveNear,
      sw: 1.15,
      op: 0.85,
      dur: 11.5,
      dir: "rev",
      fill: false,
    },
    {
      y: SY + 131,
      amp: 21,
      harmonics: [[1, 0.58, 1.9], [2, 0.36, 0.4], [3, 0.16, 2.8]],
      stroke: T.waveLead,
      sw: 1.4,
      op: 0.92,
      dur: 9.2,
      dir: "fwd",
      fill: "mono",
    },
    {
      y: SY + 123,
      amp: 24,
      harmonics: [[1, 0.5, 0.0], [2, 0.42, 1.8], [3, 0.22, 0.7]],
      stroke: T.accent,
      sw: 1.75,
      op: 0.98,
      dur: 7.4,
      dir: "fwd",
      fill: "accent",
    },
  ];

  const wavesSvg = waveLayers
    .map((w, idx) => {
      const strokePath = buildPeriodicWave(SW, w.y, w.amp, w.harmonics);
      const fillPath = w.fill
        ? buildPeriodicWave(SW, w.y, w.amp, w.harmonics, SY + SIG_H + 4)
        : null;
      const cls = w.dir === "fwd" ? `wf${idx}` : `wr${idx}`;
      const fillEl = fillPath
        ? `<path d="${fillPath}" fill="url(#${w.fill === "accent" ? "accentFill" : "monoFill"})"/>`
        : "";
      return `<g transform="translate(${SX},0)"><g class="${cls}">${fillEl}<path d="${strokePath}" fill="none" stroke="${w.stroke}" stroke-width="${w.sw}" stroke-opacity="${w.op}" stroke-linecap="round"/></g></g>`;
    })
    .join("\n      ");

  const waveCss = waveLayers
    .map((w, idx) => {
      const cls = w.dir === "fwd" ? `wf${idx}` : `wr${idx}`;
      const anim = w.dir === "fwd" ? "driftFwd" : "driftRev";
      return `.${cls}{animation:${anim} ${w.dur}s linear infinite}`;
    })
    .join("");

  // 26-week real activity telemetry spectrum bars
  const weeks = activity.weeks.slice(-26);
  const maxCount = Math.max(...weeks.map((w) => w.count), 1);
  const barAreaX = SX + 18;
  const barAreaW = SW - 36; // 306px
  const barCount = weeks.length;
  const slotW = barAreaW / barCount;
  const barW = Math.min(7.2, slotW - 4.2);
  const maxBarH = 44;
  const baselineY = SY + SH - 24; // y = 288

  const barsSvg = weeks
    .map((w, i) => {
      const x = barAreaX + i * slotW + (slotW - barW) / 2;
      // Logarithmic curve so quiet weeks (1-5) stay visible while spikes (74, 228) stand proud
      const norm = w.count === 0 ? 0 : Math.log1p(w.count) / Math.log1p(maxCount);
      const h = w.count === 0 ? 3 : Math.max(5.5, 4 + norm * (maxBarH - 4));
      const y = baselineY - h;

      let fill = T.barZero;
      let cls = "";
      if (w.count >= 50) {
        fill = T.barPeak;
        cls = ` class="pk" style="animation-delay:${(i * 0.12).toFixed(2)}s"`;
      } else if (w.count >= 15) {
        fill = T.barHigh;
      } else if (w.count >= 4) {
        fill = T.barMid;
      } else if (w.count >= 1) {
        fill = T.barLow;
      }
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${fill}"${cls}><title>${w.week}: ${w.count} contributions</title></rect>`;
    })
    .join("\n      ");

  // Corner registration hairlines (subtle industrial precision)
  const ticks = `
    <path d="M 16 24 L 16 16 L 24 16 M ${W - 24} 16 L ${W - 16} 16 L ${W - 16} 24 M 16 ${H - 24} L 16 ${H - 16} L 24 ${H - 16} M ${W - 24} ${H - 16} L ${W - 16} ${H - 16} L ${W - 16} ${H - 24}" fill="none" stroke="${T.tick}" stroke-width="1" stroke-linecap="square" opacity="0.65"/>
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Faris Aljamaan (@Dokuganrryu). Builds practical AI-assisted tools, low-level utilities, and network systems. Focus: Applied AI, Coding Agents, Python. ${activity.total} contributions over the last year.">
  <title>Faris Aljamaan (@Dokuganrryu)</title>
  <defs>
    <linearGradient id="cardBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${T.bgTop}"/>
      <stop offset="100%" stop-color="${T.bgBot}"/>
    </linearGradient>
    <linearGradient id="screenBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${T.screenBgTop}"/>
      <stop offset="100%" stop-color="${T.screenBgBot}"/>
    </linearGradient>
    <linearGradient id="topEdge" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${T.accent}" stop-opacity="0"/>
      <stop offset="48%" stop-color="${T.accent}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${T.accent}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="accentFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${T.accent}" stop-opacity="${theme === "dark" ? "0.18" : "0.14"}"/>
      <stop offset="100%" stop-color="${T.accent}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="monoFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${T.waveLead}" stop-opacity="${theme === "dark" ? "0.08" : "0.06"}"/>
      <stop offset="100%" stop-color="${T.waveLead}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="scanBeam" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${T.accent}" stop-opacity="0"/>
      <stop offset="70%" stop-color="${T.accent}" stop-opacity="${theme === "dark" ? "0.07" : "0.06"}"/>
      <stop offset="100%" stop-color="${T.accent}" stop-opacity="${theme === "dark" ? "0.32" : "0.24"}"/>
    </linearGradient>
    <pattern id="dotGrid" width="16" height="16" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="0.85" fill="${T.dotGrid}"/>
    </pattern>
    <clipPath id="sigClip">
      <rect x="${SX + 1}" y="${SY + 1}" width="${SW - 2}" height="${SIG_H - 1}" rx="9"/>
    </clipPath>
    <clipPath id="cardClip">
      <rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="13"/>
    </clipPath>
  </defs>

  <style>
    @font-face{font-family:GS;font-weight:400;src:url(data:font/woff2;base64,${FONTS.sans400}) format('woff2')}
    @font-face{font-family:GS;font-weight:600;src:url(data:font/woff2;base64,${FONTS.sans600}) format('woff2')}
    @font-face{font-family:GM;font-weight:500;src:url(data:font/woff2;base64,${FONTS.mono500}) format('woff2')}

    .sans { font-family: GS, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; }
    .mono { font-family: GM, ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace; }

    @keyframes driftFwd {
      from { transform: translateX(0px); }
      to   { transform: translateX(-${SW}px); }
    }
    @keyframes driftRev {
      from { transform: translateX(-${SW}px); }
      to   { transform: translateX(0px); }
    }
    @keyframes sweep {
      0%   { transform: translateX(${SX - 44}px); opacity: 0; }
      8%   { opacity: 1; }
      92%  { opacity: 1; }
      100% { transform: translateX(${SX + SW}px); opacity: 0; }
    }
    @keyframes breathe {
      0%, 100% { opacity: 0.45; }
      50%      { opacity: 1; }
    }
    @keyframes peakPulse {
      0%, 100% { opacity: 0.82; }
      50%      { opacity: 1; }
    }

    ${waveCss}
    .scan { animation: sweep 8.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    .dot  { animation: breathe 3s ease-in-out infinite; }
    .pk   { animation: peakPulse 3.6s ease-in-out infinite; }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation: none !important; }
      .scan { opacity: 0; }
    }
  </style>

  <!-- Card frame -->
  <g clip-path="url(#cardClip)">
    <rect x="2" y="2" width="${W - 4}" height="${H - 4}" fill="url(#cardBg)"/>
    <line x1="160" y1="2.5" x2="686" y2="2.5" stroke="url(#topEdge)" stroke-width="1.2"/>
    ${ticks}

    <!-- Left Editorial Column -->
    <g>
      <!-- Status kicker -->
      <circle cx="43" cy="54" r="3" fill="${T.accent}" class="dot"/>
      <text x="54" y="58" class="mono" font-size="11" font-weight="500" fill="${T.muted}" letter-spacing="1.6">DOKUGANRRYU</text>

      <!-- Display name -->
      <text x="38" y="106" class="sans" font-size="33" font-weight="600" fill="${T.ink}" letter-spacing="-0.8">Faris Aljamaan</text>

      <!-- Subtle positioning -->
      <text x="38" y="140" class="sans" font-size="14.5" font-weight="400" fill="${T.body}">Builds practical AI-assisted tools,</text>
      <text x="38" y="162" class="sans" font-size="14.5" font-weight="400" fill="${T.body}">low-level utilities, and network systems.</text>

      <!-- Hairline separator -->
      <line x1="38" y1="192" x2="436" y2="192" stroke="${T.divider}" stroke-width="1"/>

      <!-- Focus -->
      <text x="38" y="220" class="mono" font-size="10" font-weight="500" fill="${T.muted}" letter-spacing="1.5">FOCUS</text>
      <text x="38" y="241" class="mono" font-size="12.5" font-weight="500" fill="${T.ink}">Applied AI <tspan fill="${T.faint}">&#183;</tspan> Coding Agents <tspan fill="${T.faint}">&#183;</tspan> Python</text>

      <!-- Elsewhere -->
      <text x="38" y="276" class="mono" font-size="10" font-weight="500" fill="${T.muted}" letter-spacing="1.5">ELSEWHERE</text>
      <text x="38" y="297" class="mono" font-size="12.5" font-weight="500" fill="${T.body}">linkedin.com/in/faris-aljamaan</text>
    </g>

    <!-- Right Recessed Telemetry Deck -->
    <g>
      <rect x="${SX}" y="${SY}" width="${SW}" height="${SH}" rx="10" fill="url(#screenBg)" stroke="${T.screenBorder}" stroke-width="1"/>

      <!-- Top half: 60 FPS Layered Harmonic Signal Field -->
      <g clip-path="url(#sigClip)">
        <rect x="${SX}" y="${SY}" width="${SW}" height="${SIG_H}" fill="url(#dotGrid)"/>
        <!-- Subtle horizontal horizon reticle -->
        <line x1="${SX + 14}" y1="${SY + 114}" x2="${SX + SW - 14}" y2="${SY + 114}" stroke="${T.reticle}" stroke-width="1" stroke-dasharray="2 4"/>

        <!-- Parallax flowing 3D harmonic waves -->
        ${wavesSvg}

        <!-- Sweeping telemetry scanline -->
        <rect x="0" y="${SY}" width="44" height="${SIG_H}" fill="url(#scanBeam)" class="scan"/>

        <!-- Micro viewport labels -->
        <text x="${SX + 16}" y="${SY + 22}" class="mono" font-size="9.5" font-weight="500" fill="${T.faint}" letter-spacing="1.2">SIGNAL // 01</text>
        <text x="${SX + SW - 16}" y="${SY + 22}" class="mono" font-size="9.5" font-weight="500" fill="${T.faint}" letter-spacing="1" text-anchor="end">AI &#183; NET &#183; SYS</text>
      </g>

      <!-- Internal divider between signal field and activity spectrum -->
      <line x1="${SX + 1}" y1="${ACT_Y}" x2="${SX + SW - 1}" y2="${ACT_Y}" stroke="${T.divider}" stroke-width="1"/>

      <!-- Bottom half: Real 26-Week Contribution Rhythm -->
      <text x="${SX + 16}" y="${ACT_Y + 21}" class="mono" font-size="9.5" font-weight="500" fill="${T.muted}" letter-spacing="1.1">ACTIVITY &#183; 26W</text>
      <text x="${SX + SW - 16}" y="${ACT_Y + 21}" class="mono" font-size="10.5" font-weight="500" fill="${T.ink}" text-anchor="end">${activity.total} <tspan font-size="9.5" fill="${T.muted}">/ yr</tspan></text>

      <!-- 26 real weekly contribution bars -->
      ${barsSvg}

      <!-- Timeline axis labels -->
      <text x="${SX + 18}" y="${SY + SH - 9}" class="mono" font-size="8.5" font-weight="500" fill="${T.faint}">6m ago</text>
      <text x="${SX + SW - 18}" y="${SY + SH - 9}" class="mono" font-size="8.5" font-weight="500" fill="${T.faint}" text-anchor="end">now</text>
    </g>
  </g>

  <!-- Crisp outer border -->
  <rect x="2.5" y="2.5" width="${W - 5}" height="${H - 5}" rx="12.5" fill="none" stroke="${T.border}" stroke-width="1"/>
</svg>
`;
}

const activity = loadActivity();
for (const mode of ["dark", "light"]) {
  const svg = renderHero(mode, activity);
  const out = path.join(OUT, `hero-${mode}.svg`);
  fs.writeFileSync(out, svg, "utf8");
  console.log(`Generated ${out} (${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB)`);
}
