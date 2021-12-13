import React, { useState } from 'react'
import { Space } from 'antd'

import CopyLink from '@lib/components/CopyLink'
import formatSql from '@lib/utils/sqlFormatter'
import {
  Descriptions,
  Expand,
  Pre,
  HighlightSQL,
  TextWithInfo,
} from '@lib/components'
import type { PlanRecord } from './DetailTable'
import type { SQLRecord } from '../TopSqlTable'

interface DetailContentProps {
  sqlRecord: SQLRecord
  planRecord: PlanRecord | null
}

export function DetailContent({ sqlRecord, planRecord }: DetailContentProps) {
  const [sqlExpanded, setSqlExpanded] = useState(false)
  const toggleSqlExpanded = () => setSqlExpanded((prev) => !prev)
  const [planExpanded, setPlanExpanded] = useState(false)
  const togglePlanExpanded = () => setPlanExpanded((prev) => !prev)

  return (
    <Descriptions>
      <Descriptions.Item
        span={2}
        multiline={sqlExpanded}
        label={
          <Space size="middle">
            <TextWithInfo.TransKey transKey="top_sql.fields.sql_text" />
            <Expand.Link expanded={sqlExpanded} onClick={toggleSqlExpanded} />
            <CopyLink
              displayVariant="formatted_sql"
              data={formatSql(sqlRecord.query)}
            />
            <CopyLink displayVariant="original_sql" data={sqlRecord.query} />
          </Space>
        }
      >
        <Expand
          expanded={sqlExpanded}
          collapsedContent={<HighlightSQL sql={sqlRecord.query} compact />}
        >
          <HighlightSQL sql={sqlRecord.query} />
        </Expand>
      </Descriptions.Item>
      <Descriptions.Item
        label={
          <Space size="middle">
            <TextWithInfo.TransKey transKey="top_sql.fields.sql_digest" />
            <CopyLink data={sqlRecord.digest} />
          </Space>
        }
      >
        {sqlRecord.digest}
      </Descriptions.Item>
      {planRecord && (
        <Descriptions.Item
          label={
            <Space size="middle">
              <TextWithInfo.TransKey transKey="top_sql.fields.plan_digest" />
              <CopyLink data={planRecord.plan_digest} />
            </Space>
          }
        >
          {planRecord.plan_digest}
        </Descriptions.Item>
      )}
      {planRecord && (
        <Descriptions.Item
          span={2}
          multiline={planExpanded}
          label={
            <Space size="middle">
              <TextWithInfo.TransKey transKey="top_sql.fields.plan" />
              <Expand.Link
                expanded={planExpanded}
                onClick={togglePlanExpanded}
              />
              <CopyLink data={planRecord.plan_text} />
            </Space>
          }
        >
          <Expand expanded={planExpanded}>
            <Pre noWrap>{planRecord.plan_text}</Pre>
          </Expand>
        </Descriptions.Item>
      )}
    </Descriptions>
  )
}
