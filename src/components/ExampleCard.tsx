import type { ReactNode } from 'react'

type Props = {
  index: number
  title: string
  description: string
  /** Short notes rendered under the demo — model, interaction, trade-offs. */
  notes: string[]
  children: ReactNode
}

export function ExampleCard({ index, title, description, notes, children }: Props) {
  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
      <header className="space-y-1.5">
        <span className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase tabular-nums">
          {String(index).padStart(2, '0')}
        </span>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="max-w-prose text-[13.5px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </header>

      <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-border/50 bg-background/60 p-6">
        {children}
      </div>

      <ul className="space-y-1.5">
        {notes.map((note) => (
          <li
            key={note}
            className="flex gap-2 text-[12.5px] leading-relaxed text-muted-foreground"
          >
            <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-muted-foreground/50" />
            <span>{note}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
