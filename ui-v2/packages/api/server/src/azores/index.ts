/**
 * Generated by orval v7.3.0 🍺
 * Do not edit manually.
 * Azores Open API
 * OpenAPI spec version: 2.0.0
 */
import {
  Hono
} from 'hono'
import { cors } from 'hono/cors'

import { metricsServiceGetClusterMetricDataHandlers } from './handlers/metricsServiceGetClusterMetricData';
import { metricsServiceGetClusterMetricInstanceHandlers } from './handlers/metricsServiceGetClusterMetricInstance';
import { diagnosisServiceGetResourceGroupListHandlers } from './handlers/diagnosisServiceGetResourceGroupList';
import { clusterServiceGetProcessListHandlers } from './handlers/clusterServiceGetProcessList';
import { clusterServiceDeleteProcessHandlers } from './handlers/clusterServiceDeleteProcess';
import { diagnosisServiceGetSlowQueryListHandlers } from './handlers/diagnosisServiceGetSlowQueryList';
import { diagnosisServiceGetSlowQueryAvailableAdvancedFiltersHandlers } from './handlers/diagnosisServiceGetSlowQueryAvailableAdvancedFilters';
import { diagnosisServiceGetSlowQueryAvailableAdvancedFilterInfoHandlers } from './handlers/diagnosisServiceGetSlowQueryAvailableAdvancedFilterInfo';
import { diagnosisServiceDownloadSlowQueryListHandlers } from './handlers/diagnosisServiceDownloadSlowQueryList';
import { diagnosisServiceGetSlowQueryAvailableFieldsHandlers } from './handlers/diagnosisServiceGetSlowQueryAvailableFields';
import { diagnosisServiceGetSlowQueryDetailHandlers } from './handlers/diagnosisServiceGetSlowQueryDetail';
import { diagnosisServiceAddSqlLimitHandlers } from './handlers/diagnosisServiceAddSqlLimit';
import { diagnosisServiceCheckSqlLimitSupportHandlers } from './handlers/diagnosisServiceCheckSqlLimitSupport';
import { diagnosisServiceRemoveSqlLimitHandlers } from './handlers/diagnosisServiceRemoveSqlLimit';
import { diagnosisServiceGetSqlLimitListHandlers } from './handlers/diagnosisServiceGetSqlLimitList';
import { diagnosisServiceGetSqlPlanListHandlers } from './handlers/diagnosisServiceGetSqlPlanList';
import { diagnosisServiceBindSqlPlanHandlers } from './handlers/diagnosisServiceBindSqlPlan';
import { diagnosisServiceCheckSqlPlanSupportHandlers } from './handlers/diagnosisServiceCheckSqlPlanSupport';
import { diagnosisServiceGetSqlPlanBindingListHandlers } from './handlers/diagnosisServiceGetSqlPlanBindingList';
import { diagnosisServiceUnbindSqlPlanHandlers } from './handlers/diagnosisServiceUnbindSqlPlan';
import { diagnosisServiceGetTopSqlListHandlers } from './handlers/diagnosisServiceGetTopSqlList';
import { diagnosisServiceGetTopSqlAvailableAdvancedFiltersHandlers } from './handlers/diagnosisServiceGetTopSqlAvailableAdvancedFilters';
import { diagnosisServiceGetTopSqlAvailableAdvancedFilterInfoHandlers } from './handlers/diagnosisServiceGetTopSqlAvailableAdvancedFilterInfo';
import { diagnosisServiceGetTopSqlAvailableFieldsHandlers } from './handlers/diagnosisServiceGetTopSqlAvailableFields';
import { diagnosisServiceGetTopSqlDetailHandlers } from './handlers/diagnosisServiceGetTopSqlDetail';
import { metricsServiceGetHostMetricDataHandlers } from './handlers/metricsServiceGetHostMetricData';
import { labelServiceListLabelsHandlers } from './handlers/labelServiceListLabels';
import { labelServiceCreateLabelHandlers } from './handlers/labelServiceCreateLabel';
import { labelServiceDeleteLabelHandlers } from './handlers/labelServiceDeleteLabel';
import { labelServiceUpdateLabelHandlers } from './handlers/labelServiceUpdateLabel';
import { labelServiceBindLabelHandlers } from './handlers/labelServiceBindLabel';
import { labelServiceBindResourceHandlers } from './handlers/labelServiceBindResource';
import { userServiceLoginHandlers } from './handlers/userServiceLogin';
import { userServiceLogoutHandlers } from './handlers/userServiceLogout';
import { metricsServiceGetMetricsHandlers } from './handlers/metricsServiceGetMetrics';
import { metricsServiceGetTopMetricDataHandlers } from './handlers/metricsServiceGetTopMetricData';
import { metricsServiceGetOverviewStatusHandlers } from './handlers/metricsServiceGetOverviewStatus';
import { userServiceListUsersHandlers } from './handlers/userServiceListUsers';
import { userServiceCreateUserHandlers } from './handlers/userServiceCreateUser';
import { userServiceDeleteUserHandlers } from './handlers/userServiceDeleteUser';
import { userServiceUpdateUserHandlers } from './handlers/userServiceUpdateUser';
import { userServiceListUserRolesHandlers } from './handlers/userServiceListUserRoles';
import { userServiceValidateSessionHandlers } from './handlers/userServiceValidateSession';


const app = new Hono()

app.use('/api/v2/*', cors())
/**
 * @summary Get cluster metric data
 */

app.get('/api/v2/clusters/:clusterId/metrics/:name/data',...metricsServiceGetClusterMetricDataHandlers)


/**
 * @summary Get metric instances
 */

app.get('/api/v2/clusters/:clusterId/metrics/:name/instance',...metricsServiceGetClusterMetricInstanceHandlers)


/**
 * @summary Get resource group list
 */

app.get('/api/v2/clusters/:clusterId/resourcegroups',...diagnosisServiceGetResourceGroupListHandlers)


/**
 * @summary GetProcessList retrieves the list of running processes in a cluster
 */

app.get('/api/v2/clusters/:clusterId/sessions',...clusterServiceGetProcessListHandlers)


/**
 * @summary DeleteProcess terminates a specific process in the cluster
 */

app.delete('/api/v2/clusters/:clusterId/sessions/:sessionId',...clusterServiceDeleteProcessHandlers)


/**
 * @summary GetSlowQueryList retrieves the list of slow queries
 */

app.get('/api/v2/clusters/:clusterId/slowqueries',...diagnosisServiceGetSlowQueryListHandlers)


/**
 * @summary GetSlowQueryAvailableAdvancedFilters retrieves the list of available advanced filters
 */

app.get('/api/v2/clusters/:clusterId/slowqueries/advancedFilters',...diagnosisServiceGetSlowQueryAvailableAdvancedFiltersHandlers)


/**
 * @summary GetSlowQueryAvailableAdvancedFilterInfo retrieves the list of available advanced filter info
 */

app.get('/api/v2/clusters/:clusterId/slowqueries/advancedFilters/:filterName',...diagnosisServiceGetSlowQueryAvailableAdvancedFilterInfoHandlers)


/**
 * @summary DownloadSlowQueryList downloads the list of slow queries
 */

app.get('/api/v2/clusters/:clusterId/slowqueries/download',...diagnosisServiceDownloadSlowQueryListHandlers)


/**
 * @summary GetSlowQueryAvailableFields retrieves the list of available fields for slow queries
 */

app.get('/api/v2/clusters/:clusterId/slowqueries/fields',...diagnosisServiceGetSlowQueryAvailableFieldsHandlers)


/**
 * @summary GetSlowQueryDetail retrieves the details of a specific slow query
 */

app.get('/api/v2/clusters/:clusterId/slowqueries/:digest',...diagnosisServiceGetSlowQueryDetailHandlers)


/**
 * @summary Create SQL limit
 */

app.post('/api/v2/clusters/:clusterId/sqllimits:addSqlLimit',...diagnosisServiceAddSqlLimitHandlers)


/**
 * @summary Check if SQL limit is supported
 */

app.get('/api/v2/clusters/:clusterId/sqllimits:checkSupport',...diagnosisServiceCheckSqlLimitSupportHandlers)


/**
 * @summary Remove SQL limit
 */

app.post('/api/v2/clusters/:clusterId/sqllimits:removeSqlLimit',...diagnosisServiceRemoveSqlLimitHandlers)


/**
 * @summary Query SQL limit
 */

app.get('/api/v2/clusters/:clusterId/sqllimits:showSqlLimit',...diagnosisServiceGetSqlLimitListHandlers)


/**
 * @summary GetSqlPlanList retrieves the list of plans
 */

app.get('/api/v2/clusters/:clusterId/sqlplans',...diagnosisServiceGetSqlPlanListHandlers)


/**
 * @summary BindSqlPlan binds a plan to a specific sql
 */

app.post('/api/v2/clusters/:clusterId/sqlplans/:planDigest:bindSqlPlan',...diagnosisServiceBindSqlPlanHandlers)


/**
 * @summary CheckSupport returns whether sql plan binding is supported
 */

app.get('/api/v2/clusters/:clusterId/sqlplans:checkSupport',...diagnosisServiceCheckSqlPlanSupportHandlers)


/**
 * @summary GetSQLBindInfo
 */

app.get('/api/v2/clusters/:clusterId/sqlplans:showSqlPlanBinding',...diagnosisServiceGetSqlPlanBindingListHandlers)


/**
 * @summary DropSqlPlan unbinds a plan from a specific sql
 */

app.post('/api/v2/clusters/:clusterId/sqlplans:unbindSqlPlan',...diagnosisServiceUnbindSqlPlanHandlers)


/**
 * @summary GetTopSqlList retrieves the list of top sql
 */

app.get('/api/v2/clusters/:clusterId/topsqls',...diagnosisServiceGetTopSqlListHandlers)


/**
 * @summary GetSlowQueryAvailableAdvancedFilters retrieves the list of available advanced filters
 */

app.get('/api/v2/clusters/:clusterId/topsqls/advancedFilters',...diagnosisServiceGetTopSqlAvailableAdvancedFiltersHandlers)


/**
 * @summary GetSlowQueryAvailableAdvancedFilterInfo retrieves the list of available advanced filter info
 */

app.get('/api/v2/clusters/:clusterId/topsqls/advancedFilters/:filterName',...diagnosisServiceGetTopSqlAvailableAdvancedFilterInfoHandlers)


/**
 * @summary GetTopSqlAvailableFields retrieves the list of available fields for top sqls
 */

app.get('/api/v2/clusters/:clusterId/topsqls/fields',...diagnosisServiceGetTopSqlAvailableFieldsHandlers)


/**
 * @summary GetTopSqlDetail retrieves the details of a specific top sql
 */

app.get('/api/v2/clusters/:clusterId/topsqls/:digest',...diagnosisServiceGetTopSqlDetailHandlers)


/**
 * @summary Get host metric data
 */

app.get('/api/v2/hosts/:hostId/metrics/:name/data',...metricsServiceGetHostMetricDataHandlers)


/**
 * @summary list labels
 */

app.get('/api/v2/labels',...labelServiceListLabelsHandlers)


/**
 * @summary create label
 */

app.post('/api/v2/labels',...labelServiceCreateLabelHandlers)


/**
 * @summary delete label by label id
 */

app.delete('/api/v2/labels/:labelId',...labelServiceDeleteLabelHandlers)


/**
 * @summary update label basic info by label id
 */

app.patch('/api/v2/labels/:labelId',...labelServiceUpdateLabelHandlers)


/**
 * @summary modify bind object by label id
 */

app.post('/api/v2/labels:bindLabel',...labelServiceBindLabelHandlers)


/**
 * @summary modify bind object by resource id
 */

app.post('/api/v2/labels:bindResource',...labelServiceBindResourceHandlers)


/**
 * @summary login
 */

app.post('/api/v2/login',...userServiceLoginHandlers)


/**
 * @summary Logout
 */

app.post('/api/v2/logout',...userServiceLogoutHandlers)


/**
 * @summary Get metrics info
 */

app.get('/api/v2/metrics',...metricsServiceGetMetricsHandlers)


/**
 * @summary Get top metric data
 */

app.get('/api/v2/overview/metrics/:name/data',...metricsServiceGetTopMetricDataHandlers)


/**
 * @summary Get overview status
 */

app.get('/api/v2/overview/status',...metricsServiceGetOverviewStatusHandlers)


/**
 * @summary ListUsers
 */

app.get('/api/v2/users',...userServiceListUsersHandlers)


/**
 * @summary CreateUser
 */

app.post('/api/v2/users',...userServiceCreateUserHandlers)


/**
 * @summary delete one user by user_id
 */

app.delete('/api/v2/users/:userId',...userServiceDeleteUserHandlers)


/**
 * @summary Update User
 */

app.patch('/api/v2/users/:userId',...userServiceUpdateUserHandlers)


/**
 * @summary ListUserRoles
 */

app.get('/api/v2/users:userRoles',...userServiceListUserRolesHandlers)


/**
 * @summary ValidateSession
 */

app.get('/api/v2/users:validateSession',...userServiceValidateSessionHandlers)


export default app