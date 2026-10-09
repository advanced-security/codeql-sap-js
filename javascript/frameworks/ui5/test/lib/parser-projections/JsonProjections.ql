/**
 * @name JSON parser projection regression test
 * @description Preserves reader identity, overlapping quoted tokens, and existing input acceptance.
 * @kind table
 * @id test/ui5-json-parser-projections
 * @tags test
 */

import advanced_security.javascript.frameworks.ui5.JsonParser
import javascript

class Reader extends StringLiteral {
  CallExpr call;

  Reader() {
    call.getCalleeName() = "jsonCase" and
    this = call.getArgument(1)
  }

  string getLabel() { result = call.getArgument(0).getStringValue() }
}

module ReaderModel implements JsonParser::MakeJsonReaderSig<Reader> {
  class JsonReader extends Reader {
    string getJson() { result = this.getValue() }
  }
}

module Parser = JsonParser::Make<Reader, ReaderModel>;

from ReaderModel::JsonReader reader, string parsed, string kind
where
  (
    if exists(Parser::parse(reader))
    then
      exists(Parser::JsonValue value | value = Parser::parse(reader) |
        parsed = value.toString() and kind = value.getType() and value.getReader() = reader
      )
    else (
      parsed = "<unparsed>" and kind = "none"
    )
  )
select reader.getLabel(), parsed, kind
