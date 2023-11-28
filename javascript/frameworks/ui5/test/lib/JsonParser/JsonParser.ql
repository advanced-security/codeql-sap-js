import javascript
import advanced_security.javascript.frameworks.ui5.JsonParser

string getStringLiteral() {
    result = any(StringLiteral l).getValue()
}

module StringLiteralJsonParser  = JsonParser<getStringLiteral/0>;

from StringLiteralJsonParser::JsonValue val, StringLiteral lit
where val = StringLiteralJsonParser::parse(lit.getValue())
select lit, val, val.getType()