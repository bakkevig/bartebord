import { useState } from 'react'
import { formatCode, formatTime, rpc, uploadPhoto } from './supabase.js'
import { toSquareJpeg } from './image.js'
import { Button, ErrorText, Eyebrow, MustacheMark, Photo, Title } from './ui.jsx'
import { usePoll } from './usePoll.js'

const CODE_KEY = 'bartebord-code'

function readStoredCode() {
  try {
    return localStorage.getItem(CODE_KEY) || ''
  } catch {
    return ''
  }
}

function storeCode(code) {
  try {
    if (code) localStorage.setItem(CODE_KEY, code)
    else localStorage.removeItem(CODE_KEY)
  } catch {
    // Private mode etc.: the code is only remembered while the page is open.
  }
}

// The code may come from the QR code (?code=...). It is stored and removed from the address bar.
function initialCode() {
  const params = new URLSearchParams(window.location.search)
  const fromUrl = params.get('code')
  if (fromUrl) {
    const code = fromUrl.toUpperCase().replace(/[^A-Z0-9]/g, '')
    storeCode(code)
    window.history.replaceState(null, '', window.location.pathname)
    return code
  }
  return readStoredCode()
}

function Shell({ code, onChangeCode, children }) {
  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/70">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <MustacheMark className="w-8 h-8" />
            <span className="font-serif text-lg">Bartebord</span>
          </div>
          {code && (
            <button type="button" onClick={onChangeCode} className="text-xs text-zinc-500 hover:text-amber-500">
              Kode {formatCode(code)} · bytt
            </button>
          )}
        </div>
      </header>
      <main className="max-w-xl mx-auto px-4 py-8 pb-16">{children}</main>
    </div>
  )
}

function CodeForm({ onSubmit, error }) {
  const [value, setValue] = useState('')
  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault()
        const code = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
        if (code) onSubmit(code)
      }}
    >
      <div>
        <Eyebrow className="mb-3">Årets bartekåring</Eyebrow>
        <Title>Skriv inn koden din</Title>
        <p className="text-zinc-400 mt-3">Koden står på lappen du fikk ved ankomst.</p>
      </div>
      {error && <ErrorText error={error} />}
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="ABC-123"
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        inputMode="text"
        className="w-full bg-zinc-900 border border-zinc-700 focus:border-amber-500 outline-none px-4 py-4 text-2xl tracking-[0.2em] uppercase text-center"
        aria-label="Kode"
      />
      <Button type="submit" className="w-full">
        Fortsett
      </Button>
    </form>
  )
}

function Register({ code, state, onDone, onCancel }) {
  const [name, setName] = useState(state.name || '')
  const [photo, setPhoto] = useState(null) // { blob, url }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function pick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    try {
      const blob = await toSquareJpeg(file)
      if (photo) URL.revokeObjectURL(photo.url)
      setPhoto({ blob, url: URL.createObjectURL(blob) })
    } catch (err) {
      setError(err)
    }
  }

  async function submit(e) {
    e.preventDefault()
    if (!photo || !name.trim()) return
    setBusy(true)
    setError(null)
    try {
      const token = await rpc('register_start', { p_code: code })
      await uploadPhoto(`${token}.jpg`, photo.blob)
      await rpc('register', { p_code: code, p_name: name, p_token: token })
      await onDone()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  const ready = photo && name.trim()

  return (
    <form className="space-y-8" onSubmit={submit}>
      <div>
        <Eyebrow className="mb-3">Velkommen til Bartebord</Eyebrow>
        <Title>{state.registered ? 'Bytt bilde' : 'Registrer barten din'}</Title>
        <p className="text-zinc-400 mt-3">
          Ta en selfie der barten synes godt. Bildet er det de andre ser når de stemmer.
        </p>
      </div>

      <label className="block">
        <span className="block text-sm text-zinc-400 mb-2">Navn</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          autoComplete="name"
          placeholder="Fornavn Etternavn"
          className="w-full bg-zinc-900 border border-zinc-700 focus:border-amber-500 outline-none px-4 py-3 text-lg"
        />
      </label>

      <div>
        <span className="block text-sm text-zinc-400 mb-2">Bilde</span>
        {photo ? (
          <div className="space-y-3">
            <img src={photo.url} alt="Forhåndsvisning av bildet ditt" className="w-full aspect-square object-cover" />
            <label className="inline-block cursor-pointer text-sm text-zinc-300 underline underline-offset-4 hover:text-amber-500">
              Ta nytt bilde
              <input type="file" accept="image/*" capture="user" className="sr-only" onChange={pick} />
            </label>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-3 w-full aspect-square border border-dashed border-zinc-700 hover:border-amber-500 cursor-pointer text-zinc-300">
            <svg className="w-12 h-12 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-lg">Ta selfie</span>
            <input type="file" accept="image/*" capture="user" className="sr-only" onChange={pick} />
          </label>
        )}
      </div>

      <ErrorText error={error} />

      <div className="flex flex-col gap-3">
        <Button type="submit" disabled={!ready || busy} className="w-full">
          {busy ? 'Laster opp …' : state.registered ? 'Lagre' : 'Registrer meg'}
        </Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={busy} className="w-full">
            Avbryt
          </Button>
        )}
      </div>
    </form>
  )
}

function Waiting({ state, onEdit }) {
  return (
    <div className="space-y-8">
      <div>
        <Eyebrow className="mb-3">Du er registrert</Eyebrow>
        <Title>Takk, {state.name}!</Title>
      </div>
      <Photo photo={state.photo} name={state.name} className="w-full aspect-square" />
      <div className="border border-zinc-800 p-5 space-y-2">
        <p className="text-zinc-200 text-lg">
          Avstemningen åpner kl. {formatTime(state.voting_opens_at)}, eller når alle {state.expected_count} har
          registrert seg.
        </p>
        <p className="text-zinc-400">
          {state.registered_count} av {state.expected_count} er registrert nå. Denne siden oppdateres av seg selv.
        </p>
      </div>
      <Button variant="secondary" onClick={onEdit} className="w-full">
        Bytt bilde eller navn
      </Button>
    </div>
  )
}

function CandidateGrid({ people, selected, onSelect }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {people.map((p) => {
        const active = selected === p.id
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            aria-pressed={active}
            className={`text-left border-2 transition-colors ${
              active ? 'border-amber-500 bg-amber-500/10' : 'border-transparent hover:border-zinc-600'
            }`}
          >
            <Photo photo={p.photo} name={p.name} className="w-full aspect-square" />
            <span className={`block px-2 py-2 text-sm leading-tight ${active ? 'text-amber-400' : 'text-zinc-200'}`}>
              {p.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function Vote({ code, state, onDone }) {
  const final = state.phase === 'final'
  const hasBest = state.best.length > 0
  const hasWorst = state.worst.length > 0
  const [step, setStep] = useState(hasBest ? 'best' : hasWorst ? 'worst' : 'confirm')
  const [best, setBest] = useState(null)
  const [worst, setWorst] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const byId = Object.fromEntries([...state.best, ...state.worst].map((p) => [p.id, p]))
  const roundLabel = final ? 'Finale' : 'Første runde'

  function choose(kind, id) {
    if (kind === 'best') {
      setBest(id)
      setStep(hasWorst ? 'worst' : 'confirm')
    } else {
      setWorst(id)
      setStep('confirm')
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await rpc('cast_vote', { p_code: code, p_best: best, p_worst: worst })
      await onDone()
    } catch (err) {
      setError(err)
      await onDone()
    } finally {
      setBusy(false)
    }
  }

  if (step === 'best' || step === 'worst') {
    const isBest = step === 'best'
    return (
      <div className="space-y-6">
        <div>
          <Eyebrow className="mb-3">
            {roundLabel} · {isBest || !hasBest ? '1' : '2'} av {hasBest && hasWorst ? 2 : 1}
          </Eyebrow>
          <Title>{isBest ? 'Årets beste bart' : 'Årets verste bart'}</Title>
          <p className="text-zinc-400 mt-3">
            {final
              ? 'Velg blant finalistene. '
              : ''}
            Trykk på bildet til den du vil stemme på.
          </p>
        </div>
        <CandidateGrid
          people={isBest ? state.best : state.worst}
          selected={isBest ? best : worst}
          onSelect={(id) => choose(step, id)}
        />
        {!isBest && hasBest && (
          <Button variant="secondary" onClick={() => setStep('best')} className="w-full">
            Tilbake
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <Eyebrow className="mb-3">{roundLabel}</Eyebrow>
        <Title>Er du sikker?</Title>
        <p className="text-zinc-400 mt-3">Du kan ikke endre stemmen etter at den er sendt.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[
          ['Beste bart', best, 'best'],
          ['Verste bart', worst, 'worst'],
        ].map(([label, id, kind]) => (
          <div key={kind}>
            <p className="text-amber-500 text-sm uppercase tracking-wider mb-2">{label}</p>
            {id ? (
              <button type="button" onClick={() => setStep(kind)} className="block w-full text-left">
                <Photo photo={byId[id].photo} name={byId[id].name} className="w-full aspect-square" />
                <span className="block mt-2 text-zinc-200">{byId[id].name}</span>
                <span className="block text-xs text-zinc-500 underline underline-offset-2">Endre</span>
              </button>
            ) : (
              <p className="text-zinc-500 text-sm">Ingen å stemme på</p>
            )}
          </div>
        ))}
      </div>
      <ErrorText error={error} />
      <Button onClick={submit} disabled={busy} className="w-full">
        {busy ? 'Sender …' : 'Send stemmen'}
      </Button>
    </div>
  )
}

function Winners({ winners }) {
  return (
    <div className="space-y-10">
      {[
        ['Årets beste bart', winners.best],
        ['Årets verste bart', winners.worst],
      ].map(([label, people]) => (
        <section key={label}>
          <Eyebrow className="mb-3">{label}</Eyebrow>
          <div className={`grid gap-4 ${people.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {people.map((p) => (
              <div key={p.id}>
                <Photo photo={p.photo} name={p.name} className="w-full aspect-square" />
                <p className="font-serif text-2xl mt-3">{p.name}</p>
              </div>
            ))}
          </div>
          {people.length > 1 && <p className="text-zinc-400 mt-3">Delt seier!</p>}
        </section>
      ))}
    </div>
  )
}

function Message({ eyebrow, title, children }) {
  return (
    <div className="space-y-4">
      <Eyebrow>{eyebrow}</Eyebrow>
      <Title>{title}</Title>
      <div className="text-zinc-400 text-lg space-y-3">{children}</div>
    </div>
  )
}

function Content({ code, state, refresh }) {
  const [editing, setEditing] = useState(false)

  if (state.phase === 'done') {
    if (state.winners) return <Winners winners={state.winners} />
    return (
      <Message eyebrow="Avstemningen er avsluttet" title="Stemmene er talt">
        <p>Vinnerne avsløres snart.</p>
      </Message>
    )
  }

  if (!state.registered || editing) {
    return (
      <Register
        code={code}
        state={state}
        onCancel={state.registered ? () => setEditing(false) : null}
        onDone={async () => {
          await refresh()
          setEditing(false)
          window.scrollTo({ top: 0 })
        }}
      />
    )
  }

  if (state.phase === 'registration') {
    return <Waiting state={state} onEdit={() => setEditing(true)} />
  }

  if (state.voted) {
    return state.phase === 'final' ? (
      <Message eyebrow="Finale" title="Takk for stemmen!">
        <p>Vinnerne avsløres når alle har stemt.</p>
      </Message>
    ) : (
      <Message eyebrow="Første runde" title="Takk for stemmen!">
        <p>Når alle har stemt, går de tre beste og de tre verste bartene videre til finalen.</p>
        <p>Denne siden oppdateres av seg selv når finalen starter.</p>
      </Message>
    )
  }

  return <Vote key={state.phase} code={code} state={state} onDone={refresh} />
}

function Participant({ code, onChangeCode }) {
  const { data: state, error, refresh } = usePoll(() => rpc('participant_state', { p_code: code }), 4000, [code])

  if (state && !state.valid) {
    return <CodeForm onSubmit={onChangeCode} error={new Error(`Fant ingen lapp med koden ${formatCode(code)}.`)} />
  }
  if (!state) {
    return error ? <ErrorText error={error} /> : <p className="text-zinc-500">Laster …</p>
  }
  return (
    <div className="space-y-6">
      {error && <ErrorText error={error} />}
      <Content code={code} state={state} refresh={refresh} />
    </div>
  )
}

export default function App() {
  const [code, setCode] = useState(initialCode)

  function change(next) {
    storeCode(next)
    setCode(next)
  }

  return (
    <Shell
      code={code}
      onChangeCode={() => {
        if (window.confirm('Vil du bytte til en annen kode? Ta vare på lappen din, du trenger koden for å komme tilbake.')) change('')
      }}
    >
      {code ? <Participant key={code} code={code} onChangeCode={change} /> : <CodeForm onSubmit={change} />}
    </Shell>
  )
}
