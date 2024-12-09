/* md5: a0adf83e4c9cb83b338c8f41f7b6bca2 */
/* Rap repository id: 18 */
/* @infra/generation version: 0.0.2 */
/* eslint-disable */
/* tslint:disable */
// @ts-nocheck

/**
 * This file is automatically generated by Rapper to synchronize the Rap platform interface, please do not modify
 * Rap repository url: https://rapapi.cn/repository/editor?id=18
 */

export const POS_MAP = {
  /**
   * Interface name：Example Interface
   * Rap url: https://rapapi.cn/repository/editor?id=18&mod=53&itf=224
   *
   */
  'GET/example/1730195357072': {
    Query: ['foo'],
  },
  /**
   * Interface name：Advise indexes on the specified cluster.
   * Rap url: https://rapapi.cn/repository/editor?id=18&mod=58&itf=238
   *
   */
  'POST/api/v1/serverless/orgs/{org_id}/projects/{project_id}/clusters/{cluster_id}/advise_indexes':
    {
      Query: ['org_id', 'project_id', 'cluster_id', 'with_cloud_admin'],
      Body: ['database_name', 'queries'],
    },
  /**
   * Interface name：Apply an index advisor record.
   * Rap url: https://rapapi.cn/repository/editor?id=18&mod=58&itf=239
   *
   */
  'POST/api/v1/serverless/orgs/{org_id}/projects/{project_id}/clusters/{cluster_id}/apply_advice':
    {
      Query: ['org_id', 'project_id', 'cluster_id', 'with_cloud_admin'],
      Body: ['advice_id'],
    },
  /**
   * Interface name：Close an index advisor record.
   * Rap url: https://rapapi.cn/repository/editor?id=18&mod=58&itf=240
   *
   */
  'POST/api/v1/serverless/orgs/{org_id}/projects/{project_id}/clusters/{cluster_id}/close_advice':
    {
      Query: ['org_id', 'project_id', 'cluster_id', 'with_cloud_admin'],
      Body: ['advice_id'],
    },
  /**
   * Interface name：List databases of a cluster.
   * Rap url: https://rapapi.cn/repository/editor?id=18&mod=58&itf=241
   *
   */
  'GET/api/v1/serverless/orgs/{org_id}/projects/{project_id}/clusters/{cluster_id}/databases':
    {
      Query: ['org_id', 'project_id', 'cluster_id'],
    },
  /**
   * Interface name：Create a database of a cluster.
   * Rap url: https://rapapi.cn/repository/editor?id=18&mod=58&itf=242
   *
   */
  'POST/api/v1/serverless/orgs/{org_id}/projects/{project_id}/clusters/{cluster_id}/databases':
    {
      Query: ['org_id', 'project_id', 'cluster_id'],
      Body: ['database_name'],
    },
  /**
   * Interface name：List index advisor results of a cluster.
   * Rap url: https://rapapi.cn/repository/editor?id=18&mod=58&itf=243
   *
   */
  'GET/api/v1/serverless/orgs/{org_id}/projects/{project_id}/clusters/{cluster_id}/index_advices':
    {
      Query: [
        'org_id',
        'project_id',
        'cluster_id',
        'page_token',
        'page_size',
        'state_filter',
        'name_filter',
        'order_by',
        'desc',
      ],
    },
  /**
   * Interface name：Get detail of a index advice.
   * Rap url: https://rapapi.cn/repository/editor?id=18&mod=58&itf=244
   *
   */
  'GET/api/v1/serverless/orgs/{org_id}/projects/{project_id}/clusters/{cluster_id}/index_advices/{advice_id}':
    {
      Query: ['org_id', 'project_id', 'cluster_id', 'advice_id'],
    },
  /**
   * Interface name：GetProcessList retrieves the list of running processes in a cluster
   * Rap url: https://rapapi.cn/repository/editor?id=18&mod=58&itf=351
   *
   */
  'GET/api/v2/clusters/{clusterId}/sessions': {
    Query: ['clusterId'],
  },
  /**
   * Interface name：Get summary of open index advices.
   * Rap url: https://rapapi.cn/repository/editor?id=18&mod=58&itf=245
   *
   */
  'GET/api/v1/serverless/orgs/{org_id}/projects/{project_id}/clusters/{cluster_id}/index_advices_summary':
    {
      Query: ['org_id', 'project_id', 'cluster_id'],
    },
  /**
   * Interface name：DeleteProcess terminates a specific process in the cluster
   * Rap url: https://rapapi.cn/repository/editor?id=18&mod=58&itf=352
   *
   */
  'DELETE/api/v2/clusters/{clusterId}/sessions/{sessionId}': {
    Query: ['clusterId', 'sessionId'],
  },
  /**
   * Interface name：Get cluster metric data
   * Rap url: https://rapapi.cn/repository/editor?id=18&mod=71&itf=345
   *
   */
  'GET/api/v2/clusters/{clusterId}/metrics/{name}/data': {
    Query: [
      'clusterId',
      'name',
      'startTime',
      'endTime',
      'step',
      'label',
      'range',
    ],
  },
  /**
   * Interface name：Get metric instances
   * Rap url: https://rapapi.cn/repository/editor?id=18&mod=71&itf=346
   *
   */
  'GET/api/v2/clusters/{clusterId}/metrics/{name}/instance': {
    Query: ['clusterId', 'name'],
  },
  /**
   * Interface name：Get host metric data
   * Rap url: https://rapapi.cn/repository/editor?id=18&mod=71&itf=347
   *
   */
  'GET/api/v2/hosts/{hostId}/metrics/{name}/data': {
    Query: ['hostId', 'name', 'startTime', 'endTime', 'step', 'label', 'range'],
  },
  /**
   * Interface name：Get metrics info
   * Rap url: https://rapapi.cn/repository/editor?id=18&mod=71&itf=348
   *
   */
  'GET/api/v2/metrics': {
    Query: ['class', 'group', 'type', 'name'],
  },
  /**
   * Interface name：Get top metric data
   * Rap url: https://rapapi.cn/repository/editor?id=18&mod=71&itf=349
   *
   */
  'GET/api/v2/overview/metrics/{name}/data': {
    Query: ['name', 'startTime', 'endTime', 'step', 'limit'],
  },
  /**
   * Interface name：Get overview status
   * Rap url: https://rapapi.cn/repository/editor?id=18&mod=71&itf=350
   *
   */
  'GET/api/v2/overview/status': {
    Query: ['taskStartTime', 'taskEndTime'],
  },
  /**
   * Interface name：login
   * Rap url: https://rapapi.cn/repository/editor?id=18&mod=72&itf=353
   *
   */
  'POST/api/v2/login': {
    Body: ['userId', 'password'],
  },
  /**
   * Interface name：ListUsers
   * Rap url: https://rapapi.cn/repository/editor?id=18&mod=72&itf=355
   *
   */
  'GET/api/v2/users': {
    Query: ['pageSize', 'pageToken', 'skip', 'orderBy', 'name'],
  },
  /**
   * Interface name：CreateUser
   * Rap url: https://rapapi.cn/repository/editor?id=18&mod=72&itf=356
   *
   */
  'POST/api/v2/users': {
    Body: ['userId', 'name', 'email', 'password'],
  },
  /**
   * Interface name：delete one user by user_id
   * Rap url: https://rapapi.cn/repository/editor?id=18&mod=72&itf=357
   *
   */
  'DELETE/api/v2/users/{userId}': {
    Query: ['userId'],
  },
  /**
   * Interface name：Update User
   * Rap url: https://rapapi.cn/repository/editor?id=18&mod=72&itf=358
   *
   */
  'PATCH/api/v2/users/{userId}': {
    Query: ['userId'],
    Body: ['userId', 'name', 'email', 'password'],
  },
  /**
   * Interface name：get slow query list
   * Rap url: https://rapapi.cn/repository/editor?id=18&mod=55&itf=227
   *
   */
  'GET/slow-query/list': {
    Query: ['limit', 'term'],
  },
  /**
   * Interface name：get slow query detail
   * Rap url: https://rapapi.cn/repository/editor?id=18&mod=55&itf=228
   *
   */
  'GET/slow-query/detail': {
    Query: ['id'],
  },
  /**
   * Interface name：示例接口
   * Rap url: https://rapapi.cn/repository/editor?id=18&mod=70&itf=344
   *
   */
  'GET/example/1733710080151': {
    Query: ['foo'],
  },
}
