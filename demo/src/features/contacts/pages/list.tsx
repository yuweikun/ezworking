'use client'

import * as React from 'react'

import {
  Box,
  Button,
  HStack,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Portal,
  Spacer,
} from '@chakra-ui/react'
import {
  Command,
  DataGridCell,
  Filter,
  MenuProperty,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  ToolbarButton,
  getDataGridFilter,
  useColumns,
} from '@saas-ui-pro/react'
import {
  EmptyState,
  Link,
  PersonaAvatar,
  Select,
  SelectButton,
  SelectList,
  SelectOption,
  useHotkeysShortcut,
  useLocalStorage,
  useSnackbar,
} from '@saas-ui/react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useParams } from 'next/navigation'
import { FiGrid, FiList, FiSliders, FiUser } from 'react-icons/fi'
import { z } from 'zod'

import { Contact, createContact, getContacts, updateContact } from '#api'
import { InlineSearch } from '#components/inline-search'
import { ListPage, ListPageProps } from '#components/list-page'
import { useModals } from '#components/modals'
import { OverflowMenu } from '#components/overflow-menu'
import { usePath } from '#features/common/hooks/use-path'

import { ContactBoardHeader } from '../components/contact-board-header'
import { bulkActions } from '../components/contact-bulk-actions'
import { ContactCard } from '../components/contact-card'
import { AddFilterButton, filters } from '../components/contact-filters'
import { ContactStatus } from '../components/contact-status'
import { ContactTag } from '../components/contact-tag'
import { ContactType } from '../components/contact-type'
import { ContactTypes } from '../components/contact-types'

const DateCell = React.memo(({ date }: { date?: string }) => {
  return <>{date ? format(new Date(date), 'PP') : null}</>
})

const ActionCell: DataGridCell<Contact> = (cell) => {
  return (
    <Box onClick={(e) => e.stopPropagation()}>
      <OverflowMenu>
        <MenuItem onClick={() => console.log(cell.row.id)}>Delete</MenuItem>
      </OverflowMenu>
    </Box>
  )
}

const schema = z.object({
  firstName: z
    .string()
    .min(2, 'Too short')
    .max(25, 'Too long')
    .describe('First name'),
  lastName: z
    .string()
    .min(2, 'Too short')
    .max(25, 'Too long')
    .describe('Last name'),
  email: z.string().email().describe('Email'),
})

export function ContactsListPage() {
  const modals = useModals()
  const snackbar = useSnackbar()
  const query = useParams()

  const basePath = usePath('/')
  const type = query?.type?.toString()

  const [searchQuery, setSearchQuery] = React.useState('')

  const { data, isLoading } = useQuery({
    queryKey: [
      'GetContacts',
      {
        type,
      },
    ] as const,
    queryFn: ({ queryKey }) => getContacts(queryKey[1]),
  })

  const createContactMutation = useMutation({
    mutationFn: createContact,
  })

  const updateContactMutation = useMutation({
    mutationFn: updateContact,
  })

  const columns = useColumns<Contact>(
    (helper) => [
      helper.accessor('name', {
        header: 'Name',
        size: 200,
        enableHiding: false,
        cell: (cell) => (
          <HStack spacing="4">
            <PersonaAvatar
              name={cell.getValue()}
              src={cell.row.original.avatar}
              size="xs"
            />
            <Link href={`${basePath}/contacts/view/${cell.row.id}`}>
              {cell.getValue()}
            </Link>
          </HStack>
        ),
      }),
      helper.accessor('email', {
        header: 'Email',
        size: 300,
        meta: {
          cellProps: {
            color: 'muted',
          },
        },
      }),
      helper.accessor('createdAt', {
        header: 'Created at',
        cell: (cell) => <DateCell date={cell.getValue()} />,
        filterFn: getDataGridFilter('date'),
        enableGlobalFilter: false,
      }),
      helper.accessor('updatedAt', {
        header: 'Updated at',
        cell: (cell) => <DateCell date={cell.getValue()} />,
        filterFn: getDataGridFilter('date'),
        enableGlobalFilter: false,
      }),
      helper.accessor('type', {
        header: 'Type',
        cell: (cell) => <ContactType type={cell.getValue()} />,
        filterFn: getDataGridFilter('string'),
        enableGlobalFilter: false,
      }),
      helper.accessor('tags', {
        header: 'Tags',
        cell: (cell) => (
          <HStack>
            {cell.getValue()?.map((tag) => <ContactTag key={tag} tag={tag} />)}
          </HStack>
        ),
        filterFn: getDataGridFilter('string'),
        enableGlobalFilter: false,
      }),
      helper.accessor('status', {
        header: 'Status',
        cell: (cell) => (
          <ContactStatus status={cell.getValue()} color="muted" />
        ),
        filterFn: getDataGridFilter('string'),
        enableGlobalFilter: false,
      }),
      helper.display({
        id: 'action',
        header: '',
        cell: ActionCell,
        size: 60,
        enableGlobalFilter: false,
        enableHiding: false,
        enableSorting: false,
        enableGrouping: false,
        enableResizing: false,
      }),
    ],
    [],
  )

  const addPerson = () => {
    modals.form({
      title: 'Add person',
      defaultValues: {
        firstName: '',
        lastName: '',
        email: '',
      },
      schema,
      fields: {
        submit: {
          children: 'Save',
        },
      },
      onSubmit: async (contact) => {
        try {
          await createContactMutation.mutateAsync({
            ...contact,
            type: query?.type?.toString() || 'lead',
          }),
            modals.closeAll()
        } catch (e) {
          snackbar.error('Could not create contact')
        }
      },
    })
  }

  const addCommand = useHotkeysShortcut('contacts.add', addPerson)

  const [visibleColumns, setVisibleColumns] = useLocalStorage(
    'app.contacts.columns',
    ['name', 'email', 'createdAt', 'type', 'status'],
  )

  const displayProperties = (
    <ToggleButtonGroup
      type="checkbox"
      isAttached={false}
      size="xs"
      spacing="0"
      flexWrap="wrap"
      value={visibleColumns}
      onChange={setVisibleColumns}
    >
      {columns.map((col) => {
        if ('accessorKey' in col && col.enableHiding !== false) {
          const id = col.id || col.accessorKey
          return (
            <ToggleButton
              key={id}
              value={id}
              mb="1"
              me="1"
              color="muted"
              _checked={{ color: 'app-text', bg: 'whiteAlpha.200' }}
            >
              {id.charAt(0).toUpperCase() + id.slice(1)}
            </ToggleButton>
          )
        }
        return null
      })}
    </ToggleButtonGroup>
  )

  const [groupBy, setGroupBy] = useLocalStorage(
    'app.contacts.groupBy',
    'status',
  )

  const groupBySelect = (
    <Select
      name="groupBy"
      value={groupBy}
      onChange={(value) => setGroupBy(value as string)}
      size="xs"
    >
      <SelectButton>Status</SelectButton>
      <Portal>
        <SelectList zIndex="dropdown">
          <SelectOption value="status">Status</SelectOption>
          <SelectOption value="type">Type</SelectOption>
          <SelectOption value="tags">Tag</SelectOption>
        </SelectList>
      </Portal>
    </Select>
  )

  const primaryAction = (
    <ToolbarButton
      label="Add person"
      variant="primary"
      onClick={addPerson}
      tooltipProps={{
        label: (
          <>
            Add a person <Command>{addCommand}</Command>
          </>
        ),
      }}
    />
  )

  const [view, setView] = useLocalStorage<'list' | 'board'>(
    'app.contacts.view',
    'board',
  )

  const toolbar = (
    <Toolbar size="sm">
      <InlineSearch
        placeholder="Search by name or email..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onReset={() => setSearchQuery('')}
      />
      {primaryAction}
    </Toolbar>
  )

  const tabbar = (
    <Toolbar>
      <ContactTypes />
      <AddFilterButton />
      <Spacer />
      <ToggleButtonGroup
        value={view}
        onChange={setView}
        type="radio"
        size="xs"
        width="auto"
      >
        <ToggleButton value="list">
          <FiList />
        </ToggleButton>
        <ToggleButton value="board">
          <FiGrid />
        </ToggleButton>
      </ToggleButtonGroup>
      <Menu>
        <MenuButton
          as={ToolbarButton}
          leftIcon={<FiSliders />}
          label="Display"
          size="xs"
          variant="secondary"
        />

        <MenuList maxW="260px" zIndex="dropdown">
          {
            /* not supported by DataGrid */ view === 'board' ? (
              <MenuProperty label="Group by" value={groupBySelect} />
            ) : null
          }
          <MenuProperty
            label="Display properties"
            value={displayProperties}
            orientation="vertical"
          />
        </MenuList>
      </Menu>
    </Toolbar>
  )

  let defaultFilters: Filter[] = []

  if (query?.tag) {
    defaultFilters = [{ id: 'tags', operator: 'contains', value: query.tag }]
  }

  const emptyState = (
    <EmptyState
      title="No people added yet"
      description="Add a person or import data to get started."
      colorScheme="primary"
      icon={FiUser}
      actions={
        <>
          <Button colorScheme="primary" variant="solid" onClick={addPerson}>
            Add a person
          </Button>
          <Button>Import data</Button>
        </>
      }
    />
  )

  const board: ListPageProps<Contact>['board'] = {
    header: (header) => <ContactBoardHeader {...header} />,
    card: (row) => <ContactCard contact={row.original} />,
    groupBy,
    onCardDragEnd: ({ items, to, from }) => {
      // This is a bare minimum example, you likely need more logic for updating the sort order and changing tags.

      // Get the contact data
      const contact = data?.contacts.find(
        ({ id }) => id === items[to.columnId][to.index],
      )

      const [field, toValue] = (to.columnId as string).split(':') as [
        keyof Contact,
        string,
      ]
      const [, prevValue] = (from.columnId as string).split(':')

      if (!contact) {
        throw new Error('Contact not found')
      }

      const prevId = items[to.columnId][to.index - 1]
      let prevContact = data?.contacts.find(({ id }) => id === prevId)

      const nextId = items[to.columnId][to.index + 1]
      let nextContact = data?.contacts.find(({ id }) => id === nextId)

      if (prevContact && !nextContact) {
        // last in the column
        nextContact =
          data?.contacts[
            data?.contacts.findIndex(({ id }) => id === prevId) + 1
          ]
      } else if (!prevContact && !nextContact) {
        // first in the column
        prevContact =
          data?.contacts[
            data?.contacts.findIndex(({ id }) => id === prevId) - 1
          ]
      }

      const prevSortOrder = prevContact?.sortOrder || 0
      const nextSortOrder = nextContact?.sortOrder || data?.contacts.length || 0

      const sortOrder = (prevSortOrder + nextSortOrder) / 2 || to.index

      let value: string | string[] = toValue
      // if the field is an array, we replace the old value
      if (Array.isArray(contact[field])) {
        value = (value !== '' ? [value] : []).concat(
          (contact[field] as string[]).filter((v) => v !== prevValue),
        )
      }

      updateContactMutation.mutateAsync({
        id: contact.id,
        [field]: value,
        sortOrder,
      })
    },
  }

  return (
    <ListPage<Contact>
      title="Contacts"
      toolbar={toolbar}
      tabbar={tabbar}
      bulkActions={bulkActions}
      filters={filters}
      defaultFilters={defaultFilters}
      searchQuery={searchQuery}
      emptyState={emptyState}
      columns={columns}
      visibleColumns={visibleColumns}
      data={data?.contacts as Contact[]}
      isLoading={isLoading}
      view={view}
      board={board}
      initialState={{
        pagination: {
          pageSize: 20,
        },
        columnPinning: {
          left: ['selection', 'name'],
          right: ['action'],
        },
      }}
    />
  )
}
