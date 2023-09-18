# Queries unit tests
Eamples can be run locally using [UI5 tooling](https://sap.github.io/ui5-tooling/stable/)

## UiI5 XSS
### [avoid-duplicate-alerts](UI5Xss/avoid-duplicate-alerts)
- only reportin alerts that are specific to UI5

### [xss-book-example](UI5Xss/xss-book-example)
- custom Control
- classic string-based API
- `renderer` property is set to a render function

### [xss-custom-control-api1](UI5Xss/xss-custom-control-api1)
- custom Control
- accessing Control properties byId

### [xss-custom-control-api2](UI5Xss/xss-custom-control-api2)
- custom Control
- DOM-like API
- `renderer` property is set to an object literal 

### [xss-custom-control-jquery](UI5Xss/xss-custom-control-jquery)
- custom Control declared using JQuery

### [xss-custom-control-property-sanitized](UI5Xss/xss-custom-control-property-sanitized)
- custom Control
- DOM-like API
- the type of the control property `text` is set to `int` (sanitized)
- the sanitizer is not affecting the log-injection

### [xss-custom-control-sanitized](UI5Xss/xss-custom-control-sanitized)
- custom Control
- DOM-like API
- the value of `text` is sanitized using `sap/base/security/encodeXML`

### [xss-event-handlers](UI5Xss/xss-event-handlers)
User input flows to XSS sinks via event handlers in 4 different ways:
1. function `sap.ui.model.Model#getProperty` 
2. model property passed as handler parameter
3. function `sap.ui.base.Event#getSource#getValue`
4. accessing properties byId

### [xss-html-control](UI5Xss/xss-html-control)
- `sap.ui.core.HTML` Control

### [xss-html-control-df](UI5Xss/xss-html-control-df)
- `sap.ui.core.HTML` Control
- dataflow in the controller

### [xss-html-control-oneway](UI5Xss/xss-html-control-oneway)
- `sap.ui.core.HTML` Control
- one-way binding makes the xss fail

### [xss-html-external-model](UI5Xss/xss-html-external-model)
- `sap.ui.core.HTML` Control
- controller model as external `.json` file

### [xss-html-view](UI5Xss/xss-html-view)
- `sap.ui.core.mvc.HTMLView` View
- 
### [xss-indirect-control](UI5Xss/xss-indirect-control)
- control accessed indirectly

### [xss-js-view](UI5Xss/xss-js-view)
- `sap.ui.core.mvc.JSView` View

### [xss-json-view](UI5Xss/xss-json-view)
- `sap.ui.core.mvc.JSONView` View

### [xss-separate-renderer](UI5Xss/xss-separate-renderer)
- `renderer` property is set to a class name (a string)
- Renderer implemented in it's own module

### [xss-webc-control](UI5Xss/xss-webc-control)
- Uses the `sap.ui.webc.main.MultiInput` control

## UiI5 Log-Injection
### [avoid-duplicate-alerts](UI5LogInjection/avoid-duplicate-alerts)
- only reportin alerts that are specific to UI5

### [log-html-control-df](UI5LogInjection/log-html-control-df)
- `sap.ui.core.HTML` Control
- dataflow in the controller

### [log-custom-control-property-sanitized](UI5LogInjection/log-custom-control-property-sanitized)
- custom Control
- DOM-like API
- the type of the control property `text` is set to `int` (sanitized)
- the sanitizer is not affecting the log-injection

### [log-custom-control-sanitized](UI5LogInjection/log-custom-control-sanitized)
- the value of `text` is sanitized using `sap/base/security/encodeXML`
- the sanitizer is not affecting the log-injection

## UiI5 Clickjacking
### [clickjacking-allow-all](UI5Clickjacking/clickjacking-allow-all)
- frameOptions = `allow`

### [clickjacking-default-all](UI5Clickjacking/clickjacking-default-all)
- `frameOptions` not set

### [clickjacking-deny-all](UI5Clickjacking/clickjacking-deny-all)
- frameOptions = `deny`
