import type { ReactNode } from 'react'

export function PanelCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-bg-secondary/80 shadow-[0_10px_30px_rgba(0,0,0,0.22)] ${className}`}>
      {children}
    </section>
  )
}
