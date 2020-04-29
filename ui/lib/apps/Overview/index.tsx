import React, { useState, useEffect } from 'react'
import { Root, DateTime, MetricChart } from '@lib/components'
import { Row, Col } from 'antd'
import { RightOutlined } from '@ant-design/icons'
import { HashRouter as Router, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import client, { ClusterinfoClusterInfo } from '@lib/client'
import { StatementsTable } from '@lib/apps/Statement'
import MonitorAlertBar from './components/MonitorAlertBar'
import Nodes from './components/Nodes'
import SlowQueriesTable from '../SlowQuery/components/SlowQueriesTable'
import { defSlowQueryColumnKeys } from '../SlowQuery/components/List'
import useSlowQuery, {
  DEF_SLOW_QUERY_OPTIONS,
} from '../SlowQuery/utils/useSlowQuery'
import useStatement from '../Statement/utils/useStatement'

import styles from './index.module.less'

export default function App() {
  const { t } = useTranslation()
  const [cluster, setCluster] = useState<ClusterinfoClusterInfo | null>(null)
  const {
    queryOptions: stmtQueryOptions,
    setQueryOptions: setStmtQueryOptions,
    allTimeRanges,
    validTimeRange,
    loadingStatements,
    statements,
  } = useStatement(undefined, false)
  const {
    queryOptions,
    setQueryOptions,
    loadingSlowQueries,
    slowQueries,
    queryTimeRange: slowQueryTimeRange,
  } = useSlowQuery({ ...DEF_SLOW_QUERY_OPTIONS, limit: 10 }, false)

  useEffect(() => {
    const fetchLoad = async () => {
      try {
        let res = await client.getInstance().topologyAllGet()
        setCluster(res.data)
      } catch (error) {
        setCluster(null)
      }
    }

    fetchLoad()
  }, [])

  return (
    <Root>
      <Router>
        <Row gutter={24}>
          <Col span={18}>
            <MetricChart
              title={t('overview.metrics.total_requests')}
              series={[
                {
                  query: 'sum(rate(tidb_server_query_total[1m])) by (result)',
                  name: 'Queries {result}',
                },
              ]}
              unit="ops"
              type="bar"
            />
            <MetricChart
              title={t('overview.metrics.latency')}
              series={[
                {
                  query:
                    'histogram_quantile(0.999, sum(rate(tidb_server_handle_query_duration_seconds_bucket[1m])) by (le))',
                  name: '99.9%',
                },
                {
                  query:
                    'histogram_quantile(0.99, sum(rate(tidb_server_handle_query_duration_seconds_bucket[1m])) by (le))',
                  name: '99%',
                },
                {
                  query:
                    'histogram_quantile(0.9, sum(rate(tidb_server_handle_query_duration_seconds_bucket[1m])) by (le))',
                  name: '90%',
                },
              ]}
              unit="s"
              type="line"
            />
            <StatementsTable
              className={styles.statementsTable}
              key={`statement_${statements.length}`}
              statements={statements}
              visibleColumnKeys={{
                digest_text: true,
                sum_latency: true,
                avg_latency: true,
                related_schemas: true,
              }}
              visibleItemsCount={5}
              loading={loadingStatements}
              timeRange={validTimeRange}
              onChangeSort={(orderBy, desc) =>
                setStmtQueryOptions({
                  ...stmtQueryOptions,
                  orderBy,
                  desc,
                })
              }
              title={
                <Link to="/statement">
                  {t('overview.top_statements.title')} <RightOutlined />
                </Link>
              }
              subTitle={
                allTimeRanges.length > 0 && (
                  <span>
                    <DateTime.Calendar
                      unixTimestampMs={(validTimeRange.begin_time ?? 0) * 1000}
                    />{' '}
                    ~{' '}
                    <DateTime.Calendar
                      unixTimestampMs={(validTimeRange.end_time ?? 0) * 1000}
                    />
                  </span>
                )
              }
            />
            <SlowQueriesTable
              key={`slow_query_${slowQueries.length}`}
              loading={loadingSlowQueries}
              slowQueries={slowQueries}
              visibleColumnKeys={defSlowQueryColumnKeys}
              onChangeSort={(orderBy, desc) =>
                setQueryOptions({ ...queryOptions, orderBy, desc })
              }
              orderBy={queryOptions.orderBy}
              desc={queryOptions.desc}
              title={
                <Link to="/slow_query">
                  {t('overview.recent_slow_query.title')} <RightOutlined />
                </Link>
              }
              subTitle={
                <span>
                  <DateTime.Calendar
                    unixTimestampMs={slowQueryTimeRange.beginTime * 1000}
                  />{' '}
                  ~{' '}
                  <DateTime.Calendar
                    unixTimestampMs={slowQueryTimeRange.endTime * 1000}
                  />
                </span>
              }
            />
          </Col>
          <Col span={6}>
            <Nodes />
            <MonitorAlertBar cluster={cluster} />
          </Col>
        </Row>
      </Router>
    </Root>
  )
}
