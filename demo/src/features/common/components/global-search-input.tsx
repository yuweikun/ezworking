import * as React from 'react'

import { forwardRef, useMergeRefs } from '@chakra-ui/react'
import { Command } from '@saas-ui-pro/react'
import { useHotkeysShortcut } from '@saas-ui/react'

import { SearchInput } from '#components/search-input'

export const GlobalSearchInput = forwardRef((props, ref) => {
  const searchRef = React.useRef<HTMLInputElement>(null)

  const searchCommand = useHotkeysShortcut('general.search', () => {
    searchRef.current?.focus()
  })

  return (
    <SearchInput
      ref={useMergeRefs(ref, searchRef)}
      size="sm"
      sx={{
        bg: 'sidebar-background',
        borderColor: 'sidebar-border-color',
        _hover: {
          borderColor: 'sidebar-on',
        },
        _focus: {
          borderColor: 'sidebar-on',
        },
        '::placeholder': {
          color: 'sidebar-muted',
        },
        _dark: {
          bg: 'sidebar-background',
          borderColor: 'sidebar-border-color',
          _hover: {
            borderColor: 'sidebar-on',
          },
          _focus: {
            borderColor: 'sidebar-on',
          },
        },
      }}
      rightElement={
        <Command
          sx={{
            '.chakra-kbd': {
              bg: 'sidebar-on-muted',
              color: 'sidebar-text',
            },
          }}
        >
          {searchCommand}
        </Command>
      }
      {...props}
    />
  )
})
