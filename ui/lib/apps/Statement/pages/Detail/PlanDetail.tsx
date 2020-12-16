import React from 'react'
import { Space } from 'antd'
import { useLocalStorageState } from 'ahooks'
import { useTranslation } from 'react-i18next'
import {
  AnimatedSkeleton,
  Card,
  CardTabs,
  CopyLink,
  Descriptions,
  ErrorBar,
  Expand,
  HighlightSQL,
  Pre,
  TextWithInfo,
} from '@lib/components'
import { useClientRequest } from '@lib/utils/useClientRequest'
import client from '@lib/client'
import formatSql from '@lib/utils/sqlFormatter'

import { IPageQuery } from '.'
import TabBasic from './PlanDetailTabBasic'
import TabTime from './PlanDetailTabTime'
import TabCopr from './PlanDetailTabCopr'
import TabTxn from './PlanDetailTabTxn'
import SlowQueryTab from './SlowQueryTab'

export interface IQuery extends IPageQuery {
  plans: string[]
  allPlans: number
}

export interface IPlanDetailProps {
  query: IQuery
}

const STMT_DETAIL_PLAN_EXPAND = 'statement.detail_plan_expand'

function PlanDetail({ query }: IPlanDetailProps) {
  const { t } = useTranslation()
  const { data, isLoading, error } = useClientRequest((reqConfig) =>
    client
      .getInstance()
      .statementsPlanDetailGet(
        query.beginTime!,
        query.digest!,
        query.endTime!,
        query.plans,
        query.schema!,
        reqConfig
      )
  )

  const [detailExpand, setDetailExpand] = useLocalStorageState(
    STMT_DETAIL_PLAN_EXPAND,
    {
      prev_query: false,
      query: false,
      plan: false,
    }
  )

  const togglePrevQuery = () =>
    setDetailExpand((prev) => ({ ...prev, prev_query: !prev.prev_query }))
  const toggleQuery = () =>
    setDetailExpand((prev) => ({ ...prev, query: !prev.query }))
  const togglePlan = () =>
    setDetailExpand((prev) => ({ ...prev, plan: !prev.plan }))

  let titleKey
  if (query.allPlans === 1) {
    titleKey = 'one_for_all'
  } else if (query.plans.length === query.allPlans) {
    titleKey = 'all'
  } else {
    titleKey = 'some'
  }

  const tabs = [
    {
      key: 'basic',
      title: t('statement.pages.detail.tabs.basic'),
      content: () => <TabBasic data={data!} />,
    },
    {
      key: 'time',
      title: t('statement.pages.detail.tabs.time'),
      content: () => <TabTime data={data!} />,
    },
    {
      key: 'copr',
      title: t('statement.pages.detail.tabs.copr'),
      content: () => <TabCopr data={data!} />,
    },
    {
      key: 'txn',
      title: t('statement.pages.detail.tabs.txn'),
      content: () => <TabTxn data={data!} />,
    },
    {
      key: 'slow_query',
      title: t('statement.pages.detail.tabs.slow_query'),
      content: () => <SlowQueryTab query={query} />,
    },
  ]

  return (
    <Card
      title={t(`statement.pages.detail.desc.plans.title.${titleKey}`, {
        n: query.plans.length,
      })}
    >
      <AnimatedSkeleton showSkeleton={isLoading}>
        {error && <ErrorBar errors={[error]} />}
        {data && (
          <>
            <Descriptions>
              <Descriptions.Item
                span={2}
                multiline={detailExpand.query}
                label={
                  <Space size="middle">
                    <TextWithInfo.TransKey transKey="statement.fields.query_sample_text" />
                    <Expand.Link
                      expanded={detailExpand.query}
                      onClick={toggleQuery}
                    />
                    <CopyLink
                      displayVariant="formatted_sql"
                      data={formatSql(data.query_sample_text)}
                    />
                    <CopyLink
                      displayVariant="original_sql"
                      data={data.query_sample_text}
                    />
                  </Space>
                }
              >
                <Expand
                  expanded={detailExpand.query}
                  collapsedContent={
                    <HighlightSQL sql={data.query_sample_text!} compact />
                  }
                >
                  <HighlightSQL sql={data.query_sample_text!} />
                </Expand>
              </Descriptions.Item>
              {data.prev_sample_text ? (
                <Descriptions.Item
                  span={2}
                  multiline={detailExpand.prev_query}
                  label={
                    <Space size="middle">
                      <TextWithInfo.TransKey transKey="statement.fields.prev_sample_text" />
                      <Expand.Link
                        expanded={detailExpand.prev_query}
                        onClick={togglePrevQuery}
                      />
                      <CopyLink
                        displayVariant="formatted_sql"
                        data={formatSql(data.prev_sample_text)}
                      />
                      <CopyLink
                        displayVariant="original_sql"
                        data={data.prev_sample_text}
                      />
                    </Space>
                  }
                >
                  <Expand
                    expanded={detailExpand.prev_query}
                    collapsedContent={
                      <HighlightSQL sql={data.prev_sample_text!} compact />
                    }
                  >
                    <HighlightSQL sql={data.prev_sample_text!} />
                  </Expand>
                </Descriptions.Item>
              ) : null}
              <Descriptions.Item
                span={2}
                multiline={detailExpand.plan}
                label={
                  <Space size="middle">
                    <TextWithInfo.TransKey transKey="statement.fields.plan" />
                    <Expand.Link
                      expanded={detailExpand.plan}
                      onClick={togglePlan}
                    />
                    <CopyLink data={data.plan ?? ''} />
                  </Space>
                }
              >
                <Expand expanded={detailExpand.plan}>
                  <Pre noWrap>{data.plan}</Pre>
                </Expand>
              </Descriptions.Item>
            </Descriptions>

            <CardTabs animated={false} tabs={tabs} />
          </>
        )}
      </AnimatedSkeleton>
    </Card>
  )
}

export default PlanDetail
