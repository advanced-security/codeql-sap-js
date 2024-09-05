# Disabled XSJS CSRF protection

A web server that receives a request from a client without verifying that it was intentionally sent might be vulnerable to Cross Site Request Forgery (CSRF). An attacker can trick a client into making an unintended request to the web server that will be treated as an authentic request. This can be done via a URL, image load, XMLHttpRequest, etc. and can result in exposure of data or unintended code execution.

## Recommendation

SAP’s recommendation is to use CSRF protection for any request that could be processed by a browser client by normal users. 
- In `XS Advanced` CSRF protection is enabled by default and should not be disabled. 
- In `XS Classic` CSRF protection should be enabled explicitly. 

## Example

The following `xs-app.json` fragment enables CSRF protection in XSJS.

```json
"routes": [
  {
    "source": "/bad/(.*)",
    "destination": "srv_api",
    "csrfProtection": true,
    ...
  }
]
    ...
  }
]
```

## References

* SAP: [Server-Side JavaScript Security Considerations](https://help.sap.com/docs/SAP_HANA_PLATFORM/d89d4595fae647eabc14002c0340a999/e8a6bc904c0c48a182288604f467e84a.html).
* OWASP: [Cross-Site Request Forgery (CSRF)](https://www.owasp.org/index.php/Cross-Site_Request_Forgery_(CSRF)).
* Common Weakness Enumeration: [CWE-352](https://cwe.mitre.org/data/definitions/352.html).
