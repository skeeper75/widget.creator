/* eslint-disable @typescript-eslint/no-explicit-any */
import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'

export const metadata = {
  metadataBase: new URL('https://docs.huni.builder'),
  title: {
    template: '%s - huni.builder Docs',
    default: 'huni.builder Docs'
  },
  description:
    'huni.builder - Build and manage pricing widgets for your e-commerce platform.',
  openGraph: {
    title: 'huni.builder Docs',
    description:
      'huni.builder - Build and manage pricing widgets for your e-commerce platform.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'huni.builder Docs'
      }
    ]
  }
}

const i18nConfig: Record<string, { name: string; direction?: 'ltr' | 'rtl' }> =
  {
    ko: { name: '한국어' },
    en: { name: 'English' }
  }

export default async function RootLayout(props: any) {
  const { children, params } = props
  const { lang } = await params
  const langDir = lang === 'ar' ? 'rtl' : 'ltr'

  const pageMap = await getPageMap(`/${lang}`)

  const navbar = (
    <Navbar
      logo={
        <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>
          huni.builder
        </span>
      }
      projectLink="https://github.com/skeeper75/huni.builder"
    />
  )

  const footer = (
    <Footer>
      <span>
        {new Date().getFullYear()} &copy; huni.builder. All rights reserved.
      </span>
    </Footer>
  )

  return (
    <html lang={lang} dir={langDir} suppressHydrationWarning>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body>
        <Layout
          navbar={navbar}
          pageMap={pageMap}
          docsRepositoryBase="https://github.com/skeeper75/huni.builder/tree/main/packages/docs"
          footer={footer}
          i18n={[
            { locale: 'ko', name: '한국어' },
            { locale: 'en', name: 'English' }
          ]}
          darkMode
          sidebar={{ defaultMenuCollapseLevel: 1 }}
          toc={{ backToTop: true }}
          editLink="Edit this page on GitHub"
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}

export function generateStaticParams() {
  return Object.keys(i18nConfig).map((lang) => ({ lang }))
}
