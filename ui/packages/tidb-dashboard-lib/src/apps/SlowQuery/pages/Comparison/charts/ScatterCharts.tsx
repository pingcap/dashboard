import {
  DisplayOptions,
  SlowQueryScatterChart
} from '@lib/apps/SlowQuery/components/charts/ScatterChart'
import { TimeRangeValue, Toolbar } from '@lib/components'
import { Col, Row, Select, Skeleton, Space, Typography } from 'antd'
import React from 'react'
import { AGGR_BY } from '../../ListV2/Selections'

const { Title } = Typography

interface ScatterChartsProps {
  timeRangeValueA: TimeRangeValue
  timeRangeValueB: TimeRangeValue
  selection: DisplayOptions
  onSelectionChange: (
    s: React.SetStateAction<Partial<{ [key in keyof DisplayOptions]: any }>>
  ) => void
  analyzingA: boolean
  analyzingB: boolean
}

export const ScatterCharts: React.FC<ScatterChartsProps> = ({
  timeRangeValueA,
  timeRangeValueB,
  selection,
  onSelectionChange,
  analyzingA,
  analyzingB
}) => {
  return (
    <>
      <Toolbar>
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
        </Space>
      </Toolbar>

      <Row style={{ marginTop: '20px' }}>
        <Col span={12}>
          <Title level={5}>Slow Query Detail</Title>
          {analyzingA ? (
            <Skeleton active paragraph={{ rows: 5 }} />
          ) : (
            <SlowQueryScatterChart
              timeRangeValue={timeRangeValueA}
              displayOptions={selection}
            />
          )}
        </Col>

        <Col span={12} style={{ background: '#fafafa', padding: '10px' }}>
          <Title level={5}>Slow Query Detail</Title>
          {analyzingB ? (
            <Skeleton active paragraph={{ rows: 5 }} />
          ) : (
            <SlowQueryScatterChart
              timeRangeValue={timeRangeValueB}
              displayOptions={selection}
            />
          )}
        </Col>
      </Row>
    </>
  )
}
