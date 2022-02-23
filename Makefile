DASHBOARD_PKG := github.com/pingcap/tidb-dashboard

BUILD_TAGS ?=

LDFLAGS ?=

PD_VERSION ?= 6.0.0

TIDB_VERSION ?= latest

ifeq ($(UI),1)
	BUILD_TAGS += ui_server
endif

LDFLAGS += -X "$(DASHBOARD_PKG)/pkg/utils/version.InternalVersion=$(shell grep -v '^\#' ./release-version)"
LDFLAGS += -X "$(DASHBOARD_PKG)/pkg/utils/version.Standalone=Yes"
LDFLAGS += -X "$(DASHBOARD_PKG)/pkg/utils/version.PDVersion=$(PD_VERSION)"
LDFLAGS += -X "$(DASHBOARD_PKG)/pkg/utils/version.BuildTime=$(shell date -u '+%Y-%m-%d %I:%M:%S')"
LDFLAGS += -X "$(DASHBOARD_PKG)/pkg/utils/version.BuildGitHash=$(shell git rev-parse HEAD)"

default: server

.PHONY: clean
clean:
	rm -rf ./coverage

.PHONY: install_tools
install_tools:
	scripts/install_go_tools.sh

.PHONY: lint
lint:
	scripts/lint.sh

.PHONY: test
test: clean unit_test integration_test

.PHONY: unit_test
unit_test:
	@mkdir -p ./coverage
	GO111MODULE=on go test -v -cover -coverprofile=coverage/unit_test.txt ./pkg/... ./util/...

.PHONY: integration_test
integration_test:
	@mkdir -p ./coverage
	@TIDB_VERSION=${TIDB_VERSION} tests/run.sh

.PHONY: dev
dev: lint default

.PHONY: yarn_dependencies
yarn_dependencies: install_tools
	cd ui &&\
	yarn install --frozen-lockfile

.PHONY: ui
ui: yarn_dependencies
	cd ui &&\
	yarn build

.PHONY: go_generate
go_generate: export PATH := $(shell pwd)/bin:$(PATH)
go_generate:
	scripts/generate_swagger_spec.sh
	go generate -x ./...

.PHONY: server
server: install_tools go_generate
ifeq ($(UI),1)
	scripts/embed_ui_assets.sh
endif
	go build -o bin/tidb-dashboard -ldflags '$(LDFLAGS)' -tags "${BUILD_TAGS}" cmd/tidb-dashboard/main.go

.PHONY: run
run:
	bin/tidb-dashboard --debug --experimental --host 0.0.0.0

test_e2e_compat_features:
	cd ui &&\
	yarn run:e2e-test:compat-features --env PD_VERSION=$(PD_VERSION) TIDB_VERSION=$(TIDB_VERSION)

test_e2e_common_features:
	cd ui &&\
	yarn run:e2e-test:common-features TIDB_VERSION=$(TIDB_VERSION)

test_e2e: test_e2e_compat_features test_e2e_common_features