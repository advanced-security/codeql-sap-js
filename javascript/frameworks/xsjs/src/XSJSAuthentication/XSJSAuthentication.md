# Authentication not enforced in HANA XS application

This HANA XS application does not enforce authentication on the requests it handles.

## Overview

SAP HANA XS applications are called via HTTP requests to process a connected HANA database, and this makes it critical to authenticate the sender of the request. Failing to do so allows attackers to impersonate users and gain access to underlying systems and data.

## Recommendation

Use the built-in SAP HANA XS authentication mechanism and session management (cookies).
- If `XS Advanced` is used, authentication **is enabled by default**, and the `authenticationMethod` property indicates which authentication will be applied. However, avoid setting the property to something else than `none`, as doing so turns off all authentication on all routes.
- If `XS Classic` is used, authentication is **not enabled by default**, so the `authentication` property in the application's `.xsaccess` file should be set to enable authentication. Set the value of the property according to the method you want to implement (`LogonTicket`, `Form`, or `Basic`).

## Example

The fragment from an `xs-app.json` file shows the application in question having its authentication explicitly disabled.

```json
{
  "welcomeFile": "index.html",
  "authenticationMethod": "none",
  ...
}
```

## References

- SAP: [Server-Side JavaScript Security Considerations](https://help.sap.com/docs/SAP_HANA_PLATFORM/d89d4595fae647eabc14002c0340a999/2040c1b7e478448cb9904c55ac06cac8.html).
- SAP: [XS Advanced Application Router Configuration](https://help.sap.com/docs/SAP_HANA_PLATFORM/4505d0bdaf4948449b7f7379d24d0f0d/5f77e58ec01b46f6b64ee1e2afe3ead7.html#authenticationmethod), relevant to XS Advanced applications.
- SAP: [Application-Access File Keyword Options: Authentication](https://help.sap.com/docs/SAP_HANA_PLATFORM/b3d0daf2a98e49ada00bf31b7ca7a42e/a9fc5c220d744180850996e2f5d34d6c.html?version=2.0.03&locale=en-US#authentication), relevant to XS Classic applications.
- Common Weakness Enumeration: [CWE-306](https://cwe.mitre.org/data/definitions/306.html).
