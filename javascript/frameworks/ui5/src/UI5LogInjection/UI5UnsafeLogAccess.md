# Access to user-controlled UI5 Logs

Processing user-controlled log entries can lead to injection vulnerabilities, where an attacker can manipulate user input to affect the application excution.

UI5 applications can retrieve logs for further processing using `sap/base/Log.getLogEntries`, define custom listeners using `sap/base/Log.addLogListener` or directly display logs using the `sap/ui/vk/Notifications` control.

This query identifies instances where user-controlled log entries are accessed in a UI5 application. 

## Recommendation

Avoid accessing log entries that originate from user-controlled sources. Ensure that any log data is properly sanitized.

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
2. A second component retrieves log entries to further process them.
```javascript
let message = Log.getLogEntries()[0].message; //access to user controlled logs
do_smth(message);
```

## References

- OWASP: [Log Injection](https://owasp.org/www-community/attacks/Log_Injection).
- OWASP: [Log Injection Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html).
- SAP UI5 Documentation: [namespace `sap/base/Log`](https://sapui5.hana.ondemand.com/sdk/#api/module:sap/base/Log).
