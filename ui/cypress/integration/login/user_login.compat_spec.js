// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

// Test User Login Compatibility
// PD_VERSION < 5.3.0 of TiDB Dashboard does not support nonRootLogin
// PD_VERSION >= 5.3.0 of TiDB Dashboard supports nonRootLogin
describe('User Login', () => {
  if (Cypress.env('PD_VERSION') === '6.0.0') {
    // Create user test
    before(() => {
      let queryData = {
        query: 'DROP USER IF EXISTS "test"@"%"',
      }
      cy.task('queryDB', { ...queryData })

      queryData = {
        query: "CREATE USER 'test'@'%' IDENTIFIED BY 'test_pwd'",
      }

      cy.task('queryDB', { ...queryData })

      queryData = {
        query: "GRANT ALL PRIVILEGES ON *.* TO 'test'@'%' WITH GRANT OPTION",
      }
      cy.task('queryDB', { ...queryData })
    })

    // Run before each test
    beforeEach(() => {
      // Load a fixed set of data located in cypress/fixtures.
      // Direct to login page
      cy.fixture('uri.json').then(function (uri) {
        this.uri = uri
        cy.visit(this.uri.overview)
      })
    })

    it('noRootLogin is supported', () => {
      cy.log('PD_VERSION is: ', Cypress.env('PD_VERSION'))

      // Check username input is not disabled
      cy.get('[data-e2e=signin_username_input]').should('not.be.disabled')
    })

    it('nonRoot user with correct password', function () {
      cy.get('[data-e2e=signin_username_input]').clear().type('test')
      cy.get('[data-e2e="signin_password_input"]').type('test_pwd{enter}')
      cy.url().should('include', this.uri.overview)
    })

    it('nonRoot user with incorrect password', () => {
      cy.intercept('POST', '/dashboard/api/user/login').as('login')

      cy.get('[data-e2e=signin_username_input]').clear().type('test')
      cy.get('[data-e2e="signin_password_input"]').type('incorrect_pwd{enter}')

      cy.wait('@login').should(({ response }) => {
        expect(response.body).to.have.property('code', 'tidb.tidb_auth_failed')
      })
    })
  } else if (Cypress.env('PD_VERSION') === '5.0.0') {
    beforeEach(() => {
      cy.fixture('uri.json').then(function (uri) {
        this.uri = uri
        cy.visit(this.uri.overview)
      })
    })

    it('noRootLogin is unsupported', () => {
      cy.log('PD_VERSION is: ', Cypress.env('PD_VERSION'))

      // Check username input is disabled
      cy.get('[data-e2e=signin_username_input]').should('be.disabled')
    })
  }
})
