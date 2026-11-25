import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { formatCode, formatTime, rpc } from './supabase.js'
import { Button, ErrorText, Eyebrow, MustacheMark, Photo, Title } from './ui.jsx'
import { usePoll } from './usePoll.js'

const PASSWORD_KEY = 'bartebord-admin'

const PHASES = {
  registrering: 'Registrering',
  runde1: 'Første runde',
  finale: 'Finale',
  ferdig: 'Avsluttet',
}

function Login({ onLogin, error }) {
  const [value, setValue] = useState('')
  return (
    <form
      className="max-w-sm mx-auto px-4 py-16 space-y-6"
      onSubmit={(e) => {
        e.preventDefault()
        if (value) onLogin(value)
      }}
    >
      <div>
        <Eyebrow className="mb-3">Bartekåring</Eyebrow>
        <Title>Admin</Title>
      </div>
      {error && <ErrorText error={error} />}
      <input
        type="password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Passord"
        autoComplete="current-password"
        className="w-full bg-zinc-900 border border-zinc-700 focus:border-amber-500 outline-none px-4 py-3 text-lg"
        aria-label="Passord"
      />
      <Button type="submit" className="w-full">
        Logg inn
      </Button>
    </form>
  )
}

function Stat({ label, value }) {
  return (
    <div className="border border-zinc-800 px-4 py-3">
      <p className="text-zinc-500 text-xs uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-serif mt-1">{value}</p>
    </div>
  )
}

// Rangert liste over stemmer i én kategori.
function Ranking({ title, people, field, highlight = [], highlightLabel, limitTo }) {
  const rows = people
    .filter((p) => p.registered && (!limitTo || limitTo.includes(p.id)))
    .map((p) => ({ ...p, votes: p[field] }))
    .sort((a, b) => b.votes - a.votes || (a.name || '').localeCompare(b.name || '', 'nb'))
  const total = rows.reduce((sum, r) => sum + r.votes, 0)
  return (
    <section className="border border-zinc-800">
      <header className="flex items-baseline justify-between px-4 py-3 border-b border-zinc-800">
        <h3 className="font-serif text-xl">{title}</h3>
        <span className="text-zinc-500 text-sm">{total} stemmer</span>
      </header>
      <ol>
        {rows.map((r) => {
          const hit = highlight.includes(r.id)
          return (
            <li
              key={r.id}
              className={`flex items-center gap-3 px-4 py-2 border-b border-zinc-900 last:border-0 ${hit ? 'bg-amber-500/10' : ''}`}
            >
              <Photo photo={r.photo} name={r.name} className="w-10 h-10 shrink-0" />
              <span className={`flex-1 truncate ${hit ? 'text-amber-400' : 'text-zinc-200'}`}>{r.name}</span>
              {hit && highlightLabel && <span className="text-xs text-amber-500 uppercase tracking-wider">{highlightLabel}</span>}
              <span className="w-10 text-right font-semibold tabular-nums">{r.votes}</span>
            </li>
          )
        })}
        {rows.length === 0 && <li className="px-4 py-3 text-zinc-500">Ingen ennå</li>}
      </ol>
    </section>
  )
}

function WinnerBox({ title, ids, people }) {
  const winners = people.filter((p) => ids.includes(p.id))
  return (
    <section className="border border-amber-500/40 p-4">
      <Eyebrow className="mb-3">{title}</Eyebrow>
      {winners.length === 0 && <p className="text-zinc-500">Ingen stemmer</p>}
      <div className="flex flex-wrap gap-4">
        {winners.map((w) => (
          <div key={w.id} className="flex items-center gap-3">
            <Photo photo={w.photo} name={w.name} className="w-16 h-16" />
            <span className="font-serif text-2xl">{w.name}</span>
          </div>
        ))}
      </div>
      {winners.length > 1 && (
        <p className="text-amber-400 mt-3 text-sm">Uavgjort! Avgjør det på stedet, eller vis dem som delt seier.</p>
      )}
    </section>
  )
}

function Overview({ data, act, busy }) {
  const people = data.participants
  const registered = people.filter((p) => p.registered)
  const voted1 = registered.filter((p) => p.voted1).length
  const voted2 = registered.filter((p) => p.voted2).length
  const round = data.phase === 'finale' ? 2 : 1
  const missing = registered.filter((p) => (round === 2 ? !p.voted2 : !p.voted1))

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Fase" value={PHASES[data.phase]} />
        <Stat label="Registrert" value={`${registered.length} / ${data.expected_count}`} />
        <Stat label="Stemt runde 1" value={`${voted1} / ${registered.length}`} />
        <Stat label="Stemt finale" value={`${voted2} / ${registered.length}`} />
      </div>

      {data.phase === 'registrering' && (
        <section className="space-y-4">
          <p className="text-zinc-300">
            Avstemningen åpner av seg selv kl. {formatTime(data.voting_opens_at)}, eller når {data.expected_count}{' '}
            har registrert seg.
          </p>
          <Button onClick={() => act('open_voting', 'Åpne avstemningen nå?')} disabled={busy}>
            Åpne avstemningen nå
          </Button>
        </section>
      )}

      {data.phase === 'runde1' && (
        <section className="space-y-4">
          <p className="text-zinc-300">
            Resultatet oppdateres fortløpende. Uthevet: de som går til finalen hvis du starter den nå (topp 3, alle som
            står likt på 3. plass blir med).
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <Ranking title="Beste bart" people={people} field="r1_best" highlight={data.preview_best} highlightLabel="Finale" />
            <Ranking title="Verste bart" people={people} field="r1_worst" highlight={data.preview_worst} highlightLabel="Finale" />
          </div>
          <Button
            onClick={() =>
              act(
                'start_final',
                `Starte finalen med ${data.preview_best.length} kandidater til beste og ${data.preview_worst.length} til verste bart? ${registered.length - voted1} har ikke stemt ennå, og de kan ikke stemme i første runde etterpå.`,
              )
            }
            disabled={busy || data.preview_best.length === 0 || data.preview_worst.length === 0}
          >
            Start finalen
          </Button>
        </section>
      )}

      {data.phase === 'finale' && (
        <section className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Ranking title="Beste bart – finale" people={people} field="r2_best" limitTo={data.final_best} highlight={data.winners_best} highlightLabel="Leder" />
            <Ranking title="Verste bart – finale" people={people} field="r2_worst" limitTo={data.final_worst} highlight={data.winners_worst} highlightLabel="Leder" />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => act('finish', `Avslutte finalen? ${registered.length - voted2} har ikke stemt ennå.`)}
              disabled={busy}
            >
              Avslutt finalen
            </Button>
            {voted2 === 0 && (
              <Button variant="secondary" onClick={() => act('back_to_round1', 'Gå tilbake til første runde?')} disabled={busy}>
                Tilbake til første runde
              </Button>
            )}
          </div>
        </section>
      )}

      {data.phase === 'ferdig' && (
        <section className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <WinnerBox title="Årets beste bart" ids={data.winners_best} people={people} />
            <WinnerBox title="Årets verste bart" ids={data.winners_worst} people={people} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Ranking title="Beste bart – finale" people={people} field="r2_best" limitTo={data.final_best} />
            <Ranking title="Verste bart – finale" people={people} field="r2_worst" limitTo={data.final_worst} />
          </div>
          <div className="flex flex-wrap gap-3">
            {data.reveal ? (
              <Button variant="secondary" onClick={() => act('hide')} disabled={busy}>
                Skjul vinnerne igjen
              </Button>
            ) : (
              <Button onClick={() => act('reveal', 'Vise vinnerne på storskjermen og alle telefonene?')} disabled={busy}>
                Vis vinnerne for alle
              </Button>
            )}
            <Button variant="secondary" onClick={() => act('reopen_final', 'Åpne finalen igjen?')} disabled={busy}>
              Gjenåpne finalen
            </Button>
          </div>
          <details className="border border-zinc-800 p-4">
            <summary className="cursor-pointer text-zinc-400">Resultat fra første runde</summary>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <Ranking title="Beste bart" people={people} field="r1_best" highlight={data.final_best} />
              <Ranking title="Verste bart" people={people} field="r1_worst" highlight={data.final_worst} />
            </div>
          </details>
        </section>
      )}

      {(data.phase === 'runde1' || data.phase === 'finale') && missing.length > 0 && (
        <section>
          <h3 className="font-serif text-xl mb-3">Har ikke stemt ({missing.length})</h3>
          <div className="flex flex-wrap gap-3">
            {missing.map((p) => (
              <div key={p.id} className="flex items-center gap-2 border border-zinc-800 pr-3">
                <Photo photo={p.photo} name={p.name} className="w-10 h-10" />
                <span className="text-sm">{p.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="font-serif text-xl mb-3">Deltakere og koder</h3>
        <p className="text-zinc-500 text-sm mb-3">Har noen mistet lappen sin, finner du koden deres her.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-zinc-500 text-left">
              <tr>
                <th className="py-2 pr-3 font-normal">Bart</th>
                <th className="py-2 pr-3 font-normal">Navn</th>
                <th className="py-2 pr-3 font-normal">Kode</th>
                <th className="py-2 pr-3 font-normal">Runde 1</th>
                <th className="py-2 font-normal">Finale</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id} className="border-t border-zinc-900">
                  <td className="py-1 pr-3">
                    <Photo photo={p.photo} name={p.name} className="w-9 h-9" />
                  </td>
                  <td className="py-1 pr-3">{p.name || <span className="text-zinc-600">Ikke registrert</span>}</td>
                  <td className="py-1 pr-3 font-mono tracking-wider">{formatCode(p.code)}</td>
                  <td className="py-1 pr-3">{p.voted1 ? '✓' : ''}</td>
                  <td className="py-1">{p.voted2 ? '✓' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function SlipCard({ code }) {
  const [svg, setSvg] = useState('')
  const url = `${window.location.origin}/stem/?kode=${code}`
  useEffect(() => {
    QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' }).then(setSvg)
  }, [url])
  return (
    <div className="slip border border-zinc-400 p-5 flex gap-5 items-center break-inside-avoid bg-white text-zinc-900">
      <div className="w-32 h-32 shrink-0" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="min-w-0">
        <p className="font-serif text-xl font-bold">Bartebord 2026</p>
        <p className="text-sm mt-1 leading-snug">Skann koden med mobilen, ta en selfie og stem på årets beste og verste bart.</p>
        <p className="text-xs mt-3 text-zinc-600">Eller gå til {window.location.host}/stem og skriv inn:</p>
        <p className="font-mono text-2xl tracking-[0.2em] font-bold mt-1">{formatCode(code)}</p>
      </div>
    </div>
  )
}

function Slips({ people }) {
  const [onlyUnused, setOnlyUnused] = useState(false)
  const codes = people.filter((p) => !onlyUnused || !p.registered).map((p) => p.code)
  return (
    <div className="space-y-6">
      <div className="print:hidden space-y-4">
        <p className="text-zinc-300">
          {codes.length} lapper. Skriv ut på A4 og klipp langs kantene. Hver kode gir én registrering og én stemme per runde.
        </p>
        <label className="flex items-center gap-2 text-zinc-400 text-sm">
          <input type="checkbox" checked={onlyUnused} onChange={(e) => setOnlyUnused(e.target.checked)} />
          Bare koder som ikke er registrert
        </label>
        <Button onClick={() => window.print()}>Skriv ut</Button>
      </div>
      <div className="slips grid sm:grid-cols-2 gap-3 print:gap-0">
        {codes.map((code) => (
          <SlipCard key={code} code={code} />
        ))}
      </div>
    </div>
  )
}

function Dashboard({ password, onLogout }) {
  const [tab, setTab] = useState('oversikt')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)
  const { data, error, refresh } = usePoll(() => rpc('admin_overview', { p_password: password }), 3000, [password])

  useEffect(() => {
    if (error?.message === 'Feil passord.') onLogout(error)
  }, [error, onLogout])

  async function act(action, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return
    setBusy(true)
    setActionError(null)
    try {
      await rpc('admin_action', { p_password: password, p_action: action })
      await refresh()
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 print:bg-white print:min-h-0">
      <header className="border-b border-zinc-800/70 print:hidden">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <MustacheMark className="w-8 h-8" />
            <span className="font-serif text-lg">Bartekåring · admin</span>
          </div>
          <nav className="flex gap-4 text-sm">
            {[
              ['oversikt', 'Oversikt'],
              ['lapper', 'Lapper'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={tab === id ? 'text-amber-500' : 'text-zinc-400 hover:text-zinc-200'}
              >
                {label}
              </button>
            ))}
            <a href="/skjerm/" target="_blank" rel="noopener" className="text-zinc-400 hover:text-zinc-200">
              Storskjerm ↗
            </a>
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6 print:p-0 print:max-w-none">
        {error && error.message !== 'Feil passord.' && <ErrorText error={error} />}
        <ErrorText error={actionError} />
        {!data && !error && <p className="text-zinc-500">Laster …</p>}
        {data && tab === 'oversikt' && <Overview data={data} act={act} busy={busy} />}
        {data && tab === 'lapper' && <Slips people={data.participants} />}
      </main>
    </div>
  )
}

export default function App() {
  const [password, setPassword] = useState(() => {
    try {
      return sessionStorage.getItem(PASSWORD_KEY) || ''
    } catch {
      return ''
    }
  })
  const [loginError, setLoginError] = useState(null)

  function save(value) {
    try {
      if (value) sessionStorage.setItem(PASSWORD_KEY, value)
      else sessionStorage.removeItem(PASSWORD_KEY)
    } catch {
      // ignorer
    }
    setPassword(value)
  }

  if (!password) {
    return (
      <div className="min-h-dvh bg-zinc-950 text-zinc-100">
        <Login
          error={loginError}
          onLogin={(value) => {
            setLoginError(null)
            save(value)
          }}
        />
      </div>
    )
  }
  return (
    <Dashboard
      password={password}
      onLogout={(err) => {
        setLoginError(err)
        save('')
      }}
    />
  )
}
