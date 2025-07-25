import * as React from 'react'

import { BillingStatus } from '@saas-ui-pro/billing'
import { useFeatures } from '@saas-ui-pro/feature-flags'
import { useAuth } from '@saas-ui/auth'
import { useQueries } from '@tanstack/react-query'
import { parseISO } from 'date-fns'

import { getCurrentUser, getOrganization } from '#api'
import { plans } from '#config'

import { useWorkspace } from './use-workspace'

/**
 * Use this hook to load all required data for the app to function.
 * Like user data, billing subscription, feature flags, etc.
 **/
export const useInitApp = () => {
  const { isLoading, isAuthenticated, isLoggingIn } = useAuth()

  /**
   * Get the workspace (organization slug), from the query params
   * You could persist the active workspace in the user profile and retrieve it from `currentUser`.
   */
  const slug = useWorkspace()

  /**
   * The features context
   */
  const features = useFeatures()

  /**
   * Load current user and organization (workspace) data serially
   */
  const [
    { data: userData, isFetched: currentUserIsFetched },
    { data: orgData },
  ] = useQueries({
    queries: [
      {
        queryKey: ['CurrentUser'],
        queryFn: getCurrentUser,
        enabled: isAuthenticated,
      },
      {
        queryKey: [
          'Organization',
          {
            slug,
          },
        ] as const,
        queryFn: () => getOrganization({ slug }),
        enabled: isAuthenticated && !!slug,
      },
    ],
  })

  const currentUser = userData?.currentUser
  const organization = orgData?.organization
  const subscription = organization?.subscription

  const billing = React.useMemo(() => {
    return {
      plans: plans,
      status: subscription?.status as BillingStatus,
      planId: subscription?.plan,
      startedAt: subscription?.startedAt
        ? parseISO(subscription.startedAt)
        : undefined,
      trialEndsAt: subscription?.trialEndsAt
        ? parseISO(subscription.trialEndsAt)
        : undefined,
    }
  }, [subscription])

  /**
   * Identify the user in the feature flags context
   */
  React.useEffect(() => {
    if (currentUser && organization) {
      const member = organization.members.find(
        (member) => member.user.id === currentUser.id,
      )

      features.identify({
        id: currentUser.id,
        roles: member?.roles || [],
        plan: subscription?.plan,
      })
    }
  }, [currentUser?.id, organization?.members, subscription?.plan])

  return {
    isInitializing:
      isLoading || isLoggingIn || (isAuthenticated && !currentUserIsFetched),
    isAuthenticated,
    billing,
  }
}
