# CSRF protection disabled in HANA XS application

This XS application is not protected against CSRF (cross-site request forgery) because it either disables the protection or fails to enable the protection explicitly.

## Overview

A web server that receives a request from a client without verifying that it was intentionally sent might be vulnerable to Cross Site Request Forgery (CSRF). An attacker can trick a client into making an unintended request to the web server that will be treated as an authentic request. This can be done via a URL, image load, `XMLHttpRequest`, etc. and can result in exposure of data or unintended code execution.

## Recommendation

SAP’s recommendation is to use CSRF protection for any request that could be processed by a browser client by normal users.
- If `XS Advanced` is used, CSRF protection is configured with the `"csrfProtection"` property of `xs-app.json`. It is **enabled by default and should not be disabled.**
- If `XS Classic` is used, CSRF protection is configured with the `"prevent_xsrf"` property of `.xsaccess`. It is **disabled by default and should be enabled explicitly.**

## Example

The following `xs-app.json` fragment disables CSRF protection of the application it configures.

```json
"routes": [
    {
        "source": "/bad/(.*)",
        "destination": "srv_api",
        "csrfProtection": false,
        ...
    },
    ...
]
```

## References

- SAP: [XS Advanced Application Router Configuration Syntax](https://help.sap.com/docs/SAP_HANA_PLATFORM/b3d0daf2a98e49ada00bf31b7ca7a42e/a9fc5c220d744180850996e2f5d34d6c.html?version=2.0.03#loioa9fc5c220d744180850996e2f5d34d6c__section_N101F7_N10016_N10001), relavant to XS Classic applications.
- SAP: [Application-Access File Keyword Options, prevent_xsrf](https://help.sap.com/docs/SAP_HANA_PLATFORM/4505d0bdaf4948449b7f7379d24d0f0d/5f77e58ec01b46f6b64ee1e2afe3ead7.html#authenticationmethod), relevant to XS Advanced applications.
- SAP: [Server-Side JavaScript Security Considerations](https://help.sap.com/docs/SAP_HANA_PLATFORM/d89d4595fae647eabc14002c0340a999/e8a6bc904c0c48a182288604f467e84a.html).
- Common Weakness Enumeration: [CWE-352](https://cwe.mitre.org/data/definitions/352.html).
- OWASP: [Cross-Site Request Forgery (CSRF)](https://www.owasp.org/index.php/Cross-Site_Request_Forgery_(CSRF)).
