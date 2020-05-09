import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { Descriptions, message, Progress, Button } from 'antd'
import { Head, AnimatedSkeleton } from '@lib/components'
import { DateTime } from '@lib/components'
import { DiagnoseReport } from '@lib/client'
import { useTranslation } from 'react-i18next'
import client from '@lib/client'

function DiagnoseStatus() {
  const [report, setReport] = useState<DiagnoseReport | undefined>(undefined)
  const { id } = useParams()
  const { t } = useTranslation()

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null
    if (!id) {
      return
    }
    async function fetchData() {
      try {
        const res = await client.getInstance().diagnoseReportsIdStatusGet(id!)
        const { data } = res
        setReport(data)
        if (data.progress! >= 100) {
          if (t !== null) {
            clearInterval(t)
          }
        }
      } catch (error) {
        message.error(error.message)
      }
    }
    t = setInterval(() => fetchData(), 1000)
    fetchData()
    return () => {
      if (t !== null) {
        clearInterval(t)
      }
    }
  }, [id])

  return (
    <Head
      title={t('diagnose.status.head.title')}
      back={
        <Link to={`/diagnose`}>
          <ArrowLeftOutlined /> {t('diagnose.status.head.back')}
        </Link>
      }
      titleExtra={
        report && (
          <Button type="primary" disabled={report?.progress! < 100}>
            {/* Not using client basePath intentionally so that it can be handled by webpack-dev-server */}
            <a
              href={`/dashboard/api/diagnose/reports/${report.id}/detail`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('diagnose.status.head.view')}
            </a>
          </Button>
        )
      }
    >
      <AnimatedSkeleton showSkeleton={!report}>
        {report && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label={t('diagnose.status.range_begin')}>
              <DateTime.Calendar
                unixTimestampMs={new Date(report.start_time!).valueOf()}
              />
            </Descriptions.Item>
            <Descriptions.Item label={t('diagnose.status.range_end')}>
              <DateTime.Calendar
                unixTimestampMs={new Date(report.end_time!).valueOf()}
              />
            </Descriptions.Item>
            {report.compare_start_time && (
              <Descriptions.Item label={t('diagnose.status.baseline_begin')}>
                <DateTime.Calendar
                  unixTimestampMs={new Date(
                    report.compare_start_time
                  ).valueOf()}
                />
              </Descriptions.Item>
            )}
            <Descriptions.Item label={t('diagnose.status.progress')}>
              <Progress style={{ width: 200 }} percent={report.progress || 0} />
            </Descriptions.Item>
          </Descriptions>
        )}
      </AnimatedSkeleton>
    </Head>
  )
}

export default DiagnoseStatus
