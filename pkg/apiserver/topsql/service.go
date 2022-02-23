// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package topsql

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	"github.com/pingcap/tidb-dashboard/util/featureflag"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

var ErrNS = errorx.NewNamespace("error.api.topsql")

type ServiceParams struct {
	fx.In
	TiDBClient *tidb.Client
	NgmProxy   *utils.NgmProxy
}

type Service struct {
	params        ServiceParams
	featureTopSQL *featureflag.FeatureFlag
}

func newService(p ServiceParams, ff *featureflag.Registry) *Service {
	return &Service{params: p, featureTopSQL: ff.Register("topsql", ">= 5.4.0")}
}

func registerRouter(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/topsql")
	endpoint.Use(
		auth.MWAuthRequired(),
		s.featureTopSQL.VersionGuard(),
		utils.MWConnectTiDB(s.params.TiDBClient),
	)
	{
		endpoint.GET("/config", s.GetConfig)
		endpoint.POST("/config", auth.MWRequireWritePriv(), s.UpdateConfig)
		endpoint.GET("/instances", s.params.NgmProxy.Route("/topsql/v1/instances"))
		endpoint.GET("/summary", s.params.NgmProxy.Route("/topsql/v1/summary"))
	}
}

type GetInstancesRequest struct {
	Start string `json:"start"`
	End   string `json:"end"`
}

type InstanceResponse struct {
	Data []InstanceItem `json:"data"`
}

type InstanceItem struct {
	Instance     string `json:"instance"`
	InstanceType string `json:"instance_type"`
}

// @Summary Get availiable instances
// @Router /topsql/instances [get]
// @Security JwtAuth
// @Param q query GetInstancesRequest true "Query"
// @Success 200 {object} InstanceResponse "ok"
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) GetInstance(c *gin.Context) {
	// dummy, for generate open api
}

type GetSummaryRequest struct {
	Instance     string `json:"instance"`
	InstanceType string `json:"instance_type"`
	Start        string `json:"start"`
	End          string `json:"end"`
	Top          string `json:"top"`
	Window       string `json:"window"`
}

type SummaryResponse struct {
	Data []SummaryItem `json:"data"`
}

type SummaryItem struct {
	SQLDigest         string            `json:"sql_digest"`
	SQLText           string            `json:"sql_text"`
	IsOther           bool              `json:"is_other"`
	CPUTimeMs         uint64            `json:"cpu_time_ms"`
	ExecCountPerSec   float64           `json:"exec_count_per_sec"`
	DurationPerExecMs float64           `json:"duration_per_exec_ms"`
	ScanRecordsPerSec float64           `json:"scan_records_per_sec"`
	ScanIndexesPerSec float64           `json:"scan_indexes_per_sec"`
	Plans             []SummaryPlanItem `json:"plans"`
}

type SummaryPlanItem struct {
	PlanDigest        string   `json:"plan_digest"`
	PlanText          string   `json:"plan_text"`
	TimestampSec      []uint64 `json:"timestamp_sec"`
	CPUTimeMs         []uint64 `json:"cpu_time_ms,omitempty"`
	ExecCountPerSec   float64  `json:"exec_count_per_sec"`
	DurationPerExecMs float64  `json:"duration_per_exec_ms"`
	ScanRecordsPerSec float64  `json:"scan_records_per_sec"`
	ScanIndexesPerSec float64  `json:"scan_indexes_per_sec"`
}

// @Summary Get summaries
// @Router /topsql/summary [get]
// @Security JwtAuth
// @Param q query GetSummaryRequest true "Query"
// @Success 200 {object} SummaryResponse "ok"
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) GetSummary(c *gin.Context) {
	// dummy, for generate open api
}

type EditableConfig struct {
	Enable bool `json:"enable" gorm:"column:tidb_enable_top_sql"`
}

// @Summary Get Top SQL config
// @Router /topsql/config [get]
// @Security JwtAuth
// @Success 200 {object} EditableConfig "ok"
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) GetConfig(c *gin.Context) {
	db := utils.GetTiDBConnection(c)
	cfg := &EditableConfig{}
	err := db.Raw("SELECT @@GLOBAL.tidb_enable_top_sql as tidb_enable_top_sql").Find(cfg).Error
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, cfg)
}

// @Summary Update Top SQL config
// @Router /topsql/config [post]
// @Param request body EditableConfig true "Request body"
// @Security JwtAuth
// @Success 204 {object} string
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) UpdateConfig(c *gin.Context) {
	var cfg EditableConfig
	if err := c.ShouldBindJSON(&cfg); err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}

	db := utils.GetTiDBConnection(c)
	err := db.Exec("SET @@GLOBAL.tidb_enable_top_sql = @Enable", &cfg).Error
	if err != nil {
		rest.Error(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}
