// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

// conprof is short for continuous profiling
package conprof

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.etcd.io/etcd/clientv3"
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/util/featureflag"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

type ServiceParams struct {
	fx.In

	EtcdClient   *clientv3.Client
	Config       *config.Config
	NgmProxy     *utils.NgmProxy
	FeatureFlags *featureflag.Registry
}

type Service struct {
	params         ServiceParams
	featureConprof *featureflag.FeatureFlag

	lifecycleCtx context.Context
}

func newService(lc fx.Lifecycle, p ServiceParams) *Service {
	s := &Service{
		params:         p,
		featureConprof: p.FeatureFlags.Register("conprof", ">= 5.3.0"),
	}

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			s.lifecycleCtx = ctx
			return nil
		},
	})

	return s
}

// Register register the handlers to the service.
func registerRouter(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/continuous_profiling")

	endpoint.Use(s.featureConprof.VersionGuard())
	{
		endpoint.GET("/config", auth.MWAuthRequired(), s.params.NgmProxy.Route("/config"))
		endpoint.POST("/config", auth.MWAuthRequired(), auth.MWRequireWritePriv(), s.params.NgmProxy.Route("/config"))
		endpoint.GET("/components", auth.MWAuthRequired(), s.params.NgmProxy.Route("/continuous_profiling/components"))
		endpoint.GET("/estimate_size", auth.MWAuthRequired(), s.params.NgmProxy.Route("/continuous_profiling/estimate_size"))
		endpoint.GET("/group_profiles", auth.MWAuthRequired(), s.params.NgmProxy.Route("/continuous_profiling/group_profiles"))
		endpoint.GET("/group_profile/detail", auth.MWAuthRequired(), s.params.NgmProxy.Route("/continuous_profiling/group_profile/detail"))

		endpoint.GET("/action_token", auth.MWAuthRequired(), s.GenConprofActionToken)
		endpoint.GET("/download", s.parseJWTToken, s.params.NgmProxy.Route("/continuous_profiling/download"))
		endpoint.GET("/single_profile/view", s.parseJWTToken, s.params.NgmProxy.Route("/continuous_profiling/single_profile/view"))
	}
}

type ContinuousProfilingConfig struct {
	Enable               bool `json:"enable"`
	ProfileSeconds       int  `json:"profile_seconds"`
	IntervalSeconds      int  `json:"interval_seconds"`
	TimeoutSeconds       int  `json:"timeout_seconds"`
	DataRetentionSeconds int  `json:"data_retention_seconds"`
}

type NgMonitoringConfig struct {
	ContinuousProfiling ContinuousProfilingConfig `json:"continuous_profiling"`
}

// @Summary Get Continuous Profiling Config
// @Success 200 {object} NgMonitoringConfig
// @Router /continuous_profiling/config [get]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) ConprofConfig(c *gin.Context) {
	// dummy, for generate openapi
}

// @Summary Update Continuous Profiling Config
// @Router /continuous_profiling/config [post]
// @Param request body NgMonitoringConfig true "Request body"
// @Security JwtAuth
// @Success 200 {string} string "ok"
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) UpdateConprofConfig(c *gin.Context) {
	// dummy, for generate openapi
}

type Component struct {
	Name       string `json:"name"`
	IP         string `json:"ip"`
	Port       uint   `json:"port"`
	StatusPort uint   `json:"status_port"`
}

// @Summary Get current scraping components
// @Success 200 {array} Component
// @Router /continuous_profiling/components [get]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) ConprofComponents(c *gin.Context) {
	// dummy, for generate openapi
}

type EstimateSizeRes struct {
	InstanceCount int `json:"instance_count"`
	ProfileSize   int `json:"profile_size"`
}

// @Summary Get Estimate Size
// @Router /continuous_profiling/estimate_size [get]
// @Security JwtAuth
// @Success 200 {object} EstimateSizeRes
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) EstimateSize(c *gin.Context) {
	// dummy, for generate openapi
}

type GetGroupProfileReq struct {
	BeginTime int `json:"begin_time"`
	EndTime   int `json:"end_time"`
}

type ComponentNum struct {
	TiDB    int `json:"tidb"`
	PD      int `json:"pd"`
	TiKV    int `json:"tikv"`
	TiFlash int `json:"tiflash"`
}

type GroupProfiles struct {
	Ts          int64        `json:"ts"`
	ProfileSecs int          `json:"profile_duration_secs"`
	State       string       `json:"state"`
	CompNum     ComponentNum `json:"component_num"`
}

type GroupProfileDetail struct {
	Ts             int64           `json:"ts"`
	ProfileSecs    int             `json:"profile_duration_secs"`
	State          string          `json:"state"`
	TargetProfiles []ProfileDetail `json:"target_profiles"`
}

type ProfileDetail struct {
	State  string `json:"state"`
	Error  string `json:"error"`
	Type   string `json:"profile_type"`
	Target Target `json:"target"`
}

type Target struct {
	Component string `json:"component"`
	Address   string `json:"address"`
}

// @Summary Get Group Profiles
// @Router /continuous_profiling/group_profiles [get]
// @Param q query GetGroupProfileReq true "Query"
// @Security JwtAuth
// @Success 200 {array} GroupProfiles
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) ConprofGroupProfiles(c *gin.Context) {
	// dummy, for generate openapi
}

// @Summary Get Group Profile Detail
// @Router /continuous_profiling/group_profile/detail [get]
// @Param ts query number true "timestamp"
// @Security JwtAuth
// @Success 200 {object} GroupProfileDetail
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) ConprofGroupProfileDetail(c *gin.Context) {
	// dummy, for generate openapi
}

// @Summary Get action token for download or view profile
// @Router /continuous_profiling/action_token [get]
// @Param q query string true "target query string"
// @Security JwtAuth
// @Success 200 {string} string
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) GenConprofActionToken(c *gin.Context) {
	q := c.Query("q")
	token, err := utils.NewJWTString("conprof", q)
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.String(http.StatusOK, token)
}

// @Summary Download Group Profile files
// @Router /continuous_profiling/download [get]
// @Param ts query number true "timestamp"
// @Security JwtAuth
// @Produce application/x-gzip
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) ConprofDownload(c *gin.Context) {
	// dummy, for generate openapi
}

func (s *Service) parseJWTToken(c *gin.Context) {
	token := c.Query("token")
	queryStr, err := utils.ParseJWTString("conprof", token)
	if err != nil {
		rest.Error(c, rest.ErrBadRequest.WrapWithNoMessage(err))
		return
	}
	c.Request.URL.RawQuery = queryStr
}

type ViewSingleProfileReq struct {
	Ts          int    `json:"ts"`
	ProfileType string `json:"profile_type"`
	Component   string `json:"component"`
	Address     string `json:"address"`
}

// @Summary View Single Profile files
// @Router /continuous_profiling/single_profile/view [get]
// @Param q query ViewSingleProfileReq true "Query"
// @Security JwtAuth
// @Produce html
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) ConprofViewProfile(c *gin.Context) {
	// dummy, for generate openapi
}
