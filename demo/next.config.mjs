import bundleAnalyzer from '@next/bundle-analyzer'
import withWorkspaces from '@saas-ui/next-workspaces'
import withSvgr from 'next-svgr'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ['@saas-ui/date-picker'],
  experimental: {
    turbo: {
      resolveAlias: {
        '@saas-ui-pro/react': '@saas-ui-pro/react/src',
        '@saas-ui-pro/billing': '@saas-ui-pro/billing/src',
        '@saas-ui-pro/onboarding': '@saas-ui-pro/onboarding/src',
        '@saas-ui-pro/feature-flags': '@saas-ui-pro/feature-flags/src',
        '@saas-ui-pro/kanban': '@saas-ui-pro/kanban/src',
      },
    },
  },
}

export default withWorkspaces({
  workspaces: ['packages'],
  basePath: '../../',
})(withBundleAnalyzer(withSvgr(nextConfig)))
