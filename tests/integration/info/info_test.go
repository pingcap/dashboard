// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package info

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/stretchr/testify/suite"
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/info"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user/code"
	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/tests/util"
	"github.com/pingcap/tidb-dashboard/util/testutil"
)

type testInfoSuite struct {
	suite.Suite
	db          *testutil.TestDB
	authService *user.AuthService
	infoService *info.Service
	codeService *code.Service
}

func TestInfoSuite(t *testing.T) {
	db := testutil.OpenTestDB(t)
	tidbVersion := util.GetTiDBVersion(t, db)

	authService := &user.AuthService{}
	infoService := &info.Service{}
	codeService := &code.Service{}

	app := util.NewMockApp(t,
		tidbVersion,
		config.Default(),
		fx.Populate(&authService),
		fx.Populate(&infoService),
		fx.Populate(&codeService),
	)
	ctx, cancel := context.WithCancel(context.Background())
	app.RequireStart(ctx)

	suite.Run(t, &testInfoSuite{
		db:          db,
		authService: authService,
		infoService: infoService,
		codeService: codeService,
	})

	// exit the app
	cancel()
	app.RequireStop()
}

func (s *testInfoSuite) TestWithNotLoginUser() {
	req, _ := http.NewRequest(http.MethodGet, "/info/whoami", nil)
	c, w := util.TestReqWithHandlers(req, s.authService.MWAuthRequired(), s.infoService.WhoamiHandler)

	s.Require().Contains(c.Errors.Last().Err.Error(), "common.unauthenticated")
	s.Require().Equal(401, w.Code)
}

func (s *testInfoSuite) TestWithSQLLoginUser() {
	token := s.getTokenBySQLRoot()
	res := s.requestWhoami(token)
	s.Require().Equal(res.DisplayName, "root")
	s.Require().Equal(res.IsWriteable, true)
	s.Require().Equal(res.IsShareable, true)
}

func (s *testInfoSuite) TestWithShareCodeLoginUser() {
	rootUserToken := s.getTokenBySQLRoot()
	shareCode := s.shareCode(rootUserToken, false)

	shareCodeUserToken := s.getTokenByShareCode(shareCode)
	res := s.requestWhoami(shareCodeUserToken)
	s.Require().Equal(res.DisplayName, "Shared from root")
	s.Require().Equal(res.IsWriteable, false)
	s.Require().Equal(res.IsShareable, false)
}

func (s *testInfoSuite) TestWithShareCodeAndWritePrivLoginUser() {
	rootUserToken := s.getTokenBySQLRoot()
	shareCode := s.shareCode(rootUserToken, true)

	shareCodeUserToken := s.getTokenByShareCode(shareCode)
	res := s.requestWhoami(shareCodeUserToken)
	s.Require().Equal(res.DisplayName, "Shared from root")
	s.Require().Equal(res.IsWriteable, true)
	s.Require().Equal(res.IsShareable, false)
}

func (s *testInfoSuite) getTokenBySQLRoot() string {
	param := make(map[string]interface{})
	param["type"] = 0
	param["username"] = "root"
	pwd, _ := user.Encrypt("", s.authService.RsaPublicKey)
	param["password"] = pwd

	jsonByte, _ := json.Marshal(param)
	req, _ := http.NewRequest(http.MethodPost, "/user/login", bytes.NewReader(jsonByte))
	c, w := util.TestReqWithHandlers(req, s.authService.LoginHandler)

	s.Require().Len(c.Errors, 0)
	s.Require().Equal(200, w.Code)

	res := struct {
		Token string
	}{}
	err := json.Unmarshal(w.Body.Bytes(), &res)
	s.Require().Nil(err)

	return res.Token
}

func (s *testInfoSuite) getTokenByShareCode(shareCode string) string {
	param := make(map[string]interface{})
	param["type"] = 1
	param["password"] = shareCode

	jsonByte, _ := json.Marshal(param)
	req, _ := http.NewRequest(http.MethodPost, "/user/login", bytes.NewReader(jsonByte))
	c, w := util.TestReqWithHandlers(req, s.authService.LoginHandler)

	s.Require().Len(c.Errors, 0)
	s.Require().Equal(200, w.Code)

	res := struct {
		Token string
	}{}
	err := json.Unmarshal(w.Body.Bytes(), &res)
	s.Require().Nil(err)

	return res.Token
}

func (s *testInfoSuite) shareCode(token string, grantWritePriv bool) string {
	// request /user/share/code
	param := make(map[string]interface{})
	param["expire_in_sec"] = 10800
	param["revoke_write_priv"] = !grantWritePriv

	jsonByte, _ := json.Marshal(param)
	req, _ := http.NewRequest(http.MethodPost, "/user/share/code", bytes.NewReader(jsonByte))
	req.Header.Add("Authorization", "Bearer "+token)
	c, w := util.TestReqWithHandlers(req, s.authService.MWAuthRequired(), s.codeService.ShareHandler)

	s.Require().Len(c.Errors, 0)
	s.Require().Equal(200, w.Code)

	res := struct {
		Code string
	}{}
	err := json.Unmarshal(w.Body.Bytes(), &res)
	s.Require().Nil(err)

	return res.Code
}

func (s *testInfoSuite) requestWhoami(token string) info.WhoAmIResponse {
	req, _ := http.NewRequest(http.MethodPost, "/info/whoami", nil)
	req.Header.Add("Authorization", "Bearer "+token)
	_, w := util.TestReqWithHandlers(req, s.authService.MWAuthRequired(), s.infoService.WhoamiHandler)

	s.Require().Equal(200, w.Code)

	res := info.WhoAmIResponse{}
	err := json.Unmarshal(w.Body.Bytes(), &res)
	s.Require().Nil(err)

	return res
}
