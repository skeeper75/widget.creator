'use client'

import { useEffect, useId, useRef } from 'react'

interface MermaidProps {
  chart: string
}

export function Mermaid({ chart }: MermaidProps) {
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    const renderDiagram = async () => {
      const { default: mermaid } = await import('mermaid')

      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose'
      })

      const sanitizedId = id.replace(/:/g, '_')
      const element = ref.current
      if (!element) return

      try {
        const { svg } = await mermaid.render(sanitizedId, chart)
        element.innerHTML = svg
      } catch (error) {
        console.error('Mermaid rendering failed:', error)
        element.innerHTML = `<pre>${chart}</pre>`
      }
    }

    renderDiagram()
  }, [chart, id])

  return (
    <div
      ref={ref}
      className="mermaid-diagram my-4 flex justify-center overflow-auto"
    />
  )
}
