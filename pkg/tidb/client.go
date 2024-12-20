// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package tidb

import (
	"context"
	"database/sql/driver"
	"fmt"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/VividCortex/mysqlerr"
	"github.com/go-sql-driver/mysql"
	"github.com/pingcap/log"
	clientv3 "go.etcd.io/etcd/client/v3"
	"go.uber.org/fx"
	"go.uber.org/zap"
	mysqlDriver "gorm.io/driver/mysql"
	"gorm.io/gorm"

	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/httpc"
	"github.com/pingcap/tidb-dashboard/util/distro"
)

var (
	ErrTiDBConnFailed          = ErrNS.NewType("tidb_conn_failed")
	ErrTiDBAuthFailed          = ErrNS.NewType("tidb_auth_failed")
	ErrTiDBClientRequestFailed = ErrNS.NewType("client_request_failed")
)

const (
	defaultTiDBStatusAPITimeout      = time.Second * 10
	defaultTiDBSQLExecutionTimeoutMs = 600000 // 600s

	// When this environment variable is set, SQL requests will be always sent to this specific TiDB instance.
	// Calling `WithSQLAPIAddress` to enforce a SQL request endpoint will fail when opening the connection.
	tidbOverrideSQLEndpointEnvVar = "TIDB_OVERRIDE_ENDPOINT"
	// When this environment variable is set, status requests will be always sent to this specific TiDB instance.
	// Calling `WithStatusAPIAddress` to enforce a status API request endpoint will fail when opening the connection.
	tidbOverrideStatusEndpointEnvVar = "TIDB_OVERRIDE_STATUS_ENDPOINT"
)

type Client struct {
	lifecycleCtx             context.Context
	forwarder                *Forwarder
	statusAPIHTTPScheme      string
	statusAPIAddress         string // Empty means to use address provided by forwarder
	enforceStatusAPIAddresss bool   // enforced status api address and ignore env override config
	statusAPIHTTPClient      *httpc.Client
	statusAPITimeout         time.Duration
	sqlAPITLSKey             string // Non empty means use this key as MySQL TLS config
	sqlAPIAddress            string // Empty means to use address provided by forwarder
}

func NewTiDBClient(lc fx.Lifecycle, config *config.Config, etcdClient *clientv3.Client, httpClient *httpc.Client) *Client {
	sqlAPITLSKey := ""
	if config.TiDBTLSConfig != nil {
		sqlAPITLSKey = "tidb"
		_ = mysql.RegisterTLSConfig(sqlAPITLSKey, config.TiDBTLSConfig)
	}

	client := &Client{
		lifecycleCtx:             nil,
		forwarder:                newForwarder(lc, etcdClient),
		statusAPIHTTPScheme:      config.GetClusterHTTPScheme(),
		statusAPIAddress:         "",
		enforceStatusAPIAddresss: false,
		statusAPIHTTPClient:      httpClient,
		statusAPITimeout:         defaultTiDBStatusAPITimeout,
		sqlAPITLSKey:             sqlAPITLSKey,
		sqlAPIAddress:            "",
	}

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			client.lifecycleCtx = ctx
			return nil
		},
	})

	return client
}

func (c Client) WithStatusAPITimeout(timeout time.Duration) *Client {
	c.statusAPITimeout = timeout
	return &c
}

func (c Client) WithStatusAPIAddress(host string, statusPort int) *Client {
	c.statusAPIAddress = net.JoinHostPort(host, strconv.Itoa(statusPort))
	return &c
}

func (c Client) WithEnforcedStatusAPIAddress(host string, statusPort int) *Client {
	c.enforceStatusAPIAddresss = true
	c.statusAPIAddress = net.JoinHostPort(host, strconv.Itoa(statusPort))
	return &c
}

func (c Client) WithSQLAPIAddress(host string, sqlPort int) *Client {
	c.sqlAPIAddress = net.JoinHostPort(host, strconv.Itoa(sqlPort))
	return &c
}

func (c *Client) OpenSQLConn(user string, pass string) (*gorm.DB, error) {
	var err error

	overrideEndpoint := os.Getenv(tidbOverrideSQLEndpointEnvVar)
	// the `tidbOverrideSQLEndpointEnvVar` and the `Client.sqlAPIAddress` have the same override priority, if both exist, an error is returned
	if overrideEndpoint != "" && c.sqlAPIAddress != "" {
		log.Warn(fmt.Sprintf("Reject to establish a target specified %s SQL connection since `%s` is set", distro.R().TiDB, tidbOverrideSQLEndpointEnvVar))
		return nil, ErrTiDBConnFailed.New("%s Dashboard is configured to only connect to specified %s host", distro.R().TiDB, distro.R().TiDB)
	}

	var addr string
	switch {
	case overrideEndpoint != "":
		addr = overrideEndpoint
	default:
		addr = c.sqlAPIAddress
	}
	if addr == "" {
		if addr, err = c.forwarder.getEndpointAddr(c.forwarder.sqlPort); err != nil {
			return nil, err
		}
	}

	dsnConfig := mysql.NewConfig()
	dsnConfig.Net = "tcp"
	dsnConfig.Addr = addr
	dsnConfig.User = user
	dsnConfig.Passwd = pass
	dsnConfig.Timeout = time.Second * 60
	dsnConfig.ParseTime = true
	dsnConfig.Loc = time.Local
	dsnConfig.MultiStatements = true
	dsnConfig.TLSConfig = c.sqlAPITLSKey
	dsn := dsnConfig.FormatDSN()

	db, err := gorm.Open(mysqlDriver.Open(dsn))
	if err != nil {
		if _, ok := err.(*net.OpError); ok || err == driver.ErrBadConn {
			if strings.HasPrefix(addr, "0.0.0.0:") {
				log.Warn(fmt.Sprintf("%s reported its address to be 0.0.0.0. Please specify `-advertise-address` command line parameter when running %s", distro.R().TiDB, distro.R().TiDB))
			}
			if c.forwarder.sqlProxy.noAliveRemote.Load() {
				return nil, ErrNoAliveTiDB.NewWithNoMessage()
			}
			return nil, ErrTiDBConnFailed.Wrap(err, "failed to connect to %s", distro.R().TiDB)
		} else if mysqlErr, ok := err.(*mysql.MySQLError); ok {
			if mysqlErr.Number == mysqlerr.ER_ACCESS_DENIED_ERROR {
				return nil, ErrTiDBAuthFailed.New("bad %s username or password", distro.R().TiDB)
			}
		}
		log.Warn(fmt.Sprintf("Unknown error occurred while opening %s connection", distro.R().TiDB), zap.Error(err))
		return nil, err
	}

	if err := db.Exec(fmt.Sprintf("SET SESSION max_execution_time = '%d'", defaultTiDBSQLExecutionTimeoutMs)).Error; err != nil {
		log.Error("Failed to set max_execution_time", zap.Error(err))
		return nil, ErrTiDBClientRequestFailed.Wrap(err, "failed to set max_execution_time")
	}

	return db, nil
}

func (c *Client) Get(relativeURI string) (*httpc.Response, error) {
	var err error

	overrideEndpoint := os.Getenv(tidbOverrideStatusEndpointEnvVar)
	// the `tidbOverrideStatusEndpointEnvVar` and the `Client.statusAPIAddress` have the same override priority, if both exist and have not enforced `Client.statusAPIAddress` then an error is returned
	if overrideEndpoint != "" && c.statusAPIAddress != "" && !c.enforceStatusAPIAddresss {
		log.Warn(fmt.Sprintf("Reject to establish a target specified %s status connection since `%s` is set", distro.R().TiDB, tidbOverrideStatusEndpointEnvVar))
		return nil, ErrTiDBConnFailed.New("%s Dashboard is configured to only connect to specified %s host", distro.R().TiDB, distro.R().TiDB)
	}

	var addr string
	switch {
	case c.enforceStatusAPIAddresss:
		addr = c.statusAPIAddress
	case overrideEndpoint != "":
		addr = overrideEndpoint
	default:
		addr = c.statusAPIAddress
	}
	if addr == "" {
		if addr, err = c.forwarder.getEndpointAddr(c.forwarder.statusPort); err != nil {
			return nil, err
		}
	}

	uri := fmt.Sprintf("%s://%s%s", c.statusAPIHTTPScheme, addr, relativeURI)
	res, err := c.statusAPIHTTPClient.
		WithTimeout(c.statusAPITimeout).
		Send(c.lifecycleCtx, uri, http.MethodGet, nil, ErrTiDBClientRequestFailed, distro.R().TiDB)
	if err != nil && c.forwarder.statusProxy.noAliveRemote.Load() {
		return nil, ErrNoAliveTiDB.NewWithNoMessage()
	}
	return res, err
}

// FIXME: SendGetRequest should be extracted, as a common method.
func (c *Client) SendGetRequest(relativeURI string) ([]byte, error) {
	res, err := c.Get(relativeURI)
	if err != nil {
		return nil, err
	}
	return res.Body()
}
