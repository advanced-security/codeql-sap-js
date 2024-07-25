/**
 * A module to reason about an AST exported to a `.t-s.xml` file using `tree-sitter parse -x` .
 */

import javascript

class TreeSitterXmlElement extends XmlElement {
  TreeSitterXmlElement() { this.getFile().getName().matches("%.t-s.xml") }

  string getURL() {
    result =
      "file://" + this.getFile().getName().splitAt(".t-s.xml") + ":" +
        (this.getAttributeValue("srow").toInt() + 1) + ":" +
        (this.getAttributeValue("scol").toInt() + 1) + ":" +
        (this.getAttributeValue("erow").toInt() + 1) + ":" +
        (this.getAttributeValue("ecol").toInt() + 1)
  }
}
