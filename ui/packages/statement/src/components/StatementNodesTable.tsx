import React, { useMemo } from 'react'
import { Table } from 'antd'
import { useTranslation } from 'react-i18next'
import { getValueFormat } from '@baurine/grafana-value-formats'

import { StatementNode, StatementMaxVals } from './statement-types'
import { Bar } from '@pingcap-incubator/dashboard_components'
import { useMax } from './use-max'

const tableColumns = (
  maxs: StatementMaxVals,
  t: (_: string) => string
) => [
  {
    title: t('statement.detail.node'),
    dataIndex: 'address',
    key: 'address',
  },
  {
    title: t('statement.common.sum_latency'),
    dataIndex: 'sum_latency',
    key: 'sum_latency',
    sorter: (a: StatementNode, b: StatementNode) =>
      a.sum_latency! - b.sum_latency!,
    render: (value) => (
      <Bar.WithText value={value} capacity={maxs.maxSumLatency}>
        {getValueFormat('ns')(value, 1, null)}
      </Bar.WithText>
    ),
  },
  {
    title: t('statement.common.exec_count'),
    dataIndex: 'exec_count',
    key: 'exec_count',
    sorter: (a: StatementNode, b: StatementNode) =>
      a.exec_count! - b.exec_count!,
    render: (value) => (
      <Bar.WithText value={value} capacity={maxs.maxExecCount}>
        {getValueFormat('short')(value, 0, 0)}
      </Bar.WithText>
    ),
  },
  {
    title: t('statement.common.avg_latency'),
    dataIndex: 'avg_latency',
    key: 'avg_latency',
    sorter: (a: StatementNode, b: StatementNode) =>
      a.avg_latency! - b.avg_latency!,
    render: (value) => (
      <Bar.WithText value={value} capacity={maxs.maxAvgLatency}>
        {getValueFormat('ns')(value, 1, null)}
      </Bar.WithText>
    ),
  },
  {
    title: t('statement.common.max_latency'),
    dataIndex: 'max_latency',
    key: 'max_latency',
    sorter: (a: StatementNode, b: StatementNode) =>
      a.max_latency! - b.max_latency!,
    render: (value) => (
      <Bar.WithText value={value} capacity={maxs.maxMaxLatency}>
        {getValueFormat('ns')(value, 1, null)}
      </Bar.WithText>
    ),
  },
  {
    title: t('statement.common.avg_mem'),
    dataIndex: 'avg_mem',
    key: 'avg_mem',
    sorter: (a: StatementNode, b: StatementNode) => a.avg_mem! - b.avg_mem!,
    render: (value) => (
      <Bar.WithText value={value} capacity={maxs.maxAvgMem}>
        {getValueFormat('bytes')(value, 1, null)}
      </Bar.WithText>
    ),
  },
  {
    title: t('statement.common.sum_backoff_times'),
    dataIndex: 'sum_backoff_times',
    key: 'sum_backoff_times',
    sorter: (a: StatementNode, b: StatementNode) =>
      a.sum_backoff_times! - b.sum_backoff_times!,
    render: (value) => getValueFormat('short')(value, 0, 0),
  },
]

export default function StatementNodesTable({
  nodes,
}: {
  nodes: StatementNode[]
}) {
  const { t } = useTranslation()
  const maxs = useMax(nodes)
  const columns = useMemo(() => tableColumns(maxs, t), [maxs, t])

  return (
    <Table
      columns={columns}
      dataSource={nodes}
      rowKey={(record: StatementNode, index) => `${record.address}_${index}`}
      pagination={false}
    />
  )
}
