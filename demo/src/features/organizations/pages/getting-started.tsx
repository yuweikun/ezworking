'use client'

import * as React from 'react'

import { Center, Container } from '@chakra-ui/react'
import { useSessionStorageValue } from '@react-hookz/web'
import {
  LoadingOverlay,
  LoadingSpinner,
  Steps,
  StepsCompleted,
  StepsItem,
} from '@saas-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

import { getCurrentUser } from '#api'

import {
  CreateOrganizationStep,
  InviteTeamMembersStep,
  OnboardingPage,
} from '../components/onboarding'
import { AppearanceStep } from '../components/onboarding/appearance'
import { SubscribeStep } from '../components/onboarding/subscribe'

export const GettingStartedPage: React.FC = () => {
  const { isLoading } = useQuery({
    queryKey: ['CurrentUser'],
    queryFn: () => getCurrentUser(),
  })

  return (
    <OnboardingPage isLoading={isLoading}>
      <Container maxW="container.md">
        <Center minH="$100vh">
          <Steps variant="dots" flexDirection="column-reverse" width="full">
            <StepsItem title="Create organization">
              <CreateOrganizationStep />
            </StepsItem>
            <StepsItem title="Choose your style">
              <AppearanceStep />
            </StepsItem>
            <StepsItem title="Invite team members">
              <InviteTeamMembersStep />
            </StepsItem>
            <StepsItem title="Subscribe to updates">
              <SubscribeStep />
            </StepsItem>

            <StepsCompleted>
              <OnboardingCompleted />
            </StepsCompleted>
          </Steps>
        </Center>
      </Container>
    </OnboardingPage>
  )
}

const OnboardingCompleted = () => {
  const router = useRouter()
  const workspace = useSessionStorageValue('getting-started.workspace')

  React.useEffect(() => {
    router.push(`/${workspace.value}`)
  }, [])

  return (
    <LoadingOverlay
      variant="overlay"
      bg="chakra-body-bg"
      _dark={{ bg: 'chakra-body-bg' }}
    >
      <LoadingSpinner />
    </LoadingOverlay>
  )
}
