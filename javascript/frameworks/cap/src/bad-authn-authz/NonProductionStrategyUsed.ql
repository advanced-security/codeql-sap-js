/**
 * @name Non-production authentication strategy used
 * @description Using non-production authentication strategies can lead to unwanted authentication behavior in production.
 * @kind problem
 * @problem.severity warning
 * @security-severity 6
 * @precision high
 * @id js/cap-non-prod-auth-strategy
 * @tags security
 */

import javascript
import advanced_security.javascript.frameworks.cap.PackageJson

newtype TAlertItems =
  TNonProdAuthenticationStrategy(AuthenticationStrategy nonProdAuthStrategy) {
    nonProdAuthStrategy.isDevStrategy()
  } or
  THardCodedMockedUsers(JsonObject hardCodedMockedUsers) {
    exists(AuthenticationStrategy authStrategy |
      hardCodedMockedUsers = authStrategy.getHardcodedMockedUsers()
    )
  }

class AlertItems extends TAlertItems {
  AuthenticationStrategy asNonProdAuthenticationStrategy() {
    this = TNonProdAuthenticationStrategy(result)
  }

  JsonObject asHardCodedMockedUsers() { this = THardCodedMockedUsers(result) }

  string toString() {
    result = this.asNonProdAuthenticationStrategy().toString() or
    result = this.asHardCodedMockedUsers().toString()
  }

  Location getLocation() {
    result = this.asNonProdAuthenticationStrategy().getJsonString().getLocation() or
    result = this.asHardCodedMockedUsers().getLocation()
  }

  string getMessage() {
    exists(this.asNonProdAuthenticationStrategy()) and
    result = "Non-production authentication strategy $@ is used."
    or
    exists(this.asHardCodedMockedUsers()) and
    result = "Current authentication strategy contains $@."
  }

  string getClickableText() {
    result = this.asNonProdAuthenticationStrategy().getName()
    or
    exists(this.asHardCodedMockedUsers()) and result = "credentials of mocked users"
  }
}

from AlertItems alertItems
select alertItems, alertItems.getMessage(), alertItems, alertItems.getClickableText()
