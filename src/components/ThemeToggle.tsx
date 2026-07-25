import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  // The inline script in index.html has already set the class; read it back so
  // the button starts in the right state without a second flash.
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light')
    } catch {
      // Private mode / storage disabled — the toggle still works for this session.
    }
  }, [dark])

  return (
    <button
      type="button"
      onClick={() => setDark((prev) => !prev)}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground transition-colors hover:text-foreground"
    >
      {dark ? <Sun aria-hidden className="size-4" /> : <Moon aria-hidden className="size-4" />}
    </button>
  )
}
