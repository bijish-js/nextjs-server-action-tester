const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const fs = require('fs');
const path = require('path');

const YOUR_DIRECTORY="src"
const SERVER_ACTIONS_FILE_PATH=['public', 'serverActions.json']
const AGGREGATOR_PATH=['src', 'app', 'api', 'list-actions', 'aggregator.ts']

// Utility function to generate a random alphabetic string of given length
function generateRandomString(length) {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
	let result = '';
	for (let i = 0; i < length; i++) {
	  result += characters.charAt(Math.floor(Math.random() * characters.length));
	}
	return result;
  }
  
const transformPath = (func) => {
    // Remove the extensions
    const withoutExtension = func?.path?.replace(/\.(ts|js|jsx|tsx)$/, '');
    // Transform the path
    let transformedPath = `@/${withoutExtension?.split('/src/')[1]}`;
    return transformedPath;
};

// Function to analyze AST and find exported functions or arrow functions with "use server" directive
function findExportedUseServerFunctions(ast, filePath, result) {
  let hasTopLevelUseServer = false;

  // First pass to detect top-level "use server" directive
  traverse(ast, {
    Program(path) {
      const directives = path?.node?.directives || [];
      hasTopLevelUseServer = hasUseServerDirective(directives);
    }
  });

  // Map to keep track of identifiers for default exports
  const exportDefaultIdentifiers = new Map();

  // Second pass to find exported functions
  traverse(ast, {
    ExportNamedDeclaration(path) {
      const declaration = path?.node?.declaration;

      if (declaration) {
        if (declaration.type === 'FunctionDeclaration' || declaration.type === 'VariableDeclaration') {
          // Check if it's a function declaration or a variable declaration containing a function
          if (declaration.type === 'FunctionDeclaration') {
            // Function declaration
            if (hasUseServerDirective(declaration.body?.directives) || hasTopLevelUseServer) {
              result.push({ id: generateRandomString(8),name: declaration.id?.name, path: filePath,export:"named" });
            }
          } else if (declaration.type === 'VariableDeclaration') {
            // Variable declaration with function expression or arrow function
            declaration.declarations?.forEach((decl) => {
              if (decl.init && (decl.init.type === 'FunctionExpression' || decl.init.type === 'ArrowFunctionExpression')) {
                if (hasUseServerDirective(decl.init.body?.directives) || hasTopLevelUseServer) {
                  result.push({ id: generateRandomString(8),name: decl.id?.name, path: filePath,export:"named" });
                }
              }
            });
          }
        }
      }
    },
    ExportDefaultDeclaration(path) {
      const declaration = path.node?.declaration;
      if (declaration?.type === 'Identifier') {
        exportDefaultIdentifiers.set(declaration.name, filePath);
      } else if (declaration?.type === 'FunctionDeclaration') {
        // Function declaration directly exported
        if (hasUseServerDirective(declaration.body?.directives) || hasTopLevelUseServer) {
          result.push({ id: generateRandomString(8),name: declaration.id?.name, path: filePath,export:"default" });
        }
      } else if (declaration?.type === 'FunctionExpression' || declaration?.type === 'ArrowFunctionExpression') {
        // Function expression or arrow function directly exported
        if (hasUseServerDirective(declaration.body?.directives) || hasTopLevelUseServer) {
          result.push({ id: generateRandomString(8),name: 'default', path: filePath,export:"default" });
        }
      }
    }
  });

  // Third pass to resolve default exports with identifiers
  traverse(ast, {
    VariableDeclarator(path) {
      const id = path.node?.id?.name;
      if (exportDefaultIdentifiers.has(id)) {
        const init = path.node?.init;
        if (init && (init.type === 'FunctionExpression' || init.type === 'ArrowFunctionExpression')) {
          if (hasUseServerDirective(init.body?.directives) || hasTopLevelUseServer) {
            result.push({ id: generateRandomString(8),name: id, path: filePath ,export :"default"});
          }
        }
      }
    }
  });


}

// Function to check if directives contain "use server"
function hasUseServerDirective(directives)
 {
    return directives?.some(directive => directive.value?.value === 'use server');
}
// Analyze a single file
function analyzeFile(filePath, result) {
  const code = fs.readFileSync(filePath, 'utf8');
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx']
  });

  findExportedUseServerFunctions(ast, filePath, result);
}

// Scan a directory for JavaScript/TypeScript files and analyze them
function scanDirectory(dir, result) {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      scanDirectory(filePath, result);
    } else if (/\.(js|ts|jsx|tsx)$/.test(file)) {
      analyzeFile(filePath, result);
    }
  });
}

// Main function to run the analysis
function main() {
  const result = [];
  const directoryToScan = path.resolve(process.cwd(),YOUR_DIRECTORY); 
  scanDirectory(directoryToScan, result);

  result.sort((a, b) => {
	if (a.name < b.name) {
	  return -1;
	}
	if (a.name > b.name) {
	  return 1;
	}
	return 0;
  });
  console.log('Exported functions or arrow functions with "use server" directive:', result);

  const serverActionsFilePath = path.resolve(process.cwd(), ...SERVER_ACTIONS_FILE_PATH);
  fs.writeFileSync(serverActionsFilePath, JSON.stringify(result, null, 2));

  const aggregatorPath = path.resolve(process.cwd(), ...AGGREGATOR_PATH);

  let content ="";

  // Add new imports and exports with unique aliases
  result?.forEach(func => {
	const alias = `${func.name}_${func.id}`;
	let transformedPath = transformPath(func);

	const importStatement = func.export === 'default'
		? `import ${alias} from '${transformedPath}';`
		: `import { ${func.name} as ${alias} } from '${transformedPath}';`;
	
	// Check if the alias already exists in the content
	if (!content.includes(alias)) {
		content += `\n${importStatement}`;
		content += `\nexport { ${alias} };`;
	}
	});

  // Write the updated content back to the aggregator file
  fs.writeFileSync(aggregatorPath, content, 'utf-8');
}

// Execute the main function
main();
