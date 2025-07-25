import * as React from 'react'

import { ColorModeScript } from '@chakra-ui/react'
import '@fontsource-variable/inter'
import { Metadata } from 'next'
import { cookies } from 'next/headers'

import { LemonSqueezyScript } from '../lib/lemonsqueezy'
import { Provider } from './provider'

export const metadata: Metadata = {
  title: {
    template: '%s | Saas UI',
    default: 'Saas UI',
  },
  icons: {
    icon: '/favicons/favicon-32x32.png',
    apple: '/favicons/apple-touch-icon.png',
  },
}

export default async function AppRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()

  const colorMode = (cookieStore.get('chakra-ui-color-mode')?.value ??
    'dark') as 'light' | 'dark'

  return (
    <html data-theme={colorMode} style={{ colorScheme: colorMode }}>
      <body className={`chakra-ui-${colorMode}`}>
        <LemonSqueezyScript />
        <ColorModeScript initialColorMode={colorMode} type="cookie" />
        <Provider>{children}</Provider>
      </body>
    </html>
  )
}
