/**
 * Exported functions from CAP `cds.utils`.
 * Functions described from:
 * https://www.npmjs.com/package/@sap/cds?activeTab=code
 */

import javascript
import advanced_security.javascript.frameworks.cap.CDSUtils

abstract class UtilsSink extends DataFlow::Node {
  abstract string sinkType();
}

abstract class UtilsAccessedPathSink extends UtilsSink {
  override string sinkType() { result = "unrestricted file read" }
}

abstract class UtilsControlledDataSink extends UtilsSink {
  override string sinkType() { result = "tainted data being written to a file" }
}

abstract class UtilsControlledPathSink extends UtilsSink {
  override string sinkType() { result = "unrestricted file operations" }
}

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
class WrittenData extends UtilsControlledDataSink {
  WrittenData() { exists(FileWriters fw | fw.getData() = this) }
}

/**
 * This represents the filepath accessed as an input for the data in calls as follows:
 * ```javascript
 * await copy('db/data').to('dist/db/data')
 * ```
 * sinks in this example are:
 * ```javascript
 * 'db/data'
 * ```
 */
class AccessedPath extends UtilsAccessedPathSink {
  AccessedPath() { exists(FileReaderWriters fw | fw.getFromPath() = this) }
}

/**
 * This represents the filepath where data is written or a file operation is performed in calls as follows:
 * ```javascript
 * await write ({foo:'bar'}) .to ('some','file.json')
 * ```
 * sinks in this example are:
 * ```javascript
 * 'some'
 * 'file.json'
 * ```
 */
class ControlledInputPath extends UtilsControlledPathSink {
  ControlledInputPath() {
    exists(FileReaders fw | fw.getPath() = this)
    or
    exists(FileReaderWriters fw | fw.getToPath() = this)
    or
    exists(FileWriters fw | fw.getPath() = this)
    or
    exists(DirectoryWriters dw | dw.getPath() = this)
    or
    exists(DirectoryReaders dr | dr.getPath() = this)
  }
}
