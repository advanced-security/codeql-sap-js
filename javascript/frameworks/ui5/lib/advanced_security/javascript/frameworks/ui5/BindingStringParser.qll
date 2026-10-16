import javascript as stdlib

signature class BindingStringReaderSig {
  string getBindingString();

  stdlib::Location getLocation();

  // Get a dataflow node associated with the binding string, if any.
  // Note that not all location from which we can obtain a binding string
  // also have an associated data flow node. For example, as of writing
  // XML attributes.
  stdlib::DataFlow::Node getANode();
}

/**
 * A UI5 binding path parser.
 */
module BindingStringParser<BindingStringReaderSig BindingStringReader> {
  private newtype TToken =
    MkLeftBracketToken(int begin, int end, string value, BindingStringReader reader) {
      begin = reader.getBindingString().indexOf("{") and
      begin = end and
      value = "{"
    } or
    MkRightBracketToken(int begin, int end, string value, BindingStringReader reader) {
      begin = reader.getBindingString().indexOf("}") and
      begin = end and
      value = "}"
    } or
    MkLeftSquareBracketToken(int begin, int end, string value, BindingStringReader reader) {
      begin = reader.getBindingString().indexOf("[") and
      begin = end and
      value = "["
    } or
    MkRightSquareBracketToken(int begin, int end, string value, BindingStringReader reader) {
      begin = reader.getBindingString().indexOf("]") and
      begin = end and
      value = "]"
    } or
    MkWhiteSpaceToken(int begin, int end, string value, BindingStringReader reader) {
      value = reader.getBindingString().regexpFind("[\\s\\v\\h]", _, begin) and
      begin + value.length() - 1 = end
    } or
    MkCommaToken(int begin, int end, string value, BindingStringReader reader) {
      begin = reader.getBindingString().indexOf(",") and
      begin = end and
      value = ","
    } or
    MkColonToken(int begin, int end, string value, BindingStringReader reader) {
      begin = reader.getBindingString().indexOf(":") and
      begin = end and
      value = ":"
    } or
    MkNumberToken(int begin, int end, string value, BindingStringReader reader) {
      value =
        reader.getBindingString().regexpFind("-?[1-9]\\d*(\\.\\d+)?((e|E)?(\\+|-)?\\d+)?", _, begin) and
      begin + value.length() - 1 = end
    } or
    MkStringToken(int begin, int end, string value, BindingStringReader reader) {
      exists(string str |
        (
          // double quoted string
          str = reader.getBindingString().regexpFind("(?s)\".*?(?<!\\\\)\"", _, begin)
          or
          // single quoted string
          str = reader.getBindingString().regexpFind("(?s)'.*?(?<!\\\\)'", _, begin)
        ) and
        // The string without surrounding quotes.
        value = str.substring(1, str.length() - 1) and
        begin + str.length() - 1 = end
      )
    } or
    MkTrueToken(int begin, int end, string value, BindingStringReader reader) {
      begin = reader.getBindingString().indexOf("true") and
      value = "true" and
      begin + value.length() - 1 = end
    } or
    MkFalseToken(int begin, int end, string value, BindingStringReader reader) {
      begin = reader.getBindingString().indexOf("false") and
      value = "false" and
      begin + value.length() - 1 = end
    } or
    MkNullToken(int begin, int end, string value, BindingStringReader reader) {
      begin = reader.getBindingString().indexOf("null") and
      value = "null" and
      begin + value.length() - 1 = end
    } or
    MkNameToken(int begin, int end, string value, BindingStringReader reader) {
      // combine syntax from json binding paths, property bindings paths, xml binding paths and OData binding paths
      // Examples from https://sapui5.hana.ondemand.com/sdk/#/topic/f5aa4bb75c20445194494b264d3b3cd2
      // "{/#Company/CompanyName/@sap:label}"
      // "{City/#@sap:label}"
      // https://sapui5.hana.ondemand.com/sdk/#/topic/54e0ddf695af4a6c978472cecb01c64d.html
      // /SalesOrderList('0500000000')
      value =
        reader
            .getBindingString()
            .regexpFind("(?:#|#@)?(?:[a-zA-Z][a-zA-Z0-9_]*|[a-zA-Z0-9][a-zA-Z0-9_]:[a-zA-Z0-9_]+)(?:\\([^\\)]*\\))?",
              _, begin) and
      begin + value.length() - 1 = end and
      // exclude keyword
      not value in ["true", "false", "null"]
    } or
    MkGreaterThanToken(int begin, int end, string value, BindingStringReader reader) {
      begin = reader.getBindingString().indexOf(">") and
      value = ">" and
      begin + value.length() - 1 = end
    } or
    MkDot(int begin, int end, string value, BindingStringReader reader) {
      begin = reader.getBindingString().indexOf(".") and
      value = "." and
      begin + value.length() - 1 = end
    } or
    MkForwardSlash(int begin, int end, string value, BindingStringReader reader) {
      begin = reader.getBindingString().indexOf("/") and
      value = "/" and
      begin + value.length() - 1 = end
    } or
    MkIdentToken(int begin, int end, string value, BindingStringReader reader) {
      value = reader.getBindingString().regexpFind("[a-zA-Z0-9_]+", _, begin) and
      begin + value.length() - 1 = end
    } or
    MkSingleQuoteToken(int begin, int end, string value, BindingStringReader reader) {
      begin = reader.getBindingString().indexOf("'") and
      value = "'" and
      begin + value.length() - 1 = end
    } or
    MkDoubleQuoteToken(int begin, int end, string value, BindingStringReader reader) {
      begin = reader.getBindingString().indexOf("\"") and
      value = "\"" and
      begin + value.length() - 1 = end
    }

  private class Token extends TToken {
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
      or
      this = MkNameToken(result, _, _, _)
      or
      this = MkGreaterThanToken(result, _, _, _)
      or
      this = MkDot(result, _, _, _)
      or
      this = MkForwardSlash(result, _, _, _)
      or
      this = MkIdentToken(result, _, _, _)
      or
      this = MkSingleQuoteToken(result, _, _, _)
      or
      this = MkDoubleQuoteToken(result, _, _, _)
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
      or
      this = MkNameToken(_, result, _, _)
      or
      this = MkGreaterThanToken(_, result, _, _)
      or
      this = MkDot(_, result, _, _)
      or
      this = MkForwardSlash(_, result, _, _)
      or
      this = MkIdentToken(_, result, _, _)
      or
      this = MkSingleQuoteToken(_, result, _, _)
      or
      this = MkDoubleQuoteToken(_, result, _, _)
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
      or
      this = MkNameToken(_, _, result, _)
      or
      this = MkGreaterThanToken(_, _, result, _)
      or
      this = MkDot(_, _, result, _)
      or
      this = MkForwardSlash(_, _, result, _)
      or
      this = MkIdentToken(_, _, result, _)
      or
      this = MkSingleQuoteToken(_, _, result, _)
      or
      this = MkDoubleQuoteToken(_, _, result, _)
    }

    string toString() {
      this = MkLeftBracketToken(_, _, _, _) and result = "{"
      or
      this = MkRightBracketToken(_, _, _, _) and result = "}"
      or
      this = MkLeftSquareBracketToken(_, _, _, _) and result = "["
      or
      this = MkRightSquareBracketToken(_, _, _, _) and result = "]"
      or
      this = MkWhiteSpaceToken(_, _, _, _) and result = " "
      or
      this = MkCommaToken(_, _, _, _) and result = ","
      or
      this = MkColonToken(_, _, _, _) and result = ":"
      or
      exists(string val | this = MkNumberToken(_, _, val, _) and result = val)
      or
      exists(string val | this = MkStringToken(_, _, val, _) and result = val)
      or
      this = MkTrueToken(_, _, _, _) and result = "true"
      or
      this = MkFalseToken(_, _, _, _) and result = "false"
      or
      this = MkNullToken(_, _, _, _) and result = "null"
      or
      exists(string val | this = MkNameToken(_, _, val, _) and result = val)
      or
      this = MkGreaterThanToken(_, _, _, _) and result = ">"
      or
      this = MkDot(_, _, _, _) and result = "."
      or
      this = MkForwardSlash(_, _, _, _) and result = "/"
      or
      exists(string val | this = MkIdentToken(_, _, val, _) and result = val)
      or
      this = MkSingleQuoteToken(_, _, _, _) and result = "'"
      or
      this = MkDoubleQuoteToken(_, _, _, _) and result = "\""
    }

    string getKind() {
      this = MkLeftBracketToken(_, _, _, _) and result = "{"
      or
      this = MkRightBracketToken(_, _, _, _) and result = "}"
      or
      this = MkLeftSquareBracketToken(_, _, _, _) and result = "["
      or
      this = MkRightSquareBracketToken(_, _, _, _) and result = "]"
      or
      this = MkWhiteSpaceToken(_, _, _, _) and result = " "
      or
      this = MkCommaToken(_, _, _, _) and result = ","
      or
      this = MkColonToken(_, _, _, _) and result = ":"
      or
      this = MkNumberToken(_, _, _, _) and result = "number"
      or
      this = MkStringToken(_, _, _, _) and result = "string"
      or
      this = MkTrueToken(_, _, _, _) and result = "true"
      or
      this = MkFalseToken(_, _, _, _) and result = "false"
      or
      this = MkNullToken(_, _, _, _) and result = "null"
      or
      this = MkNameToken(_, _, _, _) and result = "name"
      or
      this = MkGreaterThanToken(_, _, _, _) and result = ">"
      or
      this = MkDot(_, _, _, _) and result = "."
      or
      this = MkForwardSlash(_, _, _, _) and result = "/"
      or
      this = MkIdentToken(_, _, _, _) and result = "ident"
      or
      this = MkSingleQuoteToken(_, _, _, _) and result = "'"
      or
      this = MkDoubleQuoteToken(_, _, _, _) and result = "\""
    }

    BindingStringReader getReader() {
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
      or
      this = MkNameToken(_, _, _, result)
      or
      this = MkGreaterThanToken(_, _, _, result)
      or
      this = MkDot(_, _, _, result)
      or
      this = MkForwardSlash(_, _, _, result)
      or
      this = MkIdentToken(_, _, _, result)
      or
      this = MkSingleQuoteToken(_, _, _, result)
      or
      this = MkDoubleQuoteToken(_, _, _, result)
    }

    /**
     * Gets the next contiguous token after the end of this token.
     */
    Token getNextAfterEnd() {
      // Find the last contained token, then get the next token after that
      result = getNextAfterContained() and
      // Ensure contiguous tokens
      consecutiveToken(this, result)
    }

    bindingset[t1, t2]
    pragma[inline_late]
    private predicate consecutiveToken(Token t1, Token t2) { t1.getEnd() + 1 = t2.getBegin() }

    /**
     * Gets the next token that occurs after the start of this token.
     */
    private Token getNext() {
      exists(int pos |
        tokenOrdering(this.getReader(), this, pos) and
        tokenOrdering(this.getReader(), result, pos + uniqueTokensAtPosition(this.getReader(), pos))
      )
    }

    /**
     * Get the last token contained by this token.
     */
    pragma[noinline]
    private Token getNextAfterContained() {
      exists(Token lastToken |
        contains(lastToken) and
        result = lastToken.getNext() and
        not contains(result)
      )
    }

    predicate isFirst() { tokenOrdering(this.getReader(), this, 1) }

    predicate contains(Token t) {
      // base case, every token contains itself
      t = this
      or
      // Recursive case, find an existing token contained by this token, and determine whether the next token is
      // contained
      exists(Token prev |
        this.contains(prev) and
        prev.getNext() = t and
        // In the case of overlapping ranges, report tokens that begin inside this token as "contained"
        this.getEnd() >= t.getBegin()
      )
    }

    /**
     * The token `t` is completely contained within this outer token.
     */
    predicate strictContains(Token t) {
      this.contains(t) and t.getBegin() > this.getBegin() and t.getEnd() < this.getEnd()
    }

    stdlib::Location getLocation() { result = getReader().getLocation() }
  }

  /**
   * Holds if `t` is ordered at `position` according to the location of the beginning of the token.
   *
   * Note: `position` is not contiguous as certain strings may be matched by multiple tokens. In this
   * case those tokens will all have the same `position`, and the subsequent token will have
   * `position + count(tokens_with_current_position)`.
   */
  private predicate tokenOrdering(BindingStringReader reader, Token t, int position) {
    t = rank[position](Token token | token.getReader() = reader | token order by token.getBegin())
  }

  /**
   * Identify how many tokens are at a given position in the ordering, i.e. have the same beginning and end.
   */
  private int uniqueTokensAtPosition(BindingStringReader reader, int position) {
    tokenOrdering(reader, _, position) and
    result = count(Token t | tokenOrdering(reader, t, position))
  }

  private class WhiteSpaceToken extends Token, MkWhiteSpaceToken { }

  private class CommaToken extends Token, MkCommaToken { }

  private class ColonToken extends Token, MkColonToken { }

  private class LeftBracketToken extends Token, MkLeftBracketToken { }

  private class RightBracketToken extends Token, MkRightBracketToken { }

  private class LeftSquareBracketToken extends Token, MkLeftSquareBracketToken { }

  private class RightSquareBracketToken extends Token, MkRightSquareBracketToken { }

  private class StringToken extends Token, MkStringToken { }

  private class NumberToken extends Token, MkNumberToken { }

  private class TrueToken extends Token, MkTrueToken { }

  private class FalseToken extends Token, MkFalseToken { }

  private class NullToken extends Token, MkNullToken { }

  private class NameToken extends Token, MkNameToken { }

  private class GreaterThanToken extends Token, MkGreaterThanToken { }

  private class ForwardSlashToken extends Token, MkForwardSlash { }

  private class IdentToken extends Token, MkIdentToken { }

  private class SingleQuoteToken extends Token, MkSingleQuoteToken { }

  private class DoubleQuoteToken extends Token, MkDoubleQuoteToken { }

  private class DotToken extends Token, MkDot { }

  private Token getNextSkippingWhitespace(Token t) {
    result = t.getNextAfterEnd() and
    not result instanceof WhiteSpaceToken
    or
    exists(WhiteSpaceToken ws | ws = t.getNextAfterEnd() | result = getNextSkippingWhitespace(ws))
  }

  private newtype TMemberList =
    EmptyMemberList() or
    ConsMemberList(Member head, MemberList tail) {
      exists(Token first, Token last |
        mkMember(first, head, last) and
        if getNextSkippingWhitespace(last) instanceof CommaToken
        then mkMembers(getNextSkippingWhitespace(getNextSkippingWhitespace(last)), tail, _)
        else tail = EmptyMemberList()
      )
    }

  private Member nthMember(MemberList list, int index) {
    exists(Member h | list = ConsMemberList(h, _) | index = 0 and result = h)
    or
    exists(MemberList t | list = ConsMemberList(_, t) |
      index > 0 and result = nthMember(t, index - 1)
    )
  }

  class MemberList extends TMemberList {
    string toString() {
      this = EmptyMemberList() and result = ""
      or
      exists(Member head, MemberList tail, string tailStr |
        this = ConsMemberList(head, tail) and
        tailStr = tail.toString() and
        if tailStr != ""
        then result = head.toString() + ", " + tailStr
        else result = head.toString()
      )
    }

    Member getMember(int index) { result = nthMember(this, index) }

    Member getAMember() { result = getMember(_) }

    stdlib::Location getLocation() { result = getAMember().getLocation() }
  }

  private newtype TMember =
    MkValueMember(string key, Value value) {
      exists(IdentToken keyToken, ColonToken colonToken, Token firstValueToken |
        colonToken = getNextSkippingWhitespace(keyToken) and
        firstValueToken = getNextSkippingWhitespace(colonToken) and
        key = keyToken.getValue() and
        key != "path" and
        mkValue(firstValueToken, value, _)
      )
    } or
    MkBindingPathMember(BindingPath path) {
      exists(IdentToken keyToken, ColonToken colonToken, Token quoteToken, Token firstValueToken |
        colonToken = getNextSkippingWhitespace(keyToken) and
        quoteToken = getNextSkippingWhitespace(colonToken) and
        (quoteToken instanceof SingleQuoteToken or quoteToken instanceof DoubleQuoteToken) and
        firstValueToken = getNextSkippingWhitespace(quoteToken) and
        "path" = keyToken.getValue() and
        mkBindingPath(firstValueToken, path, _)
      )
    }

  class Member extends TMember {
    string toString() {
      exists(string key, Value value |
        this = MkValueMember(key, value) and
        result = key + " : " + value.toString()
      )
      or
      exists(BindingPath path |
        this = MkBindingPathMember(path) and
        result = "path : " + path.toString()
      )
    }

    string getKey() {
      this = MkValueMember(result, _)
      or
      result = "path" and this = MkBindingPathMember(_)
    }

    Value getValue() { this = MkValueMember(_, result) }

    BindingPath getBindingPath() { this = MkBindingPathMember(result) }

    predicate isValue() { this = MkValueMember(_, _) }

    predicate isBindingPath() { this = MkBindingPathMember(_) }

    stdlib::Location getLocation() {
      result = this.getValue().getLocation()
      or
      result = this.getBindingPath().getLocation()
    }
  }

  private predicate mkMember(IdentToken first, Member member, Token last) {
    getNextSkippingWhitespace(first) instanceof ColonToken and
    (
      exists(Value value | first.getValue() != "path" |
        mkValue(getNextSkippingWhitespace(getNextSkippingWhitespace(first)), value, last) and
        member = MkValueMember(first.getValue(), value)
      )
      or
      exists(
        BindingPath value, Token firstBindingPathToken, Token lastBindingPathToken,
        ColonToken colonToken, Token quoteToken
      |
        first.getValue() = "path" and
        colonToken = getNextSkippingWhitespace(first) and
        quoteToken = getNextSkippingWhitespace(colonToken) and
        (quoteToken instanceof SingleQuoteToken or quoteToken instanceof DoubleQuoteToken) and
        firstBindingPathToken = getNextSkippingWhitespace(quoteToken)
      |
        mkBindingPath(firstBindingPathToken, value, lastBindingPathToken) and
        last = getNextSkippingWhitespace(lastBindingPathToken) and
        last.getKind() = quoteToken.getKind() and
        member = MkBindingPathMember(value)
      )
    )
  }

  private predicate mkMembers(IdentToken first, MemberList members, Token last) {
    exists(Member h, Token memberLast | mkMember(first, h, memberLast) |
      not getNextSkippingWhitespace(memberLast) instanceof CommaToken and
      members = ConsMemberList(h, EmptyMemberList()) and
      last = memberLast
    )
    or
    exists(Member h, Token memberLast, MemberList tail | mkMember(first, h, memberLast) |
      getNextSkippingWhitespace(memberLast) instanceof CommaToken and
      mkMembers(getNextSkippingWhitespace(getNextSkippingWhitespace(memberLast)), tail, last) and
      members = ConsMemberList(h, tail)
    )
  }

  private newtype TValueList =
    EmptyValueList() or
    ConsValueList(Value head, ValueList tail) {
      exists(Token first, Token last |
        mkValue(first, head, last) and
        if getNextSkippingWhitespace(last) instanceof CommaToken
        then mkValues(getNextSkippingWhitespace(getNextSkippingWhitespace(last)), tail, _)
        else tail = EmptyValueList()
      )
    }

  private predicate mkValues(Token first, ValueList values, Token last) {
    exists(Value h, Token valueLast | mkValue(first, h, valueLast) |
      not getNextSkippingWhitespace(valueLast) instanceof CommaToken and
      values = ConsValueList(h, EmptyValueList()) and
      last = valueLast
    )
    or
    exists(Value h, Token valueLast, ValueList tail | mkValue(first, h, valueLast) |
      getNextSkippingWhitespace(valueLast) instanceof CommaToken and
      mkValues(getNextSkippingWhitespace(getNextSkippingWhitespace(valueLast)), tail, last) and
      values = ConsValueList(h, tail)
    )
  }

  private Value getNthValue(ValueList list, int index) {
    exists(Value h | list = ConsValueList(h, _) | index = 0 and result = h)
    or
    exists(ValueList t | list = ConsValueList(_, t) |
      index > 0 and result = getNthValue(t, index - 1)
    )
  }

  class ValueList extends TValueList {
    string toString() {
      this = EmptyValueList() and result = "[]"
      or
      exists(Value head, ValueList tail, string tailStr |
        this = ConsValueList(head, tail) and
        "[" + tailStr + "]" = tail.toString() and
        if tailStr != ""
        then result = "[" + head.toString() + ", " + tailStr + "]"
        else result = "[" + head.toString() + "]"
      )
    }

    Value getValue(int index) { result = getNthValue(this, index) }

    Value getAValue() { result = getValue(_) }
  }

  private newtype TValue =
    MkNumber(float n, Token source) {
      exists(NumberToken t | t.getValue().toFloat() = n and source = t |
        not any(StringToken str).strictContains(t) and
        not any(NameToken name).strictContains(t)
      )
    } or
    MkString(string s, Token source) {
      exists(StringToken t |
        t.(Token).getValue() = s and
        t = source and
        not any(NameToken nameToken).strictContains(t)
      )
    } or
    MkObject(MemberList members, Token source) {
      exists(LeftBracketToken l, RightBracketToken r, Token last |
        mkMembers(getNextSkippingWhitespace(l), members, last) and
        getNextSkippingWhitespace(last) = r and
        source = l
      )
      or
      exists(LeftBracketToken l, RightBracketToken r | getNextSkippingWhitespace(l) = r |
        members = EmptyMemberList() and source = l
      )
    } or
    MkArray(ValueList values, Token source) {
      exists(LeftSquareBracketToken l, RightSquareBracketToken r, Token last |
        mkValues(getNextSkippingWhitespace(l), values, last) and
        getNextSkippingWhitespace(last) = r and
        source = l
      )
      or
      exists(LeftSquareBracketToken l, RightSquareBracketToken r |
        getNextSkippingWhitespace(l) = r
      |
        values = EmptyValueList() and source = l
      )
    } or
    MkTrue(Token source) {
      exists(TrueToken t |
        not any(StringToken str).strictContains(t) and
        not any(NameToken nameToken).strictContains(t) and
        source = t
      )
    } or
    MkFalse(Token source) {
      exists(FalseToken t |
        not any(StringToken str).strictContains(t) and
        not any(NameToken nameToken).strictContains(t) and
        source = t
      )
    } or
    MkNull(Token source) {
      exists(NullToken t |
        not any(StringToken str).strictContains(t) and
        not any(NameToken nameToken).strictContains(t) and
        source = t
      )
    } or
    MkName(Token source) {
      exists(NameToken t | not any(StringToken str).strictContains(t) and source = t)
    } or
    MkIdent(Token source) {
      exists(IdentToken t | source = t and getNextSkippingWhitespace(t) instanceof ColonToken)
    } or
    MkBindingPathValue(BindingPath value, Token source) { mkBindingPath(source, value, _) }

  private predicate mkValue(Token first, Value value, Token last) {
    first instanceof StringToken and
    first = last and
    value = MkString(first.getValue(), first)
    or
    first instanceof NumberToken and
    first = last and
    value = MkNumber(first.getValue().toFloat(), first)
    or
    first instanceof LeftBracketToken and
    (
      exists(MemberList members, Token membersLast |
        mkMembers(getNextSkippingWhitespace(first), members, membersLast) and
        value = MkObject(members, first) and
        last = getNextSkippingWhitespace(membersLast)
      )
      or
      last = getNextSkippingWhitespace(first) and
      value = MkObject(EmptyMemberList(), first)
    ) and
    last instanceof RightBracketToken
    or
    first instanceof LeftSquareBracketToken and
    (
      exists(ValueList values, Token valuesLast |
        mkValues(getNextSkippingWhitespace(first), values, valuesLast) and
        value = MkArray(values, first) and
        last = getNextSkippingWhitespace(valuesLast)
      )
      or
      last = getNextSkippingWhitespace(first) and
      value = MkArray(EmptyValueList(), first)
    ) and
    last instanceof RightSquareBracketToken
    or
    first instanceof TrueToken and
    first = last and
    value = MkTrue(first)
    or
    first instanceof FalseToken and
    first = last and
    value = MkFalse(first)
    or
    first instanceof NullToken and
    first = last and
    value = MkNull(first)
    or
    first instanceof NameToken and
    first = last and
    value = MkName(first)
  }

  class Value extends TValue {
    string toString() {
      exists(string value |
        this = MkString(value, _) and
        result = "\"" + value + "\""
      )
      or
      exists(float number | this = MkNumber(number, _) | result = number.toString())
      or
      exists(MemberList members | this = MkObject(members, _) | result = members.toString())
      or
      exists(ValueList values | this = MkArray(values, _) | result = values.toString())
      or
      this = MkTrue(_) and result = "true"
      or
      this = MkFalse(_) and result = "false"
      or
      this = MkNull(_) and result = "null"
      or
      exists(NameToken name | this = MkName(name) | result = name.getValue())
    }

    Token getSourceToken() {
      exists(Token token |
        this = MkString(_, token)
        or
        this = MkNumber(_, token)
        or
        this = MkObject(_, token)
        or
        this = MkArray(_, token)
        or
        this = MkTrue(token)
        or
        this = MkFalse(token)
        or
        this = MkNull(token)
        or
        this = MkName(token)
      |
        result = token
      )
    }

    BindingStringReader getReader() { result = getSourceToken().getReader() }

    string getType() {
      this = MkString(_, _) and result = "string"
      or
      this = MkNumber(_, _) and result = "number"
      or
      this = MkObject(_, _) and result = "object"
      or
      this = MkArray(_, _) and result = "array"
      or
      this = MkTrue(_) and result = "true"
      or
      this = MkFalse(_) and result = "false"
      or
      this = MkNull(_) and result = "null"
      or
      this = MkName(_) and result = "name"
    }

    string asString() { this = MkString(result, _) }

    stdlib::Location getLocation() { result = getReader().getLocation() }
  }

  class Object extends Value, MkObject {
    MemberList getMembers() { this = MkObject(result, _) }

    Member getMember(int index) { result = getMembers().getMember(index) }

    Member getAMember() { result = getMember(_) }

    override string toString() { result = "{" + getMembers() + "}" }
  }

  class String extends Value, MkString { }

  class Number extends Value, MkNumber { }

  class Array extends Value, MkArray {
    ValueList getValues() { this = MkArray(result, _) }

    Value getValue(int index) { result = getValues().getValue(index) }

    Value getAValue() { result = getValue(_) }
  }

  predicate mkBindingPathComponentList(Token first, BindingPathComponentList list, Token last) {
    exists(NameToken name, Token nextToken | nextToken = getNextSkippingWhitespace(name) |
      name = first and
      if nextToken instanceof ForwardSlashToken or nextToken instanceof DotToken
      then
        exists(BindingPathComponentList tail |
          mkBindingPathComponentList(getNextSkippingWhitespace(nextToken), tail, last) and
          list = MkConstBindingPathComponentList(name, tail)
        )
      else (
        list = MkConstBindingPathComponentList(name, MkEmptyBindingPathComponentList()) and
        last = name
      )
    )
  }

  private newtype TBindingPathComponentList =
    MkEmptyBindingPathComponentList() or
    MkConstBindingPathComponentList(NameToken headToken, BindingPathComponentList tail) {
      exists(Token nextToken | nextToken = getNextSkippingWhitespace(headToken) |
        if nextToken instanceof ForwardSlashToken or nextToken instanceof DotToken
        then mkBindingPathComponentList(getNextSkippingWhitespace(nextToken), tail, _)
        else tail = MkEmptyBindingPathComponentList()
      )
    }

  class BindingPathComponentList extends TBindingPathComponentList {
    string toString() {
      this = MkEmptyBindingPathComponentList() and result = ""
      or
      exists(NameToken head, BindingPathComponentList tail |
        this = MkConstBindingPathComponentList(head, tail) and
        if tail instanceof MkEmptyBindingPathComponentList
        then result = head.toString()
        else result = head.toString() + "/" + tail.toString()
      )
    }

    NameToken getHead() { this = MkConstBindingPathComponentList(result, _) }

    BindingPathComponentList getTail() { this = MkConstBindingPathComponentList(_, result) }
  }

  predicate mkAbsoluteBindingPath(Token first, BindingPath path, Token last) {
    exists(BindingPathComponentList pathComponents | first instanceof ForwardSlashToken |
      mkBindingPathComponentList(getNextSkippingWhitespace(first), pathComponents, last) and
      path = MkAbsoluteBindingPath(pathComponents, first)
    )
  }

  predicate mkRelativeBindingPath(Token first, BindingPath path, Token last) {
    exists(BindingPathComponentList pathComponents | not first instanceof ForwardSlashToken |
      mkBindingPathComponentList(first, pathComponents, last) and
      path = MkRelativeBindingPath(pathComponents, first)
    )
  }

  predicate mkAbsoluteBindingPathWithModel(Token first, BindingPath path, Token last) {
    exists(
      string model, BindingPathComponentList pathComponents, GreaterThanToken greaterThanToken,
      ForwardSlashToken forwardSlashToken, NameToken firstComponentToken
    |
      model = first.(NameToken).getValue() and
      greaterThanToken = getNextSkippingWhitespace(first) and
      forwardSlashToken = getNextSkippingWhitespace(greaterThanToken) and
      firstComponentToken = getNextSkippingWhitespace(forwardSlashToken)
    |
      mkBindingPathComponentList(firstComponentToken, pathComponents, last) and
      path = MkAbsoluteBindingPathWithModel(model, pathComponents, first)
    )
  }

  predicate mkRelativeBindingPathWithModel(Token first, BindingPath path, Token last) {
    exists(
      string model, BindingPathComponentList pathComponents, GreaterThanToken greaterThanToken,
      NameToken firstComponentToken
    |
      model = first.(NameToken).getValue() and
      greaterThanToken = getNextSkippingWhitespace(first) and
      firstComponentToken = getNextSkippingWhitespace(greaterThanToken)
    |
      mkBindingPathComponentList(firstComponentToken, pathComponents, last) and
      path = MkRelativeBindingPathWithModel(model, pathComponents, first)
    )
  }

  private newtype TBindingPath =
    MkAbsoluteBindingPath(BindingPathComponentList pathComponents, Token source) {
      source instanceof ForwardSlashToken and
      mkBindingPathComponentList(getNextSkippingWhitespace(source), pathComponents, _)
    } or
    MkRelativeBindingPath(BindingPathComponentList pathComponents, Token source) {
      exists(Token next |
        next = getNextSkippingWhitespace(source) and
        not source instanceof ForwardSlashToken and
        not next instanceof GreaterThanToken and
        // exclude cases like {path: } where path looks like a relative binding, but is a key
        not next instanceof ColonToken
      |
        mkBindingPathComponentList(source, pathComponents, _)
      )
    } or
    MkAbsoluteBindingPathWithModel(
      string model, BindingPathComponentList pathComponents, Token source
    ) {
      exists(
        GreaterThanToken greaterThanToken, ForwardSlashToken forwardSlashToken,
        NameToken firstComponent
      |
        greaterThanToken = getNextSkippingWhitespace(source) and
        model = source.(NameToken).getValue() and
        forwardSlashToken = getNextSkippingWhitespace(greaterThanToken) and
        firstComponent = getNextSkippingWhitespace(forwardSlashToken)
      |
        mkBindingPathComponentList(firstComponent, pathComponents, _)
      )
    } or
    MkRelativeBindingPathWithModel(
      string model, BindingPathComponentList pathComponents, Token source
    ) {
      exists(GreaterThanToken greaterThanToken, NameToken firstComponent |
        greaterThanToken = getNextSkippingWhitespace(source) and
        model = source.(NameToken).getValue() and
        firstComponent = getNextSkippingWhitespace(greaterThanToken)
      |
        mkBindingPathComponentList(firstComponent, pathComponents, _)
      )
    }

  class BindingPath extends TBindingPath {
    string toString() {
      exists(string model, string prefix, BindingPathComponentList pathComponents |
        this = MkAbsoluteBindingPathWithModel(model, pathComponents, _) and
        prefix = model + ">" + "/"
        or
        this = MkRelativeBindingPathWithModel(model, pathComponents, _) and
        prefix = model + ">"
      |
        result = prefix + pathComponents
      )
      or
      exists(BindingPathComponentList pathComponents |
        this = MkAbsoluteBindingPath(pathComponents, _) and
        result = "/" + pathComponents
        or
        this = MkRelativeBindingPath(pathComponents, _) and
        result = pathComponents.toString()
      )
    }

    string getModel() {
      this = MkAbsoluteBindingPathWithModel(result, _, _)
      or
      this = MkRelativeBindingPathWithModel(result, _, _)
    }

    predicate isAbsolute() {
      this = MkAbsoluteBindingPath(_, _) or this = MkAbsoluteBindingPathWithModel(_, _, _)
    }

    predicate isRelative() {
      this = MkRelativeBindingPath(_, _) or this = MkRelativeBindingPathWithModel(_, _, _)
    }

    BindingPathComponentList getPathComponents() {
      this = MkAbsoluteBindingPath(result, _)
      or
      this = MkRelativeBindingPath(result, _)
      or
      this = MkAbsoluteBindingPathWithModel(_, result, _)
      or
      this = MkRelativeBindingPathWithModel(_, result, _)
    }

    Token getSourceToken() {
      exists(Token t |
        (
          this = MkAbsoluteBindingPath(_, t)
          or
          this = MkRelativeBindingPath(_, t)
          or
          this = MkAbsoluteBindingPathWithModel(_, _, t)
          or
          this = MkRelativeBindingPathWithModel(_, _, t)
        ) and
        result = t
      )
    }

    stdlib::Location getLocation() { result = getSourceToken().getReader().getLocation() }

    string getSource() { result = getSourceToken().getReader().getBindingString() }
  }

  predicate mkBindingPath(Token first, BindingPath bindingPath, Token last) {
    mkAbsoluteBindingPath(first, bindingPath, last)
    or
    mkRelativeBindingPath(first, bindingPath, last)
    or
    mkAbsoluteBindingPathWithModel(first, bindingPath, last)
    or
    mkRelativeBindingPathWithModel(first, bindingPath, last)
  }

  private newtype TBinding =
    MkBindingPath(Token first, BindingPath bindingPath, Token last) {
      exists(
        LeftBracketToken leftBracketToken, RightBracketToken rightBracketToken,
        Token firstPathToken, Token lastPathToken
      |
        leftBracketToken = first and
        rightBracketToken = last and
        firstPathToken = getNextSkippingWhitespace(leftBracketToken) and
        rightBracketToken = getNextSkippingWhitespace(lastPathToken)
      |
        mkBindingPath(firstPathToken, bindingPath, lastPathToken)
      )
    } or
    MkBindingObject(Token first, Object object, Token last) {
      exists(
        LeftBracketToken leftBracketToken, RightBracketToken rightBracketToken, MemberList members,
        IdentToken firstMemberToken, Token lastMemberToken
      |
        leftBracketToken = first and
        rightBracketToken = last and
        firstMemberToken = getNextSkippingWhitespace(leftBracketToken) and
        mkMembers(firstMemberToken, members, lastMemberToken) and
        rightBracketToken = getNextSkippingWhitespace(lastMemberToken)
      |
        object = MkObject(members, first)
      )
    }

  class Binding extends TBinding {
    BindingPath asBindingPath() { this = MkBindingPath(_, result, _) }

    Object asObject() { this = MkBindingObject(_, result, _) }

    string toString() {
      result = "{" + this.asBindingPath().toString() + "}"
      or
      result = this.asObject().toString()
    }

    Token getSourceToken() {
      this = MkBindingPath(result, _, _)
      or
      this = MkBindingObject(result, _, _)
    }

    BindingStringReader getReader() { result = getSourceToken().getReader() }

    stdlib::Location getLocation() { result = getReader().getLocation() }
  }

  private predicate mkBinding(Token first, Binding binding, Token last) {
    exists(
      LeftBracketToken leftBracketToken, RightBracketToken rightBracketToken, Token firstPathToken,
      Token lastPathToken, BindingPath bindingPath
    |
      leftBracketToken = first and
      rightBracketToken = last and
      firstPathToken = getNextSkippingWhitespace(leftBracketToken) and
      rightBracketToken = getNextSkippingWhitespace(lastPathToken) and
      mkBindingPath(firstPathToken, bindingPath, lastPathToken)
    |
      binding = MkBindingPath(first, bindingPath, last)
    )
    or
    exists(
      LeftBracketToken leftBracketToken, RightBracketToken rightBracketToken, MemberList members,
      IdentToken firstMemberToken, Token lastMemberToken, Object object
    |
      leftBracketToken = first and
      rightBracketToken = last and
      firstMemberToken = getNextSkippingWhitespace(leftBracketToken) and
      mkMembers(firstMemberToken, members, lastMemberToken) and
      rightBracketToken = getNextSkippingWhitespace(lastMemberToken) and
      object = MkObject(members, first)
    |
      binding = MkBindingObject(first, object, last)
    )
  }

  Binding parseBinding(BindingStringReader reader) {
    exists(LeftBracketToken firstToken, RightBracketToken lastToken |
      firstToken.isFirst() and
      firstToken.getReader() = reader
    |
      mkBinding(firstToken, result, lastToken)
    )
  }
}
