import * as lint from "tslint";
import * as ts from "typescript";

import fs = require("fs");
import path = require("path");

/**
 * Shape of data stored under "punchcard" in a package's `package.json`.
 *
 * Used to declare packages as transient for detection by this linter.
 */
interface PunchcardConfiguration {
  isTransient?: boolean;
  transientDependencies?: string[];
}

/**
 * Find transient dependencies by scanning this package's node_modules
 * and inspecting their package.json for a "punchcard" section.
 */
function findTransientDependencies(dir: string): string[] {
  const filter: string[] = [];

  // recursively scan dependencies
  const nodeModules = path.join(dir, "node_modules");
  if (fs.existsSync(nodeModules)) {
    for (const mod of fs.readdirSync(nodeModules)) {
      const modulePath = path.join(nodeModules, mod);
      if (fs.statSync(modulePath).isDirectory()) {
        if (mod.startsWith("@")) {
          for (const mod of fs.readdirSync(modulePath)) {
            findTransientDependencies(path.join(modulePath, mod)).forEach((p) =>
              filter.push(p),
            );
          }
        } else {
          findTransientDependencies(modulePath).forEach((p) => filter.push(p));
        }
      }
    }
  }

  // extract transient dependencies from package.json
  const pkgJsonPath = path.join(dir, "package.json");
  if (fs.existsSync(pkgJsonPath)) {
    const pkgJson: {
      name: string;
      punchcard?: PunchcardConfiguration;
    } = JSON.parse(fs.readFileSync(pkgJsonPath).toString("utf8"));

    if (pkgJson.punchcard !== undefined) {
      if (typeof pkgJson.punchcard === "object") {
        if (pkgJson.punchcard.isTransient === true) {
          filter.push(pkgJson.name);
        }
        if (Array.isArray(pkgJson.punchcard.transientDependencies)) {
          for (const p of pkgJson.punchcard.transientDependencies) {
            if (typeof p === "string") {
              filter.push(p);
            } else {
              throw new TypeError(
                `invalid punchcard configuration in ${pkgJsonPath}, expected 'punchcard.transientDependencies' to be a 'string[]'`,
              );
            }
          }
        }
      } else {
        throw new TypeError(
          `invalid punchcard configuration in ${pkgJsonPath}, expected 'punchcard' key to be an 'object'.`,
        );
      }
    }
  }

  return filter;
}

const transientDependenices = findTransientDependencies(process.cwd());
// eslint-disable-next-line security/detect-non-literal-regexp
const transientDependenciesRegex = new RegExp(
  `^(${[...new Set(["@aws-cdk", "webpack"].concat(transientDependenices))]
    .map((s) => s.replace("/", "\\/"))
    .join("|")}).*`,
);

export class Rule extends lint.Rules.AbstractRule {
  public static readonly metadata: lint.IRuleMetadata = {
    description: `Detects when a punchcard "transient" module is not imported as type-only`,
    options: undefined,
    optionsDescription: "Not configurable",
    rationale: `Punchcard's concept of "transient" modules are for infrastructure code that must be erased at runtime, so they must not be statically imported."`,
    ruleName: "punchcard-transient-imports",
    type: "functionality",
    typescriptOnly: true,
  };

  public static FAILURE_STRING =
    "A build-time transient module must only be imported as type-only. See punchcard/lib/core/cdk for details.";

  public apply(sourceFile: ts.SourceFile): lint.RuleFailure[] {
    return this.applyWithWalker(
      new NoTransientModulesWalker(sourceFile, this.getOptions()),
    );
  }
}

class NoTransientModulesWalker extends lint.RuleWalker {
  public visitImportEqualsDeclaration(node: ts.ImportEqualsDeclaration): void {
    if (node.moduleReference.kind === ts.SyntaxKind.ExternalModuleReference) {
      const name = node.moduleReference.expression
        .getText()
        .replace(/["']/g, "");
      // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
      if (name.match(transientDependenciesRegex)) {
        this.addFailureAtNode(
          node,
          Rule.FAILURE_STRING,
          this.createReplacement(
            node.getStart(),
            node.getEnd() - node.getStart(),
            `import type * as ${node.name.getText()} from '${name}';`,
          ),
        );
      }
      super.visitImportEqualsDeclaration(node);
    }
  }

  public visitImportDeclaration(node: ts.ImportDeclaration): void {
    const name = node.moduleSpecifier.getText().replace(/["']/g, "");
    // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
    if (name.match(transientDependenciesRegex)) {
      if (!node.importClause?.isTypeOnly) {
        this.addFailureAtNode(
          node,
          Rule.FAILURE_STRING,
          this.appendText(node.getStart() + "import".length, " type"),
        );
      }
    }
    super.visitImportDeclaration(node);
  }
}
