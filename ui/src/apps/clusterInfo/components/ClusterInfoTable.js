import React from 'react'
import { Table, Card, Skeleton } from 'antd'
import { useTranslation } from 'react-i18next'

import client from '@/utils/client'

function ComponentPanelTable({ cluster }) {
  const { t } = useTranslation()

  let dataSource = []

  const columns = [
    {
      title: t('cluster_info.component_table.address'),
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
      width: 240,
    },
    {
      title: t('cluster_info.component_table.version'),
      dataIndex: 'version',
      key: 'version',
      ellipsis: true,
      width: 200,
    },
    {
      title: t('cluster_info.component_table.deploy_path'),
      dataIndex: 'deploy_path',
      key: 'deploy_path',
      ellipsis: true,
    },
    {
      title: t('cluster_info.component_table.status'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
    },
    {
      title: t('cluster_info.component_table.action'),
      key: 'action',
      width: 100,
      render: (_, node) => {
        if (
          node !== undefined &&
          node.status !== undefined &&
          node.status !== 'up'
        ) {
          return (
            <a onClick={() => deleteTiDBTopology(node, dataSource, cluster.setCluster)}>
              {t('cluster_info.component_table.del_db')}
            </a>
          )
        }
      },
    },
  ]

  if (cluster.cluster) {
    pushNodes('tikv', cluster.cluster, dataSource)
    pushNodes('tidb', cluster.cluster, dataSource)
    pushNodes('pd', cluster.cluster, dataSource)
  }

  return (
    <Card
      size="small"
      bordered={false}
      title={t('cluster_info.component_table.node_list')}
    >
      {!cluster ? (
        <Skeleton active title={false} paragraph={{ rows: 5 }} />
      ) : (
        <Table
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          size="middle"
          style={{ margin: -5 }}
        />
      )}
    </Card>
  )
}

function pushNodes(key, cluster, dataSource) {
  if (
    cluster[key] !== undefined &&
    cluster[key] !== null &&
    cluster[key].err === null
  ) {
    const nodes = cluster[key].nodes
    dataSource.push({
      address: key + '(' + nodes.length + ')',
      children: nodes.map((n, index) => wrapNode(n, key, index)),
    })
  }
}

function wrapNode(node, comp, id) {
  if (node === undefined || node === null) {
    return
  }
  // TODO: i18n
  let status = 'down'
  if (node.status === 1) {
    status = 'up'
  }
  if (node.deploy_path === undefined && node.binary_path !== null) {
    node.deploy_path = node.binary_path.substring(
      0,
      node.binary_path.lastIndexOf('/')
    )
  }
  return {
    address: `${node.ip}:${node.port}`,
    binary_path: node.binary_path,
    deploy_path: node.deploy_path,
    version: node.version,
    status_port: node.status_port,
    status: status,
  }
}

async function deleteTiDBTopology(node, dataSource, setCluster) {
  let resp = await client.dashboard.topologyTidbAddressDelete(node.address)
  if (resp.status === 200) {
    for (let v of dataSource) {
      if (v.address.includes('tidb')) {
        let cnt = 0;
        for (let n of v.children) {
          if (n.address === node.address) {
            v.children.splice(cnt, 1);
            break;
          }
          ++cnt;
        }
      }
    }
  }
  setCluster(dataSource);
}

export default ComponentPanelTable
