import { TimeRange } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { ActionIcon, Box, Group, Typography } from "@tidbcloud/uikit"
import { IconLayersThree02, IconRefreshCw02 } from "@tidbcloud/uikit/icons"

import {
  useChartState,
  useChartsSelectState,
} from "../shared-state/memory-state"
import { useMetricsUrlState } from "../shared-state/url-state"
import { SingleChartConfig } from "../utils/type"

import { ChartActionsMenu } from "./chart-actions-menu"

export function ChartHeader({
  title,
  enableDrillDown = false,
  showMoreActions = false,
  config,
  timeRange,
  children,
}: {
  title?: string
  enableDrillDown?: boolean
  showMoreActions?: boolean
  config: SingleChartConfig
  timeRange?: TimeRange
  children?: React.ReactNode
}) {
  const { setRefresh } = useMetricsUrlState()
  const setSelectedChart = useChartState((state) => state.setSelectedChart)
  const setTimeRange = useChartState((state) => state.setTimeRange)

  const hiddenCharts = useChartsSelectState((s) => s.hiddenCharts)
  const setHiddenCharts = useChartsSelectState((s) => s.setHiddenCharts)

  function handleHide() {
    setHiddenCharts([...hiddenCharts, config.metricName])
  }

  return (
    <Group gap={2} mb={8}>
      <Typography variant="label-lg">{title}</Typography>
      <Box sx={{ flexGrow: 1 }} />
      <ActionIcon
        variant="transparent"
        onClick={() => setRefresh("_" + config.metricName + "_")}
      >
        <IconRefreshCw02 size={14} />
      </ActionIcon>
      {enableDrillDown && (
        <ActionIcon
          mx={-4}
          variant="transparent"
          onClick={() => {
            setTimeRange(timeRange!)
            setSelectedChart(config)
          }}
        >
          <IconLayersThree02 size={16} />
        </ActionIcon>
      )}
      {showMoreActions && <ChartActionsMenu onHide={handleHide} />}
      {children}
    </Group>
  )
}