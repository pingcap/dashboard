import {
  TimeRangeValue,
  useTimeRangeUrlState,
  useTn,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Box, Card, Group, Typography } from "@tidbcloud/uikit"

import { ChartBody } from "../../components/chart-body"
import { ChartHeader } from "../../components/chart-header"
import { SinglePanelConfig } from "../../utils/type"

// @ts-expect-error @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function useLocales() {
  const { tk } = useTn("metric")
  // used for gogocode to scan and generate en.json before build
  tk("panels.performance", "Performance")
  tk("panels.resource", "Resource")
  tk("panels.process", "Process")
}

export function AzoresHostMetricsPanel({
  config,
}: {
  config: SinglePanelConfig
}) {
  const { tk } = useTn("metric")
  const { timeRange, setTimeRange } = useTimeRangeUrlState()

  function handleTimeRangeChange(v: TimeRangeValue) {
    setTimeRange({ type: "absolute", value: v })
  }

  return (
    <Card p={16} bg="carbon.0">
      <Group mb={16}>
        <Typography variant="title-lg">
          {tk(`panels.${config.category}`)}
        </Typography>
      </Group>

      <Box
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))",
        }}
      >
        {config.charts.map((c, idx) => (
          <Box key={c.title + idx}>
            <ChartHeader title={c.title} config={c} />
            <ChartBody
              config={c}
              timeRange={timeRange}
              onTimeRangeChange={handleTimeRangeChange}
            />
          </Box>
        ))}
      </Box>
    </Card>
  )
}
