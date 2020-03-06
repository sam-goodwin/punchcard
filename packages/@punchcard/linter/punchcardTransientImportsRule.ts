import * as lint from 'tslint';
import * as ts from 'typescript';

export class Rule extends lint.Rules.AbstractRule {
  public static readonly metadata: lint.IRuleMetadata = {
    ruleName: 'punchcard-transient-imports',
    type: 'functionality',
    description: `Detects when a punchcard "transient" module is not imported as type-only`,
    options: null,
    optionsDescription: 'Not configurable',
    rationale: `Punchcard's concept of "transient" modules are for infrastructure code that must be erased at runtime, so they must not be statically imported."`,
    typescriptOnly: true,
  };

  public static FAILURE_STRING = 'A build-time transient module must only be imported as type-only. See punchcard/lib/core/cdk for details.';

  public apply(sourceFile: ts.SourceFile): lint.RuleFailure[] {
    return this.applyWithWalker(new NoTransientModulesWalker(sourceFile, this.getOptions()));
  }
}

class NoTransientModulesWalker extends lint.RuleWalker {
  public visitImportDeclaration(node: ts.ImportDeclaration) {
    const text = node.getText();
    const name = node.moduleSpecifier.getText().replace(/['"]/g, '');
    if (name.match(/^(@aws-cdk.*|webpack.*)/)) {
      console.log(text);
      console.log(`name: ${name}`);
      if (!node.importClause?.isTypeOnly) {
        this.addFailureAtNode(node, Rule.FAILURE_STRING,
          this.appendText(node.getStart() + 'import'.length, ' type'));
      }
    }
    super.visitImportDeclaration(node);
  }
}