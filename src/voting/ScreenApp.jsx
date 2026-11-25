import { formatTime, rpc } from './supabase.js'
import { ErrorText, Eyebrow, MustacheMark, Photo } from './ui.jsx'
import { usePoll } from './usePoll.js'

function Mosaic({ people }) {
  if (people.length === 0) return null
  return (
    <div className="flex flex-wrap justify-center gap-3 max-w-6xl">
      {people.map((p) => (
        <div key={p.id} className="w-28 xl:w-36">
          <Photo photo={p.photo} name={p.name} className="w-full aspect-square" />
          <p className="text-sm text-zinc-400 truncate mt-1 text-center">{p.name}</p>
        </div>
      ))}
    </div>
  )
}

function Finalists({ title, people, large = false }) {
  // On a tie, several winner photos must fit side by side.
  const big = large && people.length === 1
  const medium = large && people.length > 1
  return (
    <section className="flex-1 min-w-0">
      <Eyebrow className="mb-6 text-center">{title}</Eyebrow>
      <div className="flex flex-wrap justify-center gap-6">
        {people.map((p) => (
          <div key={p.id} className={big ? 'w-80 xl:w-96' : medium ? 'w-56 xl:w-64' : 'w-44 xl:w-56'}>
            <Photo photo={p.photo} name={p.name} className="w-full aspect-square" />
            <p className={`font-serif text-center mt-3 ${big ? 'text-4xl xl:text-5xl' : medium ? 'text-3xl' : 'text-2xl'}`}>{p.name}</p>
          </div>
        ))}
      </div>
      {medium && <p className="text-amber-500 text-center text-xl mt-4">Delt seier!</p>}
    </section>
  )
}

function Big({ children }) {
  return <h1 className="font-serif font-bold text-5xl xl:text-7xl text-center">{children}</h1>
}

function Screen({ s }) {
  if (s.phase === 'done' && s.winners) {
    return (
      <>
        <Big>Årets barter</Big>
        <div className="flex flex-col lg:flex-row gap-16 w-full justify-center">
          <Finalists title="Årets beste bart" people={s.winners.best} large />
          <Finalists title="Årets verste bart" people={s.winners.worst} large />
        </div>
      </>
    )
  }
  if (s.phase === 'final' || s.phase === 'done') {
    return (
      <>
        <Big>{s.phase === 'final' ? 'Finale' : 'Stemmene er talt'}</Big>
        <p className="text-2xl text-zinc-300 text-center">
          {s.phase === 'final'
            ? `Stem på nytt blant finalistene · ${s.voted_count} av ${s.registered_count} har stemt`
            : 'Vinnerne avsløres straks …'}
        </p>
        <div className="flex flex-col lg:flex-row gap-16 w-full justify-center">
          <Finalists title="Årets beste bart" people={s.final_best || []} />
          <Finalists title="Årets verste bart" people={s.final_worst || []} />
        </div>
      </>
    )
  }
  if (s.phase === 'round1') {
    return (
      <>
        <Big>Avstemningen er åpen</Big>
        <p className="text-2xl text-zinc-300 text-center">
          Stem på årets beste og verste bart på mobilen · {s.voted_count} av {s.registered_count} har stemt
        </p>
        <Mosaic people={s.people} />
      </>
    )
  }
  return (
    <>
      <Big>Registrer barten din</Big>
      <p className="text-2xl text-zinc-300 text-center">
        Skann QR-koden på lappen din og ta en selfie
      </p>
      <p className="text-amber-500 font-serif text-4xl">
        {s.registered_count} av {s.expected_count}
      </p>
      <p className="text-zinc-400 text-lg text-center">
        Avstemningen åpner kl. {formatTime(s.voting_opens_at)}, eller når alle har registrert seg
      </p>
      <Mosaic people={s.people} />
    </>
  )
}

export default function App() {
  const { data, error } = usePoll(() => rpc('screen_state'), 3000)
  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex flex-col items-center px-8 py-10 gap-8">
      <div className="flex items-center gap-4">
        <MustacheMark className="w-12 h-12" />
        <span className="font-serif text-2xl">Bartebord 2026</span>
      </div>
      {error && !data && <ErrorText error={error} />}
      {data && <Screen s={data} />}
    </div>
  )
}
