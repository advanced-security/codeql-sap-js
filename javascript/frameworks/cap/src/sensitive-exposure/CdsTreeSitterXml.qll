import javascript

class TreeSitterXmlElement extends XmlElement {
  TreeSitterXmlElement() { this.getFile().getName().matches("%.ts.xml") }

  string getURL() {
    result =
      "file://" + this.getFile().getName().regexpCapture("^(.*)\\.ts\\.xml$", 1) + ":" +
        (this.getAttributeValue("srow").toInt() + 1) + ":" +
        (this.getAttributeValue("scol").toInt() + 1) + ":" +
        (this.getAttributeValue("erow").toInt() + 1) + ":" + this.getAttributeValue("ecol").toInt()
  }
}

class CdsAnnotateElement extends TreeSitterXmlElement {
  CdsAnnotateElement() { this.hasName("annotate_element") }

  CdsAnnotation getAnnotation() { result = this.getAChild() }

  CdsIdentifier getIdentifier() { result = this.getAChild() }
}

class CdsAnnotation extends TreeSitterXmlElement {
  CdsAnnotation() { this.hasName("annotation") }

  CdsAnnotationPath getAnnotationPath() { result = this.getAChild() }
}

class CdsAnnotationPath extends TreeSitterXmlElement {
  CdsAnnotationPath() { this.hasName("annotation_path") }

  CdsIdentifier getIdentifier() { result = this.getAChild() }
}

class CdsIdentifier extends TreeSitterXmlElement {
  CdsIdentifier() { this.hasName("identifier") }
}
