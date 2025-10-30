import javascript

module UI5PathInjection implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node node) { node instanceof RemoteFlowSource }

  predicate isSink(DataFlow::Node node) {
    node = ModelOutput::getASinkNode("ui5-path-injection").asSink()
  }
}
