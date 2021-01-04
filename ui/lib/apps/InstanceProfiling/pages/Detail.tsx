import { Badge, Button, Progress } from 'antd'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { usePersistFn } from 'ahooks'

import client from '@lib/client'
import { CardTable, Head } from '@lib/components'
import { useClientRequestWithPolling } from '@lib/utils/useClientRequest'
import { InstanceKindName } from '@lib/utils/instanceTable'
import useQueryParams from '@lib/utils/useQueryParams'

function mapData(data) {
  if (!data) {
    return data
  }
  data.tasks_status.forEach((task) => {
    if (task.state === 1) {
      let task_elapsed_secs = data.server_time - task.started_at
      let progress =
        task_elapsed_secs / data.task_group_status.profile_duration_secs
      if (progress > 0.99) {
        progress = 0.99
      }
      if (progress < 0) {
        progress = 0
      }
      task.progress = progress
    }
  })
  return data
}

function isFinished(data) {
  return data?.task_group_status?.state === 2
}

export default function Page() {
  const { t } = useTranslation()
  const { id } = useQueryParams()

  const { data: respData, isLoading, error } = useClientRequestWithPolling(
    (reqConfig) => client.getInstance().getProfilingGroupDetail(id, reqConfig),
    {
      shouldPoll: (data) => !isFinished(data),
    }
  )

  const data = useMemo(() => mapData(respData), [respData])

  const columns = useMemo(
    () => [
      {
        name: t('instance_profiling.detail.table.columns.instance'),
        key: 'instance',
        minWidth: 150,
        maxWidth: 400,
        onRender: (record) => record.target.display_name,
      },
      {
        name: t('instance_profiling.detail.table.columns.kind'),
        key: 'kind',
        minWidth: 100,
        maxWidth: 150,
        onRender: (record) => {
          return InstanceKindName[record.target.kind]
        },
      },
      {
        name: t('instance_profiling.detail.table.columns.status'),
        key: 'status',
        minWidth: 150,
        maxWidth: 200,
        onRender: (record) => {
          if (record.state === 1) {
            return (
              <div style={{ width: 200 }}>
                <Progress
                  percent={Math.round(record.progress * 100)}
                  size="small"
                  width={200}
                />
              </div>
            )
          } else if (record.state === 0) {
            return <Badge status="error" text={record.error} />
          } else {
            return (
              <Badge
                status="success"
                text={t('instance_profiling.detail.table.status.finished')}
              />
            )
          }
        },
      },
    ],
    [t]
  )

  const handleRowClick = usePersistFn(
    async (rec, _idx, _ev: React.MouseEvent<HTMLElement>) => {
      const res = await client
        .getInstance()
        .getActionToken(rec.id, 'single_view')
      const token = res.data
      if (!token) {
        return
      }
      window.open(
        `${client.getBasePath()}/profiling/single/view?token=${token}`,
        '_blank'
      )
    }
  )

  const handleDownloadGroup = useCallback(async () => {
    const res = await client.getInstance().getActionToken(id, 'group_download')
    const token = res.data
    if (!token) {
      return
    }
    window.location.href = `${client.getBasePath()}/profiling/group/download?token=${token}`
  }, [id])

  return (
    <div>
      <Head
        title={t('instance_profiling.detail.head.title')}
        back={
          <Link to={`/instance_profiling`}>
            <ArrowLeftOutlined /> {t('instance_profiling.detail.head.back')}
          </Link>
        }
        titleExtra={
          <Button
            disabled={!isFinished(data)}
            type="primary"
            onClick={handleDownloadGroup}
          >
            {t('instance_profiling.detail.download')}
          </Button>
        }
      />
      <CardTable
        loading={isLoading}
        columns={columns}
        items={data?.tasks_status || []}
        errors={[error]}
        onRowClicked={handleRowClick}
        hideLoadingWhenNotEmpty
        extendLastColumn
      />
    </div>
  )
}
