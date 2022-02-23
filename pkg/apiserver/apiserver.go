// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

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

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/clusterinfo"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/configuration"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/conprof"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/debugapi"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/diagnose"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/info"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/logsearch"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/metrics"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/profiling"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/queryeditor"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/topsql"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user/code"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user/code/codeauth"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user/sqlauth"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user/sso"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user/sso/ssoauth"
	"github.com/pingcap/tidb-dashboard/pkg/tiflash"
	"github.com/pingcap/tidb-dashboard/pkg/utils/version"
	"github.com/pingcap/tidb-dashboard/util/client/httpclient"
	"github.com/pingcap/tidb-dashboard/util/client/pdclient"
	"github.com/pingcap/tidb-dashboard/util/client/tidbclient"
	"github.com/pingcap/tidb-dashboard/util/client/tiflashclient"
	"github.com/pingcap/tidb-dashboard/util/client/tikvclient"
	"github.com/pingcap/tidb-dashboard/util/featureflag"
	"github.com/pingcap/tidb-dashboard/util/rest"

	// "github.com/pingcap/tidb-dashboard/pkg/apiserver/__APP_NAME__"
	// NOTE: Don't remove above comment line, it is a placeholder for code generator.
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/slowquery"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/statement"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	apiutils "github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/dbstore"
	"github.com/pingcap/tidb-dashboard/pkg/httpc"
	"github.com/pingcap/tidb-dashboard/pkg/keyvisual"
	keyvisualregion "github.com/pingcap/tidb-dashboard/pkg/keyvisual/region"
	"github.com/pingcap/tidb-dashboard/pkg/pd"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	"github.com/pingcap/tidb-dashboard/pkg/tikv"
	"github.com/pingcap/tidb-dashboard/pkg/utils"
)

func Handler(s *Service) http.Handler {
	return s.NewStatusAwareHandler(http.HandlerFunc(s.handler), s.stoppedHandler)
}

var once sync.Once

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

var Modules = fx.Options(
	fx.Provide(
		newAPIHandlerEngine,
		newClients,
		dbstore.NewDBStore,
		httpc.NewHTTPClient,
		pd.NewEtcdClient,
		pd.NewPDClient,
		config.NewDynamicConfigManager,
		tidb.NewTiDBClient,
		tikv.NewTiKVClient,
		tiflash.NewTiFlashClient,
		utils.ProvideSysSchema,
		apiutils.NewNgmProxy,
		info.NewService,
		clusterinfo.NewService,
		logsearch.NewService,
		diagnose.NewService,
		keyvisual.NewService,
		metrics.NewService,
		queryeditor.NewService,
		configuration.NewService,
		// __APP_NAME__.NewService,
		// NOTE: Don't remove above comment line, it is a placeholder for code generator
	),
	user.Module,
	codeauth.Module,
	sqlauth.Module,
	ssoauth.Module,
	code.Module,
	sso.Module,
	profiling.Module,
	conprof.Module,
	statement.Module,
	slowquery.Module,
	debugapi.Module,
	topsql.Module,
)

func (s *Service) Start(ctx context.Context) error {
	if s.IsRunning() {
		return nil
	}

	s.ctx, s.cancel = context.WithCancel(ctx)

	s.app = fx.New(
		fx.Logger(utils.NewFxPrinter()),
		fx.Supply(featureflag.NewRegistry(version.PDVersion)),
		Modules,
		fx.Provide(
			s.provideLocals,
		),
		fx.Populate(&s.apiHandlerEngine),
		fx.Invoke(
			info.RegisterRouter,
			clusterinfo.RegisterRouter,
			profiling.RegisterRouter,
			logsearch.RegisterRouter,
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

// TODO: Find a better place to put these client bundles.
func newClients(lc fx.Lifecycle, config *config.Config) (
	dbClient *tidbclient.StatusClient,
	kvClient *tikvclient.StatusClient,
	csClient *tiflashclient.StatusClient,
	pdClient *pdclient.APIClient,
) {
	httpConfig := httpclient.Config{
		TLSConfig: config.ClusterTLSConfig,
	}
	dbClient = tidbclient.NewStatusClient(httpConfig)
	kvClient = tikvclient.NewStatusClient(httpConfig)
	csClient = tiflashclient.NewStatusClient(httpConfig)
	pdClient = pdclient.NewAPIClient(httpConfig)
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			dbClient.SetDefaultCtx(ctx)
			kvClient.SetDefaultCtx(ctx)
			csClient.SetDefaultCtx(ctx)
			pdClient.SetDefaultCtx(ctx)
			return nil
		},
	})
	return
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
	apiHandlerEngine.Use(rest.ErrorHandlerFn())

	endpoint = apiHandlerEngine.Group("/dashboard/api")

	return
}

var StoppedHandler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotFound)
	_, _ = io.WriteString(w, "Dashboard is not started.\n")
})
