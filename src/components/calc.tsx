import React, { useMemo, useState } from 'react'

// components/GradeCalculator.tsx (three thresholds, lowest feasible per target, non-bold sentences)

// Weights and thresholds
const W = { mid: 0.3, end: 0.3, fin: 0.4 } as const
const THRESH = { mid: 25, end: 50, fin: 50 } as const
type Term = keyof typeof W

export function GradeCalculator() {
  const [midterm, setMidterm] = useState('')
  const [endterm, setEndterm] = useState('')
  const [final, setFinal] = useState('')

  // Parse and clamp to [0,100]; empty means "not entered"
  const mt = useMemo(() => clamp100(parseFloat(midterm)), [midterm])
  const et = useMemo(() => clamp100(parseFloat(endterm)), [endterm])
  const fn = useMemo(() => clamp100(parseFloat(final)), [final])

  const hasMT = midterm !== ''
  const hasET = endterm !== ''
  const hasFN = final !== ''

  // Check if all scores have been entered
  const allEntered = hasMT && hasET && hasFN

  // Check if at least one score has been entered
  const hasAnyInput = hasMT || hasET || hasFN

  // Known weighted sum
  const K =
    (hasMT ? W.mid * mt : 0) +
    (hasET ? W.end * et : 0) +
    (hasFN ? W.fin * fn : 0)

  // Unknowns and remaining weight
  const unknown: Term[] = (['mid', 'end', 'fin'] as Term[]).filter(t =>
    t === 'mid' ? !hasMT : t === 'end' ? !hasET : !hasFN
  )
  const remainingWeight = unknown.reduce((s, t) => s + W[t], 0)

  // Floor/ceiling range
  const floorTotal = K
  const ceilingTotal = K + 100 * remainingWeight

  // Immediate-fail thresholds apply to entered results
  const violatesThreshold =
    (hasMT && mt < THRESH.mid) ||
    (hasET && et < THRESH.end) ||
    (hasFN && fn < THRESH.fin)

  // Main status (color) by guaranteed bracket; falls back to "can still reach" based on ceiling
  const status = getStatusByBands({ floorTotal, ceilingTotal, violatesThreshold })

  // Three concise sentences (lowest feasible single-exam requirement) for 50/70/90
  const t50 = getThresholdSentence({ K, unknown, target: 50, violatesThreshold })
  const t70 = getThresholdSentence({ K, unknown, target: 70, violatesThreshold })
  const t90 = getThresholdSentence({ K, unknown, target: 90, violatesThreshold })

  return (
    <div style={pageWrap}>
      <div style={cardWrap}>
        <div style={card}>
          <h1 style={title}>Калькулятор оценок</h1>
          <p style={subtitle}>
            Снизу вводишь оценки короче
          </p>

          <div style={inputsWrap}>
            <Field label="Midterm (30%)" value={midterm} onChange={setMidterm} placeholder="e.g., 72" />
            <Field label="Endterm (30%)" value={endterm} onChange={setEndterm} placeholder="e.g., 65" />
            <Field label="Final (40%)" value={final} onChange={setFinal} placeholder="e.g., 80" />
          </div>

          {/* Status bar - only show if all entered OR obviously failing */}
          {(allEntered || violatesThreshold) && (
            <div style={{ ...statusBox, ...(status.panelStyle || {}) }}>
              <div style={{ ...statusText, ...(status.textStyle || {}) }}>{status.message}</div>
            </div>
          )}

          {/* Three target lines - always show if any input */}
          {hasAnyInput && (
            <div style={targetsWrap}>
              <div style={targetLine}>Не завалить (50): {t50}</div>
              <div style={targetLine}>Сохранить степуху (70): {t70}</div>
              <div style={targetLine}>Повышенная степуха (90): {t90}</div>
            </div>
          )}

          {hasAnyInput && (
            <button
              onClick={() => {
                setMidterm('')
                setEndterm('')
                setFinal('')
              }}
              style={resetBtn}
            >
              Обнулить
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- Core logic ---------- */

function getThresholdSentence(args: {
  K: number
  unknown: Term[]
  target: number
  violatesThreshold: boolean
}) {
  const { K, unknown, target, violatesThreshold } = args

  // Hard-stop cases
  if (violatesThreshold) return 'Невозможно из-за неудачного порога на экзамене.'
  if (unknown.length === 0) {
    return K >= target
      ? `Уже достиг с оценкой ${fmt1(K)}.`
      : `Не достигнуто с оценкой ${fmt1(K)}.`
  }

  // If even perfect remaining scores cannot reach target, it's impossible
  const ceiling = K + 100 * unknown.reduce((s, t) => s + W[t], 0)
  if (ceiling < target) return 'Невозможно с оставшимися оценками.'

  // Already guaranteed
  if (K >= target) return 'Уже гарантировано, (если не провалишь порог).'

  // For each remaining term: compute best-case requirement assuming other remaining terms are perfect,
  // then floor to that term’s own minimum threshold (25 for Midterm, 50 for End/Final), and clamp to 100.
  type Option = { term: Term; need: number; feasible: boolean }
  const options: Option[] = unknown.map((term) => {
    const othersMax = unknown
      .filter(t => t !== term)
      .reduce((s, t) => s + W[t] * 100, 0)

    const rawNeeded = (target - (K + othersMax)) / W[term] // best-case requirement
    const floored = Math.max(THRESH[term], rawNeeded)
    const need = Math.min(100, floored)
    return { term, need, feasible: need <= 100 }
  })

  const feasible = options.filter(o => o.feasible)
  const best = feasible.reduce((a, b) => (a.need <= b.need ? a : b))
  return `Нужно минимум ${fmt2(best.need)} на ${termLabel(best.term)}.`
}

function getStatusByBands(args: {
  floorTotal: number
  ceilingTotal: number
  violatesThreshold: boolean
}) {
  const { floorTotal, ceilingTotal, violatesThreshold } = args

  if (violatesThreshold) {
    return {
      message: 'Саламалейкум 👋',
      panelStyle: { background: colors.soft.redBG, border: `1px solid ${colors.soft.red}` },
      textStyle: { color: colors.soft.red, fontWeight: 500 },
    }
  }

  // Guaranteed band by floor
  if (floorTotal >= 90) {
    return {
      message: 'Повышка, поздравляю братуха 😁',
      panelStyle: { background: colors.soft.rainbowBG, border: `1px solid ${colors.stroke}` },
      textStyle: {
        backgroundImage: colors.rainbowText,
        WebkitBackgroundClip: 'text' as const,
        WebkitTextFillColor: 'transparent' as const,
        fontWeight: 600, // still not heavy; gradient gives emphasis
      },
    }
  }
  if (floorTotal >= 70) {
    return {
      message: 'Сохраняем стипендию 💵💵💵',
      panelStyle: { background: colors.soft.greenBG, border: `1px solid ${colors.stroke}` },
      textStyle: { color: colors.soft.green, fontWeight: 500 },
    }
  }
  if (floorTotal >= 50) {
    return {
      message: 'Хотябы не летка 😅',
      panelStyle: { background: colors.soft.amberBG, border: `1px solid ${colors.stroke}` },
      textStyle: { color: colors.soft.amber, fontWeight: 500 },
    }
  }

  // Not guaranteed; if nothing is achievable, keep red, else neutral styling but message stays in band language
  if (ceilingTotal < 50) {
    return {
      message: 'Саламалейкум 👋',
      panelStyle: { background: colors.soft.redBG, border: `1px solid ${colors.soft.red}` },
      textStyle: { color: colors.soft.red, fontWeight: 500 },
    }
  }
  return {
    message: 'Саламалейкум 👋',
    panelStyle: { background: colors.soft.redBG, border: `1px solid ${colors.soft.red}` },
    textStyle: { color: colors.soft.red, fontWeight: 500 },
  }
}

function termLabel(t: Term) {
  return t === 'mid' ? 'Midterm' : t === 'end' ? 'Endterm' : 'Final'
}

/* ---------- UI pieces ---------- */

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div style={fieldWrap}>
      <label style={fieldLabel}>{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={0}
        max={100}
        style={inputStyle}
        onFocus={(e) => (e.currentTarget.style.borderColor = colors.accent)}
        onBlur={(e) => (e.currentTarget.style.borderColor = colors.stroke)}
      />
    </div>
  )
}

/* ---------- Utilities ---------- */

function clamp100(n: number | undefined) {
  if (isNaN(Number(n))) return 0
  return Math.max(0, Math.min(100, Number(n)))
}

function fmt1(n: number) {
  return n.toFixed(1)
}

function fmt2(n: number) {
  return n.toFixed(2)
}

/* ---------- Styles (non-bold sentences) ---------- */

const colors = {
  bgGrad: 'linear-gradient(180deg, rgba(14,165,233,0.10) 0%, rgba(99,102,241,0.10) 100%)',
  cardGrad: 'linear-gradient(135deg, rgba(236,253,245,0.85) 0%, rgba(239,246,255,0.85) 100%)',
  stroke: '#E5E7EB',
  accent: '#22C55E',
  soft: {
    red: '#EF4444',
    redBG: '#FEE2E2',
    amber: '#F59E0B',
    amberBG: '#FFF7ED',
    green: '#10B981',
    greenBG: '#ECFDF5',
    rainbowBG: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(96,165,250,0.12))',
  },
  rainbowText: 'linear-gradient(135deg, #34D399 0%, #60A5FA 33%, #A78BFA 66%, #F472B6 100%)',
}

const pageWrap: React.CSSProperties = {
  position: 'relative',
  minHeight: '100vh',
  background: colors.bgGrad,
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '12vh 16px 6vh',
  boxSizing: 'border-box',
  overflow: 'hidden',
}

const cardWrap: React.CSSProperties = {
  width: '100%',
  maxWidth: 820,
  position: 'relative',
  zIndex: 1,
}

const card: React.CSSProperties = {
  width: '100%',
  background: colors.cardGrad,
  backdropFilter: 'blur(8px)',
  borderRadius: 24,
  boxShadow: '0 12px 40px rgba(2,6,23,0.10)',
  padding: 32,
}

const title: React.CSSProperties = {
  margin: 0,
  textAlign: 'center',
  fontSize: 32,
  fontWeight: 800,
  color: '#0F172A',
}

const subtitle: React.CSSProperties = {
  marginTop: 8,
  marginBottom: 24,
  textAlign: 'center',
  color: '#475569',
}

const inputsWrap: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 12,
}

const fieldWrap: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const fieldLabel: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: '#334155',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  fontSize: 16,
  borderRadius: 12,
  border: `2px solid ${colors.stroke}`,
  outline: 'none',
  transition: 'all 0.2s',
  backgroundColor: '#FFFFFF',
  boxSizing: 'border-box',
}

const statusBox: React.CSSProperties = {
  marginTop: 16,
  padding: 16,
  borderRadius: 16,
  textAlign: 'center' as const,
  background: '#FFFFFF',
  border: `1px solid ${colors.stroke}`,
}

const statusText: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 500, // not bold
  color: '#0F172A',
}
const targetsWrap: React.CSSProperties = {
  marginTop: 14,
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 8,
}

const targetLine: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 500, // not bold-heavy
  color: '#0F172A',
}

const resetBtn: React.CSSProperties = {
  width: '100%',
  marginTop: 16,
  padding: '12px 16px',
  fontSize: 16,
  fontWeight: 700,
  borderRadius: 12,
  border: 'none',
  backgroundImage: 'linear-gradient(135deg, #22C55E, #06B6D4)',
  color: 'white',
  cursor: 'pointer',
  boxShadow: '0 6px 18px rgba(34,197,94,0.30)',
}
