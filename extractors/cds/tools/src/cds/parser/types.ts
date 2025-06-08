/** Context for CDS access control. */
export interface CdsAccessControl {
  /** Source file where the access control is defined. */
  sourceFile: string;

  /** Service or entity being restricted. */
  target: string;

  /** Type of restriction (e.g. 'requires', 'grant'). */
  type: string;

  /** Authorization value. */
  value: unknown;
}

/** Represents a CDS annotation. */
export interface CdsAnnotation {
  /** Name of the annotation. */
  name: string;

  /** Source file where the annotation is defined. */
  sourceFile: string;

  /** Value of the annotation. */
  value: unknown;
}

/** Represents a CDS entity definition. */
export interface CdsEntity {
  /** Annotations attached to the entity. */
  annotations: CdsAnnotation[];

  /** Parent entity or aspect if extended. */
  extends?: string;

  /** Full qualified name including namespace. */
  fqn: string;

  /** Name of the entity. */
  name: string;

  /** Properties of the entity. */
  properties: CdsProperty[];

  /** Source file where the entity is defined. */
  sourceFile: string;
}

/** Represents an entity exposed in a CDS service. */
export interface CdsExposedEntity {
  /** Annotations attached to the exposed entity. */
  annotations: CdsAnnotation[];

  /** Whether this is a projection. */
  isProjection: boolean;

  /** Name of the exposed entity in the service. */
  name: string;

  /** Source entity that is being exposed. */
  sourceEntity: string;
}

/** Represents an import reference in a CDS file. */
export interface CdsImport {
  /** Whether the import is from a module (node_modules). */
  isModule: boolean;

  /** Whether the import is relative. */
  isRelative: boolean;

  /** Path to the imported resource. */
  path: string;

  /** Original import statement. */
  statement: string;
}

/** Results of parsing CDS content. */
export interface CdsParseResult {
  /** List of access controls found. */
  accessControls: CdsAccessControl[];

  /** List of context blocks. */
  contexts: {
    entities: CdsEntity[];
    name: string;
    services: CdsService[];
  }[];

  /** List of entities found. */
  entities: CdsEntity[];

  /** Errors encountered during parsing. */
  errors: string[];

  /** List of imports found. */
  imports: CdsImport[];

  /** Namespace declared in the file. */
  namespace?: string;

  /** List of services found. */
  services: CdsService[];
}

/** Represents a property of a CDS entity. */
export interface CdsProperty {
  /** Annotations attached to the property. */
  annotations: CdsAnnotation[];

  /** Cardinality if this is an association. */
  cardinality?: 'one' | 'many';

  /** Whether this property is an association. */
  isAssociation: boolean;

  /** Whether this is a composition. */
  isComposition: boolean;

  /** Whether this property is a key. */
  isKey: boolean;

  /** Name of the property. */
  name: string;

  /** Target entity if this is an association. */
  target?: string;

  /** Data type of the property. */
  type: string;
}

/** Represents a simplified package.json file structure with only the fields we need */
export interface PackageJson {
  /** The name of the package */
  name?: string;

  /** The version of the package */
  version?: string;

  /** Production dependencies */
  dependencies?: Record<string, string>;

  /** Development dependencies */
  devDependencies?: Record<string, string>;

  /** All other fields in package.json */
  [key: string]: unknown;
}

/** File cache to avoid reading the same file multiple times */
export interface FileCache {
  /** Map of file paths to their content */
  fileContents: Map<string, string>;

  /** Map of file paths to their parsed package.json content */
  packageJsonCache: Map<string, PackageJson>;

  /** Map of file paths to their parsed CDS content */
  cdsParseCache: Map<string, CdsParseResult>;
}

/** Represents a CDS project with its directory and associated files. */
export interface CdsProject {
  /** All CDS files within this project. */
  cdsFiles: string[];

  /** Dependencies on other CDS projects. */
  dependencies?: CdsProject[];

  /** The package.json content if available. */
  packageJson?: PackageJson;

  /** The directory path of the project. */
  projectDir: string;
}

/** Extended CdsProject map with debug signals */
export interface CdsProjectMapWithDebugSignals extends Map<string, CdsProject> {
  /** Signal for successful debug parser operation */
  __debugParserSuccess?: boolean;

  /** Signal for failed debug parser operation */
  __debugParserFailure?: boolean;
}

/** Represents a CDS service definition. */
export interface CdsService {
  /** Annotations attached to the service. */
  annotations: CdsAnnotation[];

  /** Exposed entities in this service. */
  entities: CdsExposedEntity[];

  /** Full qualified name including namespace. */
  fqn: string;

  /** Name of the service. */
  name: string;

  /** Source file where the service is defined. */
  sourceFile: string;
}
