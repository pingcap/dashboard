import { TimeRangePicker } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import {
  Card,
  Group,
  SimpleGrid,
  Typography,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import {
  useTimeRangeUrlState,
  useTn,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import dayjs from "dayjs"

import { ChartCard } from "../../components/chart-card"
import { SinglePanelConfig } from "../../utils/type"

const QUICK_RANGES: number[] = [
  5 * 60, // 5 mins
  15 * 60,
  30 * 60,
  60 * 60,
  6 * 60 * 60,
  12 * 60 * 60,
  24 * 60 * 60,
  2 * 24 * 60 * 60,
  3 * 24 * 60 * 60, // 3 days
  7 * 24 * 60 * 60, // 7 days
]

export function AzoresHostMetricsPanel(props: { config: SinglePanelConfig }) {
  const { tk } = useTn("metric")

  // used for gogocode to scan and generate en.json in build time
  tk("panels.performance", "Performance")
  tk("panels.resource", "Resource")
  tk("panels.memory", "Memory")

  const { timeRange, setTimeRange } = useTimeRangeUrlState()

  const timeRangePicker = (
    <TimeRangePicker
      value={timeRange}
      onChange={(v) => {
        setTimeRange(v)
      }}
      quickRanges={QUICK_RANGES}
      minDateTime={() =>
        dayjs()
          .subtract(QUICK_RANGES[QUICK_RANGES.length - 1], "seconds")
          .toDate()
      }
      maxDateTime={() => dayjs().toDate()}
    />
  )

  return (
    <Card p={24} bg="carbon.0">
      <Group mb={20}>
        <Typography variant="title-lg">
          {tk(`panels.${props.config.category}`)}
        </Typography>
        <Group ml="auto">{timeRangePicker}</Group>
      </Group>

      <SimpleGrid
        type="container"
        cols={{ base: 1, "900px": 2, "1350px": 3, "1800px": 4 }}
        spacing="xl"
      >
        {props.config.charts.map((c) => (
          <ChartCard key={c.title} config={c} timeRange={timeRange} />
        ))}
      </SimpleGrid>
    </Card>
  )
}
