import {
  Axis,
  BarSeries,
  Chart,
  Position,
  ScaleType,
  Settings,
  timeFormatter,
  BrushEndListener,
} from '@elastic/charts'
import { orderBy, toPairs } from 'lodash'
import React, { useEffect, useMemo, useState } from 'react'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { TopsqlCPUTimeItem } from '@lib/client'

export interface ListChartProps {
  data: TopsqlCPUTimeItem[]
  timeWindowSize: number
  timeRangeTimestamp: [number, number]
  onBrushEnd: BrushEndListener
}

export function ListChart({
  onBrushEnd,
  data,
  timeWindowSize,
  timeRangeTimestamp,
}: ListChartProps) {
  // We need to update data and xDomain.minInterval at same time on the legacy @elastic/charts
  // to avoid `Error: custom xDomain is invalid, custom minInterval is greater than computed minInterval`
  // https://github.com/elastic/elastic-charts/pull/933
  // TODO: update @elastic/charts
  const [dataWithTimeWindowSize, setDataWithTimeWindowSize] = useState({
    data,
    timeWindowSize,
  })
  const { chartData } = useChartData(dataWithTimeWindowSize.data)
  const { digestMap } = useDigestMap(dataWithTimeWindowSize.data)

  useEffect(() => {
    setDataWithTimeWindowSize({ data, timeWindowSize })
  }, [data])

  return (
    <Chart>
      <Settings
        showLegend
        legendPosition={Position.Bottom}
        onBrushEnd={onBrushEnd}
        xDomain={{
          minInterval: dataWithTimeWindowSize.timeWindowSize * 1000,
          min: timeRangeTimestamp[0] * 1000,
          max: timeRangeTimestamp[1] * 1000,
        }}
      />
      <Axis
        id="bottom"
        position={Position.Bottom}
        showOverlappingTicks
        tickFormat={timeFormatter('MM-DD HH:mm:ss')}
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

function useDigestMap(seriesData: TopsqlCPUTimeItem[]) {
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

function useChartData(seriesData: TopsqlCPUTimeItem[]) {
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
  }, [seriesData])

  return {
    chartData,
  }
}
