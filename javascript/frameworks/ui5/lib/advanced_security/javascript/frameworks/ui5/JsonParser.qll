signature string getJsonSig();

/**
 * A naive Json parser without error recovery.
 */
module JsonParser<getJsonSig/0 getJson> {
  private newtype TJsonToken =
    MkLeftBracketToken(int begin, int end, string value, string source) {
      source = getJson() and
      begin = source.indexOf("{") and
      begin = end and
      value = "{"
    } or
    MkRightBracketToken(int begin, int end, string value, string source) {
      source = getJson() and
      begin = source.indexOf("}") and
      begin = end and
      value = "}"
    } or
    MkLeftSquareBracketToken(int begin, int end, string value, string source) {
      source = getJson() and
      begin = source.indexOf("[") and
      begin = end and
      value = "["
    } or
    MkRightSquareBracketToken(int begin, int end, string value, string source) {
      source = getJson() and
      begin = source.indexOf("]") and
      begin = end and
      value = "]"
    } or
    MkWhiteSpaceToken(int begin, int end, string value, string source) {
      source = getJson() and
      value = source.regexpFind("[\\s\\v\\h]", _, begin) and
      begin + value.length() - 1 = end
    } or
    MkCommaToken(int begin, int end, string value, string source) {
      source = getJson() and
      begin = source.indexOf(",") and
      begin = end and
      value = ","
    } or
    MkColonToken(int begin, int end, string value, string source) {
      source = getJson() and
      begin = source.indexOf(":") and
      begin = end and
      value = ":"
    } or
    MkNumberToken(int begin, int end, string value, string source) {
      source = getJson() and
      value = source.regexpFind("-?[1-9]\\d*(\\.\\d+)?((e|E)?(\\+|-)?\\d+)?", _, begin) and
      begin + value.length() - 1 = end
    } or
    MkStringToken(int begin, int end, string value, string source) {
      source = getJson() and
      exists(string literal |
        literal = source.regexpFind("(?s)\".*?(?<!\\\\)\"", _, begin) and
        // The string without surrounding quotes.
        value = literal.substring(1, literal.length() - 1) and
        begin + literal.length() - 1 = end
      )
    } or
    MkTrueToken(int begin, int end, string value, string source) {
      source = getJson() and
      value = source.regexpFind("true", _, begin) and
      begin + value.length() - 1 = end
    } or
    MkFalseToken(int begin, int end, string value, string source) {
      source = getJson() and
      value = source.regexpFind("false", _, begin) and
      begin + value.length() - 1 = end
    } or
    MkNullToken(int begin, int end, string value, string source) {
      source = getJson() and
      value = source.regexpFind("null", _, begin) and
      begin + value.length() - 1 = end
    }

  private class JsonToken extends TJsonToken {
    int getBegin() {
      this = MkLeftBracketToken(result, _, _, _)
      or
      this = MkRightBracketToken(result, _, _, _)
      or
      this = MkLeftSquareBracketToken(result, _, _, _)
      or
      this = MkRightSquareBracketToken(result, _, _, _)
      or
      this = MkWhiteSpaceToken(result, _, _, _)
      or
      this = MkCommaToken(result, _, _, _)
      or
      this = MkColonToken(result, _, _, _)
      or
      this = MkNumberToken(result, _, _, _)
      or
      this = MkStringToken(result, _, _, _)
      or
      this = MkTrueToken(result, _, _, _)
      or
      this = MkFalseToken(result, _, _, _)
      or
      this = MkNullToken(result, _, _, _)
    }

    int getEnd() {
      this = MkLeftBracketToken(_, result, _, _)
      or
      this = MkRightBracketToken(_, result, _, _)
      or
      this = MkLeftSquareBracketToken(_, result, _, _)
      or
      this = MkRightSquareBracketToken(_, result, _, _)
      or
      this = MkWhiteSpaceToken(_, result, _, _)
      or
      this = MkCommaToken(_, result, _, _)
      or
      this = MkColonToken(_, result, _, _)
      or
      this = MkNumberToken(_, result, _, _)
      or
      this = MkStringToken(_, result, _, _)
      or
      this = MkTrueToken(_, result, _, _)
      or
      this = MkFalseToken(_, result, _, _)
      or
      this = MkNullToken(_, result, _, _)
    }

    string getValue() {
      this = MkLeftBracketToken(_, _, result, _)
      or
      this = MkRightBracketToken(_, _, result, _)
      or
      this = MkLeftSquareBracketToken(_, _, result, _)
      or
      this = MkRightSquareBracketToken(_, _, result, _)
      or
      this = MkWhiteSpaceToken(_, _, result, _)
      or
      this = MkCommaToken(_, _, result, _)
      or
      this = MkColonToken(_, _, result, _)
      or
      this = MkNumberToken(_, _, result, _)
      or
      this = MkStringToken(_, _, result, _)
      or
      this = MkTrueToken(_, _, result, _)
      or
      this = MkFalseToken(_, _, result, _)
      or
      this = MkNullToken(_, _, result, _)
    }

    string toString() {
      this = MkLeftBracketToken(_, _, _, _) and result = "leftbracket"
      or
      this = MkRightBracketToken(_, _, _, _) and result = "rightbracket"
      or
      this = MkLeftSquareBracketToken(_, _, _, _) and result = "leftsquarebracket"
      or
      this = MkRightSquareBracketToken(_, _, _, _) and result = "rightsquarebracket"
      or
      this = MkWhiteSpaceToken(_, _, _, _) and result = "whitespace"
      or
      this = MkCommaToken(_, _, _, _) and result = "comma"
      or
      this = MkColonToken(_, _, _, _) and result = "colon"
      or
      exists(string val | this = MkNumberToken(_, _, val, _) and result = "integer=" + val)
      or
      exists(string val | this = MkStringToken(_, _, val, _) and result = "string=" + val)
      or
      this = MkTrueToken(_, _, _, _) and result = "true"
      or
      this = MkFalseToken(_, _, _, _) and result = "false"
      or
      this = MkNullToken(_, _, _, _) and result = "null"
    }

    string getSource() {
      this = MkLeftBracketToken(_, _, _, result)
      or
      this = MkRightBracketToken(_, _, _, result)
      or
      this = MkLeftSquareBracketToken(_, _, _, result)
      or
      this = MkRightSquareBracketToken(_, _, _, result)
      or
      this = MkWhiteSpaceToken(_, _, _, result)
      or
      this = MkCommaToken(_, _, _, result)
      or
      this = MkColonToken(_, _, _, result)
      or
      this = MkNumberToken(_, _, _, result)
      or
      this = MkStringToken(_, _, _, result)
      or
      this = MkTrueToken(_, _, _, result)
      or
      this = MkFalseToken(_, _, _, result)
      or
      this = MkNullToken(_, _, _, result)
    }

    JsonToken getNext() {
      result.getBegin() = this.getEnd() + 1 and
      result.getSource() = this.getSource()
    }

    predicate isFirst() {
      not exists(JsonToken other |
        other.getBegin() < this.getBegin() and other.getSource() = this.getSource()
      )
    }
  }

  private class WhiteSpaceToken extends JsonToken, MkWhiteSpaceToken { }

  private class CommaToken extends JsonToken, MkCommaToken { }

  private class ColonToken extends JsonToken, MkColonToken { }

  private class LeftBracketToken extends JsonToken, MkLeftBracketToken { }

  private class RightBracketToken extends JsonToken, MkRightBracketToken { }

  private class LeftSquareBracketToken extends JsonToken, MkLeftSquareBracketToken { }

  private class RightSquareBracketToken extends JsonToken, MkRightSquareBracketToken { }

  private class StringToken extends JsonToken, MkStringToken {
    predicate contains(JsonToken t) {
      this.getSource() = t.getSource() and
      this.getBegin() < t.getBegin() and
      this.getEnd() > t.getEnd()
    }
  }

  private class NumberToken extends JsonToken, MkNumberToken { }

  private class TrueToken extends JsonToken, MkTrueToken { }

  private class FalseToken extends JsonToken, MkFalseToken { }

  private class NullToken extends JsonToken, MkNullToken { }

  private JsonToken getNextSkippingWhitespace(JsonToken t) {
    result = t.getNext() and
    not result instanceof WhiteSpaceToken
    or
    exists(WhiteSpaceToken ws | ws = t.getNext() | result = getNextSkippingWhitespace(ws))
  }

  private newtype TJsonMemberList =
    EmptyMemberList() or
    ConsMemberList(JsonMember head, JsonMemberList tail) {
      exists(JsonToken first, JsonToken last |
        mkJsonMember(first, head, last) and
        if getNextSkippingWhitespace(last) instanceof CommaToken
        then mkJsonMembers(getNextSkippingWhitespace(getNextSkippingWhitespace(last)), tail, _)
        else tail = EmptyMemberList()
      )
    }

  private JsonMember nthMember(JsonMemberList list, int index) {
    exists(JsonMember h | list = ConsMemberList(h, _) | index = 0 and result = h)
    or
    exists(JsonMemberList t | list = ConsMemberList(_, t) |
      index > 0 and result = nthMember(t, index - 1)
    )
  }

  class JsonMemberList extends TJsonMemberList {
    string toString() {
      this = EmptyMemberList() and result = "{}"
      or
      exists(JsonMember head, JsonMemberList tail, string tailStr |
        this = ConsMemberList(head, tail) and
        "{" + tailStr + "}" = tail.toString() and
        if tailStr != ""
        then result = "{" + head.toString() + ", " + tailStr + "}"
        else result = "{" + head.toString() + "}"
      )
    }

    JsonMember getMember(int index) { result = nthMember(this, index) }

    JsonMember getAMember() { result = getMember(_) }
  }

  private newtype TJsonMember =
    MkJsonMember(string key, JsonValue value) {
      exists(StringToken keyToken, ColonToken colonToken, JsonToken firstValueToken |
        colonToken = getNextSkippingWhitespace(keyToken) and
        firstValueToken = getNextSkippingWhitespace(colonToken) and
        key = keyToken.(JsonToken).getValue() and
        mkJsonValue(firstValueToken, value, _)
      )
    }

  class JsonMember extends TJsonMember {
    string toString() {
      exists(string key, JsonValue value |
        this = MkJsonMember(key, value) and
        result = key + " : " + value.toString()
      )
    }

    string getKey() { this = MkJsonMember(result, _) }

    JsonValue getValue() { this = MkJsonMember(_, result) }
  }

  private predicate mkJsonMember(StringToken first, JsonMember member, JsonToken last) {
    getNextSkippingWhitespace(first) instanceof ColonToken and
    exists(JsonValue value |
      mkJsonValue(getNextSkippingWhitespace(getNextSkippingWhitespace(first)), value, last) and
      member = MkJsonMember(first.getValue(), value)
    )
  }

  private predicate mkJsonMembers(JsonToken first, JsonMemberList members, JsonToken last) {
    exists(JsonMember h, JsonToken memberLast | mkJsonMember(first, h, memberLast) |
      not getNextSkippingWhitespace(memberLast) instanceof CommaToken and
      members = ConsMemberList(h, EmptyMemberList()) and
      last = memberLast
    )
    or
    exists(JsonMember h, JsonToken memberLast, JsonMemberList tail |
      mkJsonMember(first, h, memberLast)
    |
      getNextSkippingWhitespace(memberLast) instanceof CommaToken and
      mkJsonMembers(getNextSkippingWhitespace(getNextSkippingWhitespace(memberLast)), tail, last) and
      members = ConsMemberList(h, tail)
    )
  }

  private newtype TJsonValueList =
    EmptyJsonValueList() or
    ConsJsonValueList(JsonValue head, JsonValueList tail) {
      exists(JsonToken first, JsonToken last |
        mkJsonValue(first, head, last) and
        if getNextSkippingWhitespace(last) instanceof CommaToken
        then mkJsonValues(getNextSkippingWhitespace(getNextSkippingWhitespace(last)), tail, _)
        else tail = EmptyJsonValueList()
      )
    }

  private predicate mkJsonValues(JsonToken first, JsonValueList values, JsonToken last) {
    exists(JsonValue h, JsonToken valueLast | mkJsonValue(first, h, valueLast) |
      not getNextSkippingWhitespace(valueLast) instanceof CommaToken and
      values = ConsJsonValueList(h, EmptyJsonValueList()) and
      last = valueLast
    )
    or
    exists(JsonValue h, JsonToken valueLast, JsonValueList tail | mkJsonValue(first, h, valueLast) |
      getNextSkippingWhitespace(valueLast) instanceof CommaToken and
      mkJsonValues(getNextSkippingWhitespace(getNextSkippingWhitespace(valueLast)), tail, last) and
      values = ConsJsonValueList(h, tail)
    )
  }

  private JsonValue getNthValue(JsonValueList list, int index) {
    exists(JsonValue h | list = ConsJsonValueList(h, _) | index = 0 and result = h)
    or
    exists(JsonValueList t | list = ConsJsonValueList(_, t) |
      index > 0 and result = getNthValue(t, index - 1)
    )
  }

  class JsonValueList extends TJsonValueList {
    string toString() {
      this = EmptyJsonValueList() and result = "[]"
      or
      exists(JsonValue head, JsonValueList tail, string tailStr |
        this = ConsJsonValueList(head, tail) and
        "[" + tailStr + "]" = tail.toString() and
        if tailStr != ""
        then result = "[" + head.toString() + ", " + tailStr + "]"
        else result = "[" + head.toString() + "]"
      )
    }

    JsonValue getValue(int index) { result = getNthValue(this, index) }

    JsonValue getAValue() { result = getValue(_) }
  }

  private newtype TJsonValue =
    MkJsonNumber(float n, JsonToken source) {
      exists(NumberToken t | t.getValue().toFloat() = n and source = t |
        not any(StringToken str).contains(t)
      )
    } or
    MkJsonString(string s, JsonToken source) {
      exists(StringToken t | t.(JsonToken).getValue() = s and t = source)
    } or
    MkJsonObject(JsonMemberList members, JsonToken source) {
      exists(LeftBracketToken l, RightBracketToken r, JsonToken last |
        mkJsonMembers(getNextSkippingWhitespace(l), members, last) and
        getNextSkippingWhitespace(last) = r and
        source = l
      )
      or
      exists(LeftBracketToken l, RightBracketToken r | getNextSkippingWhitespace(l) = r |
        members = EmptyMemberList() and source = l
      )
    } or
    MkJsonArray(JsonValueList values, JsonToken source) {
      exists(LeftSquareBracketToken l, RightSquareBracketToken r, JsonToken last |
        mkJsonValues(getNextSkippingWhitespace(l), values, last) and
        getNextSkippingWhitespace(last) = r and
        source = l
      )
      or
      exists(LeftSquareBracketToken l, RightSquareBracketToken r |
        getNextSkippingWhitespace(l) = r
      |
        values = EmptyJsonValueList() and source = l
      )
    } or
    MkJsonTrue(JsonToken source) {
      exists(TrueToken t | not any(StringToken str).contains(t) and source = t)
    } or
    MkJsonFalse(JsonToken source) {
      exists(FalseToken t | not any(StringToken str).contains(t) and source = t)
    } or
    MkJsonNull(JsonToken source) {
      exists(NullToken t | not any(StringToken str).contains(t) and source = t)
    }

  private predicate mkJsonValue(JsonToken first, JsonValue value, JsonToken last) {
    first instanceof StringToken and
    first = last and
    value = MkJsonString(first.getValue(), first)
    or
    first instanceof NumberToken and
    first = last and
    value = MkJsonNumber(first.getValue().toFloat(), first)
    or
    first instanceof LeftBracketToken and
    (
      exists(JsonMemberList members, JsonToken membersLast |
        mkJsonMembers(getNextSkippingWhitespace(first), members, membersLast) and
        value = MkJsonObject(members, first) and
        last = getNextSkippingWhitespace(membersLast)
      )
      or
      last = getNextSkippingWhitespace(first) and
      value = MkJsonObject(EmptyMemberList(), first)
    ) and
    last instanceof RightBracketToken
    or
    first instanceof LeftSquareBracketToken and
    (
      exists(JsonValueList values, JsonToken valuesLast |
        mkJsonValues(getNextSkippingWhitespace(first), values, valuesLast) and
        value = MkJsonArray(values, first) and
        last = getNextSkippingWhitespace(valuesLast)
      )
      or
      last = getNextSkippingWhitespace(first) and
      value = MkJsonArray(EmptyJsonValueList(), first)
    ) and
    last instanceof RightSquareBracketToken
    or
    first instanceof TrueToken and
    first = last and
    value = MkJsonTrue(first)
    or
    first instanceof FalseToken and
    first = last and
    value = MkJsonFalse(first)
    or
    first instanceof NullToken and
    first = last and
    value = MkJsonNull(first)
  }

  class JsonValue extends TJsonValue {
    string toString() {
      exists(string value |
        this = MkJsonString(value, _) and
        result = "\"" + value + "\""
      )
      or
      exists(float number | this = MkJsonNumber(number, _) | result = number.toString())
      or
      exists(JsonMemberList members | this = MkJsonObject(members, _) | result = members.toString())
      or
      exists(JsonValueList values | this = MkJsonArray(values, _) | result = values.toString())
      or
      this = MkJsonTrue(_) and result = "true"
      or
      this = MkJsonFalse(_) and result = "false"
      or
      this = MkJsonNull(_) and result = "null"
    }

    string getSource() {
      exists(JsonToken token |
        this = MkJsonString(_, token)
        or
        this = MkJsonNumber(_, token)
        or
        this = MkJsonObject(_, token)
        or
        this = MkJsonArray(_, token)
        or
        this = MkJsonTrue(token)
        or
        this = MkJsonFalse(token)
        or
        this = MkJsonNull(token)
      |
        result = token.getSource()
      )
    }

    string getType() {
      this = MkJsonString(_, _) and result = "string"
      or
      this = MkJsonNumber(_, _) and result = "number"
      or
      this = MkJsonObject(_, _) and result = "object"
      or
      this = MkJsonArray(_, _) and result = "array"
      or
      this = MkJsonTrue(_) and result = "true"
      or
      this = MkJsonFalse(_) and result = "false"
      or
      this = MkJsonNull(_) and result = "null"
    }

    string asString() { this = MkJsonString(result, _) }
  }

  class JsonObject extends JsonValue, MkJsonObject {
    JsonMemberList getMembers() { this = MkJsonObject(result, _) }

    JsonMember getMember(int index) { result = getMembers().getMember(index) }

    JsonMember getAMember() { result = getMember(_) }
  }

  class JsonString extends JsonValue, MkJsonString { }

  class JsonNumber extends JsonValue, MkJsonNumber { }

  class JsonArray extends JsonValue, MkJsonArray {
    JsonValueList getValues() { this = MkJsonArray(result, _) }

    JsonValue getValue(int index) { result = getValues().getValue(index) }

    JsonValue getAValue() { result = getValue(_) }
  }

  JsonValue parse(string json) {
    result.getSource() = json and
    exists(JsonToken firstToken |
      firstToken.isFirst() and
      if firstToken instanceof WhiteSpaceToken
      then mkJsonValue(getNextSkippingWhitespace(firstToken), result, _)
      else mkJsonValue(firstToken, result, _)
    )
  }
}
