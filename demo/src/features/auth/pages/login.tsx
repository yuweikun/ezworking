'use client'

import { Container, Stack, Text } from '@chakra-ui/react'
import { LoginView, useAuth } from '@saas-ui/auth'
import { LoadingOverlay, LoadingSpinner } from '@saas-ui/react'

import { Link } from '#components/link'
import { Logo } from '#components/logo'
import { authProviders, authType } from '#config'

export const LoginPage = () => {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return (
      <LoadingOverlay variant="fullscreen">
        <LoadingSpinner />
      </LoadingOverlay>
    )
  }

  return (
    <Stack flex="1" direction="row">
      <Stack
        flex="1"
        alignItems="center"
        justify="center"
        direction="column"
        spacing="8"
      >
        <Container>
          <Logo margin="0 auto" mb="12" />
          <LoginView title="Log in" type={authType} providers={authProviders}>
            <Link href="/forgot_password">Forgot your password?</Link>
          </LoginView>
        </Container>

        <Text color="muted">
          Don't have an account yet?{' '}
          <Link href="/signup" color="chakra-body-text">
            Sign up
          </Link>
          .
        </Text>
      </Stack>
    </Stack>
  )
}
