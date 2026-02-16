import javascript
import advanced_security.javascript.frameworks.cap.Application

/**
 * The "cds" section of this application's `package.json`.
 */
class CdsManifest extends JsonObject {
  CdsManifest() { exists(PackageJson parent | this = parent.getPropValue("cds")) }
}

/**
 * The "requires" section of the "cds" section.
 */
class RequiresSection extends JsonObject {
  RequiresSection() { exists(CdsManifest cdsSection | this = cdsSection.getPropValue("requires")) }
}

/**
 * The service required by this application. It should provide a name
 * by which `cds.connect().to(name)` looks up the target service.
 */
class RequiredService extends JsonObject {
  string name;

  RequiredService() { exists(RequiresSection requires | this = requires.getPropValue(name)) }

  string getName() { result = name }

  /**
   * Holds if this is a declaration of a remote service. All possible kinds of remote services can
   * be found in [this part of CAPire](https://cap.cloud.sap/docs/guides/using-services#import-api).
   */
  predicate isRemote() {
    this.getPropStringValue("kind") = ["odata", "odata-v4", "odata-v2", "rest", "sql", "sqlite"]
  }

  /**
   * Holds if this is a declaration of a local service, which must provide an
   * [implementation](https://cap.cloud.sap/docs/node.js/cds-connect#cds-requires-srv-impl) as its property.
   */
  predicate isLocal() { exists(string path | path = this.getPropStringValue("impl")) }

  File getImplementationFile() {
    exists(RootDirectory root |
      // `getFilePathRelativeToRoot` returns normalized forward-slash paths regardless of OS,
      // matching the forward-slash convention used in package.json `impl` values.
      root.getFilePathRelativeToRoot(result) = "./" + this.getPropStringValue("impl")
    )
  }

  /**
   * Holds if this is a declaration of a database service, which is considered remote.
   */
  predicate isDatabase() { this.getPropStringValue("kind") = ["sql", "sqlite"] }
}

/**
 * The authentication strategy that the application is opting to use. It can either be a simple string
 * denoting a strategy preset or an object equipped with mocked users and their credentials. e.g.
 * ``` json
 * "cds": {
 *   "requires": {
 *     "auth": {
 *       "kind": "basic",
 *       "users": {
 *          "JohnDoe": {
 *            "password": "JohnDoe'sPassword",
 *            "roles": [ "JohnDoe'sRole" ]
 *          }
 *       }
 *     }
 *   }
 * }
 * ```
 */
class AuthenticationStrategy extends JsonValue {
  AuthenticationStrategy() {
    exists(RequiresSection requires | this = requires.getPropValue("auth"))
  }

  /**
   * Gets the JSON string that holds the name of the authentication strategy.
   */
  JsonString getJsonString() {
    this instanceof JsonObject and result = this.getPropValue("kind")
    or
    result = this
  }

  /**
   * Gets the name of the authentication strategy.
   */
  string getName() { result = this.getJsonString().getStringValue() }

  /**
   * Gets mocked users declared in this section, if any.
   */
  JsonObject getHardcodedMockedUsers() { result = this.(JsonObject).getPropValue("users") }

  /**
   * Holds if this authentication strategy is a preset for production.
   */
  predicate isProdStrategy() { this.getName() = ["jwt", "xsuaa", "ias"] }

  /**
   * Holds if this authentication strategy is a preset for development.
   */
  predicate isDevStrategy() { this.getName() = ["basic", "mocked", "dummy"] }

  /**
   * Holds if this authentication strategy uses a custom authentication middleware.
   */
  predicate isCustomStrategy() { exists(this.(JsonObject).getPropStringValue("impl")) }
}
