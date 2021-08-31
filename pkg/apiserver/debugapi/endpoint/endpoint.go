// Copyright 2021 PingCAP, Inc.
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

package endpoint

import (
	"github.com/joomcode/errorx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

// Process flow
//
// (send path/query params' value)
// browser side -|
//               |   (validate/transform/send request middlewares)
//               |-> server side -|
//                                |   (the actual {host}:{port}/{path}?{query})
//                                |-> specific endpoint host

var (
	ErrNS           = errorx.NewNamespace("error.api.debugapi.endpoint")
	ErrInvalidParam = ErrNS.NewType("invalid_parameter")
)

type APIModel struct {
	ID          string                `json:"id"`
	Component   model.NodeKind        `json:"component"`
	Path        string                `json:"path"`
	Method      Method                `json:"method"`
	PathParams  []*APIParam           `json:"path_params"`  // e.g. /stats/dump/{db}/{table} -> db, table
	QueryParams []*APIParam           `json:"query_params"` // e.g. /debug/pprof?seconds=1 -> seconds
	Middleware  MiddlewareHandlerFunc `json:"-"`
}

// EachParams simplifies the process of iterating over path & query params
// and ends the iteration when return error
func (m *APIModel) ForEachParam(fn func(p *APIParam, isPathParam bool) error) error {
	params := make([]*APIParam, 0, len(m.PathParams)+len(m.QueryParams))
	if m.PathParams != nil {
		params = append(params, m.PathParams...)
	}
	if m.QueryParams != nil {
		params = append(params, m.QueryParams...)
	}

	pathParamLen := len(m.PathParams)
	for i, p := range params {
		isPathParam := i < pathParamLen
		if err := fn(p, isPathParam); err != nil {
			return err
		}
	}
	return nil
}

// Middlewares includes endpoint middlewares & param model middlewares
func (m *APIModel) Middlewares() []MiddlewareHandler {
	middlewares := []MiddlewareHandler{}

	// param model middlewares
	_ = m.ForEachParam(func(p *APIParam, isPathParam bool) error {
		modelMiddlewares := p.Model.Middlewares(p, isPathParam)
		middlewares = append(middlewares, modelMiddlewares...)
		return nil
	})

	// endpoint middlewares
	if m.Middleware != nil {
		middlewares = append(middlewares, m.Middleware)
	}

	return middlewares
}
