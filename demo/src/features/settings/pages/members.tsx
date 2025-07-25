'use client'

import * as React from 'react'

import { Section, SectionBody, SectionHeader } from '@saas-ui-pro/react'
import { useSnackbar } from '@saas-ui/react'
import { useMutation, useQuery } from '@tanstack/react-query'

import {
  getOrganization,
  inviteToOrganization,
  removeUserFromOrganization,
  updateMemberRoles,
} from '#api'
import { InviteData } from '#components/invite-dialog'
import { useModals } from '#components/modals'
import { SettingsPage } from '#components/settings-page'
import { useWorkspace } from '#features/common/hooks/use-workspace'
import {
  Member,
  MembersList,
} from '#features/organizations/components/members-list'

export function MembersSettingsPage() {
  const slug = useWorkspace()
  const snackbar = useSnackbar()
  const modals = useModals()

  const { data, isLoading } = useQuery({
    queryKey: ['Organization', slug],
    queryFn: () => getOrganization({ slug }),
  })

  const organization = data?.organization

  if (!isLoading && !organization) {
    return null
  }

  const members =
    organization?.members.map(
      ({ roles, user: { id, email, name, status } }) => {
        return {
          id,
          email,
          name,
          status,
          roles,
        } as Member
      },
    ) || []

  const inviteUser = useMutation({
    mutationFn: inviteToOrganization,
  })

  const removeUser = useMutation({
    mutationFn: removeUserFromOrganization,
  })

  const updateRoles = useMutation({
    mutationFn: updateMemberRoles,
  })

  const onInvite = async ({ emails, role }: InviteData) => {
    if (!organization) return

    return snackbar.promise(
      inviteUser.mutateAsync({
        organizationId: organization.id,
        emails,
        role,
      }),
      {
        loading:
          emails.length === 1
            ? `Inviting ${emails[0]}...`
            : `Inviting ${emails.length} people...`,
        success: `Invitation(s) have been sent.`,
        error: (err: Error) => err.message,
      },
    )
  }

  const onCancelInvite = async (member: Member) => {
    if (!organization) return

    return snackbar.promise(
      removeUser.mutateAsync({
        userId: member.id,
        organizationId: organization.id,
      }),
      {
        loading: `Removing ${member.email}...`,
        success: `Removed ${member.email}!`,
        error: (err: Error) => err.message,
      },
    )
  }

  const onRemove = (member: Member) => {
    if (!organization) return

    modals.confirm?.({
      title: 'Remove member',
      body: `Are you sure you want to remove ${member.email} from ${
        organization.name || 'this organization'
      }?`,
      confirmProps: {
        colorScheme: 'red',
        children: 'Remove',
      },
      onConfirm: async () => {
        await snackbar.promise(
          removeUser.mutateAsync({
            organizationId: organization.id,
            userId: member.id,
          }),
          {
            loading: `Removing ${member.email}...`,
            success: `Removed ${member.email}!`,
            error: (err: Error) => err.message,
          },
        )
      },
    })
  }

  const onUpdateRoles = async (member: Member, roles: string[]) => {
    if (!organization) return

    return updateRoles.mutateAsync({
      userId: member.id,
      organizationId: organization.id,
      roles,
    })
  }

  return (
    <SettingsPage
      isLoading={isLoading}
      title="Members"
      description="Manage who can access your organization"
    >
      <Section variant="annotated">
        <SectionHeader title="Members" description="Invite your colleagues" />
        <SectionBody>
          <MembersList
            members={members}
            onInvite={onInvite}
            onCancelInvite={onCancelInvite}
            onRemove={onRemove}
            onUpdateRoles={onUpdateRoles}
          />
        </SectionBody>
      </Section>
    </SettingsPage>
  )
}
