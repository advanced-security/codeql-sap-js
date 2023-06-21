sap.ui.require(["sap/ui/commons/TextField", "sap/m/InputBase", "sap/m/Input", "sap/base/util/UriParameters"],
    function (TextField, InputBase, Input, UriParameters) {

        ////////
        // Sources of user-controlled data
        ////////

        // sap.ui.commons.TextField.value
        var f = new TextField();
        f.value = "text";

        // sap.m.InputBase.value
        var ib = new InputBase();
        ib.value = "text";

        // sap.m.Input.value
        // sap.m.Input#setValue()
        var input = new Input();
        input.value = "text";
        input.setValue("text");

        // jQuery.sap.getUriParameters() return
        var sValue = jQuery.sap.getUriParameters().get("foo");

        // jQuery.sap.syncHead return
        var value = jQuery.sap.syncHead("url", "param")

        // jQuery.sap.syncGet return
        var value = jQuery.sap.syncGet("url", "param")

        // jQuery.sap.syncGetText return
        var value = jQuery.sap.syncGetText("url", "param")

        // jQuery.sap.syncPost return
        var value = jQuery.sap.syncPost("url", "param")

        // jQuery.sap.syncPostText return
        var value = jQuery.sap.syncPostText("url", "param")

        // Q?: should these be summaries as vales are tainted only
        // if the object is tainted 
        // UriParameters#get
        // UriParameters#getAll
        var uri = UriParameters.fromQuery(window.location.search)
        var sValue = uri.get("foo")
        var sValue = uri.getAll("foo")
    });
