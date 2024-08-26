/** Provides classes for working with XSJSLib modules. */

import javascript

/**
 * An XSJS module.
 */
class XSJSModule extends Module {
  XSJSModule() { this.getFile().getExtension() = ["xsjs", "xsjslib"] }

  override XSJSImportExpr getAnImport() { result.getTopLevel() = this }

  /** Gets a module from which this module imports. */
  override XSJSModule getAnImportedModule() { result = this.getAnImport().getImportedModule() }

  override DataFlow::ValueNode getAnExportedValue(string name) {
    result.getFile() = this.getFile() and
    exists(FunctionDeclStmt fds | fds = result.getAstNode() |
      fds.getParent() instanceof TopLevel and
      name = fds.getName()
    )
  }
}

/**
 * An import declaration.
 *
 * Example:
 *
 * ```
 * $.import("module.xsjslib");
 * ```
 */
class XSJSImportExpr extends CallExpr, Import {
  XSJSImportExpr() {
    this.getReceiver().(GlobalVarAccess).getName() = "$" and
    this.getFile().getExtension() = ["xsjs", "xsjslib"] and
    this.getCalleeName() = "import" and
    this.getNumArgument() = 1
  }

  override Module getEnclosingModule() { result = this.getTopLevel() }

  override XSJSLiteralImportPath getImportedPath() { result = this.getArgument(0) }

  override DataFlow::Node getImportedModuleNode() { result = DataFlow::valueNode(this) }
}

/** A literal path expression appearing in an `import` declaration. */
private class XSJSLiteralImportPath extends PathExpr, ConstantString {
  XSJSLiteralImportPath() { exists(XSJSImportExpr req | this = req.getArgument(0)) }

  override Folder getAdditionalSearchRoot(int priority) {
    priority = 0 and
    result = this.getFile().getParentContainer()
  }

  override string getValue() { result = this.getStringValue() }
}
