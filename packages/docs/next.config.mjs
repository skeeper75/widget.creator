import nextra from 'nextra'

const withNextra = nextra({
  defaultShowCopyCode: true,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // i18n configuration tells Nextra which locales to generate
  // The [lang] dynamic route handles actual routing
  i18n: {
    locales: ['ko', 'en'],
    defaultLocale: 'ko',
  },
  reactStrictMode: true,
}

export default withNextra(nextConfig)
