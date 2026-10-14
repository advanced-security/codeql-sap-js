sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
  return Controller.extend("codeql.sap.parser.controller.app", {
    onInit: function () {
      bindingCase("absolute", "{/foo/bar}");
      bindingCase("relative", "{foo.bar}");
      bindingCase("attribute", "{docs>/item/@label}");
      bindingCase("whitespace", "{ \n /foo\t}");
      bindingCase("quoted", "{path: '/foo', type: 'false'}");
      bindingCase("missing-close", "{/foo");
      bindingCase("plain", "not-a-binding");

      jsonCase("number", "1.0e+1");
      jsonCase("zero-number", "0");
      jsonCase("string-overlap", '"{true:false}"');
      jsonCase("nested", '{"a": [true, false, null]}');
      jsonCase("whitespace", " \t true\n ");
      jsonCase("empty-array", "[]");
      jsonCase("unterminated", '{"a":');
      jsonCase("prefix-tolerated", "1 trailing");
    }
  });
});
