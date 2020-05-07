import React, { useState, useEffect, useCallback } from 'react'
import { Button, Drawer, Result } from 'antd'
import { useTranslation } from 'react-i18next'
import { useGetSet, useMount, useInterval } from 'react-use'
import { useBoolean } from '@umijs/hooks'

import client, { ConfigKeyVisualConfig } from '@lib/client'
import { Heatmap } from '../heatmap'
import { HeatmapData, HeatmapRange, DataTag } from '../heatmap/types'
import { fetchHeatmap } from '../utils'
import KeyVizSettingForm from './KeyVizSettingForm'
import KeyVizToolbar from './KeyVizToolbar'

import './KeyViz.less'

type CacheEntry = {
  metricType: DataTag
  dateRange: number
  expireTime: number
  data: HeatmapData
}

// const CACHE_EXPRIE_SECS = 10

class HeatmapCache {
  // cache: CacheEntry[] = []
  // latestFetchIdx = 0

  async fetch(
    range: number | HeatmapRange,
    metricType: DataTag
  ): Promise<HeatmapData | undefined> {
    // return fetchDummyHeatmap()
    let selection
    if (typeof range === 'number') {
      const endTime = Math.ceil(new Date().getTime() / 1000)
      // this.cache = this.cache.filter((entry) => entry.expireTime > endTime)
      // const entry = this.cache.find(
      //   (entry) => entry.dateRange === range && entry.metricType === metricType
      // )
      // if (entry) {
      //   return entry.data
      // } else {
      selection = {
        starttime: endTime - range,
        endtime: endTime,
      }
      // }
    } else {
      selection = range
    }

    // this.latestFetchIdx += 1
    // const fetchIdx = this.latestFetchIdx
    const data = await fetchHeatmap(selection, metricType)
    // if (fetchIdx === this.latestFetchIdx) {
    // if (typeof range === 'number') {
    //   this.cache.push({
    //     dateRange: range,
    //     metricType: metricType,
    //     expireTime: new Date().getTime() / 1000 + CACHE_EXPRIE_SECS,
    //     data: data,
    //   })
    // }
    return data
    // }
    // return undefined
  }
}

// Todo: define heatmap state, with auto check control, date range select, reset to zoom
// fetchData ,  changeType, add loading state, change zoom level to reset autofetch,

type ChartState = {
  heatmapData: HeatmapData
  metricType: DataTag
}

// TODO: using global state is not a good idea
let _chart
let cache = new HeatmapCache()

const KeyViz = () => {
  const [chartState, setChartState] = useState<ChartState>()
  const [getSelection, setSelection] = useGetSet<HeatmapRange | null>(null)
  const [isLoading, setLoading] = useState(true)
  const [getAutoRefreshSeconds, setAutoRefreshSeconds] = useGetSet(0)
  const [getRemainingRefreshSeconds, setRemainingRefreshSeconds] = useGetSet(0)
  const [getOnBrush, setOnBrush] = useGetSet(false)
  const [getDateRange, setDateRange] = useGetSet(3600 * 6)
  const [getBrightLevel, setBrightLevel] = useGetSet(1)
  const [getMetricType, setMetricType] = useGetSet<DataTag>('written_bytes')
  const [config, setConfig] = useState<ConfigKeyVisualConfig | null>(null)
  const {
    state: shouldShowSettings,
    setTrue: openSettings,
    setFalse: closeSettings,
  } = useBoolean(false)
  const { t } = useTranslation()

  const enabled = config?.auto_collection_enabled === true

  const updateServiceStatus = useCallback(async function () {
    setLoading(true)
    try {
      const resp = await client.getInstance().keyvisualConfigGet()
      const config = resp.data
      const enabled = config?.auto_collection_enabled === true
      if (!enabled) {
        setAutoRefreshSeconds(0)
      }
      setConfig(config)
    } catch (e) {}
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useMount(updateServiceStatus)

  const updateHeatmap = useCallback(async () => {
    if (getAutoRefreshSeconds() > 0) {
      setRemainingRefreshSeconds(getAutoRefreshSeconds())
    }
    setLoading(true)
    setOnBrush(false)
    try {
      const metricType = getMetricType()
      const data = await cache.fetch(
        getSelection() || getDateRange(),
        metricType
      )
      setChartState({ heatmapData: data!, metricType })
    } catch (e) {}
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onChangeBrightLevel = useCallback((val) => {
    if (!_chart) return
    setBrightLevel(val)
    _chart.brightness(val)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onChangeDateRange = useCallback((v: number) => {
    setDateRange(v)
    setSelection(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onResetZoom = useCallback(() => {
    setSelection(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onToggleBrush = useCallback(() => {
    const newOnBrush = !getOnBrush()
    setAutoRefreshSeconds(0)
    setOnBrush(newOnBrush)
    _chart.brush(newOnBrush)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onBrush = useCallback((selection: HeatmapRange) => {
    setOnBrush(false)
    setAutoRefreshSeconds(0)
    setSelection(selection)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onZoom = useCallback(() => {
    setAutoRefreshSeconds(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onChartInit = useCallback((chart) => {
    _chart = chart
    setLoading(false)
    _chart.brightness(getBrightLevel())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (getRemainingRefreshSeconds() > getAutoRefreshSeconds()) {
      setRemainingRefreshSeconds(getAutoRefreshSeconds())
    }
    if (getAutoRefreshSeconds() > 0) {
      onResetZoom()
      setOnBrush(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAutoRefreshSeconds()])

  useEffect(() => {
    if (enabled) {
      updateHeatmap()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, getSelection(), getDateRange(), getMetricType()])

  useInterval(() => {
    if (getAutoRefreshSeconds() === 0) {
      return
    }
    if (getRemainingRefreshSeconds() === 0) {
      updateHeatmap()
    } else {
      setRemainingRefreshSeconds((c) => c - 1)
    }
  }, 1000)

  const disabledPage = isLoading ? null : (
    <Result
      title={t('keyviz.settings.disabled_result.title')}
      subTitle={t('keyviz.settings.disabled_result.sub_title')}
      extra={
        <Button type="primary" onClick={openSettings}>
          {t('keyviz.settings.open_setting')}
        </Button>
      }
    />
  )

  const mainPart = !enabled
    ? disabledPage
    : chartState && (
        <Heatmap
          data={chartState.heatmapData}
          dataTag={chartState.metricType}
          onBrush={onBrush}
          onChartInit={onChartInit}
          onZoom={onZoom}
        />
      )

  return (
    <div className="PD-KeyVis">
      <KeyVizToolbar
        enabled={enabled}
        dateRange={getDateRange()}
        metricType={getMetricType()}
        brightLevel={getBrightLevel()}
        onToggleBrush={onToggleBrush}
        onResetZoom={onResetZoom}
        isLoading={isLoading}
        autoRefreshSeconds={getAutoRefreshSeconds()}
        remainingRefreshSeconds={getRemainingRefreshSeconds()}
        isOnBrush={getOnBrush()}
        onChangeBrightLevel={onChangeBrightLevel}
        onChangeMetric={setMetricType}
        onChangeDateRange={onChangeDateRange}
        onChangeAutoRefresh={setAutoRefreshSeconds}
        onRefresh={updateHeatmap}
        onShowSettings={openSettings}
      />

      {mainPart}

      <Drawer
        title={t('keyviz.settings.title')}
        width={300}
        closable={true}
        visible={shouldShowSettings}
        onClose={closeSettings}
        destroyOnClose={true}
      >
        <KeyVizSettingForm
          onClose={closeSettings}
          onConfigUpdated={updateServiceStatus}
        />
      </Drawer>
    </div>
  )
}

export default KeyViz
