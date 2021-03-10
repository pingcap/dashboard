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

package profiling

import (
	"context"
	"sync"
	"time"

	"github.com/joomcode/errorx"
	"github.com/pingcap/log"
	"go.uber.org/fx"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/dbstore"
)

const (
	Timeout = 5 * time.Second
)

var (
	ErrNS             = errorx.NewNamespace("error.profiling")
	ErrIgnoredRequest = ErrNS.NewType("ignored_request")
	ErrTimeout        = ErrNS.NewType("timeout")
)

type StartRequest struct {
	Targets      []model.RequestTargetNode `json:"targets"`
	DurationSecs uint                      `json:"duration_secs"`
}

type StartRequestSession struct {
	req       StartRequest
	ch        chan struct{}
	taskGroup *TaskGroup
	err       error
}

type ServiceParams struct {
	fx.In
	ConfigManager *config.DynamicConfigManager
	LocalStore    *dbstore.DB
}

type Service struct {
	params        ServiceParams
	wg            sync.WaitGroup
	sessionCh     chan *StartRequestSession
	lastTaskGroup *TaskGroup
	tasks         sync.Map
	fetchers      *fetchers
}

var newService = fx.Provide(func(lc fx.Lifecycle, p ServiceParams, fts *fetchers) (*Service, error) {
	if err := autoMigrate(p.LocalStore); err != nil {
		return nil, err
	}
	s := &Service{params: p, fetchers: fts}
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			s.wg.Add(1)
			go func() {
				defer s.wg.Done()
				s.serviceLoop(ctx)
			}()
			return nil
		},
		OnStop: func(context.Context) error {
			s.wg.Wait()
			return nil
		},
	})

	return s, nil
})

func (s *Service) serviceLoop(ctx context.Context) {
	cfgCh := s.params.ConfigManager.NewPushChannel()
	s.sessionCh = make(chan *StartRequestSession, 1000)
	defer close(s.sessionCh)

	var dc *config.DynamicConfig
	var timeCh <-chan time.Time = make(chan time.Time, 1)

	newAutoRequest := func() *StartRequest {
		if dc == nil || dc.Profiling.AutoCollectionDurationSecs == 0 {
			timeCh = make(chan time.Time, 1)
			return nil
		}
		timeCh = time.After(time.Duration(dc.Profiling.AutoCollectionIntervalSecs+dc.Profiling.AutoCollectionDurationSecs) * time.Second)
		return &StartRequest{
			Targets:      dc.Profiling.AutoCollectionTargets,
			DurationSecs: dc.Profiling.AutoCollectionDurationSecs,
		}
	}

	for {
		select {
		case <-ctx.Done():
			return
		case newDc, ok := <-cfgCh:
			if !ok {
				return
			}
			dc = newDc
			if req := newAutoRequest(); req != nil {
				_, _ = s.exclusiveExecute(ctx, req)
			}
		case <-timeCh:
			if req := newAutoRequest(); req != nil {
				_, _ = s.exclusiveExecute(ctx, req)
			}
		case session := <-s.sessionCh:
			s.handleRequest(ctx, session, dc)
		}
	}
}

func (s *Service) handleRequest(ctx context.Context, session *StartRequestSession, dc *config.DynamicConfig) {
	defer close(session.ch)
	if dc.Profiling.AutoCollectionDurationSecs > 0 {
		session.err = ErrIgnoredRequest.New("automatic collection is enabled")
		log.Warn("request is ignored", zap.Error(session.err))
		return
	}
	session.taskGroup, session.err = s.exclusiveExecute(ctx, &session.req)
}

func (s *Service) exclusiveExecute(ctx context.Context, req *StartRequest) (*TaskGroup, error) {
	if s.lastTaskGroup != nil {
		if err := s.cancelGroup(s.lastTaskGroup.ID); err != nil {
			return nil, ErrIgnoredRequest.New("failed to cancel last task group: id = %d", s.lastTaskGroup.ID)
		}
		time.Sleep(500 * time.Millisecond)
	}
	return s.startGroup(ctx, req)
}

func (s *Service) startGroup(ctx context.Context, req *StartRequest) (*TaskGroup, error) {
	taskGroup := NewTaskGroup(s.params.LocalStore, req.DurationSecs, model.NewRequestTargetStatisticsFromArray(&req.Targets))
	if err := s.params.LocalStore.Create(taskGroup.TaskGroupModel).Error; err != nil {
		log.Warn("failed to start task group", zap.Error(err))
		return nil, err
	}

	tasks := make([]*Task, 0, len(req.Targets))
	for _, target := range req.Targets {
		t := NewTask(ctx, taskGroup, target, s.fetchers)
		s.params.LocalStore.Create(t.TaskModel)
		s.tasks.Store(t.ID, t)
		tasks = append(tasks, t)
	}

	s.wg.Add(1)
	go func() {
		defer s.wg.Done()
		var wg sync.WaitGroup
		for i := 0; i < len(tasks); i++ {
			wg.Add(1)
			go func(idx int) {
				defer wg.Done()
				tasks[idx].run()
				s.tasks.Delete(tasks[idx].ID)
			}(i)
		}
		wg.Wait()
		taskGroup.State = TaskStateFinish
		s.params.LocalStore.Save(taskGroup.TaskGroupModel)
	}()

	return taskGroup, nil
}

func (s *Service) cancelGroup(taskGroupID uint) error {
	var tasks []TaskModel
	if err := s.params.LocalStore.Where("task_group_id = ? AND state = ?", taskGroupID, TaskStateRunning).Find(&tasks).Error; err != nil {
		log.Warn("failed to cancel task group", zap.Error(err))
		return err
	}

	for _, task := range tasks {
		if task, ok := s.tasks.Load(task.ID); ok {
			t := task.(*Task)
			t.stop()
		}
	}

	// wait for tasks stop
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()
	for {
		var runningTasks []TaskModel
		if err := s.params.LocalStore.Where("task_group_id = ? AND state = ?", taskGroupID, TaskStateRunning).Find(&runningTasks).Error; err != nil {
			log.Warn("failed to cancel task group", zap.Error(err))
			return err
		}
		if len(runningTasks) == 0 {
			break
		}
		<-ticker.C
	}

	return nil
}
