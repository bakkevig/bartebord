import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const configured = Boolean(url && key)

export const supabase = configured
  ? createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  : null

function friendly(error) {
  const message = error?.message || ''
  if (/fetch|network|load failed/i.test(message)) {
    return 'Får ikke kontakt med serveren. Sjekk nettet og prøv igjen.'
  }
  return message || 'Noe gikk galt. Prøv igjen.'
}

// Calls a database function and throws an error with Norwegian text if something goes wrong.
export async function rpc(fn, args = {}) {
  let result
  try {
    result = await supabase.rpc(fn, args)
  } catch (error) {
    throw new Error(friendly(error), { cause: error })
  }
  if (result.error) throw new Error(friendly(result.error))
  return result.data
}

export async function uploadPhoto(path, blob) {
  let result
  try {
    result = await supabase.storage.from('mustaches').upload(path, await blob.arrayBuffer(), {
      contentType: 'image/jpeg',
      cacheControl: '31536000',
      upsert: false,
    })
  } catch (error) {
    throw new Error(friendly(error), { cause: error })
  }
  if (result.error) throw new Error('Bildet kunne ikke lastes opp. ' + friendly(result.error))
}

export function photoUrl(path) {
  return path ? `${url}/storage/v1/object/public/mustaches/${path}` : null
}

export function formatCode(code) {
  const c = (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return c.length > 3 ? `${c.slice(0, 3)}-${c.slice(3)}` : c
}

export function formatTime(iso) {
  return new Intl.DateTimeFormat('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Oslo',
  }).format(new Date(iso))
}
