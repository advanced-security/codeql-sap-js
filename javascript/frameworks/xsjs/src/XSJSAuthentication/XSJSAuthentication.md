# Broken XSJS authentication

If you choose to use server-side JavaScript to write your application code, you need to bear in mind the potential for (and risk of) attack against authentication infrastructure. Leaks or flaws in the authentication or session management functions allow attackers to impersonate users and gain access to unauthorized systems and data.

## Recommendation

Use the built-in SAP HANA XS authentication mechanism and session management (cookies). 
- In `XS Advanced` authentication is enabled by default, the `authenticationMethod` property indicates which authentication will be applied. If set to `none` than all routes are not protected. 
- In `XS Classic` use the `authentication` keyword in the application's `.xsaccess` file to enable authentication and set it according to the method you want implement (`LogonTicket`, `Form`, or `Basic`) to ensure that all objects in the application path are available only to authenticated users.

## Example

The following `xs-app.json` fragment shows disabled XSJS authentication.

```json
{
  "welcomeFile": "index.html",
  "authenticationMethod": "none",
  ...
}  
```

## References

* SAP: [Server-Side JavaScript Security Considerations](https://help.sap.com/docs/SAP_HANA_PLATFORM/d89d4595fae647eabc14002c0340a999/2040c1b7e478448cb9904c55ac06cac8.html).
* XS Advanced: [Application Router Configuration](https://help.sap.com/docs/SAP_HANA_PLATFORM/4505d0bdaf4948449b7f7379d24d0f0d/5f77e58ec01b46f6b64ee1e2afe3ead7.html#authenticationmethod)
* XS Classic: [Authentication](https://help.sap.com/docs/SAP_HANA_PLATFORM/b3d0daf2a98e49ada00bf31b7ca7a42e/a9fc5c220d744180850996e2f5d34d6c.html?version=2.0.03&locale=en-US#authentication)
* Common Weakness Enumeration: [CWE-306](https://cwe.mitre.org/data/definitions/306.html).
