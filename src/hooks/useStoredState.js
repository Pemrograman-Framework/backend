import { useCallback, useSyncExternalStore } from 'react'

const serverSnapshot = '__ab_server_snapshot__'

export default function useStoredState(key, initial) {
  const eventName = `ab-storage-${key}`
  const subscribe = useCallback((onChange) => {
    const onStorage = (event) => {
      if (event.key === key || event.key === null) onChange()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(eventName, onChange)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(eventName, onChange)
    }
  }, [eventName, key])
  const getSnapshot = useCallback(() => window.localStorage.getItem(key), [key])
  const getServerSnapshot = () => serverSnapshot
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  let value = initial
  if (stored !== null && stored !== serverSnapshot) {
    try {
      value = JSON.parse(stored)
    } catch (error) {
      console.error(`Unable to read saved state "${key}".`, error)
    }
  }

  const setValue = useCallback((nextValue) => {
    try {
      const current = window.localStorage.getItem(key)
      const currentValue = current === null ? initial : JSON.parse(current)
      const updatedValue = typeof nextValue === 'function' ? nextValue(currentValue) : nextValue
      if (updatedValue === undefined) window.localStorage.removeItem(key)
      else window.localStorage.setItem(key, JSON.stringify(updatedValue))
      window.dispatchEvent(new Event(eventName))
    } catch (error) {
      console.error(`Unable to save state "${key}".`, error)
    }
  }, [eventName, initial, key])

  return [value, setValue, stored !== serverSnapshot]
}
