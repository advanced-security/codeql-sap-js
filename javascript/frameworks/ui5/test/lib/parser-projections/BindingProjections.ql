/**
 * @name Binding parser projection regression test
 * @description Preserves token projections and malformed-input behavior during parser refactoring.
 * @kind table
 * @id test/ui5-binding-parser-projections
 * @tags test
 */

import advanced_security.javascript.frameworks.ui5.BindingStringParser as Make
import javascript

class Reader extends StringLiteral {
  CallExpr call;

  Reader() {
    call.getCalleeName() = "bindingCase" and
    this = call.getArgument(1)
  }

  string getBindingString() { result = this.getValue() }

  DataFlow::Node getANode() { result.asExpr() = this }

  string getLabel() { result = call.getArgument(0).getStringValue() }
}

module Parser = Make::BindingStringParser<Reader>;

from Reader reader, string parsed, string kind, int begin, int end
where
  (
    if exists(Parser::parseBinding(reader))
    then
      exists(Parser::Binding binding | binding = Parser::parseBinding(reader) |
        parsed = binding.toString() and
        (
          if exists(binding.asBindingPath())
          then (
            kind = binding.asBindingPath().getSourceToken().getKind() and
            begin = binding.asBindingPath().getSourceToken().getBegin() and
            end = binding.asBindingPath().getSourceToken().getEnd()
          ) else (
            kind = binding.getSourceToken().getKind() and
            begin = binding.getSourceToken().getBegin() and
            end = binding.getSourceToken().getEnd()
          )
        ) and
        binding.getReader() = reader and
        binding.getLocation() = reader.getLocation()
      )
    else (
      parsed = "<unparsed>" and kind = "none" and begin = -1 and end = -1
    )
  )
select reader.getLabel(), parsed, kind, begin, end
