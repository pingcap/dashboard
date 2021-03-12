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

package tidb

import (
	"context"
	"fmt"
	"net"
	"time"

	"github.com/cenkalti/backoff/v4"
	"github.com/joomcode/errorx"
	"go.etcd.io/etcd/clientv3"
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/utils/topology"
)

var (
	ErrNoAliveTiDB = ErrNS.NewType("no_alive_tidb")
)

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

	go f.pollingForTiDB()
	go f.sqlProxy.run(ctx)
	go f.statusProxy.run(ctx)

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
		if err != nil {
			if errorx.IsOfType(err, ErrNoAliveTiDB) {
				f.sqlProxy.updateRemotes(nil)
				f.statusProxy.updateRemotes(nil)
			}
		} else {
			statusEndpoints := make(map[string]struct{}, len(allTiDB))
			tidbEndpoints := make(map[string]struct{}, len(allTiDB))
			for _, server := range allTiDB {
				tidbEndpoints[fmt.Sprintf("%s:%d", server.IP, server.Port)] = struct{}{}
				statusEndpoints[fmt.Sprintf("%s:%d", server.IP, server.StatusPort)] = struct{}{}
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

func newForwarder(lc fx.Lifecycle, etcdClient *clientv3.Client) *Forwarder {
	f := &Forwarder{
		config: &forwarderConfig{
			TiDBRetrieveTimeout: time.Second,
			TiDBPollInterval:    5 * time.Second,
			ProxyTimeout:        3 * time.Second,
			ProxyCheckInterval:  2 * time.Second,
		},
		etcdClient: etcdClient,
	}
	lc.Append(fx.Hook{
		OnStart: f.Start,
	})
	return f
}
