const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const fs = require('fs');
const path = require('path');
const { determineProjectSetup, getConfig } = require("./utils");

const projectSetup = determineProjectSetup();
const YOUR_DIRECTORY = projectSetup?.hasSrcDir ? "src" : "";
const SERVER_ACTIONS_FILE_PATH = ['public', 'serverActions.json'];
const AGGREGATOR_PATH = [projectSetup?.hasSrcDir ? "src" : "", 'app', 'api', getConfig()?.apiName, `aggregator.${projectSetup?.isTypeScript ? "ts" : "js"}`];

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
	// Get the current working directory
	const projectRoot = process.cwd();
	// Normalize the path to a relative path from the project root
	let relativePath = path.relative(projectRoot, func?.path);
	// Remove the file extension
	relativePath = relativePath.replace(/\.(ts|js|jsx|tsx)$/, '');
	// Construct the final transformed path
	const transformedPath = `@/${relativePath}`;
	return transformedPath;
};
function extractTypeInfo(node, filePath) {
	// Placeholder implementation to extract type information
	// Enhance this to capture more complex types
	if (node.params) {
		const parameters = node.params.map(param => {
			if (param.type === 'Identifier') {
				return { name: param.name, type: param.typeAnnotation?.typeAnnotation?.type || 'unknown' };
			}
			if (param.type === 'ObjectPattern') {
				return {
					name: param.name,
					type: 'object',
					properties: param.properties.map(prop => ({
						name: prop.key.name,
						type: prop.value.typeAnnotation?.typeAnnotation?.type || 'unknown'
					}))
				};
			}
		});
		const returnType = node.returnType?.typeAnnotation?.type || 'unknown';
		return { parameters, returnType };
	}
	return null;
}
function extractTypeInfo(node, filePath) {
	// Placeholder implementation to extract type information
	// Enhance this to capture more complex types
	if (node.params) {
		const parameters = node.params.map(param => {
			if (param.type === 'Identifier') {
				return { name: param.name, type: param.typeAnnotation?.typeAnnotation?.type || 'unknown' };
			}
			if (param.type === 'ObjectPattern') {
				return {
					name: param.name,
					type: 'object',
					properties: param.properties.map(prop => ({
						name: prop.key.name,
						type: prop.value.typeAnnotation?.typeAnnotation?.type || 'unknown'
					}))
				};
			}
		});
		const returnType = node.returnType?.typeAnnotation?.type || 'unknown';
		return { parameters, returnType };
	}
	return null;
}
function findExportedUseServerFunctions(ast, filePath, result) {
	let hasTopLevelUseServer = false;

	traverse(ast, {
		Program(path) {
			const directives = path.node.directives || [];
			hasTopLevelUseServer = hasUseServerDirective(directives);
		}
	});

	const exportDefaultIdentifiers = new Map();

	traverse(ast, {
		ExportNamedDeclaration(path) {
			const declaration = path.node.declaration;

			if (declaration) {
				if (declaration.type === 'FunctionDeclaration' || declaration.type === 'VariableDeclaration') {
					if (declaration.type === 'FunctionDeclaration') {
						if (hasUseServerDirective(declaration.body.directives) || hasTopLevelUseServer) {
							result.push({
								id: generateRandomString(8),
								name: declaration.id.name,
								path: filePath,
								export: "named",
								typeInfo: extractTypeInfo(declaration, filePath)
							});
						}
					} else if (declaration.type === 'VariableDeclaration') {
						declaration.declarations.forEach((decl) => {
							if (decl.init && (decl.init.type === 'FunctionExpression' || decl.init.type === 'ArrowFunctionExpression')) {
								if (hasUseServerDirective(decl.init.body.directives) || hasTopLevelUseServer) {
									result.push({
										id: generateRandomString(8),
										name: decl.id.name,
										path: filePath,
										export: "named",
										typeInfo: extractTypeInfo(decl.init, filePath)

									});
								}
							}
						});
					}
				}
			}
		},
		ExportDefaultDeclaration(path) {
			const declaration = path.node.declaration;
			if (declaration.type === 'Identifier') {
				exportDefaultIdentifiers.set(declaration.name, filePath);
			} else if (declaration.type === 'FunctionDeclaration') {
				if (hasUseServerDirective(declaration.body.directives) || hasTopLevelUseServer) {
					result.push({
						id: generateRandomString(8),
						name: declaration.id.name,
						path: filePath,
						export: "default",
						typeInfo: extractTypeInfo(declaration, filePath)
					});
				}
			} else if (declaration.type === 'FunctionExpression' || declaration.type === 'ArrowFunctionExpression') {
				if (hasUseServerDirective(declaration.body.directives) || hasTopLevelUseServer) {
					result.push({
						id: generateRandomString(8), name: 'default', path: filePath, export: "default",
						typeInfo: extractTypeInfo(declaration, filePath)
					});
				}
			}
		}
	});

	traverse(ast, {
		VariableDeclarator(path) {
			const id = path.node.id.name;
			if (exportDefaultIdentifiers.has(id)) {
				const init = path.node.init;
				if (init && (init.type === 'FunctionExpression' || init.type === 'ArrowFunctionExpression')) {
					if (hasUseServerDirective(init.body.directives) || hasTopLevelUseServer) {
						result.push({
							id: generateRandomString(8),
							name: id,
							path: filePath,
							export: "default",
							typeInfo: extractTypeInfo(init, filePath)
						});
					}
				}
			}
		}
	});
}

function hasUseServerDirective(directives) {
	return directives?.some(directive => directive.value.value === 'use server');
}

function analyzeFile(filePath, result) {
	const code = fs.readFileSync(filePath, 'utf8');
	const ast = parser.parse(code, {
		sourceType: 'module',
		plugins: ['typescript', 'jsx']
	});

	findExportedUseServerFunctions(ast, filePath, result);
}

function scanDirectory(dir, result, depth = 0, maxDepth = getConfig()?.maxDepth) {
	const projectConfig = getConfig()
	if (depth > maxDepth) {
		console.warn(`Max depth of ${maxDepth} reached at directory: ${dir}`);
		return;
	}

	// Directories to exclude from the scan
	const excludeDirs = ['node_modules', '.git', '.next', ...projectConfig?.excludeDirs];

	fs.readdirSync(dir).forEach(file => {
		const filePath = path.join(dir, file);
		const stat = fs.statSync(filePath);

		if (stat.isDirectory()) {
			if (!excludeDirs.includes(file)) {
				scanDirectory(filePath, result, depth + 1, maxDepth);
			}
		} else if (/\.(js|ts|jsx|tsx)$/.test(file)) {

			analyzeFile(filePath, result);
		}
	});
}

function RunAnalysis(logResult = false) {
	const result = [];
	const directoryToScan = path.resolve(process.cwd(), YOUR_DIRECTORY);

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

	if (logResult) {
		console.log(`ℹ️  Exported functions or arrow functions with "use server" directive:`, result);
	}

	const serverActionsFilePath = path.resolve(process.cwd(), ...SERVER_ACTIONS_FILE_PATH);
	fs.writeFileSync(serverActionsFilePath, JSON.stringify(result, null, 2));

	const aggregatorPath = path.resolve(process.cwd(), ...AGGREGATOR_PATH);

	let content = "";

	result?.forEach(func => {
		const alias = `${func.name}_${func.id}`;
		let transformedPath = transformPath(func);

		const importStatement = func.export === 'default'
			? `import ${alias} from '${transformedPath}';`
			: `import { ${func.name} as ${alias} } from '${transformedPath}';`;

		if (!content.includes(alias)) {
			content += `\n${importStatement}`;
			content += `\nexport { ${alias} };`;
		}
	});

	fs.writeFileSync(aggregatorPath, content, 'utf-8');
	console.log('✅ Scanning completed successfully.');
}

module.exports = RunAnalysis;
