'use client'

import React from 'react'

import { AuthProvider as BaseAuthProvider } from '@saas-ui/auth'

import { authService } from '#config'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = (
  props,
) => {
  return <BaseAuthProvider {...authService} {...props} />
}
