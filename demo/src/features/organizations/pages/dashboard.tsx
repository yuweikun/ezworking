'use client'

import { useState } from 'react'

import {
  Card,
  Grid,
  GridItem,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@chakra-ui/react'
import {
  ErrorPage,
  Page,
  PageBody,
  PageHeader,
  Toolbar,
  ToolbarButton,
} from '@saas-ui-pro/react'
import { useQuery } from '@tanstack/react-query'
import { FaDiscord, FaGithub, FaTwitter } from 'react-icons/fa'

import { getDashboard } from '#api'
import {
  DateRange,
  DateRangePicker,
  DateRangePresets,
  getRangeDiff,
  getRangeValue,
} from '#components/date-picker'
import { SegmentedControl } from '#components/segmented-control'
import { useWorkspace } from '#features/common/hooks/use-workspace'

import { IntroTour } from '../components/intro-tour'
import { Activity } from '../components/metrics/activity'
import { Metric } from '../components/metrics/metric'
import { RevenueChart } from '../components/metrics/revenue-chart'
import { SalesByCountry } from '../components/metrics/sales-by-country'

export function DashboardPage() {
  const workspace = useWorkspace()

  const [range, setRange] = useState('30d')
  const [dateRange, setDateRange] = useState(getRangeValue('30d'))
  const onPresetChange = (preset: string) => {
    if (preset !== 'custom') {
      setDateRange(getRangeValue(preset as DateRangePresets))
    }
    setRange(preset)
  }

  const onRangeChange = (range: DateRange) => {
    const diff = getRangeDiff(range)
    if ([1, 3, 7, 30].includes(diff)) {
      setRange(`${diff}`)
    } else {
      setRange('custom')
    }

    setDateRange(range)
  }

  const { data, isLoading } = useQuery({
    queryKey: [
      'dashboard',
      {
        workspace,
        startDate: dateRange.start.toString(),
        endDate: dateRange.end.toString(),
      },
    ] as const,
    queryFn: ({ queryKey }) => getDashboard(queryKey[1]),
    enabled: !!workspace,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  })

  const organization = data?.organization

  if (!isLoading && !organization) {
    return (
      <ErrorPage
        title="No organization found"
        description={`We couldn't find a organization named ${workspace}`}
      />
    )
  }

  const toolbar = (
    <Toolbar className="overview-toolbar" variant="ghost">
      <ToolbarButton
        as="a"
        href="https://twitter.com/intent/tweet?text=Check%20out%20%40saas_js,%20an%20advanced%20component%20library%20for%20SaaS%20products%20build%20with%20%40chakra_ui.%20https%3A//saas-ui.dev%20"
        icon={<FaTwitter />}
        label="Share on Twitter"
      />
      <ToolbarButton
        as="a"
        href="https://github.com/saas-js/saas-ui"
        icon={<FaGithub />}
        label="Star on Github"
      />
      <ToolbarButton
        as="a"
        href="https://discord.gg/4PmJGFcAjX"
        icon={<FaDiscord />}
        label="Join Discord"
      />
      <ToolbarButton
        as="a"
        href="https://saas-ui.lemonsqueezy.com/checkout/buy/5c76854f-738a-46b8-b32d-932a97d477f5"
        label="Buy Pro"
        colorScheme="primary"
        variant="solid"
        className="pre-order"
      />
    </Toolbar>
  )

  const footer = (
    <Toolbar justifyContent="flex-start" variant="secondary" size="xs">
      <SegmentedControl
        size="xs"
        segments={[
          {
            id: '1d',
            label: '1d',
          },
          {
            id: '3d',
            label: '3d',
          },
          {
            id: '7d',
            label: '7d',
          },
          { id: '30d', label: '30d' },
          { id: 'custom', label: 'Custom' },
        ]}
        value={range}
        onChange={onPresetChange}
      />
      <DateRangePicker value={dateRange} onChange={onRangeChange} />
    </Toolbar>
  )

  return (
    <Page isLoading={isLoading}>
      <PageHeader
        title={organization?.name}
        toolbar={toolbar}
        footer={footer}
      />
      <PageBody
        contentWidth="container.2xl"
        bg="page-body-bg-subtle"
        py={{ base: 4, xl: 8 }}
        px={{ base: 4, xl: 8 }}
      >
        <IntroTour />
        <Grid
          templateColumns={['repeat(1, 1fr)', null, null, 'repeat(2, 1fr)']}
          gridAutoColumns="fr1"
          width="100%"
          gap={{ base: 4, xl: 8 }}
          pb="8"
        >
          <GridItem colSpan={{ base: 1, lg: 2 }} maxW="100vw">
            <Card>
              <Tabs variant="unstyled" tabIndex={0}>
                <TabList
                  overflow="hidden"
                  borderTopRadius="md"
                  display="flex"
                  flexWrap="wrap"
                >
                  {data?.charts.map((metric) => (
                    <Tab
                      key={metric.id}
                      id={metric.id}
                      alignItems="stretch"
                      justifyContent="stretch"
                      flex={{ base: '0 0 50%', lg: '1 0 auto' }}
                      height="auto"
                      textAlign="left"
                      borderBottomWidth="1px"
                      borderRightWidth="1px"
                      _hover={{
                        bg: 'whiteAlpha.100',
                        _dark: {
                          bg: 'whiteAlpha.100',
                        },
                      }}
                      _selected={{
                        borderBottomWidth: '2px',
                        borderBottomColor: 'primary.500',
                        display: 'flex',
                      }}
                      _last={{
                        borderRightWidth: '0',
                      }}
                    >
                      <Metric {...metric} />
                    </Tab>
                  ))}
                </TabList>
                <TabPanels>
                  {data?.charts.map((metric) => (
                    <TabPanel key={metric.id} pt="8">
                      <RevenueChart data={metric.data} />
                    </TabPanel>
                  ))}
                </TabPanels>
              </Tabs>
            </Card>
          </GridItem>
          <GridItem as={SalesByCountry} data={data?.sales} />
          <GridItem as={Activity} data={data?.activity} />
        </Grid>
      </PageBody>
    </Page>
  )
}
