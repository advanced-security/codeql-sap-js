# Queries unit tests
Eamples can be run locally using [UI5 tooling](https://sap.github.io/ui5-tooling/stable/)

## UiI5 XSS
### [avoid-duplicate-alerts](queries/UI5Xss/avoid-duplicate-alerts)
- only reportin alerts that are specific to UI5

### [xss-book-example](queries/UI5Xss/xss-book-example)
- custom Control
- classic string-based API
- `renderer` property is set to a render function

### [xss-bind-element-context](queries/UI5Xss/xss-bind-element-context)
- default-model contexts assigned through `bindElement`
- relative bindings in XML, JSON, and JavaScript views
- nested contexts, aggregation contexts, model overrides, and sibling controls

### [standard-bindings](queries/UI5Xss/standard-bindings)
- standard `js/xss` detection for manifest-model bindings
- standard client-side URL redirect detection for `sap.m.Link.href`
- negative server-side URL redirect coverage

### [xss-custom-control-api1](queries/UI5Xss/xss-custom-control-api1)
- custom Control
- accessing Control properties byId

### [xss-custom-control-api2](queries/UI5Xss/xss-custom-control-api2)
- custom Control
- DOM-like API
- `renderer` property is set to an object literal 

### [xss-custom-control-jquery](queries/UI5Xss/xss-custom-control-jquery)
- custom Control declared using JQuery

### [xss-custom-control-property-sanitized](queries/UI5Xss/xss-custom-control-property-sanitized)
- custom Control
- DOM-like API
- the type of the control property `text` is set to `int` (sanitized)
- the sanitizer is not affecting the log-injection

### [xss-custom-control-sanitized](queries/UI5Xss/xss-custom-control-sanitized)
- custom Control
- DOM-like API
- the value of `text` is sanitized using `sap/base/security/encodeXML`

### [xss-event-handlers](queries/UI5Xss/xss-event-handlers)
User input flows to XSS sinks via event handlers in 4 different ways:
1. function `sap.ui.model.Model#getProperty` 
2. model property passed as handler parameter
3. function `sap.ui.base.Event#getSource#getValue`
4. accessing properties byId

### [xss-searchfield-jquery-html](queries/UI5Xss/xss-searchfield-jquery-html)
- `sap.m.SearchField` value (`liveChange` handler) stored in a controller field
- flows to jQuery DOM sinks on a control's jQuery object: `this.byId(..).$().html()`, `this.getView().byId(..).$().append()`, `this.byId(..).$().find(..).html()`
- sanitized with `sap/base/security/encodeXML`, and safe `.text()` usage
- `StockXssSinks.ql` checks that the same sinks are recognized by the stock `js/xss` sinks via models-as-data

### [xss-html-control](queries/UI5Xss/xss-html-control)
- `sap.ui.core.HTML` Control
- sanitization using the `sanitizeContent` property
- sanitization disabled by programmatically setting the `sanitizeContent` property to false 

### [xss-html-control-df](queries/UI5Xss/xss-html-control-df)
- `sap.ui.core.HTML` Control
- dataflow in the controller

### [xss-html-control-oneway](queries/UI5Xss/xss-html-control-oneway)
- `sap.ui.core.HTML` Control
- one-way binding makes the xss fail

### [xss-internal-data-model](queries/UI5Xss/xss-internal-data-model)
- default `sap.ui.model.json.JSONModel` declared in `manifest.json`
- relative two-way binding from `sap.m.Input` to `sap.ui.core.HTML`
- true negative where `setDefaultBindingMode(OneWay)` prevents flow from `sap.m.Input` to the model

### [xss-inferred-json-data-model](queries/UI5Xss/xss-inferred-json-data-model)
- default `sap.ui.model.json.JSONModel` inferred from a `JSON` data source
- relative two-way binding from `sap.m.Input` to `sap.ui.core.HTML`

### [xss-html-external-model](queries/UI5Xss/xss-html-external-model)
- `sap.ui.core.HTML` Control
- controller model as external `.json` file

### [xss-html-view](queries/UI5Xss/xss-html-view)
- `sap.ui.core.mvc.HTMLView` View

### [xss-indirect-control](queries/UI5Xss/xss-indirect-control)
- control accessed indirectly

### [xss-js-view](queries/UI5Xss/xss-js-view)
- `sap.ui.core.mvc.JSView` View
- sanitization using the `sanitizeContent` property

### [xss-json-view](queries/UI5Xss/xss-json-view)
- `sap.ui.core.mvc.JSONView` View
- sanitization using the `sanitizeContent` property

### [xss-separate-renderer](queries/UI5Xss/xss-separate-renderer)
- `renderer` property is set to a class name (a string)
- Renderer implemented in it's own module

### [xss-webc-control](queries/UI5Xss/xss-webc-control)
- Uses the `sap.ui.webc.main.MultiInput` control

## Client-side URL Redirection

### [ui5-link-href](queries/UrlRedirect/ui5-link-href)
- focused V4 regression: a todo URL edited through `sap.m.Input.value` flows via a relative two-way model binding to `sap.m.Link.href` within a list item
- uses the standard client-side URL redirect query with UI5 customizations
- negative cases: user input used only as link text with a fixed HTTPS destination, and a link bound to a separate, unedited model property

## Client-side Request Forgery

### [ui5-binding](queries/RequestForgery/ui5-binding)
- standard client-side request-forgery detection for a model-bound resource URL
- negative server-side request-forgery coverage

## UiI5 Log-Injection
### [avoid-duplicate-alerts](queries/UI5LogInjection/avoid-duplicate-alerts)
- only reportin alerts that are specific to UI5

### [log-html-control-df](queries/UI5LogInjection/log-html-control-df)
- `sap.ui.core.HTML` Control
- dataflow in the controller

### [log-custom-control-property-sanitized](queries/UI5LogInjection/log-custom-control-property-sanitized)
- custom Control
- DOM-like API
- the type of the control property `text` is set to `int` (sanitized)
- the sanitizer is not affecting the log-injection

### [log-custom-control-sanitized](queries/UI5LogInjection/log-custom-control-sanitized)
- the value of `text` is sanitized using `sap/base/security/encodeXML`
- the sanitizer is not affecting the log-injection

## UiI5 Clickjacking
### [clickjacking-allow-all](queries/UI5Clickjacking/clickjacking-allow-all)
- frameOptions = `allow`

### [clickjacking-default-all](queries/UI5Clickjacking/clickjacking-default-all)
- `frameOptions` not set

### [clickjacking-deny-all](queries/UI5Clickjacking/clickjacking-deny-all)
- frameOptions = `deny`
