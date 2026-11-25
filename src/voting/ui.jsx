import { configured, photoUrl } from './supabase.js'

export function NotConfigured() {
  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <p className="text-zinc-400 max-w-sm text-center">
        Kåringen er ikke satt opp ennå. Supabase-adressen og -nøkkelen mangler i byggingen av nettsiden.
      </p>
    </div>
  )
}

export function RequireConfig({ children }) {
  return configured ? children : <NotConfigured />
}

export function Eyebrow({ children, className = '' }) {
  return (
    <p className={`text-amber-500 uppercase tracking-[0.3em] text-xs sm:text-sm ${className}`}>{children}</p>
  )
}

export function Title({ children, className = '' }) {
  return <h1 className={`font-serif font-bold text-3xl sm:text-4xl text-zinc-100 ${className}`}>{children}</h1>
}

export function Button({ variant = 'primary', className = '', ...props }) {
  const styles = {
    primary:
      'bg-amber-500 text-zinc-950 hover:bg-amber-400 font-semibold disabled:bg-zinc-700 disabled:text-zinc-400',
    secondary:
      'border border-zinc-700 text-zinc-200 hover:border-amber-500 hover:text-amber-500 disabled:text-zinc-600 disabled:border-zinc-800',
    danger:
      'border border-red-900 text-red-300 hover:border-red-500 hover:text-red-200 disabled:text-zinc-600 disabled:border-zinc-800',
  }
  return (
    <button
      type="button"
      className={`px-5 py-3 text-base transition-colors disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    />
  )
}

export function ErrorText({ error }) {
  if (!error) return null
  return (
    <p role="alert" className="border border-red-900 bg-red-950/40 text-red-200 px-4 py-3 text-sm">
      {error.message || String(error)}
    </p>
  )
}

export function Photo({ photo, name, className = '' }) {
  const src = photoUrl(photo)
  return src ? (
    <img src={src} alt={name ? `Barten til ${name}` : ''} className={`object-cover bg-zinc-800 ${className}`} loading="lazy" />
  ) : (
    <div className={`bg-zinc-800 ${className}`} />
  )
}

export function MustacheMark({ className = 'w-10 h-10' }) {
  return <img src="/mustache.svg" alt="" className={`invert ${className}`} />
}
