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

  override string getAnExportedSymbol() { exists(this.getAnExportedValue(result)) }

  override DataFlow::ValueNode getAnExportedValue(string name) {
    exists(FunctionDeclStmt fds |
      result.getAstNode() = fds and
      fds.getParent() = this.getTopLevel() and
      fds.getName() = name
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
    this.getCalleeName() = "import"
  }

  override XSJSModule getEnclosingModule() { result = this.getTopLevel() }

  override PathExpr getImportedPath() {
    this.getNumArgument() = [1, 2] and result = this.getArgument([0, 1])
  }

  override DataFlow::Node getImportedModuleNode() { result = DataFlow::valueNode(this) }
}

/** A literal path expression appearing in an `import` declaration. */
private class XSJSLiteralImportPath extends PathExpr, ConstantString {
  XSJSLiteralImportPath() { this = any(XSJSImportExpr e | e.getNumArgument() = 1).getArgument(0) }

  override Folder getSearchRoot(int priority) {
    priority = 0 and
    this = any(XSJSImportExpr e).getArgument(0) and
    result = this.getFile().getParentContainer()
  }

  override string getValue() { result = this.getStringValue() }
}

private class XSJSModuleImportPath extends PathExpr, ConstantString {
  XSJSModuleImportPath() { this = any(XSJSImportExpr e | e.getNumArgument() = 2).getArgument(1) }

  override Folder getSearchRoot(int priority) {
    exists(XSJSImportExpr e |
      priority = 0 and
      this = e.getArgument(1) and
      result.getAbsolutePath() =
        this.getFile().getParentContainer().getAbsolutePath() + "/" +
          e.getArgument(0).toString().replaceAll("\"", "").replaceAll(".", "/")
    )
  }

  override string getValue() { result = this.getStringValue() + ".xsjslib" }
}
