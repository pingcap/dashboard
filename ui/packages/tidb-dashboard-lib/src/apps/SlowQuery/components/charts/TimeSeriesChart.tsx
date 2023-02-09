import React, { useContext, useRef } from 'react'

import { TimeRangeValue } from '@lib/components'
import {
  TimeSeriesChart as DiagTimeSeriesChart,
  PromDataAccessor,
  PromQueryGroup,
  Chart,
  Trigger
} from '@diag-ui/chart'
import { SlowQueryContext } from '../../context'
import { useChange } from '@lib/utils/useChange'

interface LineChartProps {
  height?: number
  timeRangeValue: TimeRangeValue
  type: 'line' | 'scatter'
  promql: string
  name: string
  unit: string
}

export const TimeSeriesChart: React.FC<LineChartProps> = ({
  height,
  timeRangeValue,
  type,
  promql,
  name,
  unit
}) => {
  const ctx = useContext(SlowQueryContext)
  const triggerRef = useRef<Trigger>(null as any)
  const refreshChart = () => {
    // triggerRef.current({ start_time: 1668936700, end_time: 1668938500 })
    triggerRef.current({
      start_time: timeRangeValue[0],
      end_time: timeRangeValue[1]
    })
  }
  const chartRef = useRef<Chart>(null)

  useChange(() => {
    refreshChart()
  }, [timeRangeValue, promql])

  return (
    <PromDataAccessor
      ref={triggerRef}
      fetch={(query, tp) => {
        return ctx?.ds.promqlQueryRange?.(
          query,
          tp.start_time,
          tp.end_time,
          '1m'
        ) as any
        // return fetch(
        //   `http://127.0.0.1:8428/api/v1/query_range?query=${query}&start=${tp.start_time}&end=${tp.end_time}&step=1m`
        // ).then((resp) => resp.json())
      }}
    >
      <DiagTimeSeriesChart height={height} ref={chartRef}>
        <PromQueryGroup
          queries={[
            {
              promql,
              name,
              type
            }
          ]}
          unit={unit}
        />
      </DiagTimeSeriesChart>
    </PromDataAccessor>
  )
}
