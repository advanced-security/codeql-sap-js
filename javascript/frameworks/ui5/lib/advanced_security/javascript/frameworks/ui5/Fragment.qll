/**
 * Provides classes for modeling the sap.ui.core.Fragment API.
 */

import javascript
import DataFlow
import advanced_security.javascript.frameworks.ui5.UI5

/**
 * Gets a reference to the Fragment module import.
 */
class FragmentLoad extends InvokeNode, MethodCallNode {
  FragmentLoad() {
    this =
      TypeTrackers::hasDependency(["sap/ui/core/Fragment", "sap.ui.core.Fragment"])
          .getAMemberCall("load")
    or
    exists(RequiredObject requiredModule, SapDefineModule sapModule |
      this = requiredModule.asSourceNode().getAMemberCall("load") and
      //ensure it is an sap module define
      requiredModule.getEnclosingFunction() = sapModule.getArgument(1)
    )
  }

  /**
   * Gets the configuration object passed to Fragment.load().
   */
  DataFlow::Node getConfigObject() { result = this.getArgument(0) }

  /**
   * Gets the 'name' property value from the config object.
   * This specifies the fragment resource to load (e.g., "my.app.fragments.MyFragment").
   */
  DataFlow::Node getNameArgument() {
    exists(DataFlow::ObjectLiteralNode config |
      config = this.getConfigObject().getALocalSource() and
      result = config.getAPropertyWrite("name").getRhs()
    )
  }

  /**
   * Gets the 'controller' property value from the config object.
   * This specifies the fragment's controller, if it has one.
   */
  DataFlow::Node getControllerArgument() {
    exists(DataFlow::ObjectLiteralNode config |
      config = this.getConfigObject().getALocalSource() and
      result = config.getAPropertyWrite("controller").getRhs()
    )
  }
}
