// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package user

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"sort"
	"time"

	jwt "github.com/breeswish/gin-jwt/v2"
	"github.com/gin-gonic/gin"
	"github.com/gtank/cryptopasta"
	"github.com/joomcode/errorx"
	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/util/featureflag"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

var (
	ErrNS                  = errorx.NewNamespace("error.api.user")
	ErrUnsupportedAuthType = ErrNS.NewType("unsupported_auth_type")
	ErrNSSignIn            = ErrNS.NewSubNamespace("signin")
	ErrSignInOther         = ErrNSSignIn.NewType("other")
)

type AuthService struct {
	FeatureNonRootLogin *featureflag.FeatureFlag

	middleware     *jwt.GinJWTMiddleware
	authenticators map[utils.AuthType]Authenticator
}

type AuthenticateForm struct {
	Type     utils.AuthType `json:"type" example:"0"`
	Username string         `json:"username" example:"root"` // Does not present for AuthTypeSharingCode
	Password string         `json:"password"`
	Extra    string         `json:"extra"` // FIXME: Use strong type
}

type TokenResponse struct {
	Token  string    `json:"token"`
	Expire time.Time `json:"expire"`
}

type SignOutInfo struct {
	EndSessionURL string `json:"end_session_url"`
}

type Authenticator interface {
	IsEnabled() (bool, error)
	Authenticate(form AuthenticateForm) (*utils.SessionUser, error)
	ProcessSession(u *utils.SessionUser) bool
	SignOutInfo(u *utils.SessionUser, redirectURL string) (*SignOutInfo, error)
}

type BaseAuthenticator struct{}

func (a BaseAuthenticator) IsEnabled() (bool, error) {
	return true, nil
}

func (a BaseAuthenticator) ProcessSession(u *utils.SessionUser) bool {
	return true
}

func (a BaseAuthenticator) SignOutInfo(u *utils.SessionUser, redirectURL string) (*SignOutInfo, error) {
	return &SignOutInfo{}, nil
}

func NewAuthService(featureFlags *featureflag.Registry) *AuthService {
	var secret *[32]byte

	secretStr := os.Getenv("DASHBOARD_SESSION_SECRET")
	switch len(secretStr) {
	case 0:
		secret = cryptopasta.NewEncryptionKey()
	case 32:
		log.Info("DASHBOARD_SESSION_SECRET is overridden from env var")
		secret = &[32]byte{}
		copy(secret[:], secretStr)
	default:
		log.Warn("DASHBOARD_SESSION_SECRET does not meet the 32 byte size requirement, ignored")
		secret = cryptopasta.NewEncryptionKey()
	}

	service := &AuthService{
		FeatureNonRootLogin: featureFlags.Register("nonRootLogin", ">= 5.3.0"),
		middleware:          nil,
		authenticators:      map[utils.AuthType]Authenticator{},
	}

	middleware, err := jwt.New(&jwt.GinJWTMiddleware{
		IdentityKey: utils.SessionUserKey,
		Realm:       "dashboard",
		Key:         secret[:],
		Timeout:     time.Hour * 24,
		MaxRefresh:  time.Hour * 24,
		Authenticator: func(c *gin.Context) (interface{}, error) {
			var form AuthenticateForm
			if err := c.ShouldBindJSON(&form); err != nil {
				return nil, rest.ErrBadRequest.WrapWithNoMessage(err)
			}
			u, err := service.authForm(form)
			if err != nil {
				return nil, errorx.Decorate(err, "authenticate failed")
			}
			return u, nil
		},
		PayloadFunc: func(data interface{}) jwt.MapClaims {
			user, ok := data.(*utils.SessionUser)
			if !ok {
				return jwt.MapClaims{}
			}
			// `user` contains sensitive information, thus it is encrypted in the token.
			// In order to be simple, we keep using JWS instead of JWE for thus scenario.
			plain, err := json.Marshal(user)
			if err != nil {
				return jwt.MapClaims{}
			}
			encrypted, err := cryptopasta.Encrypt(plain, secret)
			if err != nil {
				return jwt.MapClaims{}
			}
			return jwt.MapClaims{
				"p": base64.StdEncoding.EncodeToString(encrypted),
			}
		},
		IdentityHandler: func(c *gin.Context) interface{} {
			claims := jwt.ExtractClaims(c)

			encoded, ok := claims["p"].(string)
			if !ok {
				return nil
			}
			decoded, err := base64.StdEncoding.DecodeString(encoded)
			if err != nil {
				return nil
			}
			decrypted, err := cryptopasta.Decrypt(decoded, secret)
			if err != nil {
				return nil
			}
			var user utils.SessionUser
			if err := json.Unmarshal(decrypted, &user); err != nil {
				return nil
			}

			// Force expire schema outdated sessions.
			if user.Version != utils.SessionVersion {
				return nil
			}

			a, ok := service.authenticators[user.AuthFrom]
			if !ok {
				return nil
			}
			if !a.ProcessSession(&user) {
				return nil
			}

			return &user
		},
		Authorizator: func(data interface{}, c *gin.Context) bool {
			// Ensure identity is valid
			if data == nil {
				return false
			}
			user := data.(*utils.SessionUser)
			return user != nil
		},
		HTTPStatusMessageFunc: func(e error, c *gin.Context) string {
			var err error
			if errorxErr := errorx.Cast(e); errorxErr != nil {
				// If the error is an errorx, use it directly.
				err = e
			} else if errors.Is(e, jwt.ErrFailedTokenCreation) {
				// Try to catch other sign in failure errors.
				err = ErrSignInOther.WrapWithNoMessage(e)
			} else {
				// The remaining error comes from checking tokens for protected endpoints.
				err = rest.ErrUnauthenticated.NewWithNoMessage()
			}
			rest.Error(c, err)
			return err.Error()
		},
		Unauthorized: func(c *gin.Context, code int, message string) {
			c.Status(code)
		},
		LoginResponse: func(c *gin.Context, code int, token string, expire time.Time) {
			c.JSON(http.StatusOK, TokenResponse{
				Token:  token,
				Expire: expire,
			})
		},
	})
	if err != nil {
		// Error only comes from configuration errors. Fatal is fine.
		log.Fatal("Failed to configure auth service", zap.Error(err))
	}

	service.middleware = middleware

	return service
}

func (s *AuthService) authForm(f AuthenticateForm) (*utils.SessionUser, error) {
	a, ok := s.authenticators[f.Type]
	if !ok {
		return nil, ErrUnsupportedAuthType.NewWithNoMessage()
	}
	u, err := a.Authenticate(f)
	if err != nil {
		return nil, err
	}
	u.AuthFrom = f.Type
	return u, nil
}

func registerRouter(r *gin.RouterGroup, s *AuthService) {
	endpoint := r.Group("/user")
	endpoint.GET("/login_info", s.GetLoginInfoHandler)
	endpoint.POST("/login", s.LoginHandler)
	endpoint.GET("/sign_out_info", s.MWAuthRequired(), s.getSignOutInfoHandler)
}

// MWAuthRequired creates a middleware that verifies the authentication token (JWT) in the request. If the token
// is valid, identity information will be attached in the context. If there is no authentication token, or the
// token is invalid, subsequent handlers will be skipped and errors will be generated.
func (s *AuthService) MWAuthRequired() gin.HandlerFunc {
	return s.middleware.MiddlewareFunc()
}

// TODO: Make these MWRequireXxxPriv more general to use.
func (s *AuthService) MWRequireSharePriv() gin.HandlerFunc {
	return func(c *gin.Context) {
		u := utils.GetSession(c)
		if u == nil {
			rest.Error(c, rest.ErrUnauthenticated.NewWithNoMessage())
			c.Abort()
			return
		}
		if !u.IsShareable {
			rest.Error(c, rest.ErrForbidden.NewWithNoMessage())
			c.Abort()
			return
		}
		c.Next()
	}
}

func (s *AuthService) MWRequireWritePriv() gin.HandlerFunc {
	return func(c *gin.Context) {
		u := utils.GetSession(c)
		if u == nil {
			rest.Error(c, rest.ErrUnauthenticated.NewWithNoMessage())
			c.Abort()
			return
		}
		if !u.IsWriteable {
			rest.Error(c, rest.ErrForbidden.NewWithNoMessage())
			c.Abort()
			return
		}
		c.Next()
	}
}

// RegisterAuthenticator registers an authenticator in the authenticate pipeline.
func (s *AuthService) RegisterAuthenticator(typeID utils.AuthType, a Authenticator) {
	s.authenticators[typeID] = a
}

type GetLoginInfoResponse struct {
	SupportedAuthTypes []int `json:"supported_auth_types"`
}

// @ID userGetLoginInfo
// @Summary Get log in information, like supported authenticate types
// @Success 200 {object} GetLoginInfoResponse
// @Router /user/login_info [get]
func (s *AuthService) GetLoginInfoHandler(c *gin.Context) {
	supportedAuth := make([]int, 0)
	for typeID, a := range s.authenticators {
		enabled, err := a.IsEnabled()
		if err != nil {
			rest.Error(c, err)
			return
		}
		if enabled {
			supportedAuth = append(supportedAuth, int(typeID))
		}
	}
	sort.Ints(supportedAuth)
	resp := GetLoginInfoResponse{
		SupportedAuthTypes: supportedAuth,
	}
	c.JSON(http.StatusOK, resp)
}

// @ID userLogin
// @Summary Log in
// @Param message body AuthenticateForm true "Credentials"
// @Success 200 {object} TokenResponse
// @Failure 401 {object} rest.ErrorResponse
// @Router /user/login [post]
func (s *AuthService) LoginHandler(c *gin.Context) {
	s.middleware.LoginHandler(c)
}

type GetSignOutInfoRequest struct {
	RedirectURL string `json:"redirect_url" form:"redirect_url"`
}

// @ID userGetSignOutInfo
// @Summary Get sign out info
// @Success 200 {object} SignOutInfo
// @Param q query GetSignOutInfoRequest true "Query"
// @Router /user/sign_out_info [get]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *AuthService) getSignOutInfoHandler(c *gin.Context) {
	var req GetSignOutInfoRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}

	u := utils.GetSession(c)
	a, ok := s.authenticators[u.AuthFrom]
	if !ok {
		rest.Error(c, ErrUnsupportedAuthType.NewWithNoMessage())
		return
	}
	si, err := a.SignOutInfo(u, req.RedirectURL)
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, si)
}
