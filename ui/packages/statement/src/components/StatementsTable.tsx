import React, { useMemo } from 'react'
import _ from 'lodash'
import { Link } from 'react-router-dom'
import { Table, Tooltip } from 'antd'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { TextWithHorizontalBar } from './HorizontalBar'
import {
  StatementOverview,
  StatementTimeRange,
  StatementMaxMinVals,
} from './statement-types'
import { useTranslation } from 'react-i18next'
import styles from './styles.module.css'
import { useMaxMin } from './use-max-min'

const tableColumns = (
  t: (string) => string,
  concise: boolean,
  timeRange: StatementTimeRange,
  maxMins: StatementMaxMinVals,
  detailPagePath?: string
) => {
  const columns = [
    {
      title: t('statement.common.schemas'),
      dataIndex: 'schemas',
      key: 'schemas',
    },
    {
      title: t('statement.common.digest_text'),
      dataIndex: 'digest_text',
      key: 'digest_text',
      render: (value, record: StatementOverview) => (
        <Link
          to={`${detailPagePath || '/statement/detail'}?digest=${
            record.digest
          }&schema=${record.schema_name}&begin_time=${
            timeRange.begin_time
          }&end_time=${timeRange.end_time}`}
        >
          <Tooltip title={value} placement="right">
            <div className={styles.digest_column}>{value}</div>
          </Tooltip>
        </Link>
      ),
    },
    {
      title: t('statement.common.sum_latency'),
      dataIndex: 'sum_latency',
      key: 'sum_latency',
      sorter: (a: StatementOverview, b: StatementOverview) =>
        a.sum_latency! - b.sum_latency!,
      render: (value) => (
        <TextWithHorizontalBar
          text={getValueFormat('ns')(value, 1, null)}
          normalVal={value / maxMins.maxSumLatency}
        />
      ),
    },
    {
      title: t('statement.common.avg_latency'),
      dataIndex: 'avg_latency',
      key: 'avg_latency',
      sorter: (a: StatementOverview, b: StatementOverview) =>
        a.avg_latency! - b.avg_latency!,
      render: (value) => (
        <TextWithHorizontalBar
          text={getValueFormat('ns')(value, 1, null)}
          normalVal={value / maxMins.maxAvgLatency}
          maxVal={(value / maxMins.maxAvgLatency) * 1.2}
          minVal={(value / maxMins.maxAvgLatency) * 0.5}
        />
      ),
    },
    {
      title: t('statement.common.exec_count'),
      dataIndex: 'exec_count',
      key: 'exec_count',
      sorter: (a: StatementOverview, b: StatementOverview) =>
        a.exec_count! - b.exec_count!,
      render: (value) => (
        <TextWithHorizontalBar
          text={getValueFormat('short')(value, 0, 0)}
          normalVal={value / maxMins.maxExecCount}
        />
      ),
    },
    {
      title: t('statement.common.avg_mem'),
      dataIndex: 'avg_mem',
      key: 'avg_mem',
      sorter: (a: StatementOverview, b: StatementOverview) =>
        a.avg_mem! - b.avg_mem!,
      render: (value) => (
        <TextWithHorizontalBar
          text={getValueFormat('decbytes')(value, 1, null)}
          normalVal={value / maxMins.maxAvgMem}
          maxVal={(value / maxMins.maxAvgMem) * 1.2}
        />
      ),
    },
    // {
    //   title: t('statement.common.avg_affected_rows'),
    //   dataIndex: 'avg_affected_rows',
    //   key: 'avg_affected_rows',
    //   sorter: (a: StatementOverview, b: StatementOverview) =>
    //     a.avg_affected_rows! - b.avg_affected_rows!,
    //   render: (value) => getValueFormat('short')(value, 0, 0),
    // },
  ]
  if (concise) {
    return columns.filter((col) =>
      ['schemas', 'digest_text', 'sum_latency', 'avg_latency'].includes(col.key)
    )
  }
  return columns
}

interface Props {
  statements: StatementOverview[]
  loading: boolean
  timeRange: StatementTimeRange
  detailPagePath?: string
  concise?: boolean
}

export default function StatementsTable({
  statements,
  loading,
  timeRange,
  detailPagePath,
  concise,
}: Props) {
  const { t } = useTranslation()
  const maxMins = useMaxMin(statements)
  const columns = useMemo(
    () => tableColumns(t, concise || false, timeRange, maxMins, detailPagePath),
    [t, concise, timeRange, maxMins]
  )

  return (
    <Table
      columns={columns}
      dataSource={statements}
      loading={loading}
      rowKey={(record: StatementOverview, index) => `${record.digest}_${index}`}
      pagination={false}
    />
  )
}
