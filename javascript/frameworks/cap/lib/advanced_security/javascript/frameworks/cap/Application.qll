/**
 * Definitions pertaining to the application as a whole.
 */

import javascript
import advanced_security.javascript.frameworks.cap.PackageJson

class RootDirectory extends Folder {
  RootDirectory() {
    exists(PackageJson packageJson | this = packageJson.getJsonFile().getParentContainer())
  }

  /**
   * Gets the path of a file relative to this root directory.
   *
   * Note: We normalize path separators for cross-platform compatibility.
   * On Windows, getAbsolutePath() returns backslashes, so we convert them
   * to forward slashes before processing.
   */
  string getFilePathRelativeToRoot(File file) {
    result =
      file.getAbsolutePath()
          .regexpReplaceAll("\\\\", "/")
          .regexpReplaceAll(this.getAbsolutePath().regexpReplaceAll("\\\\", "/"), ".") and
    result.charAt(0) = "."
  }

  /**
   * Holds if this root directory of the application contains the given file.
   */
  predicate contains(File file) { exists(this.getFilePathRelativeToRoot(file)) }
}
