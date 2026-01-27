import javascript
import advanced_security.javascript.frameworks.ui5.JsonParser

module MakeStringLiteralJsonReader implements JsonParser::MakeJsonReaderSig<StringLiteral> {
  class JsonReader extends StringLiteral {
    string getJson() { result = this.getValue() }
  }
}

module StringLiteralJsonParser = JsonParser::Make<StringLiteral, MakeStringLiteralJsonReader>;

from StringLiteralJsonParser::JsonValue val, MakeStringLiteralJsonReader::JsonReader reader
where val = StringLiteralJsonParser::parse(reader)
select reader, val, val.getType()
