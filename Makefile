.PHONY: tidy swagger_spec yarn_dependencies swagger_client ui server run

DASHBOARD_API ?=

BUILD_TAGS ?=

SKIP_YARN_INSTALL ?=

ifeq ($(SWAGGER),1)
BUILD_TAGS += swagger_server
endif

ifeq ($(UI),1)
BUILD_TAGS += ui_server
endif

default:
	SWAGGER=1 make server

tidy:
	go mod tidy

swagger_spec:
	scripts/generate_swagger_spec.sh

yarn_dependencies:
ifneq ($(SKIP_YARN_INSTALL), 1)
	# Skip post-install scripts by `--ignore-scripts` here,
	# as a malicious script could steal NODE_AUTH_TOKEN.
	cd ui &&\
	yarn install --ignore-scripts
endif

swagger_client: swagger_spec yarn_dependencies
	cd ui &&\
	npm run build_api_client

ui: swagger_client
	cd ui &&\
	REACT_APP_DASHBOARD_API_URL="${DASHBOARD_API}" npm run build

server:
ifeq ($(SWAGGER),1)
	make swagger_spec
endif
ifeq ($(UI),1)
	scripts/embed_ui_assets.sh
endif
	go build -o bin/tidb-dashboard -tags "${BUILD_TAGS}" cmd/tidb-dashboard/main.go

run:
	bin/tidb-dashboard
