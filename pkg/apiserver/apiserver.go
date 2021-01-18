// Copyright 2020 PingCAP, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// See the License for the specific language governing permissions and
// limitations under the License.

package apiserver

import (
	"context"
	"io"
	"net/http"
	"sync"

	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	cors "github.com/rs/cors/wrapper/gin"
	"go.uber.org/fx"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/clusterinfo"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/configuration"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/diagnose"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/info"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/logsearch"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/metrics"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/profiling"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/queryeditor"

	// "github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/__APP_NAME__"
	// NOTE: Don't remove above comment line, it is a placeholder for code generator
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/slowquery"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/statement"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/user"
	apiutils "github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/httpc"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual"
	keyvisualregion "github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual/region"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/pd"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/tidb"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/tikv"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils/version"
)

func Handler(s *Service) http.Handler {
	return s.NewStatusAwareHandler(http.HandlerFunc(s.handler), s.stoppedHandler)
}

var (
	once sync.Once
)

type Service struct {
	app    *fx.App
	status *utils.ServiceStatus

	ctx    context.Context
	cancel context.CancelFunc

	config                  *config.Config
	customKeyVisualProvider *keyvisualregion.DataProvider
	stoppedHandler          http.Handler
	uiAssetFS               http.FileSystem

	apiHandlerEngine *gin.Engine
}

func NewService(cfg *config.Config, stoppedHandler http.Handler, uiAssetFS http.FileSystem, customKeyVisualProvider *keyvisualregion.DataProvider) *Service {
	once.Do(func() {
		// These global modification will be effective only for the first invoke.
		_ = godotenv.Load()
		gin.SetMode(gin.ReleaseMode)
	})

	return &Service{
		status:                  utils.NewServiceStatus(),
		config:                  cfg,
		customKeyVisualProvider: customKeyVisualProvider,
		stoppedHandler:          stoppedHandler,
		uiAssetFS:               uiAssetFS,
	}
}

func (s *Service) IsRunning() bool {
	return s.status.IsRunning()
}

func (s *Service) Start(ctx context.Context) error {
	if s.IsRunning() {
		return nil
	}

	s.ctx, s.cancel = context.WithCancel(ctx)

	s.app = fx.New(
		fx.Logger(utils.NewFxPrinter()),
		fx.Provide(
			newAPIHandlerEngine,
			s.provideLocals,
			dbstore.NewDBStore,
			httpc.NewHTTPClient,
			pd.NewEtcdClient,
			pd.NewPDClient,
			config.NewDynamicConfigManager,
			tidb.NewTiDBClient,
			tikv.NewTiKVClient,
			user.NewAuthService,
			info.NewService,
			clusterinfo.NewService,
			profiling.NewService,
			logsearch.NewService,
			slowquery.NewService,
			statement.NewService,
			diagnose.NewService,
			keyvisual.NewService,
			metrics.NewService,
			queryeditor.NewService,
			configuration.NewService,
			// __APP_NAME__.NewService,
			// NOTE: Don't remove above comment line, it is a placeholder for code generator
		),
		fx.Populate(&s.apiHandlerEngine),
		fx.Invoke(
			user.RegisterRouter,
			info.RegisterRouter,
			clusterinfo.RegisterRouter,
			profiling.RegisterRouter,
			logsearch.RegisterRouter,
			slowquery.RegisterRouter,
			statement.RegisterRouter,
			diagnose.RegisterRouter,
			keyvisual.RegisterRouter,
			metrics.RegisterRouter,
			queryeditor.RegisterRouter,
			configuration.RegisterRouter,
			// __APP_NAME__.RegisterRouter,
			// NOTE: Don't remove above comment line, it is a placeholder for code generator
			// Must be at the end
			s.status.Register,
		),
	)

	if err := s.app.Start(s.ctx); err != nil {
		s.cleanAfterError()
		return err
	}

	version.Print()

	return nil
}

func (s *Service) cleanAfterError() {
	s.cancel()

	// drop
	s.app = nil
	s.apiHandlerEngine = nil
	s.ctx = nil
	s.cancel = nil
}

func (s *Service) Stop(ctx context.Context) error {
	if !s.IsRunning() || s.app == nil {
		return nil
	}

	s.cancel()
	err := s.app.Stop(ctx)

	// drop
	s.app = nil
	s.apiHandlerEngine = nil
	s.ctx = nil
	s.cancel = nil

	return err
}

func (s *Service) NewStatusAwareHandler(handler http.Handler, stoppedHandler http.Handler) http.Handler {
	return s.status.NewStatusAwareHandler(handler, stoppedHandler)
}

func (s *Service) handler(w http.ResponseWriter, r *http.Request) {
	s.apiHandlerEngine.ServeHTTP(w, r)
}

func (s *Service) provideLocals() (*config.Config, http.FileSystem, *keyvisualregion.DataProvider) {
	return s.config, s.uiAssetFS, s.customKeyVisualProvider
}

func newAPIHandlerEngine() (apiHandlerEngine *gin.Engine, endpoint *gin.RouterGroup) {
	apiHandlerEngine = gin.New()
	apiHandlerEngine.Use(gin.Recovery())
	apiHandlerEngine.Use(cors.AllowAll())
	apiHandlerEngine.Use(gzip.Gzip(gzip.DefaultCompression))
	apiHandlerEngine.Use(apiutils.MWHandleErrors())

	endpoint = apiHandlerEngine.Group("/dashboard/api")

	return
}

var StoppedHandler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotFound)
	_, _ = io.WriteString(w, "Dashboard is not started.\n")
})
