/** Provides classes for working with XSJSLib modules. */

import javascript

/**
 * An XSJSLib module.
 */
class XSJSModule extends Module {
  XSJSModule() { this.getFile().getExtension() = ["xsjs", "xsjslib"] }

  /**
   * Get a value that is explicitly exported from this module with under `name`.
   */
  override DataFlow::ValueNode getAnExportedValue(string name) {
    exists(FunctionDeclStmt fds |
      fds.getParent() = this.getTopLevel() and
      fds.getName() = name and
      result.getAstNode() = fds
    )
  }
}

/**
 * An XSJSLib module import declaration.
 * ```
 * $.import("module.xsjslib");
 * ```
 */
class XSJSImportExpr extends CallExpr, Import {
  XSJSImportExpr() {
    this.getReceiver().(GlobalVarAccess).getName() = "$" and
    this.getFile().getExtension() = ["xsjs", "xsjslib"] and
    this.getCalleeName() = "import"
  }

  override XSJSModule getEnclosingModule() { result = this.getTopLevel() }

  override PathExpr getImportedPath() { result = this.getLastArgument() }

  override DataFlow::Node getImportedModuleNode() { result = DataFlow::valueNode(this) }
}

private class XSJSModuleImportPath extends PathExpr, ConstantString {
  XSJSModuleImportPath() { this = any(XSJSImportExpr e).getLastArgument() }

  override Folder getSearchRoot(int priority) {
    priority = 0 and
    result = this.getFile().getParentContainer()
  }

  override string getValue() {
    exists(XSJSImportExpr e |
      this = e.getArgument(0) and result = this.getStringValue()
      or
      this = e.getArgument(1) and
      result =
        e.getArgument(0).getStringValue().replaceAll(".", "/") + "/" + this.getStringValue() +
          ".xsjslib"
    )
  }
}