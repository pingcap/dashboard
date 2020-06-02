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

package topology

import (
	"context"

	"go.etcd.io/etcd/clientv3"
)

func FetchAlertManagerTopology(ctx context.Context, etcdClient *clientv3.Client) (*AlertManagerInfo, error) {
	i, err := fetchStandardComponentTopology(ctx, "alertmanager", etcdClient)
	if err != nil {
		return nil, err
	}
	if i == nil {
		return nil, nil
	}
	return &AlertManagerInfo{StandardComponentInfo: *i}, nil
}

func FetchGrafanaTopology(ctx context.Context, etcdClient *clientv3.Client) (*GrafanaInfo, error) {
	i, err := fetchStandardComponentTopology(ctx, "grafana", etcdClient)
	if err != nil {
		return nil, err
	}
	if i == nil {
		return nil, nil
	}
	return &GrafanaInfo{StandardComponentInfo: *i}, nil
}

func FetchPrometheusTopology(ctx context.Context, etcdClient *clientv3.Client) (*PrometheusInfo, error) {
	i, err := fetchStandardComponentTopology(ctx, "prometheus", etcdClient)
	if err != nil {
		return nil, err
	}
	if i == nil {
		return nil, nil
	}
	return &PrometheusInfo{StandardComponentInfo: *i}, nil
}
