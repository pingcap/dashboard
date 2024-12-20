// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package util

import (
	"context"
	"time"

	"go.uber.org/fx"
	"go.uber.org/fx/fxtest"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver"
	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/util/featureflag"
)

type App struct {
	*fxtest.App

	tb fxtest.TB
}

func NewMockApp(tb fxtest.TB, tidbVersion string, c *config.Config, opts ...fx.Option) *App {
	allOpts := make([]fx.Option, 0, len(opts)+1)
	allOpts = append(allOpts,
		apiserver.Modules,
		fx.Supply(featureflag.NewRegistry(tidbVersion)),
		fx.Supply(c),
	)
	allOpts = append(allOpts, opts...)

	app := fxtest.New(tb, allOpts...)

	return &App{
		App: app,
		tb:  tb,
	}
}

// RequireStart calls Start, failing the test if an error is encountered.
// It also sleep 5 seconds to wait for the server to start.
func (app *App) RequireStart(ctx context.Context) *App {
	if err := app.Start(ctx); err != nil {
		app.tb.Errorf("application didn't start cleanly: %v", err)
		app.tb.FailNow()
	}
	time.Sleep(5 * time.Second)
	return app
}

// RequireStop calls Stop, failing the test if an error is encountered.
func (app *App) RequireStop() {
	if err := app.Stop(context.Background()); err != nil {
		app.tb.Errorf("application didn't stop cleanly: %v", err)
		app.tb.FailNow()
	}
}
