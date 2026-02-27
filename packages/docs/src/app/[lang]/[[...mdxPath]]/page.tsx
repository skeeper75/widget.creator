import { redirect } from 'next/navigation'
import { generateStaticParamsFor, importPage } from 'nextra/pages'
import { useMDXComponents as getMDXComponents } from '../../../../mdx-components'

// Generate static params - 'lang' is the locale segment, 'mdxPath' is the content path
export const generateStaticParams = generateStaticParamsFor('mdxPath', 'lang')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateMetadata(props: any) {
  const params = await props.params
  const mdxPath = params.mdxPath
  // Redirect index paths to getting-started
  if (!mdxPath || mdxPath.length === 0 || (mdxPath.length === 1 && mdxPath[0] === '')) {
    return {}
  }
  const { metadata } = await importPage(mdxPath, params.lang)
  return metadata
}

const Wrapper = getMDXComponents().wrapper

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function Page(props: any) {
  const params = await props.params
  const mdxPath = params.mdxPath

  // Handle index route - redirect to first section
  if (!mdxPath || mdxPath.length === 0 || (mdxPath.length === 1 && mdxPath[0] === '')) {
    redirect(`/${params.lang}/getting-started`)
  }

  const result = await importPage(mdxPath, params.lang)
  const { default: MDXContent, toc, metadata } = result
  return (
    <Wrapper toc={toc} metadata={metadata}>
      <MDXContent {...props} params={params} />
    </Wrapper>
  )
}
