import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertTriangle, ShieldCheck } from 'lucide-react';
import { login } from '../services/api';
import './LoginPage.css';

/* ══════════════════════════════════════════════
   BACKGROUND — sinais analíticos interativos
   ══════════════════════════════════════════════ */
const W = 1400;
const H = 900;

function buildSignalPoints(baseY, amplitude, freq, phase, pts = 160) {
  const points = [];
  for (let i = 0; i <= pts; i++) {
    const x = (i / pts) * W;
    const noise =
      Math.sin(i * 0.43 + phase) * amplitude * 0.3 +
      Math.sin(i * 0.17 + phase * 1.7) * amplitude * 0.2;
    const y = baseY + Math.sin((i / pts) * Math.PI * 2 * freq + phase) * amplitude + noise;
    points.push({ x, y });
  }
  return points;
}

function pointsToPath(pts) {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(2)}`).join(' ');
}

const SIGNAL_DEFS = [
  { baseY: 180, amplitude: 40, freq: 1.8, phase: 0,   baseOpacity: 0.22, color: 'brand', delay: '0s',   dur: '18s', width: 1.6 },
  { baseY: 320, amplitude: 30, freq: 2.4, phase: 1.1, baseOpacity: 0.18, color: 'white', delay: '-4s',  dur: '22s', width: 1.2 },
  { baseY: 460, amplitude: 50, freq: 1.2, phase: 2.3, baseOpacity: 0.25, color: 'brand', delay: '-8s',  dur: '15s', width: 2.0 },
  { baseY: 580, amplitude: 28, freq: 3.0, phase: 0.7, baseOpacity: 0.15, color: 'white', delay: '-12s', dur: '26s', width: 1.0 },
  { baseY: 710, amplitude: 38, freq: 1.5, phase: 3.5, baseOpacity: 0.20, color: 'brand', delay: '-3s',  dur: '20s', width: 1.4 },
];

const SIGNALS = SIGNAL_DEFS.map(s => ({
  ...s,
  points: buildSignalPoints(s.baseY, s.amplitude, s.freq, s.phase),
  path:   pointsToPath(buildSignalPoints(s.baseY, s.amplitude, s.freq, s.phase)),
}));

const DATA_POINTS = Array.from({ length: 36 }, (_, i) => ({
  id: i,
  cx: (i * 157 + 80) % (W - 60) + 30,
  cy: (i * 113 + 120) % (H - 80) + 40,
  r:  1.8 + (i % 4) * 0.9,
  delay: `${(i * 0.37) % 4}s`,
  dur:   `${4 + (i % 5)}s`,
}));

const CONNECTIONS = DATA_POINTS.reduce((acc, a, i) => {
  DATA_POINTS.slice(i + 1).forEach(b => {
    const d = Math.hypot(a.cx - b.cx, a.cy - b.cy);
    if (d < 200 && acc.length < 32) {
      acc.push({ x1: a.cx, y1: a.cy, x2: b.cx, y2: b.cy, alpha: 1 - d / 200 });
    }
  });
  return acc;
}, []);

const BAR_DATA  = [42, 67, 55, 80, 63, 91, 74, 58, 85, 70, 48, 95];
const LINE_DATA = [30, 55, 42, 70, 58, 85, 65, 78, 60, 90];

function proxFactor(svgX, svgY, mouseNorm) {
  if (!mouseNorm) return 0;
  const dist = Math.hypot(svgX - mouseNorm.x * W, svgY - mouseNorm.y * H);
  return Math.max(0, 1 - dist / 340);
}

function AnalyticBackground({ parallax, mouseNorm }) {
  return (
    <svg
      className="login-bg-svg"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sig-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="var(--brand-500)" stopOpacity="0" />
          <stop offset="25%"  stopColor="var(--brand-500)" stopOpacity="1" />
          <stop offset="75%"  stopColor="var(--brand-500)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--brand-500)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sig-grad2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="rgba(255,255,255,0)" />
          <stop offset="25%"  stopColor="rgba(255,255,255,0.75)" />
          <stop offset="75%"  stopColor="rgba(255,255,255,0.75)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <filter id="glow-brand" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow-white" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Grade pontilhada */}
      <g style={{ transform: `translate(${parallax.x * 0.18}px, ${parallax.y * 0.12}px)`, transition: 'transform 0.8s ease-out' }}>
        {Array.from({ length: 20 }, (_, col) =>
          Array.from({ length: 13 }, (_, row) => {
            const gx = col * 74 + 20;
            const gy = row * 72 + 20;
            const p  = proxFactor(gx, gy, mouseNorm);
            return (
              <circle key={`${col}-${row}`} cx={gx} cy={gy}
                r={0.8 + p * 1.6} fill="white"
                fillOpacity={0.09 + p * 0.32}
                style={{ transition: 'r 0.3s, fill-opacity 0.3s' }} />
            );
          })
        )}
      </g>

      {/* Conexoes */}
      <g style={{ transform: `translate(${parallax.x * 0.22}px, ${parallax.y * 0.16}px)`, transition: 'transform 0.9s ease-out' }}>
        {CONNECTIONS.map((c, i) => {
          const mx = (c.x1 + c.x2) / 2;
          const my = (c.y1 + c.y2) / 2;
          const p  = proxFactor(mx, my, mouseNorm);
          return (
            <line key={i} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
              stroke="white"
              strokeOpacity={c.alpha * 0.20 + p * 0.50}
              strokeWidth={0.8 + p * 1.8}
              style={{ transition: 'stroke-opacity 0.3s, stroke-width 0.3s' }} />
          );
        })}
      </g>

      {/* Pontos de dados */}
      <g style={{ transform: `translate(${parallax.x * 0.28}px, ${parallax.y * 0.20}px)`, transition: 'transform 1s ease-out' }}>
        {DATA_POINTS.map(pt => {
          const p = proxFactor(pt.cx, pt.cy, mouseNorm);
          return (
            <circle key={pt.id} cx={pt.cx} cy={pt.cy}
              r={pt.r + p * 4} fill="white"
              fillOpacity={0.24 + p * 0.58}
              filter={p > 0.25 ? 'url(#glow-white)' : undefined}
              className="bg-data-point"
              style={{ animationDelay: pt.delay, animationDuration: pt.dur, transition: 'r 0.25s, fill-opacity 0.25s' }} />
          );
        })}
      </g>

      {/* Linhas de sinal */}
      <g style={{ transform: `translate(${parallax.x * 0.09}px, ${parallax.y * 0.07}px)`, transition: 'transform 1.2s ease-out' }}>
        {SIGNALS.map((s, i) => {
          const midPt = s.points[Math.floor(s.points.length / 2)];
          const p     = proxFactor(midPt.x, midPt.y, mouseNorm);
          return (
            <path key={i} d={s.path}
              stroke={s.color === 'brand' ? 'url(#sig-grad)' : 'url(#sig-grad2)'}
              strokeWidth={s.width + p * 2.8}
              strokeOpacity={s.baseOpacity + p * 0.60}
              fill="none"
              filter={p > 0.22 ? (s.color === 'brand' ? 'url(#glow-brand)' : 'url(#glow-white)') : undefined}
              className="bg-signal"
              style={{ animationDelay: s.delay, animationDuration: s.dur, transition: 'stroke-opacity 0.3s, stroke-width 0.3s' }} />
          );
        })}
      </g>

      {/* Mini grafico de barras (canto inferior esquerdo) */}
      <g style={{ transform: `translate(${60 + parallax.x * 0.12}px, ${H - 145 + parallax.y * 0.08}px)`, transition: 'transform 1s ease-out' }}>
        <line x1="0" y1="90" x2={BAR_DATA.length * 22 + 10} y2="90"
          stroke="white" strokeOpacity="0.25" strokeWidth="0.8" />
        {BAR_DATA.map((v, i) => {
          const barH = (v / 100) * 82;
          const bx   = 60 + i * 22;
          const by   = H - 145 + 90 - barH / 2;
          const p    = proxFactor(bx, by, mouseNorm);
          return (
            <rect key={i} x={i * 22} y={90 - barH} width="14" height={barH} rx="2"
              fill={i % 3 === 0 ? 'var(--brand-500)' : 'white'}
              fillOpacity={0.28 + p * 0.52}
              style={{ transition: 'fill-opacity 0.3s' }} />
          );
        })}
        <text x="0" y="106" fill="white" fillOpacity="0.22" fontSize="9" fontFamily="var(--font)">ANALYTICS</text>
      </g>

      {/* Mini grafico de linha (canto superior direito) */}
      <g style={{ transform: `translate(${W - 210 + parallax.x * 0.10}px, ${44 + parallax.y * 0.06}px)`, transition: 'transform 1.1s ease-out' }}>
        {(() => {
          const sx = 18;
          const sy = 0.68;
          const mkPts = (d) => d.map((v, i) => `${i * sx},${90 - v * sy}`).join(' ');
          return (
            <>
              <polygon
                points={`0,90 ${mkPts(LINE_DATA)} ${(LINE_DATA.length - 1) * sx},90`}
                fill="url(#sig-grad)" fillOpacity="0.08" />
              <polyline
                points={mkPts(LINE_DATA)}
                fill="none" stroke="url(#sig-grad)" strokeWidth="2"
                strokeOpacity="0.85" strokeLinejoin="round" strokeLinecap="round" />
              {LINE_DATA.map((v, i) => {
                const px2 = W - 210 + i * sx;
                const py2 = 44 + 90 - v * sy;
                const p   = proxFactor(px2, py2, mouseNorm);
                return (
                  <circle key={i} cx={i * sx} cy={90 - v * sy}
                    r={2 + p * 2.5} fill="var(--brand-500)"
                    fillOpacity={0.75 + p * 0.25}
                    style={{ transition: 'r 0.25s, fill-opacity 0.25s' }} />
                );
              })}
              <text x="0" y="105" fill="white" fillOpacity="0.22" fontSize="9" fontFamily="var(--font)">PERFORMANCE</text>
            </>
          );
        })()}
      </g>
    </svg>
  );
}

/* ══════════════════════════════════════════════
   ÍCONE SVG — DataLens
   ══════════════════════════════════════════════ */
function DataLensIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9"   stroke="white" strokeWidth="1.5" strokeOpacity="0.5" />
      <circle cx="12" cy="12" r="5.5" stroke="white" strokeWidth="1.5" strokeOpacity="0.8" />
      <circle cx="12" cy="12" r="2"   fill="white" />
      <line x1="12" y1="1"    x2="12" y2="4.5"  stroke="white" strokeWidth="1.2" strokeOpacity="0.4" />
      <line x1="12" y1="19.5" x2="12" y2="23"   stroke="white" strokeWidth="1.2" strokeOpacity="0.4" />
      <line x1="1"  y1="12"   x2="4.5"  y2="12" stroke="white" strokeWidth="1.2" strokeOpacity="0.4" />
      <line x1="19.5" y1="12" x2="23" y2="12"   stroke="white" strokeWidth="1.2" strokeOpacity="0.4" />
    </svg>
  );
}

/* ══════════════════════════════════════════════
   COMPONENTE PRINCIPAL — LoginPage
   ══════════════════════════════════════════════ */
export default function LoginPage() {
  const navigate = useNavigate();

  /* Estados do formulário */
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [errors, setErrors]       = useState({ email: '', password: '' });

  /* Parallax + posição normalizada do mouse */
  const [parallax, setParallax]   = useState({ x: 0, y: 0 });
  const [mouseNorm, setMouseNorm] = useState(null);
  const rootRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    setParallax({
      x: ((relX - rect.width  / 2) / rect.width)  * 28,
      y: ((relY - rect.height / 2) / rect.height) * 18,
    });
    setMouseNorm({ x: relX / rect.width, y: relY / rect.height });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setParallax({ x: 0, y: 0 });
    setMouseNorm(null);
  }, []);

  /* Validação */
  const validateEmail = (v) => {
    if (!v) return 'E-mail é obrigatório.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Informe um e-mail corporativo válido.';
    return '';
  };
  const validatePassword = (v) => (!v ? 'Senha é obrigatória.' : '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    if (eErr || pErr) { setErrors({ email: eErr, password: pErr }); return; }
    setErrors({ email: '', password: '' });
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setAuthError(err.message || 'Não foi possível entrar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="login-root"
      ref={rootRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background interativo */}
      <AnalyticBackground parallax={parallax} mouseNorm={mouseNorm} />

      {/* Card de login */}
      <div className="login-card" role="main">
        <div className="login-card__header">
          <div className="login-card__logo-mark"><DataLensIcon size={18} /></div>
          <h1 className="login-card__title">DataLens</h1>
          <p className="login-card__subtitle">Acesse sua conta corporativa para continuar.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {authError && (
            <div className="login-error-banner" role="alert">
              <AlertTriangle size={14} className="login-error-banner__icon" />
              <div className="login-error-banner__text">
                <strong>Acesso negado</strong>
                {authError}
              </div>
            </div>
          )}

          {/* E-mail */}
          <div className={`form-field${errors.email ? ' form-field--error' : ''}`}>
            <label className="form-field__label" htmlFor="login-email">E-mail corporativo</label>
            <div className="form-field__input-wrap">
              <Mail size={15} className="form-field__icon" aria-hidden="true" />
              <input
                id="login-email" type="email"
                className={`form-field__input${errors.email ? ' is-error' : ''}`}
                placeholder="seu.nome@empresa.com"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors(p => ({ ...p, email: '' }));
                  if (authError) setAuthError(null);
                }}
                onBlur={() => setErrors(p => ({ ...p, email: validateEmail(email) }))}
                autoComplete="email" aria-required="true"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
                disabled={isLoading} />
            </div>
            {errors.email && (
              <span id="email-error" className="form-field__error" role="alert">
                <AlertTriangle size={10} aria-hidden="true" />{errors.email}
              </span>
            )}
          </div>

          {/* Senha */}
          <div className={`form-field${errors.password ? ' form-field--error' : ''}`}>
            <label className="form-field__label" htmlFor="login-password">Senha</label>
            <div className="form-field__input-wrap">
              <Lock size={15} className="form-field__icon" aria-hidden="true" />
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                className={`form-field__input${errors.password ? ' is-error' : ''}`}
                placeholder="••••••••"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors(p => ({ ...p, password: '' }));
                  if (authError) setAuthError(null);
                }}
                onBlur={() => setErrors(p => ({ ...p, password: validatePassword(password) }))}
                autoComplete="current-password" aria-required="true"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
                disabled={isLoading} />
              <button type="button" className="form-field__eye-btn"
                onClick={() => setShowPass(v => !v)}
                aria-label={showPass ? 'Ocultar senha' : 'Exibir senha'}>
                {showPass ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
              </button>
            </div>
            {errors.password && (
              <span id="password-error" className="form-field__error" role="alert">
                <AlertTriangle size={10} aria-hidden="true" />{errors.password}
              </span>
            )}
          </div>

          <button type="submit" className="btn-login" disabled={isLoading} aria-busy={isLoading}>
            {isLoading
              ? (<><span className="btn-login__spinner" aria-hidden="true" />Verificando acesso…</>)
              : 'Entrar'}
          </button>

          <div className="login-form__forgot">
            <button type="button" className="login-form__forgot-link" onClick={() => {}}>
              Esqueci minha senha
            </button>
          </div>
        </form>

        <footer className="login-card__footer">
          <ShieldCheck size={11} aria-hidden="true" />
          <span>Acesso restrito a colaboradores autorizados.</span>
        </footer>
      </div>
    </div>
  );
}
