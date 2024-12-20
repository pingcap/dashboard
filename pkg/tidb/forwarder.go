// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package tidb

import (
	"context"
	"fmt"
	"net"
	"strconv"
	"sync"
	"time"

	"github.com/cenkalti/backoff/v4"
	"github.com/pingcap/log"
	clientv3 "go.etcd.io/etcd/client/v3"
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/utils/topology"
	"github.com/pingcap/tidb-dashboard/util/distro"
)

var ErrNoAliveTiDB = ErrNS.NewType("no_alive_tidb")

type forwarderConfig struct {
	TiDBRetrieveTimeout time.Duration
	TiDBPollInterval    time.Duration
	ProxyTimeout        time.Duration
	ProxyCheckInterval  time.Duration
}

type Forwarder struct {
	lifecycleCtx context.Context

	config     *forwarderConfig
	etcdClient *clientv3.Client

	sqlProxy    *proxy
	sqlPort     int
	statusProxy *proxy
	statusPort  int

	wg *sync.WaitGroup
}

func (f *Forwarder) Start(ctx context.Context) error {
	f.lifecycleCtx = ctx

	var err error
	if f.sqlProxy, err = f.createProxy(); err != nil {
		return err
	}
	if f.statusProxy, err = f.createProxy(); err != nil {
		return err
	}

	f.sqlPort = f.sqlProxy.port()
	f.statusPort = f.statusProxy.port()

	f.wg.Add(3)
	go f.pollingForTiDB()
	go f.sqlProxy.run(ctx, f.wg)
	go f.statusProxy.run(ctx, f.wg)

	return nil
}

func (f *Forwarder) createProxy() (*proxy, error) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return nil, err
	}
	proxy := newProxy(l, nil, f.config.ProxyCheckInterval, f.config.ProxyTimeout)
	return proxy, nil
}

func (f *Forwarder) pollingForTiDB() {
	defer f.wg.Done()
	ebo := backoff.NewExponentialBackOff()
	ebo.MaxInterval = f.config.TiDBPollInterval
	bo := backoff.WithContext(ebo, f.lifecycleCtx)

	for {
		var allTiDB []topology.TiDBInfo
		err := backoff.Retry(func() error {
			var err error
			allTiDB, err = topology.FetchTiDBTopology(bo.Context(), f.etcdClient)
			return err
		}, bo)
		if err == nil {
			statusEndpoints := make(map[string]struct{}, len(allTiDB))
			tidbEndpoints := make(map[string]struct{}, len(allTiDB))
			for _, server := range allTiDB {
				if server.Status == topology.ComponentStatusUp {
					tidbEndpoints[net.JoinHostPort(server.IP, strconv.Itoa(int(server.Port)))] = struct{}{}
					statusEndpoints[net.JoinHostPort(server.IP, strconv.Itoa(int(server.StatusPort)))] = struct{}{}
				}
			}
			f.sqlProxy.updateRemotes(tidbEndpoints)
			f.statusProxy.updateRemotes(statusEndpoints)
		}

		select {
		case <-f.lifecycleCtx.Done():
			return
		case <-time.After(f.config.TiDBPollInterval):
		}
	}
}

func (f *Forwarder) getEndpointAddr(port int) (string, error) {
	if f.statusProxy.noAliveRemote.Load() {
		log.Warn(fmt.Sprintf("Unable to resolve connection address since no alive %s instance", distro.R().TiDB))
		return "", ErrNoAliveTiDB.NewWithNoMessage()
	}
	return fmt.Sprintf("127.0.0.1:%d", port), nil
}

func newForwarder(lc fx.Lifecycle, etcdClient *clientv3.Client) *Forwarder {
	f := &Forwarder{
		config: &forwarderConfig{
			TiDBRetrieveTimeout: time.Second,
			TiDBPollInterval:    5 * time.Second,
			ProxyTimeout:        3 * time.Second,
			ProxyCheckInterval:  2 * time.Second,
		},
		etcdClient: etcdClient,
		wg:         &sync.WaitGroup{},
	}
	lc.Append(fx.Hook{
		OnStart: f.Start,
		OnStop: func(context.Context) error {
			f.wg.Wait()
			return nil
		},
	})
	return f
}
