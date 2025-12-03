sap.ui.define(
  [
    "sap/base/util/LoaderExtensions",
    "sap/base/i18n/ResourceBundle",
    "sap/ui/core/Patcher",
    "sap/base/Log",
    "sap/ui/core/HTML",
    "sap/base/util/Properties",
    "sap/ui/core/RenderManager",
    "sap/ui/util/Storage",
    "sap/ui/core/util/File",
    "sap/ui/richtexteditor/RichTextEditor"
  ],
  function (
    LoaderExtensions,
    ResourceBundle,
    Patcher,
    Log,
    HTML,
    Properties,
    RenderManager,
    Storage,
    File,
    RichTextEditor
  ) {
    var value = jQuery.sap.log.fatal(code0, code1, code2);
    var value = jQuery.sap.log.error(code0, code1, code2);
    var value = jQuery.sap.log.warning(code0, code1, code2);
    var value = jQuery.sap.log.info(code0, code1, code2);

    var value = jQuery.sap.log.debug(code0, code1, code2);

    var value = jQuery.sap.log.trace(code0, code1, code2);


    var log = jQuery.sap.log.getLogger("", jQuery.sap.log.Level.ERROR);
    var value = log.fatal(code0, code1, code2);

    var value = log.error(code0, code1, code2);

    var value = log.warning(code0, code1, code2);

    var value = log.info(code0, code1, code2);

    var value = log.debug(code0, code1, code2);

    var value = log.trace(code0, code1, code2);

    var value = jQuery.sap.assert(code0, code1);

    var value = jQuery.sap.registerModulePath(code0, code1);

    var value = jQuery.sap.registerResourcePath(code0, code1);

    var value = jQuery.sap.require(code0);

    var value = jQuery.sap.includeScript(code0);

    var value = jQuery.sap.includeStyleSheet(code0);

    var value = jQuery.sap.globalEval(code0);

    var value = jQuery.sap.properties(code0);

    var value = jQuery.sap.resources(code0);

    var value = jQuery.sap.sjax(code0);

    var value = jQuery.sap.syncHead(code0);

    var value = jQuery.sap.syncGet(code0, code1);

    var value = jQuery.sap.syncPost(code0, code1);

    var value = jQuery.sap.syncGetText(code0, code1);

    var value = jQuery.sap.syncGetJSON(code0, code1);
    var value = sap.base.Log.fatal(code0, code1, code2);
    var value = sap.base.Log.error(code0, code1, code2);
    var value = sap.base.Log.warning(code0, code1, code2);
    var value = sap.base.Log.info(code0, code1, code2);
    var value = sap.base.Log.debug(code0, code1, code2);
    var value = sap.base.Log.trace(code0, code1, code2);
    var value = Log.fatal(code0, code1, code2);
    var value = Log.error(code0, code1, code2);
    var value = Log.warning(code0, code1, code2);
    var value = Log.info(code0, code1, code2);
    var value = Log.debug(code0, code1, code2);
    var value = Log.trace(code0, code1, code2);
    var value = sap.base.assert(code0, code1);
    var obj = new ResourceBundle();
    var value = obj.create(code0);
    var obj = new LoaderExtensions();
    var value = obj.registerResourcePath(code0, code1);
    var obj = new Properties();
    var value = obj.create(code0);
    var obj = new HTML({ content: code0 });
    obj.content = code0;
    obj.setContent(code0);
    var obj = new Patcher();
    var value = obj.unsafeHtml(code0);
    var obj = new RenderManager();
    var value = obj.write(code0);
    var obj = new RenderManager();
    var value = obj.writeAttribute(code0, code1);
    var obj = new RenderManager();
    var value = obj.writeAttributeEscaped(code0);
    var obj = new RenderManager();
    var value = obj.addStyle(code0, code1);
    var obj = new RenderManager();
    var value = obj.addClass(code0);
    var obj = new RenderManager();
    var value = obj.unsafeHtml(code0);

    var value = sap.ui.dom.includeScript(code0);
    var value = sap.ui.dom.includeStyleSheet(code0);

    var value = Storage.put(code0, code1);
    var value = sap.ui.util.Storage.put(code0, code1);
    var value = jQuery.sap.storage.put(code0, code1);

    var value = File.save(code0, code1, "csv", "text/csv", code4, code5);
    var value = File.save(code0, code1, "csv", "text/plain", code4, code5);
    var value = File.save(code0, code1, code2, code3, code4, code5);
    var value = sap.ui.core.util.File.save(code0, code1, "csv", "text/csv", code4, code5);
    var value = sap.ui.core.util.File.save(code0, code1, "csv", "text/plain", code4, code5);
    var value = sap.ui.core.util.File.save(code0, code1, code2, code3, code4, code5);

    var obj = new HTML({ content: code0, sanitizeContent: true });
    var obj = new HTML({ content: code0, sanitizeContent: false });

    var obj = new RichTextEditor({ value: code0 });
    var obj = new RichTextEditor({ value: code0, sanitizeValue: true });
    var obj = new RichTextEditor({ value: code0, sanitizeValue: false });
  },
);
