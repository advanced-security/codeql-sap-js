import javascript
import advanced_security.javascript.frameworks.ui5.dataflow.DataFlow

/**
 * Call to [`sap.ui.util.Storage.put`](https://sapui5.hana.ondemand.com/sdk/#/api/module:sap/ui/util/Storage%23methods/put)
 *  or its jQuery counterpart, [`jQuery.sap.Storage.put`](https://sapui5.hana.ondemand.com/sdk/#/api/jQuery.sap.storage%23methods/jQuery.sap.storage.put).
 */
private class StoragePutCall extends CallNode {
  StoragePutCall() {
    /* 1. This is a call to `sap.ui.util.Storage.put` */
    /* 1-1. Required from `sap/ui/util/Storage` */
    exists(RequiredObject storageClass |
      this.getReceiver().getALocalSource() = storageClass.asSourceNode() and
      this.getCalleeName() = "put"
    )
    or
    /* 1-2. Direct call to `sap.ui.util.Storage.put` */
    this =
      globalVarRef("sap")
          .getAPropertyRead("ui")
          .getAPropertyRead("util")
          .getAPropertyRead("Storage")
          .getAMemberCall("put")
    or
    /* 2. This is a call to `jQuery.sap.storage.put` */
    this =
      globalVarRef("jQuery")
          .getAPropertyRead("sap")
          .getAPropertyRead("storage")
          .getAMemberCall("put")
  }

  string getKeyName() {
    result = this.getArgument(0).getALocalSource().asExpr().(StringLiteral).getValue()
  }

  string getContentToBeSaved() {
    result = this.getArgument(1).getALocalSource().asExpr().(StringLiteral).getValue()
  }
}

/**
 * Call to [`sap.ui.core.util.File.save`](https://sapui5.hana.ondemand.com/sdk/#/api/sap.ui.core.util.File%23methods/sap.ui.core.util.File.save).
 */
private class FileSaveCall extends CallNode {
  FileSaveCall() {
    /* 1. Required from `sap/ui/core/util/File` */
    exists(RequiredObject fileClass |
      this.getReceiver().getALocalSource() = fileClass.asSourceNode() and
      this.getCalleeName() = "save"
    )
    or
    /* 2. Direct call to `sap.ui.core.util.File.save` */
    this =
      globalVarRef("sap")
          .getAPropertyRead("ui")
          .getAPropertyRead("core")
          .getAPropertyRead("util")
          .getAPropertyRead("File")
          .getAMemberCall("save")
  }

  /**
   * Gets the MIME type the file will saved under.
   */
  string getMimeType() {
    result = this.getArgument(3).getALocalSource().asExpr().(StringLiteral).getValue()
  }

  /**
   * Gets the file extension to be attached to the filename.
   */
  string getExtension() {
    result = this.getArgument(2).getALocalSource().asExpr().(StringLiteral).getValue()
  }

  /**
   * Holds if the file MIME type is `"text/csv"`.
   */
  predicate mimeTypeIsCsv() { this.getMimeType() = "text/csv" }

  /**
   * Holds if the file MIME type is `"application/json"`.
   */
  predicate mimeTypeIsJson() { this.getMimeType() = "application/json" }

  /**
   * Holds if the file extension is `"csv"`. It can be used as a fallback
   * to detect a CSV data being written if `this.mimeTypeIsCsv()` fails.
   */
  predicate extensionIsCsv() { this.getExtension() = "csv" }

  /**
   * Holds if the file extension is `"json"`. It can be used as a fallback
   * to detect a JSON data being written if `this.mimeTypeIsJson()` fails.
   */
  predicate extensionIsJson() { this.getExtension() = "json" }

  /**
   * Gets the content object to be saved into the file.
   */
  DataFlow::Node getContentToBeSaved() { result = this.getArgument(0) }

  /**
   * Gets the path the file will be saved under.
   */
  string getPathToBeSavedUnder() {
    result = this.getArgument(1).getALocalSource().asExpr().(StringLiteral).getValue()
  }
}

module UI5FormulaInjection implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node node) { node instanceof RemoteFlowSource }

  predicate isSink(DataFlow::Node node) {
    exists(StoragePutCall storagePutCall | node = storagePutCall.getArgument(1))
    or
    exists(FileSaveCall fileSaveCall |
      node = fileSaveCall.getArgument(0) and
      (
        /* 1. Primary check: match on the MIME type */
        fileSaveCall.mimeTypeIsCsv() or
        fileSaveCall.mimeTypeIsJson() or
        /* 2. Fallback check: match on the file extension */
        fileSaveCall.extensionIsCsv() or
        fileSaveCall.extensionIsJson()
      )
    )
  }
}
