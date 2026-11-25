import { useCallback, useEffect, useRef, useState } from 'react'

// Henter data på nytt med jevne mellomrom, og med en gang når fanen blir synlig igjen.
export function usePoll(load, intervalMs, deps = []) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const loadRef = useRef(load)
  loadRef.current = load

  const refresh = useCallback(async () => {
    try {
      const result = await loadRef.current()
      setData(result)
      setError(null)
      return result
    } catch (e) {
      setError(e)
      return null
    }
  }, [])

  useEffect(() => {
    let timer
    let stopped = false
    const tick = async () => {
      await refresh()
      if (!stopped) timer = setTimeout(tick, intervalMs)
    }
    tick()
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      stopped = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, refresh, ...deps])

  return { data, error, refresh, setData }
}
