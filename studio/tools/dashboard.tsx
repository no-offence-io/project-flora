import {Badge, Box, Button, Card, Container, Flex, Grid, Heading, Spinner, Stack, Text} from '@sanity/ui'
import {useEffect, useState} from 'react'
import {useClient, type Tool} from 'sanity'
import {useRouter} from 'sanity/router'
import {Icon} from '@sanity/icons'

/**
 * The landing tab: what happened in the shop, what needs doing, and one click to every part of the
 * site. Reads only order and product documents — the same data the Orders and Products lists show —
 * so it needs no extra access and nothing beyond the Studio login.
 */

type Stats = {
  today: {totalOre: number}[]
  week: {totalOre: number}[]
  month: {totalOre: number}[]
  toPack: number
  latest: {_id: string; orderNumber?: string; status?: string; totalOre?: number; orderedAt?: string; name?: string}[]
  lowStock: {_id: string; name?: string; stock?: number}[]
}

const STATS_QUERY = `{
  "today": *[_type == "order" && orderedAt >= $today]{totalOre},
  "week":  *[_type == "order" && orderedAt >= $week]{totalOre},
  "month": *[_type == "order" && orderedAt >= $month]{totalOre},
  "toPack": count(*[_type == "order" && status == "paid"]),
  "latest": *[_type == "order"] | order(orderedAt desc)[0...6]{
    _id, orderNumber, status, totalOre, orderedAt, "name": customer.name
  },
  "lowStock": *[_type == "product" && visible != false && stock <= 3] | order(stock asc)[0...6]{
    _id, "name": name[_key == "en"][0].value, stock
  }
}`

const nok = new Intl.NumberFormat('nb-NO', {style: 'currency', currency: 'NOK', maximumFractionDigits: 0})
const kr = (ore: number) => nok.format(ore / 100)
const sum = (rows: {totalOre: number}[]) => rows.reduce((t, r) => t + (r.totalOre ?? 0), 0)
const startOf = (daysBack: number) => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - daysBack)
  return d.toISOString()
}

const STATUS_TONE: Record<string, 'positive' | 'primary' | 'default' | 'caution' | 'critical'> = {
  paid: 'caution',
  shipped: 'primary',
  delivered: 'positive',
  refunded: 'default',
  cancelled: 'critical',
}

function Dashboard() {
  const client = useClient({apiVersion: '2026-02-01'})
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = {today: startOf(0), week: startOf(7), month: startOf(30)}
    let cancelled = false
    client
      .fetch<Stats>(STATS_QUERY, params)
      .then((s) => !cancelled && setStats(s))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      cancelled = true
    }
  }, [client])

  const open = (path: string) => () => router.navigateUrl({path})
  const edit = (id: string, type: string) => () => router.navigateIntent('edit', {id, type})

  return (
    <Container width={3} padding={4}>
      <Stack gap={5}>
        <Box>
          <Heading as="h1" size={3}>
            Flöra
          </Heading>
          <Text muted size={1} style={{marginTop: 6}}>
            {new Date().toLocaleDateString('nb-NO', {weekday: 'long', day: 'numeric', month: 'long'})}
          </Text>
        </Box>

        {error && (
          <Card tone="critical" padding={3} radius={2}>
            <Text size={1}>Could not load the overview: {error}</Text>
          </Card>
        )}

        <Grid gridTemplateColumns={[1, 2, 4]} gap={3}>
          <Stat label="Today" value={stats ? kr(sum(stats.today)) : null} sub={stats ? `${stats.today.length} orders` : undefined} />
          <Stat label="Last 7 days" value={stats ? kr(sum(stats.week)) : null} sub={stats ? `${stats.week.length} orders` : undefined} />
          <Stat label="Last 30 days" value={stats ? kr(sum(stats.month)) : null} sub={stats ? `${stats.month.length} orders` : undefined} />
          <Stat label="To be packed" value={stats ? String(stats.toPack) : null} tone={stats && stats.toPack > 0 ? 'caution' : undefined} />
        </Grid>

        <Grid gridTemplateColumns={[1, 1, 2]} gap={4}>
          <Card padding={4} radius={3} shadow={1}>
            <Stack gap={3}>
              <Flex align="center" justify="space-between">
                <Heading size={1}>Latest orders</Heading>
                <Button text="All orders" mode="ghost" fontSize={1} onClick={open('/structure/order')} />
              </Flex>
              {!stats ? (
                <Spinner />
              ) : stats.latest.length === 0 ? (
                <Text muted size={1}>No orders yet. They appear here automatically when someone pays.</Text>
              ) : (
                stats.latest.map((o) => (
                  <Card key={o._id} padding={3} radius={2} tone="transparent" border style={{cursor: 'pointer'}} onClick={edit(o._id, 'order')}>
                    <Flex align="center" justify="space-between" gap={3}>
                      <Stack gap={2}>
                        <Text weight="semibold" size={1}>
                          {o.orderNumber ?? 'Order'} · {o.name ?? ''}
                        </Text>
                        <Text muted size={1}>
                          {o.orderedAt ? new Date(o.orderedAt).toLocaleString('nb-NO', {dateStyle: 'short', timeStyle: 'short'}) : ''}
                        </Text>
                      </Stack>
                      <Flex align="center" gap={3}>
                        <Badge tone={STATUS_TONE[o.status ?? ''] ?? 'default'}>{o.status}</Badge>
                        <Text size={1}>{kr(o.totalOre ?? 0)}</Text>
                      </Flex>
                    </Flex>
                  </Card>
                ))
              )}
            </Stack>
          </Card>

          <Stack gap={4}>
            <Card padding={4} radius={3} shadow={1}>
              <Stack gap={3}>
                <Heading size={1}>Edit the site</Heading>
                <Grid gridTemplateColumns={2} gap={2}>
                  <Button text="Products" icon={<Icon symbol="tag" />} mode="ghost" onClick={open('/structure/product')} />
                  <Button text="Front page" icon={<Icon symbol="home" />} mode="ghost" onClick={edit('homePage', 'homePage')} />
                  <Button text="FAQ" icon={<Icon symbol="help-circle" />} mode="ghost" onClick={open('/structure/faqItem')} />
                  <Button text="Policy pages" icon={<Icon symbol="document" />} mode="ghost" onClick={open('/structure/policyPage')} />
                  <Button text="Site settings" icon={<Icon symbol="cog" />} mode="ghost" onClick={edit('siteSettings', 'siteSettings')} />
                  <Button text="Open the shop" icon={<Icon symbol="launch" />} mode="ghost" as="a" href="https://www.prosjectflora.com" target="_blank" rel="noreferrer" />
                </Grid>
                <Text muted size={1}>
                  Every text has an English field and a <strong>+ Norsk</strong> button beneath it for the Norwegian version.
                </Text>
              </Stack>
            </Card>

            <Card padding={4} radius={3} shadow={1} tone={stats && stats.lowStock.length > 0 ? 'caution' : 'default'}>
              <Stack gap={3}>
                <Heading size={1}>Low stock</Heading>
                {!stats ? (
                  <Spinner />
                ) : stats.lowStock.length === 0 ? (
                  <Text muted size={1}>Nothing is running out.</Text>
                ) : (
                  stats.lowStock.map((p) => (
                    <Flex key={p._id} align="center" justify="space-between" style={{cursor: 'pointer'}} onClick={edit(p._id, 'product')}>
                      <Text size={1}>{p.name ?? 'Product'}</Text>
                      <Badge tone={(p.stock ?? 0) === 0 ? 'critical' : 'caution'}>{p.stock ?? 0} left</Badge>
                    </Flex>
                  ))
                )}
              </Stack>
            </Card>
          </Stack>
        </Grid>
      </Stack>
    </Container>
  )
}

function Stat({label, value, sub, tone}: {label: string; value: string | null; sub?: string; tone?: 'caution'}) {
  return (
    <Card padding={4} radius={3} shadow={1} tone={tone}>
      <Stack gap={3}>
        <Text muted size={1}>{label}</Text>
        {value === null ? <Spinner /> : <Heading size={3}>{value}</Heading>}
        {sub && <Text muted size={1}>{sub}</Text>}
      </Stack>
    </Card>
  )
}

export const dashboardTool: Tool = {
  name: 'dashboard',
  title: 'Dashboard',
  icon: () => <Icon symbol="dashboard" />,
  component: Dashboard,
}
