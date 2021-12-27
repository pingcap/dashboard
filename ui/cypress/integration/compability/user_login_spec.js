describe('User Login in', () => {
  before(() => {
    // Check noRootLogin is unsupported
    cy.request(`${Cypress.env('apiUrl')}info/info`).then((resp) => {
      expect(resp.status).to.eq(200)
      expect(resp.body.supported_features).not.include('nonRootLogin')
    })
  })

  beforeEach(() => {
    // Load a fixed set of data located in cypress/fixtures.
    cy.fixture('uri.json').as('uri')

    // Direct to login page
    cy.visit('@uri.root')
    cy.get('[data-e2e=signin_username_input]').should('be.disabled')
  })

  describe('Root Login', () => {
    it('root login with no pwd', function () {
      cy.get('[data-e2e=signin_username_input]').should('have.value', 'root')
      cy.get('[data-e2e=signin_submit]').click()
      cy.url().should('include', '/overview')
    })

    it('root login with correct pwd', function () {
      // create user test
      cy.exec(
        `echo "SET PASSWORD FOR 'root'@'%' = 'root_pwd';" | mysql --comments --host 127.0.0.1 --port 4000 -u root`
      )

      cy.get('[data-e2e="signin_password_input"]').type('root_pwd{enter}')
      cy.url().should('include', '/overview')
    })

    it('root login with incorrect pwd', function () {
      cy.get('[data-e2e="signin_password_input"]').type('incorrect_pwd{enter}')
      cy.url().should('include', '/overview')
      cy.get('[data-e2e="signin_password_form_item"]').should(
        'have.class',
        'ant-form-item-has-error'
      )
    })
  })
})