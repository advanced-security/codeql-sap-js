# CodeQL: SAP JavaScript frameworks
This repository contains [CodeQL](https://codeql.github.com/) models and queries for SAP JavaScript frameworks:
- [CAP](javascript/frameworks/cap) (https://cap.cloud.sap/)
- [UI5](javascript/frameworks/ui5) (https://sapui5.hana.ondemand.com/)
- [XSJS](javascript/frameworks/xsjs) (https://www.npmjs.com/package/@sap/async-xsjs)

### Published CodeQl packs
- [advanced-security/javascript-sap-cap-queries](https://github.com/advanced-security/codeql-sap-js/pkgs/container/javascript-sap-cap-queries)
- [advanced-security/javascript-sap-ui5-queries](https://github.com/advanced-security/codeql-sap-js/pkgs/container/javascript-sap-ui5-queries)
- [advanced-security/javascript-sap-async-xsjs-queries](https://github.com/advanced-security/codeql-sap-js/pkgs/container/javascript-sap-async-xsjs-queries)

## Usage 

### Analyzing a repository with [Code Scanning](https://docs.github.com/en/code-security/code-scanning/creating-an-advanced-setup-for-code-scanning/customizing-your-advanced-setup-for-code-scanning#using-query-packs)
Example workflow file:
```yaml
jobs:
  analyze-javascript:
    name: Analyze
    runs-on: 'ubuntu-latest'
    permissions:
      security-events: write

    - name: Compile CDS files
      run: |
        npm install -g @sap/cds-dk
        for cds_file in $(find . -type f \( -iname '*.cds' \) -print)
          do
            cds compile $cds_file \
              -2 json \
              -o "$cds_file.json" \
              --locations
          done
      
    - name: Initialize CodeQL
      uses: github/codeql-action/init@v3
      with:
        languages: javascript
        config-file: .github/codeql/codeql-config.yaml

    - name: Perform CodeQL Analysis
      id: analyze
      uses: github/codeql-action/analyze@v3
      env:
        LGTM_INDEX_XML_MODE: all
        LGTM_INDEX_FILETYPES: ".json:JSON\n.cds:JSON"
```
Example configuration file:
```yaml
name: "My CodeQL config"

packs:
  # Use these packs for JavaScript and TypeScript analysis
  javascript:
    - codeql/javascript-queries:codeql-suites/javascript-security-extended.qls
    - advanced-security/javascript-sap-xsjs-queries:codeql-suites/javascript-security-extended.qls
    - advanced-security/javascript-sap-cap-queries:codeql-suites/javascript-security-extended.qls
    - advanced-security/javascript-sap-ui5-queries:codeql-suites/javascript-security-extended.qls

paths-ignore:
  - "**/node_modules"
```
### Building and analyzing the CodeQL database with the CodeQL CLI

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
4. Analyze the database using one or more packs
```
codeql database analyze <DB_NAME> --format=sarif-latest --output=<OUTPUT_FILE> \
  --download advanced-security/javascript-sap-cap-queries \
             advanced-security/javascript-sap-ui5-queries \
             advanced-security/javascript-sap-xsjs-queries
```

## License 

This project is licensed under the terms of the MIT open source license. Please refer to [MIT](LICENSE.txt) for the full terms.

## Maintainers 

See [CODEOWNERS](CODEOWNERS)

## Support

See [SUPPORT](SUPPORT.md)

