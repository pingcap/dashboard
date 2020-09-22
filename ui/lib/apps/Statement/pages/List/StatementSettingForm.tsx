import React, { useMemo, useState } from 'react'
import {
  Form,
  InputNumber,
  Skeleton,
  Switch,
  Input,
  Slider,
  Space,
  Button,
  Modal,
} from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import client, { StatementConfig } from '@lib/client'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { ErrorBar } from '@lib/components'

interface Props {
  onClose: () => void
  onConfigUpdated: () => any
}

type InternalStatementConfig = StatementConfig & {
  keep_duration: number
  max_refresh_interval: number
  max_keep_duration: number
}

const convertArrToObj = (arr: number[]) =>
  arr.reduce((acc, cur) => {
    acc[cur] = cur
    return acc
  }, {})

const REFRESH_INTERVAL_MARKS = convertArrToObj([1, 5, 15, 30, 60])
const KEEP_DURATION_MARKS = convertArrToObj([1, 2, 5, 10, 20, 30])

function StatementSettingForm({ onClose, onConfigUpdated }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const { t } = useTranslation()

  const {
    data: oriConfig,
    isLoading: loading,
    error,
  } = useClientRequest((reqConfig) =>
    client.getInstance().statementsConfigGet(reqConfig)
  )

  const config = useMemo(() => {
    if (oriConfig) {
      const refresh_interval = Math.ceil(oriConfig.refresh_interval! / 60)
      const max_refresh_interval = Math.max(refresh_interval, 60)
      const keep_duration = Math.ceil(
        (oriConfig.refresh_interval! * oriConfig.history_size!) / (24 * 60 * 60)
      )
      const max_keep_duration = Math.max(keep_duration, 30)

      return {
        ...oriConfig,
        refresh_interval,
        keep_duration,
        max_refresh_interval,
        max_keep_duration,
      } as InternalStatementConfig
    }
    return null
  }, [oriConfig])

  async function updateConfig(values) {
    const newConfig: StatementConfig = {
      enable: values.enable,
      refresh_interval: values.refresh_interval * 60,
      history_size: Math.ceil(
        (values.keep_duration * 24 * 60) / values.refresh_interval
      ),
    }
    try {
      setSubmitting(true)
      await client.getInstance().statementsConfigPost(newConfig)
      onClose()
      onConfigUpdated()
    } finally {
      setSubmitting(false)
    }
  }

  function handleSubmit(values) {
    if (oriConfig?.enable && !values.enable) {
      // warning
      Modal.confirm({
        title: t('statement.settings.close_statement'),
        icon: <ExclamationCircleOutlined />,
        content: t('statement.settings.close_statement_warning'),
        okText: t('statement.settings.actions.close'),
        cancelText: t('statement.settings.actions.cancel'),
        okButtonProps: { danger: true },
        onOk: () => updateConfig(values),
      })
    } else {
      updateConfig(values)
    }
  }

  return (
    <>
      {error && <ErrorBar errors={[error]} />}
      {loading && <Skeleton active={true} paragraph={{ rows: 5 }} />}
      {!loading && config && (
        <Form layout="vertical" initialValues={config} onFinish={handleSubmit}>
          <Form.Item
            name="enable"
            valuePropName="checked"
            label={t('statement.settings.switch')}
          >
            <Switch />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) => prev.enable !== cur.enable}
          >
            {({ getFieldValue }) => {
              return (
                getFieldValue('enable') && (
                  <Form.Item noStyle>
                    <Form.Item label={t('statement.settings.refresh_interval')}>
                      <Input.Group>
                        <Form.Item noStyle name="refresh_interval">
                          <InputNumber
                            min={1}
                            max={config.max_refresh_interval}
                            formatter={(value) => `${value} min`}
                            parser={(value) =>
                              value?.replace(/[^\d]/g, '') || ''
                            }
                          />
                        </Form.Item>
                        <Form.Item noStyle name="refresh_interval">
                          <Slider
                            min={1}
                            max={config.max_refresh_interval}
                            marks={{
                              ...REFRESH_INTERVAL_MARKS,
                              [config.max_refresh_interval]: `${config.max_refresh_interval}`,
                            }}
                          />
                        </Form.Item>
                      </Input.Group>
                    </Form.Item>
                    <Form.Item label={t('statement.settings.keep_duration')}>
                      <Input.Group>
                        <Form.Item noStyle name="keep_duration">
                          <InputNumber
                            min={1}
                            max={config.max_keep_duration}
                            formatter={(value) => `${value} day`}
                            parser={(value) =>
                              value?.replace(/[^\d]/g, '') || ''
                            }
                          />
                        </Form.Item>
                        <Form.Item noStyle name="keep_duration">
                          <Slider
                            min={1}
                            max={config.max_keep_duration}
                            marks={{
                              ...KEEP_DURATION_MARKS,
                              [config.max_keep_duration]: `${config.max_keep_duration}`,
                            }}
                          />
                        </Form.Item>
                      </Input.Group>
                    </Form.Item>
                  </Form.Item>
                )
              )
            }}
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {t('statement.settings.actions.save')}
              </Button>
              <Button onClick={onClose}>
                {t('statement.settings.actions.cancel')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      )}
    </>
  )
}

export default StatementSettingForm
