/**
 * Provides classes for working with
 * [Asynchronous Module Definitions](https://github.com/amdjs/amdjs-api/wiki/AMD).
 */

import javascript
private import semmle.javascript.internal.CachedStages
private import Expressions.ExprHasNoEffect

/**
 * A IU5 `declare`/`require` call using jQuery.
 *
 * Example:
 *
 * ```
 * √("codeql-sap-js.control.xss");
 *
 * The first argument is a dependency.
 * ```
 */
abstract class SapJQueryModuleDefinition extends CallExpr {
  SapJQueryModuleDefinition() {
    inVoidContext(this) and
    this.getReceiver().(PropAccess).getQualifiedName() = "jQuery.sap"
  }
}

/**
 * `jQuery.sap.declare` call
 */
class SapJQueryDefine extends SapJQueryModuleDefinition {
  SapJQueryDefine() { this.getCalleeName() = "declare" }
}

/**
 * `jQuery.sap.require` call
 */
class SapJQueryRequire extends SapJQueryModuleDefinition {
  SapJQueryRequire() { this.getCalleeName() = "require" }
}

/**
 * An AMD `define`/`require` call.
 *
 * Example:
 *
 * ```
 * sap.ui.define(['fs', 'express'], function(fs, express) {
 *   ...
 * });
 * ```
 *
 * The first argument is an (optional) array of dependencies,
 * the second a factory method or object.
 *
 * We also recognize the three-argument form `define('m', ['fs', 'express'], ...)`
 * where the first argument is the module name, the second argument an
 * array of dependencies, and the third argument a factory method or object.
 */
abstract class SapAmdModuleDefinition extends CallExpr {
  SapAmdModuleDefinition() {
    inVoidContext(this) and
    exists(int n | n = this.getNumArgument() |
      n = 1
      or
      n = 2 and this.getArgument(0) instanceof ArrayExpr
      or
      n = 3 and
      this.getArgument(0) instanceof ConstantString and
      this.getArgument(1) instanceof ArrayExpr
    )
  }

  /** Gets the array of module dependencies, if any. */
  ArrayExpr getDependencies() {
    result = this.getArgument(0) or
    result = this.getArgument(1)
  }

  /** Gets the `i`th dependency of this module definition. */
  PathExpr getDependency(int i) { result = this.getDependencies().getElement(i) }

  /** Gets a dependency of this module definition. */
  PathExpr getADependency() {
    result = this.getDependency(_) or
    result = this.getARequireCall().getAnArgument()
  }

  /**
   * Gets a data flow node containing the factory value of this module definition.
   */
  pragma[nomagic]
  DataFlow::SourceNode getFactoryNode() {
    result = this.getFactoryNodeInternal() and
    result instanceof DataFlow::ValueNode
  }

  private DataFlow::Node getFactoryNodeInternal() {
    // To avoid recursion, this should not depend on `SourceNode`.
    result = DataFlow::valueNode(this.getLastArgument()) or
    result = this.getFactoryNodeInternal().getAPredecessor()
  }

  /** Gets the expression defining this module. */
  Expr getModuleExpr() {
    exists(DataFlow::Node f | f = this.getFactoryNode() |
      if f instanceof DataFlow::FunctionNode
      then
        exists(ReturnStmt ret | ret.getContainer() = f.(DataFlow::FunctionNode).getAstNode() |
          result = ret.getExpr()
        )
      else result = f.asExpr()
    )
  }

  /** Gets a source node whose value becomes the definition of this module. */
  DataFlow::SourceNode getAModuleSource() { result.flowsToExpr(this.getModuleExpr()) }

  /**
   * Holds if `p` is the parameter corresponding to dependency `dep`.
   */
  predicate dependencyParameter(PathExpr dep, Parameter p) {
    exists(int i |
      dep = this.getDependency(i) and
      p = this.getFactoryParameter(i)
    )
  }

  /**
   * Gets the parameter corresponding to dependency `name`.
   *
   * For instance, in the module definition
   *
   * ```
   * define(['dep1', 'dep2'], function(pdep1, pdep2) { ... })
   * ```
   *
   * parameters `pdep1` and `pdep2` correspond to dependencies
   * `dep1` and `dep2`.
   */
  Parameter getDependencyParameter(string name) {
    exists(PathExpr dep |
      this.dependencyParameter(dep, result) and
      dep.getValue() = name
    )
  }

  /**
   * Gets the `i`th parameter of the factory function of this module.
   */
  private Parameter getFactoryParameter(int i) {
    this.getFactoryNodeInternal().asExpr().(Function).getParameter(i) = result
  }

  /**
   * Gets the parameter corresponding to the pseudo-dependency `require`.
   */
  Parameter getRequireParameter() {
    result = this.getDependencyParameter("require")
    or
    // if no dependencies are listed, the first parameter is assumed to be `require`
    not exists(this.getDependencies()) and result = this.getFactoryParameter(0)
  }

  pragma[noinline]
  private Variable getRequireVariable() { result = this.getRequireParameter().getVariable() }

  /**
   * Gets the parameter corresponding to the pseudo-dependency `exports`.
   */
  Parameter getExportsParameter() {
    result = this.getDependencyParameter("exports")
    or
    // if no dependencies are listed, the second parameter is assumed to be `exports`
    not exists(this.getDependencies()) and result = this.getFactoryParameter(1)
  }

  /**
   * Gets the parameter corresponding to the pseudo-dependency `module`.
   */
  Parameter getModuleParameter() {
    result = this.getDependencyParameter("module")
    or
    // if no dependencies are listed, the third parameter is assumed to be `module`
    not exists(this.getDependencies()) and result = this.getFactoryParameter(2)
  }

  /**
   * Gets an abstract value representing one or more values that may flow
   * into this module's `module.exports` property.
   */
  DefiniteAbstractValue getAModuleExportsValue() {
    result = [this.getAnImplicitExportsValue(), this.getAnExplicitExportsValue()]
  }

  pragma[noinline, nomagic]
  private AbstractValue getAnImplicitExportsValue() {
    // implicit exports: anything that is returned from the factory function
    result = this.getModuleExpr().analyze().getAValue()
  }

  pragma[noinline]
  private AbstractValue getAnExplicitExportsValue() {
    // explicit exports: anything assigned to `module.exports`
    exists(AbstractProperty moduleExports, SapAmdModule m |
      this = m.getDefine() and
      moduleExports.getBase().(AbstractModuleObject).getModule() = m and
      moduleExports.getPropertyName() = "exports"
    |
      result = moduleExports.getAValue()
    )
  }

  /**
   * Gets a call to `require` inside this module.
   */
  CallExpr getARequireCall() {
    result.getCallee().getUnderlyingValue() = this.getRequireVariable().getAnAccess()
  }
}

/**
 * `sap.ui.define` call
 */
class SapUiDefine extends SapAmdModuleDefinition {
  SapUiDefine() {
    this.getReceiver().(PropAccess).getQualifiedName() = "sap.ui" and
    this.getCalleeName() = "define"
  }
}

/**
 * `sap.ui.require` call
 */
class SapUiRequire extends SapAmdModuleDefinition {
  SapUiRequire() {
    this.getReceiver().(PropAccess).getQualifiedName() = "sap.ui" and
    this.getCalleeName() = "require"
  }
}

/** An UI5 dependency, considered as a path expression. */
private class SapAmdDependencyPath extends PathExprCandidate {
  SapAmdDependencyPath() {
    exists(SapAmdModuleDefinition amd |
      this = amd.getDependencies().getAnElement() or
      this = amd.getARequireCall().getAnArgument()
    )
  }
}

/** A constant path element appearing in an AMD dependency expression. */
private class ConstantAmdDependencyPathElement extends PathExpr, ConstantString {
  ConstantAmdDependencyPathElement() { this = any(SapAmdDependencyPath amd).getAPart() }

  override string getValue() { result = this.getStringValue() }
}

/**
 * Holds if `nd` is nested inside an AMD module definition.
 */
private predicate inAmdModuleDefinition(AstNode nd) {
  nd.getParent() instanceof SapAmdModuleDefinition
  or
  inAmdModuleDefinition(nd.getParent())
}

/**
 * Holds if `def` is an AMD module definition in `tl` which is not
 * nested inside another module definition.
 */
private predicate amdModuleTopLevel(SapAmdModuleDefinition def, TopLevel tl) {
  def.getTopLevel() = tl and
  not inAmdModuleDefinition(def)
}

/**
 * An AMD dependency, viewed as an import.
 */
private class SapAmdDependencyImport extends Import {
  SapAmdDependencyImport() { this = any(SapAmdModuleDefinition def).getADependency() }

  override Module getEnclosingModule() { this = result.(SapAmdModule).getDefine().getADependency() }

  override PathExpr getImportedPath() { result = this }

  /**
   * Gets a file that looks like it might be the target of this import.
   *
   * Specifically, we look for files whose absolute path ends with the imported path, possibly
   * adding well-known JavaScript file extensions like `.js`.
   */
  private File guessTarget() {
    exists(PathString imported, string abspath, string dirname, string basename |
      this.targetCandidate(result, abspath, imported, dirname, basename)
    |
      abspath.regexpMatch(".*/\\Q" + imported + "\\E")
      or
      exists(Folder dir |
        // `dir` ends with the dirname of the imported path
        dir.getAbsolutePath().regexpMatch(".*/\\Q" + dirname + "\\E") or
        dirname = ""
      |
        result = dir.getJavaScriptFile(basename)
      )
    )
  }

  /**
   * Holds if `f` is a file whose stem (that is, basename without extension) matches the imported path.
   *
   * Additionally, `abspath` is bound to the absolute path of `f`, `imported` to the imported path, and
   * `dirname` and `basename` to the dirname and basename (respectively) of `imported`.
   */
  private predicate targetCandidate(
    File f, string abspath, PathString imported, string dirname, string basename
  ) {
    imported = this.getImportedPath().getValue() and
    f.getStem() = imported.getStem() and
    f.getAbsolutePath() = abspath and
    dirname = imported.getDirName() and
    basename = imported.getBaseName()
  }

  /**
   * Gets the module whose absolute path matches this import, if there is only a single such module.
   */
  private Module resolveByAbsolutePath() {
    result.getFile() = unique(File file | file = this.guessTarget())
  }

  override Module getImportedModule() {
    result = super.getImportedModule()
    or
    not exists(super.getImportedModule()) and
    result = this.resolveByAbsolutePath()
  }

  override DataFlow::Node getImportedModuleNode() {
    exists(Parameter param |
      any(SapAmdModuleDefinition def).dependencyParameter(this, param) and
      result = DataFlow::parameterNode(param)
    )
  }
}

/**
 * An AMD-style module.
 *
 * Example:
 *
 * ```
 * define(['fs', 'express'], function(fs, express) {
 *   ...
 * });
 * ```
 */
class SapAmdModule extends Module {
  cached
  SapAmdModule() {
    Stages::DataFlowStage::ref() and
    exists(unique(SapAmdModuleDefinition def | amdModuleTopLevel(def, this)))
  }

  /** Gets the definition of this module. */
  SapAmdModuleDefinition getDefine() { amdModuleTopLevel(result, this) }

  override DataFlow::Node getAnExportedValue(string name) {
    exists(DataFlow::PropWrite pwn | result = pwn.getRhs() |
      pwn.getBase().analyze().getAValue() = this.getDefine().getAModuleExportsValue() and
      name = pwn.getPropertyName()
    )
  }

  override DataFlow::Node getABulkExportedNode() {
    // Assigned to `module.exports` via the factory's `module` parameter
    exists(AbstractModuleObject m, DataFlow::PropWrite write |
      m.getModule() = this and
      write.getPropertyName() = "exports" and
      write.getBase().analyze().getAValue() = m and
      result = write.getRhs()
    )
    or
    // Returned from factory function
    result = this.getDefine().getModuleExpr().flow()
  }
}
