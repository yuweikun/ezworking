'use client'

import { useAuth } from '@saas-ui/auth'
import { LoadingOverlay, LoadingSpinner } from '@saas-ui/react'

import { HomePage } from '#features/organizations/pages/home'

export const IndexPage = () => {
  const { isAuthenticated, isLoggingIn } = useAuth()

  if (isLoggingIn) {
    return (
      <LoadingOverlay variant="fullscreen">
        <LoadingSpinner />
      </LoadingOverlay>
    )
  }

  if (isAuthenticated) {
    return <HomePage />
  }
}
