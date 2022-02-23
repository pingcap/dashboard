// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package user

import (
	"bytes"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/joomcode/errorx"
	"github.com/stretchr/testify/suite"
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/info"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	"github.com/pingcap/tidb-dashboard/tests/util"
	"github.com/pingcap/tidb-dashboard/util/rest"
	"github.com/pingcap/tidb-dashboard/util/testutil"
)

type testUserSuite struct {
	suite.Suite
	db          *testutil.TestDB
	authService *user.AuthService
	infoService *info.Service
}

func TestUserSuite(t *testing.T) {
	db := testutil.OpenTestDB(t)
	tidbVersion := util.GetTiDBVersion(t, db)

	authService := &user.AuthService{}
	infoService := &info.Service{}

	app := util.NewMockApp(t,
		tidbVersion,
		config.Default(),
		fx.Populate(&authService),
		fx.Populate(&infoService),
	)
	app.RequireStart()

	suite.Run(t, &testUserSuite{
		db:          db,
		authService: authService,
		infoService: infoService,
	})

	app.RequireStop()
}

func (s *testUserSuite) supportNonRootLogin() bool {
	return s.authService.FeatureNonRootLogin.IsSupported()
}

func (s *testUserSuite) SetupSuite() {
	// drop user if exist
	s.db.MustExec("DROP USER IF EXISTS 'dashboardAdmin'@'%'")
	s.db.MustExec("DROP USER IF EXISTS 'dashboardAdmin-2'@'%'")

	// create user 1 with sufficient priviledges
	s.db.MustExec("CREATE USER 'dashboardAdmin'@'%' IDENTIFIED BY '12345678'")
	s.db.MustExec("GRANT PROCESS, CONFIG ON *.* TO 'dashboardAdmin'@'%'")
	s.db.MustExec("GRANT SHOW DATABASES ON *.* TO 'dashboardAdmin'@'%'")
	if s.supportNonRootLogin() {
		s.db.MustExec("GRANT DASHBOARD_CLIENT ON *.* TO 'dashboardAdmin'@'%'")
	}

	// create user 2 with insufficient priviledges
	s.db.MustExec("CREATE USER 'dashboardAdmin-2'@'%' IDENTIFIED BY '12345678'")
	s.db.MustExec("GRANT PROCESS, CONFIG ON *.* TO 'dashboardAdmin-2'@'%'")
	s.db.MustExec("GRANT SHOW DATABASES ON *.* TO 'dashboardAdmin-2'@'%'")
}

func (s *testUserSuite) TearDownSuite() {
	s.db.MustExec("DROP USER IF EXISTS 'dashboardAdmin'@'%'")
	s.db.MustExec("DROP USER IF EXISTS 'dashboardAdmin-2'@'%'")
}

func (s *testUserSuite) TestLoginWithEmpty() {
	req, _ := http.NewRequest(http.MethodPost, "/user/login", nil)
	c, w := util.TestReqWithHandlers(req, s.authService.LoginHandler)

	s.Require().True(errorx.IsOfType(c.Errors.Last().Err, rest.ErrBadRequest))
	s.Require().Equal(401, c.Writer.Status())
	s.Require().Equal(401, w.Code)
}

func (s *testUserSuite) TestLoginWithNotExistUser() {
	param := make(map[string]interface{})
	param["type"] = 0
	param["username"] = "not_exist"
	param["password"] = "aaa"

	jsonByte, _ := json.Marshal(param)
	req, _ := http.NewRequest(http.MethodPost, "/user/login", bytes.NewReader(jsonByte))
	c, w := util.TestReqWithHandlers(req, s.authService.LoginHandler)

	s.Require().Contains(c.Errors.Last().Err.Error(), "authenticate failed")
	s.Require().True(errorx.IsOfType(c.Errors.Last().Err, tidb.ErrTiDBAuthFailed))
	s.Require().Equal(401, c.Writer.Status())
	s.Require().Equal(401, w.Code)
}

func (s *testUserSuite) TestLoginWithWrongPassword() {
	param := make(map[string]interface{})
	param["type"] = 0
	param["username"] = "dashboardAdmin"
	param["password"] = "123456789"

	jsonByte, _ := json.Marshal(param)
	req, _ := http.NewRequest(http.MethodPost, "/user/login", bytes.NewReader(jsonByte))
	c, w := util.TestReqWithHandlers(req, s.authService.LoginHandler)

	s.Require().Contains(c.Errors.Last().Err.Error(), "authenticate failed")
	s.Require().True(errorx.IsOfType(c.Errors.Last().Err, tidb.ErrTiDBAuthFailed))
	s.Require().Equal(401, c.Writer.Status())
	s.Require().Equal(401, w.Code)
}

func (s *testUserSuite) TestLoginWithInsufficientPrivs() {
	param := make(map[string]interface{})
	param["type"] = 0
	param["username"] = "dashboardAdmin-2"
	param["password"] = "12345678"

	jsonByte, _ := json.Marshal(param)
	req, _ := http.NewRequest(http.MethodPost, "/user/login", bytes.NewReader(jsonByte))
	c, w := util.TestReqWithHandlers(req, s.authService.LoginHandler)

	s.Require().Contains(c.Errors.Last().Err.Error(), "authenticate failed")
	s.Require().True(errorx.IsOfType(c.Errors.Last().Err, user.ErrInsufficientPrivs))
	s.Require().Equal(401, c.Writer.Status())
	s.Require().Equal(401, w.Code)
}

func (s *testUserSuite) TestLoginWithSufficientPrivs() {
	if s.supportNonRootLogin() {
		param := make(map[string]interface{})
		param["type"] = 0
		param["username"] = "dashboardAdmin"
		param["password"] = "12345678"

		jsonByte, _ := json.Marshal(param)
		req, _ := http.NewRequest(http.MethodPost, "/user/login", bytes.NewReader(jsonByte))
		c, w := util.TestReqWithHandlers(req, s.authService.LoginHandler)

		s.Require().Len(c.Errors, 0)
		s.Require().Equal(200, c.Writer.Status())
		s.Require().Equal(200, w.Code)

		res := struct {
			Token string
		}{}
		err := json.Unmarshal(w.Body.Bytes(), &res)
		s.Require().Nil(err)

		// request /info/whoami by the token
		req2, _ := http.NewRequest(http.MethodPost, "/info/whoami", nil)
		req2.Header.Add("Authorization", "Bearer "+res.Token)
		c2, w2 := util.TestReqWithHandlers(req2, s.authService.MWAuthRequired(), s.infoService.WhoamiHandler)

		s.Require().Equal(200, c2.Writer.Status())
		s.Require().Equal(200, w2.Code)

		res2 := info.WhoAmIResponse{}
		err2 := json.Unmarshal(w2.Body.Bytes(), &res2)
		s.Require().Nil(err2)
		s.Require().Equal(res2.DisplayName, "dashboardAdmin")
	}
}

func (s *testUserSuite) TestLoginWithWrongPasswordForRoot() {
	param := make(map[string]interface{})
	param["type"] = 0
	param["username"] = "root"
	param["password"] = "aaa"

	jsonByte, _ := json.Marshal(param)
	req, _ := http.NewRequest(http.MethodPost, "/user/login", bytes.NewReader(jsonByte))
	c, w := util.TestReqWithHandlers(req, s.authService.LoginHandler)

	s.Require().Contains(c.Errors.Last().Err.Error(), "authenticate failed")
	s.Require().True(errorx.IsOfType(c.Errors.Last().Err, tidb.ErrTiDBAuthFailed))
	s.Require().Equal(401, c.Writer.Status())
	s.Require().Equal(401, w.Code)
}

func (s *testUserSuite) TestLoginWithCorrectPasswordForRoot() {
	param := make(map[string]interface{})
	param["type"] = 0
	param["username"] = "root"
	param["password"] = ""

	jsonByte, _ := json.Marshal(param)
	req, _ := http.NewRequest(http.MethodPost, "/user/login", bytes.NewReader(jsonByte))
	c, w := util.TestReqWithHandlers(req, s.authService.LoginHandler)

	s.Require().Len(c.Errors, 0)
	s.Require().Equal(200, c.Writer.Status())
	s.Require().Equal(200, w.Code)

	res := struct {
		Token string
	}{}
	err := json.Unmarshal(w.Body.Bytes(), &res)
	s.Require().Nil(err)
}

func (s *testUserSuite) TestLoginInfo() {
	req, _ := http.NewRequest(http.MethodGet, "/user/login_info", nil)
	c, w := util.TestReqWithHandlers(req, s.authService.GetLoginInfoHandler)

	s.Require().Len(c.Errors, 0)
	s.Require().Equal(200, c.Writer.Status())
	s.Require().Equal(200, w.Code)

	res := user.GetLoginInfoResponse{}
	err := json.Unmarshal(w.Body.Bytes(), &res)
	s.Require().Nil(err)

	// SSO is not enabled default, so only returns []int{0, 1}
	s.Require().Equal([]int{0, 1}, res.SupportedAuthTypes)
}
