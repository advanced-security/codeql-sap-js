import javascript

class ExposedServiceAccessSpec extends File {
  ExposedServiceAccessSpec() {
    this.getBaseName() = "xs-app.json"
    or
    // we are only interested in exposed services
    this.getBaseName() = ".xsaccess" and
    exists(JsonValue v | this = v.getJsonFile() |
      v.getPropValue("exposed").getBooleanValue() = false
    )
  }
}
