import React, { useState } from 'react'
import { Button, Select, Space, Tooltip } from 'antd'
import useUrlState from '@ahooksjs/use-url-state'
import { ExpandOutlined, FieldTimeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router'

import { Toolbar, TimeRange } from '@lib/components'
import styles from './List.module.less'
import { ExpandChart } from './ExpandChart/ExpandChart'
import { LimitTimeRange } from '../../components/LimitTimeRange'
import { DisplayOptions } from '../../components/charts/ScatterChart'

interface SelectionsProps {
  selection: DisplayOptions
  onSelectionChange: (
    s: React.SetStateAction<Partial<{ [key in keyof DisplayOptions]: any }>>
  ) => void
  timeRange: TimeRange
  onTimeRangeChange: (val: TimeRange) => void
}

export const AGGR_BY = [
  {
    value: 'slow_query_query_time',
    label: 'Latency'
  },
  {
    value: 'slow_query_memory_max',
    label: 'Memory'
  }
]

export const GROUP_BY = [
  {
    value: 'query',
    label: 'SQL Text'
  },
  {
    value: 'user',
    label: 'User'
  },
  {
    value: 'database',
    label: 'Database'
  },
  {
    value: 'use_tiflash',
    label: 'Use TiFlash'
  }
]

export const getGroupByLabel = (groupBy: DisplayOptions['groupBy']) => {
  return GROUP_BY.find((g) => g.value === groupBy)?.label
}

export const Selections: React.FC<SelectionsProps> = ({
  selection,
  onSelectionChange,
  timeRange,
  onTimeRangeChange
}) => {
  const [openExpandChart, setOpenExpandChart] = useState(false)
  const navigate = useNavigate()

  return (
    <Toolbar className={styles.list_toolbar} data-e2e="slow_query_toolbar">
      <Space>
        <div>
          <span style={{ marginRight: '6px' }}>Aggregate By:</span>
          <Select
            defaultValue={selection.aggrBy}
            style={{ width: 150 }}
            options={AGGR_BY}
            onChange={(v) => onSelectionChange({ aggrBy: v })}
          />
        </div>
        <div>
          <span style={{ marginRight: '6px' }}>Group By:</span>
          <Select
            defaultValue={selection.groupBy}
            style={{ width: 150 }}
            options={GROUP_BY}
            onChange={(v) => onSelectionChange({ groupBy: v })}
          />
        </div>
        <div>
          <span style={{ marginRight: '6px' }}>Use TiFlash:</span>
          <Select
            defaultValue={selection.tiflash}
            style={{ width: 150 }}
            options={[
              {
                value: 'all',
                label: 'All'
              },
              {
                value: 'yes',
                label: 'Yes'
              },
              {
                value: 'no',
                label: 'No'
              }
            ]}
            onChange={(v) => onSelectionChange({ tiflash: v })}
          />
        </div>
        <LimitTimeRange value={timeRange} onChange={onTimeRangeChange} />
      </Space>
      <Space>
        <>
          <Tooltip placement="bottom" title={'Time Comparison'}>
            <Button
              type="text"
              icon={<FieldTimeOutlined />}
              onClick={() => {
                const urlParams = createUrlSearchParams(selection)
                navigate(`comparison?${urlParams.toString()}`)
              }}
            />
          </Tooltip>
        </>

        <>
          <Tooltip placement="bottom" title={'Expand'}>
            <Button
              type="text"
              icon={<ExpandOutlined />}
              onClick={() => setOpenExpandChart(true)}
            />
          </Tooltip>
          <ExpandChart
            open={openExpandChart}
            onOpenChange={setOpenExpandChart}
            defaultSelection={selection}
            defaultTimeRange={timeRange}
          />
        </>
      </Space>
    </Toolbar>
  )
}

export const DEFAULT_URL_QUERY_PARAMS: DisplayOptions = {
  aggrBy: 'slow_query_query_time',
  groupBy: 'query',
  tiflash: 'all'
}

export const useUrlSelection = () => {
  return useUrlState<DisplayOptions>(DEFAULT_URL_QUERY_PARAMS, {
    navigateMode: 'replace'
  })
}

export const createUrlSearchParams = (opts: DisplayOptions) => {
  const urlParams = new URLSearchParams()
  Object.entries(opts).forEach(([k, v]) => {
    if (Array.isArray(v)) {
      v.forEach((vv) => urlParams.append(k, vv))
    } else {
      urlParams.append(k, v)
    }
  })
  return urlParams
}
