sap.ui.require(
  [
    "sap/ui/codeeditor/CodeEditor",
    "sap/m/FeedInput",
    "sap/ui/commons/TextField",
    "sap/base/util/UriParameters",
    "sap/ui/richtexteditor/RichTextEditor",
    "sap/m/InputBase",
    "sap/ui/webc/main/MultiInput",
    "sap/m/SearchField",
    "sap/ui/webc/main/Input",
    "sap/ui/commons/TextField",
    "sap/ui/commons/PasswordField",
    "sap/ui/commons/ValueHelpField",
    "sap/ui/commons/SearchField",
    "sap/ui/commons/ComboBox",
    "sap/ui/commons/TextArea",
    "sap/ui/webc/main/TextArea"
  ],
  function (
    CodeEditor,
    FeedInput,
    TextField,
    UriParameters,
    RichTextEditor,
    InputBase,
    MultiInput,
    SearchField,
    Input,
    TextField,
    PasswordField,
    ValueHelpField,
    SearchField,
    ComboBox,
    TextAreaCommons,
    TextAreaWebc
  ) {
    var obj = new TextField();
    var value = obj.value;
    var obj = new TextField();
    var value = obj.getValue();
    var obj = new InputBase();
    var value = obj.value;
    var obj = new InputBase();
    var value = obj.getValue();
    var obj = new SearchField();
    var value = obj.value;
    var obj = new SearchField();
    var value = obj.getValue();
    var obj = new FeedInput();
    var value = obj.value;
    var obj = new FeedInput();
    var value = obj.getValue();
    var obj = new Input();
    var value = obj.value;
    var obj = new Input();
    var value = obj.getValue();
    var obj = new MultiInput();
    var value = obj.value;
    var obj = new MultiInput();
    var value = obj.getValue();
    var obj = new CodeEditor();
    var value = obj.value;
    var obj = new CodeEditor();
    var value = obj.getCurrentValue();
    var obj = new RichTextEditor();
    var value = obj.value;
    var obj = new RichTextEditor();
    var value = obj.getValue();

    var obj = new PasswordField();
    var value = obj.value;
    var obj = new PasswordField();
    var value = obj.getValue();
    var obj = new ValueHelpField();
    var value = obj.value;
    var obj = new ValueHelpField();
    var value = obj.getValue();
    var obj = new SearchField();
    var value = obj.value;
    var obj = new SearchField();
    var value = obj.getValue();
    var obj = new ComboBox();
    var value = obj.value;
    var obj = new ComboBox();
    var value = obj.getValue();
    var obj = new TextAreaCommons();
    var value = obj.value;
    var obj = new TextAreaCommons();
    var value = obj.getValue();
    var obj = new TextAreaWebc();
    var value = obj.value;
    var obj = new TextAreaWebc();
    var value = obj.getValue();

    var value = jQuery.sap.getUriParameters().get();

    var value = jQuery.sap.syncHead();

    var value = jQuery.sap.syncGet();

    var value = jQuery.sap.syncGetText();

    var value = jQuery.sap.syncPost();

    var value = jQuery.sap.syncPostText();

    var value = UriParameters.fromQuery(code0).get();
    var value = UriParameters.fromQuery(code0).getAll();

    var obj = jQuery.sap.getUriParameters();
    var value = obj.get();
    var value = obj.getAll();
    var obj = new UriParameters();
    var value = obj.getAll();
    var obj = new UriParameters();
    var value = obj.get();
  },
);
