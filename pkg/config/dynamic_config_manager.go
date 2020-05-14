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

package config

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/joomcode/errorx"
	"github.com/pingcap/log"
	"go.etcd.io/etcd/clientv3"
	"go.uber.org/fx"
	"go.uber.org/zap"
)

const (
	DynamicConfigPath = "/dashboard/dynamic_config"
	Timeout           = 5 * time.Second
)

var (
	ErrorNS         = errorx.NewNamespace("error.dynamic_config")
	ErrUnableToLoad = ErrorNS.NewType("unable_to_load")
	ErrNotReady     = ErrorNS.NewType("not_ready")
)

type DynamicConfigOption func(dc *DynamicConfig)

type DynamicConfigManager struct {
	mu sync.RWMutex

	ctx        context.Context
	config     *Config
	etcdClient *clientv3.Client

	dynamicConfig *DynamicConfig
	pushChannels  []chan *DynamicConfig
}

func NewDynamicConfigManager(lc fx.Lifecycle, config *Config, etcdClient *clientv3.Client) *DynamicConfigManager {
	m := &DynamicConfigManager{
		config:     config,
		etcdClient: etcdClient,
	}
	lc.Append(fx.Hook{
		OnStart: m.Start,
		OnStop:  m.Stop,
	})
	return m
}

func (m *DynamicConfigManager) Start(ctx context.Context) error {
	m.ctx = ctx

	go func() {
		for {
			dc, err := m.load()
			if err == nil {
				dc.Adjust()
				m.Set(dc)
				return
			}
		}
	}()

	return nil
}

func (m *DynamicConfigManager) Stop(ctx context.Context) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, ch := range m.pushChannels {
		close(ch)
	}
	return nil
}

func (m *DynamicConfigManager) NewPushChannel() <-chan *DynamicConfig {
	m.mu.Lock()
	defer m.mu.Unlock()

	ch := make(chan *DynamicConfig, 1000)
	m.pushChannels = append(m.pushChannels, ch)

	if m.dynamicConfig != nil {
		ch <- m.dynamicConfig.Clone()
	}

	return ch
}

func (m *DynamicConfigManager) Get() (*DynamicConfig, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if m.dynamicConfig == nil {
		return nil, ErrNotReady.NewWithNoMessage()
	}
	return m.dynamicConfig.Clone(), nil
}

func (m *DynamicConfigManager) Set(newDc *DynamicConfig) error {
	if err := m.store(newDc); err != nil {
		return err
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	m.dynamicConfig = newDc

	for _, ch := range m.pushChannels {
		ch <- m.dynamicConfig.Clone()
	}

	return nil
}

func (m *DynamicConfigManager) Modify(opts ...DynamicConfigOption) error {
	newDc, err := m.Get()
	if err != nil {
		return err
	}

	for _, opt := range opts {
		opt(newDc)
	}
	if err := newDc.Validate(); err != nil {
		return err
	}

	return m.Set(newDc)
}

func (m *DynamicConfigManager) load() (*DynamicConfig, error) {
	ctx, cancel := context.WithTimeout(m.ctx, Timeout)
	defer cancel()
	resp, err := m.etcdClient.Get(ctx, DynamicConfigPath)
	if err != nil {
		return nil, ErrUnableToLoad.WrapWithNoMessage(err)
	}
	switch len(resp.Kvs) {
	case 0:
		log.Warn("Dynamic config does not exist in etcd")
		return nil, nil
	case 1:
		log.Info("Load dynamic config from etcd", zap.ByteString("json", resp.Kvs[0].Value))
		var dc DynamicConfig
		if err = json.Unmarshal(resp.Kvs[0].Value, &dc); err != nil {
			return nil, err
		}
		return &dc, nil
	default:
		log.Error("unreachable")
		return nil, ErrUnableToLoad.New("unreachable")
	}
}

func (m *DynamicConfigManager) store(dc *DynamicConfig) error {
	bs, err := json.Marshal(dc)
	if err != nil {
		return err
	}

	log.Info("Save dynamic config to etcd", zap.ByteString("json", bs))
	ctx, cancel := context.WithTimeout(m.ctx, Timeout)
	defer cancel()
	_, err = m.etcdClient.Put(ctx, DynamicConfigPath, string(bs))

	return err
}
