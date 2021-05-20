import React, { useEffect, useMemo, useState } from 'react'
import { Collapse, Space, Input, Empty, Alert, Tooltip } from 'antd'
import { useTranslation } from 'react-i18next'
import { TFunction, i18n as Ii18n } from 'i18next'
import { SearchOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { debounce } from 'lodash'

import { AnimatedSkeleton, Card, Root } from '@lib/components'
import { useClientRequest } from '@lib/utils/useClientRequest'
import client, { DebugapiEndpointAPIModel } from '@lib/client'

import style from './ApiList.module.less'
import ApiForm, { Topology } from './ApiForm'

const useFilterEndpoints = (endpoints?: DebugapiEndpointAPIModel[]) => {
  const [keywords, setKeywords] = useState('')
  const nonNullEndpoints = useMemo(() => endpoints || [], [endpoints])
  const [filteredEndpoints, setFilteredEndpoints] = useState<
    DebugapiEndpointAPIModel[]
  >(nonNullEndpoints)

  useEffect(() => {
    const k = keywords.trim()
    if (!!k) {
      setFilteredEndpoints(
        nonNullEndpoints.filter((e) => e.id?.includes(k) || e.path?.includes(k))
      )
    } else {
      setFilteredEndpoints(nonNullEndpoints)
    }
  }, [nonNullEndpoints, keywords])

  return {
    endpoints: filteredEndpoints,
    filterBy: debounce(setKeywords, 300),
  }
}

export default function Page() {
  const { t, i18n } = useTranslation()
  const {
    data: endpointData,
    isLoading: isEndpointLoading,
  } = useClientRequest((reqConfig) =>
    client.getInstance().debugapiEndpointsGet(reqConfig)
  )
  const { endpoints, filterBy } = useFilterEndpoints(endpointData)

  // TODO: refine with components/InstanceSelect
  const {
    data: tidbTopology = [],
    isLoading: isTiDBTopology,
  } = useClientRequest((reqConfig) =>
    client.getInstance().getTiDBTopology(reqConfig)
  )
  const {
    data: pdTopology = [],
    isLoading: isPDLoading,
  } = useClientRequest((reqConfig) =>
    client.getInstance().getPDTopology(reqConfig)
  )
  const {
    data: storeTopology,
    isLoading: isStoreLoading,
  } = useClientRequest((reqConfig) =>
    client.getInstance().getStoreTopology(reqConfig)
  )
  const topology: Topology = {
    tidb: tidbTopology!,
    tikv: storeTopology?.tikv || [],
    tiflash: storeTopology?.tiflash || [],
    pd: pdTopology!,
  }
  const isTopologyLoading = isTiDBTopology || isPDLoading || isStoreLoading

  const groups = useMemo(
    () =>
      endpoints.reduce((prev, endpoint) => {
        const groupName = endpoint.component!
        if (!prev[groupName]) {
          prev[groupName] = []
        }
        prev[groupName].push(endpoint)
        return prev
      }, {} as { [group: string]: DebugapiEndpointAPIModel[] }),
    [endpoints]
  )
  const sortedGroups = useMemo(
    () =>
      ['tidb', 'tikv', 'tiflash', 'pd']
        .filter((sortKey) => groups[sortKey])
        .map((sortKey) => groups[sortKey]),
    [groups]
  )

  function EndpointGroup({ group }: { group: DebugapiEndpointAPIModel[] }) {
    return (
      <Card
        noMarginLeft
        noMarginRight
        title={t(`debug_api.${group[0].component!}.name`)}
      >
        <Collapse ghost>
          {group.map((endpoint) => (
            <Collapse.Panel
              className={style.collapse_panel}
              header={
                <CustomHeader endpoint={endpoint} translation={{ t, i18n }} />
              }
              key={endpoint.id!}
            >
              <ApiForm endpoint={endpoint} topology={topology} />
            </Collapse.Panel>
          ))}
        </Collapse>
      </Card>
    )
  }

  return (
    <Root>
      <Card>
        <Alert
          message={t(`debug_api.warning_header.title`)}
          description={t(`debug_api.warning_header.body`)}
          type="warning"
          showIcon
        />
      </Card>
      <Card>
        <Input
          style={{ maxWidth: 450 }}
          placeholder={t(`debug_api.keyword_search`)}
          prefix={<SearchOutlined />}
          onChange={(e) => filterBy(e.target.value)}
        />
      </Card>
      <Card>
        <AnimatedSkeleton showSkeleton={isEndpointLoading || isTopologyLoading}>
          {endpoints.length ? (
            sortedGroups.map((g) => (
              <EndpointGroup key={g[0].component!} group={g} />
            ))
          ) : (
            <Empty description={t('debug_api.endpoints_not_found')} />
          )}
        </AnimatedSkeleton>
      </Card>
    </Root>
  )
}

function CustomHeader({
  endpoint,
  translation,
}: {
  endpoint: DebugapiEndpointAPIModel
  translation: {
    t: TFunction
    i18n: Ii18n
  }
}) {
  const { t, i18n } = translation
  const descTranslationKey = `debug_api.${endpoint.component}.endpoints.${endpoint.id}_desc`
  const descExists = i18n.exists(descTranslationKey)
  return (
    <div className={style.header}>
      <Space direction="vertical">
        <Space>
          <h4>
            {t(`debug_api.${endpoint.component}.endpoints.${endpoint.id}`)}
          </h4>
          {descExists && (
            <Tooltip title={t(descTranslationKey)}>
              <QuestionCircleOutlined />
            </Tooltip>
          )}
        </Space>
        <Schema endpoint={endpoint} />
      </Space>
    </div>
  )
}

// e.g. http://{tidb_ip}/stats/dump/{db}/{table}?queryName={queryName}
function Schema({ endpoint }: { endpoint: DebugapiEndpointAPIModel }) {
  const query =
    endpoint.query_params?.reduce((prev, { name }, i) => {
      if (i === 0) {
        prev += '?'
      }
      prev += `${name}={${name}}`
      return prev
    }, '') || ''
  return (
    <p className={style.schema}>
      {`http://{${endpoint.component}_host}${endpoint.path}${query}`}
    </p>
  )
}
