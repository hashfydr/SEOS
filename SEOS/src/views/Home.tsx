import { useEffect, useRef, useState } from 'react';
import { Logo, LogoMark } from '../components/Logo';

interface Props {
  onEnter: () => void;
}

// ─── Strata: each project artifact is a layer resting on the one above ───

const STRATA = [
  { label: 'Idea', note: 'plain-language concept', fill: '#ebdfc8', ink: '#5b4a36' },
  { label: 'Requirements', note: 'functional · non-functional', fill: '#dcc6a1', ink: '#4f3f2c' },
  { label: 'User Stories', note: 'traced to REQ ids', fill: '#c9a576', ink: '#3f3122' },
  { label: 'System Model', note: 'UML · ER entities', fill: '#b47a50', ink: '#fbf3e6' },
  { label: 'Architecture', note: 'patterns · trade-offs', fill: '#8c5a3d', ink: '#f6ead8' },
  { label: 'OpenAPI 3.1', note: 'endpoints from entities', fill: '#5e4a3d', ink: '#efe2cf' },
  { label: 'SRS · SDD · README', note: 'living documentation', fill: '#352d27', ink: '#e9dcc7' },
];

const W = 520;
const H = 540;
const TOP = 34;
const BAND = 70;

/**
 * Top boundary of layer i. `amp` (0–1) blends in a travelling wave at time `t`
 * (seconds) on top of the layer's resting shape.
 */
function strataCurve(i: number, t = 0, amp = 0) {
  const base = TOP + i * BAND;
  const pts: [number, number][] = [];
  for (let x = 0; x <= W; x += 20) {
    const rest =
      7 * Math.sin(x / 74 + i * 1.7) +
      3.5 * Math.sin(x / 19 + i * 2.3) +
      (x / W) * (i % 2 ? 6 : -4);
    const wave = amp
      ? amp * (10 * Math.sin(x / 52 - t * 2.6 + i * 0.9) + 3.4 * Math.sin(x / 22 - t * 3.9 + i * 1.3))
      : 0;
    pts.push([x, base + rest + wave]);
  }
  let d = `M0,${H} L${pts[0][0]},${pts[0][1].toFixed(1)}`;
  for (let k = 1; k < pts.length; k++) {
    const [px, py] = pts[k - 1];
    const [x, y] = pts[k];
    d += ` Q${px},${py.toFixed(1)} ${((px + x) / 2).toFixed(1)},${((py + y) / 2).toFixed(1)}`;
  }
  d += ` L${W},${pts[pts.length - 1][1].toFixed(1)} L${W},${H} Z`;
  return d;
}

// How strongly a layer ripples when `hovered` is under the pointer:
// the hovered layer fully, its neighbours less, the rest barely.
const rippleTarget = (i: number, hovered: number | null) =>
  hovered === null ? 0 : Math.max(0, 1 - Math.abs(i - hovered) * 0.5);

function StrataFigure() {
  const [hovered, setHovered] = useState<number | null>(null);
  const hoveredRef = useRef<number | null>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const amps = useRef(STRATA.map(() => 0));
  const frame = useRef<number | null>(null);

  // Only touches refs, so a fresh closure per render is harmless
  function tick(now: number) {
    const t = now / 1000;
    let moving = false;
    amps.current = amps.current.map((a, i) => {
      // Ease toward the target so waves swell in and settle out
      const next = a + (rippleTarget(i, hoveredRef.current) - a) * 0.06;
      const settled = Math.abs(next) < 0.002 && hoveredRef.current === null;
      if (!settled) moving = true;
      const amp = settled ? 0 : next;
      const d = strataCurve(i, t, amp);
      pathRefs.current[i * 2]?.setAttribute('d', d);
      pathRefs.current[i * 2 + 1]?.setAttribute('d', d);
      return amp;
    });
    frame.current = moving ? requestAnimationFrame(tick) : null;
  }

  const hover = (i: number | null) => {
    hoveredRef.current = i;
    setHovered(i);
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion && frame.current === null) frame.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      role="img"
      aria-label="Cross-section of rock strata, one layer per SEOS artifact"
      onMouseLeave={() => hover(null)}
    >
      <defs>
        <clipPath id="strata-clip">
          <rect x="0" y="0" width={W} height={H} rx="6" />
        </clipPath>
        <pattern id="speckle" width="9" height="9" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="3" r="0.7" fill="#000" opacity="0.12" />
          <circle cx="7" cy="7" r="0.5" fill="#fff" opacity="0.12" />
        </pattern>
      </defs>
      <g clipPath="url(#strata-clip)">
        <rect width={W} height={H} fill="#f3ebdd" />
        {STRATA.map((s, i) => (
          <g
            key={s.label}
            className="animate-rise"
            style={{ animationDelay: `${120 + i * 90}ms` }}
            onMouseEnter={() => hover(i)}
          >
            <path ref={(el) => { pathRefs.current[i * 2] = el; }} d={strataCurve(i)} fill={s.fill} />
            <path ref={(el) => { pathRefs.current[i * 2 + 1] = el; }} d={strataCurve(i)} fill="url(#speckle)" />
          </g>
        ))}
        {/* Labels sit above every layer so a rising wave never covers them */}
        {STRATA.map((s, i) => (
          <g
            key={`label-${s.label}`}
            className="animate-rise"
            pointerEvents="none"
            style={{ animationDelay: `${120 + i * 90}ms` }}
          >
            <g
              style={{
                transform: `translateX(${hovered === i ? 8 : 0}px)`,
                transition: 'transform 0.45s cubic-bezier(.2,.7,.2,1)',
              }}
            >
              <text x="22" y={TOP + i * BAND + 34} fill={s.ink} fontFamily="Fraunces, Georgia, serif" fontSize="19">
                {s.label}
              </text>
              <text x="22" y={TOP + i * BAND + 53} fill={s.ink} opacity="0.75" fontFamily="JetBrains Mono, monospace" fontSize="10.5" letterSpacing="0.04em">
                {String(i + 1).padStart(2, '0')} — {s.note}
              </text>
            </g>
          </g>
        ))}
      </g>
      <rect x="0.5" y="0.5" width={W - 1} height={H - 1} rx="6" fill="none" stroke="#2a2420" strokeOpacity="0.18" />
    </svg>
  );
}

// ─── Topographic contours for the closing band ───

function Contours() {
  const rings = Array.from({ length: 11 }, (_, k) => 40 + k * 34);
  const ring = (R: number, k: number) => {
    let d = '';
    for (let a = 0; a <= 72; a++) {
      const t = (a / 72) * Math.PI * 2;
      const r = R * (1 + 0.13 * Math.sin(3 * t + k * 0.35) + 0.06 * Math.sin(5 * t - k * 0.2));
      const x = 600 + r * Math.cos(t) * 1.45;
      const y = 200 + r * Math.sin(t);
      d += `${a ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)} `;
    }
    return d + 'Z';
  };
  return (
    <svg viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full" aria-hidden="true">
      {rings.map((R, k) => (
        <path key={R} d={ring(R, k)} fill="none" stroke="#d8c3a0" strokeOpacity={0.07 + (k % 4 === 0 ? 0.08 : 0)} strokeWidth="1" />
      ))}
    </svg>
  );
}

// ─── Content ───

const MODULES = [
  { name: 'Requirements Engineer', body: 'Turn a loose concept into prioritised functional and non-functional requirements, each with an id and an approval state.' },
  { name: 'User Stories', body: 'Agile stories derived from approved requirements, with acceptance criteria and a direct link back to their source.' },
  { name: 'System Modeling', body: 'A drag-and-drop canvas for entities, actors and services — keys, fields and cardinalities included, with undo history.' },
  { name: 'Architecture', body: 'Pattern recommendations matched to scale, a component and tech-stack map, and the honest trade-offs behind each choice.' },
  { name: 'API Designer', body: 'OpenAPI 3.1 specifications generated from your domain model, ready to read, copy and hand to a backend team.' },
  { name: 'Documentation', body: 'SRS, SDD and README kept in step with everything above, instead of written once and left to drift.' },
  { name: 'Learning Dashboard', body: 'The engineering concepts behind each decision — REST, SOLID, DDD, event sourcing — with a curated reading list.' },
];

const STEPS = [
  { title: 'Describe the idea', body: 'Write what you want to build in a sentence or a page, in the workspace or straight into the assistant.' },
  { title: 'Every layer is laid down', body: 'The assistant fills requirements, stories, models, architecture, API and docs in one pass, all from the same project model.' },
  { title: 'Refine and approve', body: 'Edit any layer by hand or by asking. Approve what holds up; reject what doesn’t. The rest stays consistent.' },
];

export default function Home({ onEnter }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const jump = (id: string) =>
    scroller.current?.querySelector(`#${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div ref={scroller} className="h-full overflow-y-auto bg-rock-chalk text-rock-basalt">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-rock-basalt/10 bg-rock-chalk/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 h-16 flex items-center justify-between">
          <button onClick={() => jump('top')} aria-label="SEOS — back to top">
            <Logo size={34} />
          </button>
          <nav className="hidden md:flex items-center gap-8 text-[13px] text-rock-granite">
            <button onClick={() => jump('why')} className="hover:text-rock-clay transition-colors">Why SEOS</button>
            <button onClick={() => jump('modules')} className="hover:text-rock-clay transition-colors">Modules</button>
            <button onClick={() => jump('how')} className="hover:text-rock-clay transition-colors">How it works</button>
          </nav>
          <button
            onClick={onEnter}
            className="shrink-0 rounded-md bg-rock-basalt px-4 py-2 text-[13px] font-medium text-rock-chalk hover:bg-rock-clay transition-colors"
          >
            Open workspace
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section id="top" className="rock-grain relative">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28 grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-14 lg:gap-16 items-center">
          <div>
            <p className="animate-rise font-mono text-[11px] uppercase tracking-[0.18em] text-rock-clay">
              Software Engineering Operating System
            </p>
            <h1 className="animate-rise mt-5 font-display text-[42px] leading-[1.04] sm:text-6xl lg:text-[52px] 2xl:text-[66px] tracking-[-0.02em]" style={{ animationDelay: '80ms' }}>
              Build on bedrock,
              <br />
              <span className="italic text-rock-clay">not loose gravel.</span>
            </h1>
            <p className="animate-rise mt-7 max-w-xl text-[16px] leading-relaxed text-rock-granite" style={{ animationDelay: '160ms' }}>
              SEOS keeps requirements, user stories, system models, architecture, API specs and documentation in one
              connected project model. Describe an idea once — every layer is derived from the one beneath it, and stays that way.
            </p>
            <div className="animate-rise mt-9 flex flex-wrap items-center gap-3" style={{ animationDelay: '240ms' }}>
              <button
                onClick={onEnter}
                className="group inline-flex items-center gap-2 rounded-md bg-rock-clay px-6 py-3.5 text-[15px] font-medium text-rock-chalk shadow-[0_1px_0_rgba(0,0,0,0.15)] hover:bg-[#8f4424] transition-colors"
              >
                Enter the workspace
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </button>
              <button
                onClick={() => jump('how')}
                className="rounded-md border border-rock-basalt/20 px-6 py-3.5 text-[15px] text-rock-shale hover:border-rock-basalt/50 transition-colors"
              >
                See how it works
              </button>
            </div>
            <dl className="animate-rise mt-12 grid grid-cols-3 max-w-md border-t border-rock-basalt/15 pt-6" style={{ animationDelay: '320ms' }}>
              {[
                ['7', 'connected modules'],
                ['3', 'AI providers'],
                ['1', 'source of truth'],
              ].map(([n, l]) => (
                <div key={l}>
                  <dt className="font-display text-3xl">{n}</dt>
                  <dd className="mt-1 text-[12px] text-rock-flint">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <figure className="relative">
            <div className="pointer-events-none absolute -inset-3 rounded-lg border border-rock-basalt/10" aria-hidden="true" />
            <StrataFigure />
            <figcaption className="mt-3 flex justify-between font-mono text-[10.5px] tracking-wide text-rock-flint">
              <span>FIG. 1 — PROJECT CROSS-SECTION</span>
              <span>SURFACE → BEDROCK</span>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ── Why ── */}
      <section id="why" className="rock-grain-dark bg-rock-basalt text-rock-limestone scroll-mt-16">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-20 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-12 lg:gap-20">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-rock-ochre">The problem</p>
              <h2 className="mt-4 font-display text-4xl sm:text-5xl leading-[1.08] tracking-tight">
                Most projects are a pile of disconnected artifacts.
              </h2>
            </div>
            <div className="space-y-8 text-[15px] leading-relaxed text-rock-sandstone">
              <p>
                Requirements live in a document. Diagrams live in another tool. The API spec is written a month later and
                quietly drifts. By the time the README is updated, nobody remembers which requirement a given endpoint
                was supposed to satisfy.
              </p>
              <div className="grid sm:grid-cols-2 gap-px bg-rock-limestone/10 rounded-md overflow-hidden">
                <div className="bg-rock-shale p-6">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-rock-flint">Usually</p>
                  <ul className="mt-4 space-y-2.5 text-rock-sandstone/80">
                    <li>— Separate tools per phase</li>
                    <li>— Manual copy between them</li>
                    <li>— Docs written once, then stale</li>
                    <li>— No trace from story to requirement</li>
                  </ul>
                </div>
                <div className="bg-rock-shale p-6">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-rock-lichen">With SEOS</p>
                  <ul className="mt-4 space-y-2.5 text-rock-limestone">
                    <li>— One project model, every phase</li>
                    <li>— Layers derived, not re-typed</li>
                    <li>— Docs regenerate with the design</li>
                    <li>— Every story links its REQ id</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Modules ── */}
      <section id="modules" className="bg-rock-limestone scroll-mt-16">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-20 lg:py-28">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-rock-clay">Modules</p>
              <h2 className="mt-4 font-display text-4xl sm:text-5xl tracking-tight">Seven layers, one survey.</h2>
            </div>
            <p className="max-w-sm text-[14px] leading-relaxed text-rock-granite">
              Each module reads from and writes to the same store, so a change in one is visible in the rest.
            </p>
          </div>

          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-rock-basalt/15">
            {MODULES.map((m, i) => (
              <article
                key={m.name}
                className="group border-r border-b border-rock-basalt/15 p-7 lg:p-8 hover:bg-rock-chalk transition-colors"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[11px] tracking-widest text-rock-flint">No. {String(i + 1).padStart(2, '0')}</span>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: STRATA[i].fill, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.15)' }} />
                </div>
                <h3 className="mt-6 font-display text-2xl tracking-tight group-hover:text-rock-clay transition-colors">{m.name}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-rock-granite">{m.body}</p>
              </article>
            ))}
            <article className="border-r border-b border-rock-basalt/15 p-7 lg:p-8 bg-rock-clay text-rock-chalk flex flex-col justify-between min-h-[200px]">
              <span className="font-mono text-[11px] tracking-widest opacity-80">Plus</span>
              <div>
                <h3 className="font-display text-2xl tracking-tight">An assistant that edits the project, not just talks about it.</h3>
                <button onClick={onEnter} className="mt-5 text-[14px] underline underline-offset-4 decoration-rock-chalk/40 hover:decoration-rock-chalk">
                  Try it →
                </button>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="rock-grain bg-rock-chalk scroll-mt-16">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-20 lg:py-28">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-rock-clay">How it works</p>
          <h2 className="mt-4 font-display text-4xl sm:text-5xl tracking-tight max-w-2xl">From a sentence to a specified system.</h2>

          <ol className="mt-14 grid md:grid-cols-3 gap-10 md:gap-8">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative pt-8 border-t-2 border-rock-basalt">
                <span className="absolute -top-[13px] left-0 bg-rock-chalk pr-3 font-display text-lg italic text-rock-clay">
                  {['i.', 'ii.', 'iii.'][i]}
                </span>
                <h3 className="font-display text-2xl tracking-tight">{s.title}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-rock-granite">{s.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-16 rounded-md border border-rock-basalt/15 bg-rock-limestone/60 p-6 sm:p-8 grid sm:grid-cols-[auto_1fr] gap-6 items-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-rock-flint">Works with</p>
            <div className="flex flex-wrap gap-2 text-[13px]">
              {['Google Gemini', 'OpenAI', 'Anthropic Claude', 'React', 'TypeScript', 'Zustand', 'OpenAPI 3.1'].map((t) => (
                <span key={t} className="rounded-full border border-rock-basalt/15 bg-rock-chalk px-3.5 py-1.5 text-rock-shale">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section className="relative overflow-hidden bg-rock-shale text-rock-limestone">
        <Contours />
        <div className="relative mx-auto max-w-6xl px-5 sm:px-8 py-24 lg:py-32 text-center">
          <div className="mb-8 flex justify-center"><LogoMark size={72} tone="dark" /></div>
          <h2 className="font-display text-4xl sm:text-6xl tracking-tight">Start with an idea.</h2>
          <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-rock-sandstone">
            Bring an API key for Gemini, OpenAI or Claude, describe what you want to build, and watch the layers settle.
          </p>
          <button
            onClick={onEnter}
            className="mt-10 inline-flex items-center gap-2 rounded-md bg-rock-ember px-7 py-3.5 text-[15px] font-medium text-rock-basalt hover:bg-rock-sandstone transition-colors"
          >
            Enter the workspace →
          </button>
        </div>
      </section>

      <footer className="bg-rock-basalt text-rock-flint">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-8 flex flex-wrap items-center justify-between gap-4 text-[12px]">
          <Logo size={28} tone="dark" className="text-rock-sandstone" />
          <span>Software Engineering Operating System</span>
        </div>
      </footer>
    </div>
  );
}

