import {
  Axis,
  BarSeries,
  Chart,
  niceTimeFormatByDay,
  Position,
  ScaleType,
  Settings,
  timeFormatter,
  BrushEndListener,
} from '@elastic/charts'
import { orderBy, toPairs } from 'lodash'
import React, { useEffect, useMemo, useRef } from 'react'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { TopsqlTopSQLItem } from '@lib/client'
import { useWindowSize } from './useWindowSize'
import { TimeRange } from '../components/Filter'

export interface TopSqlChartProps {
  seriesData: TopsqlTopSQLItem[]
  timeRange: TimeRange
  timestampRange: [number, number]
  chartTimeRange: [number, number] | undefined
  onBrushEnd: BrushEndListener
}

export function TopSqlChart({
  onBrushEnd,
  seriesData,
  timeRange,
  timestampRange,
  chartTimeRange,
}: TopSqlChartProps) {
  const chartRef = useRef<Chart>(null)
  const { chartData } = useChartData(seriesData, chartTimeRange)
  const { digestMap } = useDigestMap(seriesData)
  const { windowSize, computeWindowSize } = useWindowSize()

  useEffect(() => {
    computeWindowSize(
      chartRef.current?.getChartContainerRef().current?.offsetWidth || 0,
      timeRange.value
    )
  }, [chartRef, timeRange])

  return (
    <Chart ref={chartRef}>
      <Settings
        showLegend
        legendPosition={Position.Bottom}
        onBrushEnd={onBrushEnd}
        xDomain={
          chartTimeRange
            ? undefined
            : {
                minInterval: windowSize * 1000,
                min: timestampRange[0],
                max: timestampRange[1],
              }
        }
      />
      <Axis
        id="bottom"
        position={Position.Bottom}
        showOverlappingTicks
        tickFormat={timeFormatter(niceTimeFormatByDay(2))}
      />
      <Axis
        id="left"
        position={Position.Left}
        tickFormat={(v) => getValueFormat('ms')(v, 0, 0)}
      />
      {Object.keys(chartData).map((digest) => {
        return (
          <BarSeries
            key={digest}
            id={digest}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor={0}
            yAccessors={[1]}
            stackAccessors={[0]}
            data={chartData[digest]}
            name={
              digestMap?.[digest]?.slice(0, 50) ||
              `Unknown(digest: ${digest.slice(0, 8)})`
            }
          />
        )
      })}
    </Chart>
  )
}

function useDigestMap(seriesData: TopsqlTopSQLItem[]) {
  const digestMap = useMemo(() => {
    if (!seriesData) {
      return {}
    }
    return seriesData.reduce((prev, { sql_digest, sql_text }) => {
      prev[sql_digest!] = sql_text
      return prev
    }, {})
  }, [seriesData])
  return { digestMap }
}

function useChartData(
  seriesData: TopsqlTopSQLItem[],
  timeRange: [number, number] | undefined
) {
  const chartData = useMemo(() => {
    if (!seriesData) {
      return {}
    }
    // Group by SQL digest + timestamp and sum their values
    const valuesByDigestAndTs: Record<string, Record<number, number>> = {}
    const sumValueByDigest: Record<string, number> = {}
    seriesData.forEach((series) => {
      const seriesDigest = series.sql_digest!

      if (!valuesByDigestAndTs[seriesDigest]) {
        valuesByDigestAndTs[seriesDigest] = {}
      }
      const map = valuesByDigestAndTs[seriesDigest]
      let sum = 0
      series.plans?.forEach((values) => {
        values.timestamp_secs?.forEach((t, i) => {
          if (timeRange && (t < timeRange[0] || t > timeRange[1])) {
            return
          }

          if (!map[t]) {
            map[t] = values.cpu_time_millis![i]
          } else {
            map[t] += values.cpu_time_millis![i]
          }
          sum += values.cpu_time_millis![i]
        })
      })

      if (!sumValueByDigest[seriesDigest]) {
        sumValueByDigest[seriesDigest] = 0
      }
      sumValueByDigest[seriesDigest] += sum
    })

    // Order by digest
    const orderedDigests = orderBy(
      toPairs(sumValueByDigest),
      ['1'],
      ['desc']
    ).map((v) => v[0])

    const datumByDigest: Record<string, Array<[number, number]>> = {}
    for (const digest of orderedDigests) {
      const datum: Array<[number, number]> = []

      const valuesByTs = valuesByDigestAndTs[digest]
      for (const ts in valuesByTs) {
        const value = valuesByTs[ts]
        datum.push([Number(ts), value])
      }

      datumByDigest[digest] = datum
    }

    return datumByDigest
  }, [seriesData, timeRange])

  return {
    chartData,
  }
}
