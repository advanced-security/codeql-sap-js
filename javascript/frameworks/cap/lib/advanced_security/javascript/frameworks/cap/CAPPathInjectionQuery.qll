/**
 * Exported functions from CAP `cds.utils`.
 * Functions described from:
 * https://www.npmjs.com/package/@sap/cds?activeTab=code
 */

import javascript
import advanced_security.javascript.frameworks.cap.CDSUtils

abstract class UtilsSink extends DataFlow::Node { }

abstract class UtilsExtraFlow extends DataFlow::Node { }

/**
 * This represents the data in calls as follows:
 * ```javascript
 * await write ({foo:'bar'}) .to ('some','file.json')
 * ```
 * sinks in this example are:
 * ```javascript
 * {foo:'bar'}
 * ```
 */
class WrittenData extends UtilsSink {
  WrittenData() { exists(FileWriters fw | fw.getData() = this) }
}

/**
 * This represents the filepath in calls as follows:
 * ```javascript
 * await write ({foo:'bar'}) .to ('some','file.json')
 * ```
 * sinks in this example are:
 * ```javascript
 * 'some'
 * 'file.json'
 * ```
 */
class WrittenPath extends UtilsSink {
  WrittenPath() {
    exists(FileReaders fw | fw.getPath() = this)
    or
    exists(FileReaderWriters fw | fw.getPath() = this)
    or
    exists(FileWriters fw | fw.getPath() = this)
    or
    exists(DirectoryWriters dw | dw.getPath() = this)
    or
    exists(DirectoryReaders dr | dr.getPath() = this)
  }
}

/**
 * This represents calls where the taint flows through the call. e.g.
 * ```javascript
 * let dir = isdir ('app')
 * ```
 */
class AdditionalFlowStep extends UtilsExtraFlow {
  AdditionalFlowStep() {
    exists(PathConverters pc | pc.getPath() = this)
    or
    exists(PathPredicates pr | pr.getPath() = this)
  }

  DataFlow::CallNode getOutgoingNode() { result = this }

  DataFlow::Node getIngoingNode() { result = this.(DataFlow::CallNode).getAnArgument() }
}
