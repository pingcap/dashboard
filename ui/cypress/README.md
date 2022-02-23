# E2E Test

Since there are some features is different from version to version, we have `make test_e2e_compat_features` and `make test_e2e_common_features` to test features compatibility in different versions and common features in all versions, respectively.

## Install Cypress

The Cypress has been added to package.json, so just run `yarn` to install it. We use Cypress@8.5.0 here since the version>8.5.0 has an unstable server connection error, the related issue can be referred [here](https://github.com/cypress-io/cypress/issues/18464).

## Run Test

**Prerequisite**: TiDB Dashboard server has to be started before run cypress test.

### Open Test Runner to Run Test Locally

#### Test E2E with PD_VERSION >= 5.3.0

```shell
# start frontend server
cd ui && yarn start
# start backend server
make dev && make run
# open cypress test runner
cd ui && yarn open:cypress
```

#### Test E2E with PD_VERSION < 5.3.0

```shell
# start frontend server
cd ui && yarn start
# start backend server
make dev && make run PD_VERSION=5.0.0
# open cypress test runner
cd ui && yarn open:cypress --env PD_VERSION=5.0.0
```

Run test by choosing test file under `/integration` on cypress test runner, cypress will open a broswer to run e2e test.

### Run on CI

```shell
# start frontend server
make ui
# start backend server
UI=1 make && make run PD_VERSION=${PD_VERSION}
# run e2e_compat_features and e2e_common_features tests
make test_e2e PD_VERSION=${PD_VERSION}
```
