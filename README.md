# CodeQL: SAP JavaScript frameworks
This repository contains [CodeQL](https://codeql.github.com/) models and queries for SAP JavaScript frameworks:
- [CAP](javascript/frameworks/cap) (https://cap.cloud.sap/)
- [UI5](javascript/frameworks/ui5) (https://sapui5.hana.ondemand.com/)
- [XSJS](javascript/frameworks/xsjs) (https://www.npmjs.com/package/@sap/async-xsjs)

### Published CodeQl packs
- [advanced-security/javascript-sap-cap-queries](https://github.com/advanced-security/codeql-sap-js/pkgs/container/javascript-sap-cap-queries)
- [advanced-security/javascript-sap-ui5-queries](https://github.com/advanced-security/codeql-sap-js/pkgs/container/javascript-sap-ui5-queries)
- [advanced-security/javascript-sap-async-xsjs-queries](https://github.com/advanced-security/codeql-sap-async-xsjs/pkgs/container/javascript-sap-async-xsjs-queries)

## Usage 

### Building the CodeQL database

1. Include and index XML, JSON and CDS files by setting the necessary environment variables:
```
export LGTM_INDEX_XML_MODE='ALL'
export LGTM_INDEX_FILETYPES=$'.json:JSON\n.cds:JSON'
```
2. Compile all the CDS files using the SAP cds toolkit
```
npm install -g @sap/cds-dk
for cds_file in $(find . -type f \( -iname '*.cds' \) -print)
  do
    cds compile $cds_file \
      -2 json \
      -o "$cds_file.json" \
      --locations
  done
```
3. Build the database [as usual](https://docs.github.com/en/code-security/codeql-cli/codeql-cli-manual/database-create)
```
codeql database create <DB_NAME> --language=javascript
```

### Analyzing the database with [Code Scanning](https://docs.github.com/en/code-security/code-scanning/creating-an-advanced-setup-for-code-scanning/customizing-your-advanced-setup-for-code-scanning#using-query-packs)
Example [configuration file](https://github.com/advanced-security/codeql-sap-js/blob/main/.github/codeql/codeql-config.yaml#L3-L7).
 
### Analyzing the database with the [CodeQL CLI](https://docs.github.com/en/code-security/codeql-cli/using-the-advanced-functionality-of-the-codeql-cli/publishing-and-using-codeql-packs#using-a-codeql-pack-to-analyze-a-codeql-database)
Example:
```
codeql database analyze <DB_NAME> advanced-security/javascript-sap-ui5-queries --download --format=sarif-latest --output=<OUTPUT_FILE>
```

## License

The code in this repository is licensed under the [MIT License](LICENSE) by [GitHub](https://github.com).
