/**
 * Associates UI5 loader dependency paths with their factory parameters using standard module imports.
 * This adapter does not add security sources, sinks, or sanitizers.
 */

import javascript

/** A call to the global `sap.ui` module loader. */
overlay[local?]
class UI5ModuleLoaderCall extends MethodCallExpr {
  UI5ModuleLoaderCall() {
    exists(DotExpr ui |
      this.getReceiver() = ui and
      ui.getPropertyName() = "ui" and
      ui.getBase().(GlobalVarAccess).getName() = "sap" and
      this.getMethodName() = ["define", "require"]
    )
  }

  ArrayExpr getDependencyArray() {
    result = this.getArgument(0)
    or
    this.getMethodName() = "define" and
    this.getArgument(0) instanceof ConstantString and
    result = this.getArgument(1)
  }

  Expr getFactoryArgument() {
    this.getArgument(0) instanceof ArrayExpr and result = this.getArgument(1)
    or
    this.getMethodName() = "define" and
    this.getArgument(0) instanceof ConstantString and
    this.getArgument(1) instanceof ArrayExpr and
    result = this.getArgument(2)
    or
    this.getMethodName() = "define" and
    this.getNumArgument() = 1 and
    result = this.getArgument(0)
  }
}

/** A UI5 call compatible with the standard AMD model's final factory argument. */
overlay[local?]
class UI5ModuleDefinition extends UI5ModuleLoaderCall, AmdModuleDefinition::Range {
  UI5ModuleDefinition() { this.getFactoryArgument() = this.getLastArgument() }
}

/**
 * UI5 permits an error callback or export flag after the factory, whereas the standard AMD model
 * uses the final argument as its factory.
 */
overlay[local?]
private class UI5AdditionalArgumentImport extends Import {
  UI5ModuleLoaderCall loader;
  int index;

  UI5AdditionalArgumentImport() {
    loader.getFactoryArgument() != loader.getLastArgument() and
    this = loader.getDependencyArray().getElement(index)
  }

  override Module getEnclosingModule() { result = loader.getTopLevel() }

  override Expr getImportedPathExpr() { result = this }

  override DataFlow::Node getImportedModuleNode() {
    result = DataFlow::parameterNode(loader.getFactoryArgument().(Function).getParameter(index))
  }
}
