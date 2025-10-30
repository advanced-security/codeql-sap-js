import javascript
import advanced_security.javascript.frameworks.cap.CDS

/**
 * An access to the `utils` module on a CDS facade.
 */
class CdsUtilsModuleAccess extends API::Node {
  CdsUtilsModuleAccess() { exists(CdsFacade cds | this = cds.getMember("utils")) }
}

/**
 * CDS Utils:
 * `decodeURI`, `decodeURIComponent`, `local`
 */
class PathConverters extends DataFlow::CallNode {
  PathConverters() {
    exists(CdsUtilsModuleAccess utils |
      utils.getMember(["decodeURI", "decodeURIComponent", "local"]).getACall() = this
    )
  }

  /**
   * Gets the arguments to these calls.
   */
  DataFlow::Node getPath() { this.getAnArgument() = result }
}

/**
 * CDS Utils:
 * `isdir`, `isfile`
 */
class PathPredicates extends DataFlow::CallNode {
  PathPredicates() {
    exists(CdsUtilsModuleAccess utils | utils.getMember(["isdir", "isfile"]).getACall() = this)
  }

  /**
   * Gets the arguments to these calls.
   */
  DataFlow::Node getPath() { this.getAnArgument() = result }
}

/**
 * CDS Utils:
 * `find`, `stat`, `readdir`
 */
class DirectoryReaders extends DataFlow::CallNode {
  DirectoryReaders() {
    exists(CdsUtilsModuleAccess utils |
      utils.getMember(["find", "stat", "readdir"]).getACall() = this
    )
  }

  /**
   * Gets the arguments to these calls.
   */
  DataFlow::Node getPath() { this.getAnArgument() = result }
}

/**
 * CDS Utils:
 * `mkdirp`, `rmdir`, `rimraf`, `rm`
 */
class DirectoryWriters extends DataFlow::CallNode {
  DirectoryWriters() {
    exists(CdsUtilsModuleAccess utils |
      utils.getMember(["mkdirp", "rmdir", "rimraf", "rm"]).getACall() = this
    )
  }

  /**
   * Gets the arguments to these calls.
   */
  DataFlow::Node getPath() { this.getAnArgument() = result }
}

/**
 * CDS Utils:
 * `read`
 */
class FileReaders extends DataFlow::CallNode {
  FileReaders() { exists(CdsUtilsModuleAccess utils | utils.getMember(["read"]).getACall() = this) }

  /**
   * Gets the 0th argument to these calls.
   */
  DataFlow::Node getPath() { this.getArgument(0) = result }
}

/**
 * CDS Utils:
 * `append`, `write`
 */
class FileWriters extends DataFlow::CallNode {
  FileWriters() {
    exists(CdsUtilsModuleAccess utils | utils.getMember(["append", "write"]).getACall() = this)
  }

  /**
   * Gets the arguments to these calls that represent data.
   */
  DataFlow::Node getData() {
    this.getNumArgument() = 1 and
    this.getArgument(0) = result
    or
    this.getNumArgument() = 2 and
    this.getArgument(1) = result
  }

  /**
   * Gets the arguments to these calls that represent a path.
   * Includes arguments to chained calls `to`, where that argument also represents a path.
   */
  DataFlow::Node getPath() {
    this.getAMemberCall("to").getAnArgument() = result
    or
    this.getNumArgument() = 2 and
    this.getArgument(0) = result
  }
}

/**
 * CDS Utils:
 * `copy`
 */
class FileReaderWriters extends DataFlow::CallNode {
  FileReaderWriters() {
    exists(CdsUtilsModuleAccess utils | utils.getMember(["copy"]).getACall() = this)
  }

  /**
   * Gets the arguments to these calls that represent a path from which data is read.
   */
  DataFlow::Node getFromPath() { this.getArgument(0) = result }

  /**
   * Gets the arguments to these calls that represent a path to which data is written.
   * Includes arguments to chained calls `to`, where that argument also represents a path.
   */
  DataFlow::Node getToPath() {
    this.getAMemberCall("to").getArgument(_) = result
    or
    this.getArgument(1) = result
  }
}
