# `advanced-security/codeql-sap-js` : `extractors/README.md`

## CodeQL CDS Extractor : Overview

The CodeQL CDS Extractor is a specialized component designed to process and analyze Core Data Services (CDS) files used in SAP Cloud Application Programming (CAP) model applications. This extractor expands CodeQL's static analysis capabilities to detect security vulnerabilities, bugs, and quality issues in CDS files.

Key capabilities of the extractor include:

- Compiling `.cds` files to an intermediate JSON representation
- Handling SAP CAP dependencies and managing compiler versions
- Integrating with the JavaScript extractor for comprehensive analysis
- Converting CDS code to CodeQL's TRAP format for database inclusion
- Supporting both Windows and Unix-like environments through platform-specific wrapper scripts

The extractor operates as an extension to the JavaScript extractor, complementing its ability to analyze JavaScript, TypeScript, and JSON files with support for the CDS domain-specific language.

## CodeQL CDS Extractor : Flowchart

The following flowchart shows the flow of execution for the current implementation of the extractor.

```mermaid
flowchart TD
    COM["`export _build_cmd=<br>$(pwd)/extractors/
javascript/tools/
pre-finalize.sh`"]
    DCR[codeql database create<br>--command=$_build_cmd<br>--language=javascript<br>--search-path=./extractors/<br>--<br>/path/to/database]
    DB[(CodeQL Database)]
    DINIT[codeql database init]
    CRE[codeql resolve extractor]
    JSE[[javascript extractor]]
    DTRAC[codeql database<br>trace-command]
    SPF[[pre-finalize.sh]]
    ABCMD[[autobuild.sh/cmd]]
    ABT[[cds-extractor.ts/js]]
    ENV[[setup & validate<br>environment]]
    PDG[[build project<br>dependency graph]]
    INSTC[[install dependencies<br>with caching]]
    PROC[[process CDS files<br>to JSON]]
    PMAP[[project-aware<br>dependency resolution]]
    FIND[[find project for<br>CDS file]]
    CDCMD[[determine CDS<br>command for project]]
    COMP[[compile CDS<br>to JSON]]
    CDJ([.cds.json files])
    FILT[[configure LGTM<br>index filters]]
    JSA[[javascript extractor<br>autobuild script]]
    DIAG[[add compilation<br>diagnostics]]
    TF([CodeQL TRAP files])
    DBF[codeql database finalize<br> -- /path/to/database]

    COM ==> DCR
    DCR ==> |run internal CLI<br>plumbing command| DINIT
    DINIT ----> |--language=javascript| CRE
    CRE -..-> |/extractor/path/javascript| DINIT
    DINIT -.initialize database.-> DB

    DINIT ==> |run the<br>javascript extractor| JSE
    JSE -.-> |extract javascript files:<br>_.html, .js, .json, .ts_| DB
    JSE ==> |run autobuild within<br>the javascript extractor| DTRAC
    
    DTRAC ==> |run the build --command| SPF
    SPF ==> |run autobuilder<br>for CDS files| ABCMD
    ABCMD ==> |runs TypeScript version<br>of CDS extractor| ABT
    
    ABT ==> |setup and validate<br>environment first| ENV
    ABT ==> |build project dependency<br>graph for source root| PDG
    PDG ==> |analyze CDS projects<br>structure & relationships| PMAP
    
    ABT ==> |efficiently install<br>required dependencies| INSTC
    INSTC ==> |use cached approach for<br>dependency installation| PMAP
    
    ABT ==> |process each CDS file<br>to generate JSON files| PROC
    PROC ==> |find which project<br>contains this CDS file| FIND
    FIND ==> |uses project-aware<br>dependency resolution| PMAP
    FIND ==> |determine appropriate<br>CDS command for project| CDCMD
    
    CDCMD ==> |compile CDS file to JSON<br>with project context| COMP
    COMP ==> |generate JSON representation<br>with project awareness| CDJ
    COMP --x |if compilation fails,<br>report diagnostics| DIAG
    DIAG -.-> |diagnostics stored<br>in database| DB
    
    CDJ -.-> |stored in same location<br>as original .cds files| DB
    
    ABT ==> |configure extraction<br>filters for JSON files| FILT
    ABT ==> |run JavaScript extractor<br>to process JSON files| JSA
    JSA ==> |processes .cds.json files<br>via javascript extractor| CDJ
    
    CDJ ==> |javascript extractor<br>generates TRAP files| TF
    TF ==> |imported during<br>database finalization| DBF
    DBF ==> |finalize database and<br>cleanup temporary files| DB
```
