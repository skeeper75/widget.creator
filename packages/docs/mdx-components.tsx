import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs'
import { Mermaid } from './src/components/Mermaid'
import { Callout, Steps } from 'nextra/components'

const docsComponents = getDocsMDXComponents()

// Custom code block renderer to handle mermaid diagrams
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pre({ children, className, ...props }: any) {
  // Check if this is a mermaid code block
  if (className?.includes('language-mermaid')) {
    const content = typeof children === 'string' ? children : ''
    return <Mermaid chart={content} />
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Pre = docsComponents.pre as any
  return <Pre className={className} {...props}>{children}</Pre>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useMDXComponents(components?: any) {
  return {
    ...docsComponents,
    pre,
    Callout,
    Steps,
    ...components
  }
}
