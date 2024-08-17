const defaultConfig = require('./defaultConfig');
const fsExtra = require('fs-extra');
const path = require('path');
const fs = require('fs');
const fsPromise = require('fs').promises;

let configCache = null;

const determineProjectSetup = () => {

	try {
		// Check if TypeScript is used
		const tsConfigPath = path.resolve(process.cwd(), 'tsconfig.json');
		const jsConfigPath = path.resolve(process.cwd(), 'jsconfig.json');
		const isTypeScript = fs.existsSync(tsConfigPath);
		const configPath = isTypeScript ? tsConfigPath : jsConfigPath;

		// Check directory structure
		const hasSrcDir = fs.existsSync(path.resolve(process.cwd(), 'src'));
		const hasAppDir = fs.existsSync(path.resolve(process.cwd(), hasSrcDir ? 'src/app' : 'app'));
		const hasPagesDir = fs.existsSync(path.resolve(process.cwd(), hasSrcDir ? 'src/pages' : 'pages'));

		// Read the existing config file if it exists
		let config = {};
		if (fs.existsSync(configPath)) {
			try {
				config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
			} catch (error) {
				console.error(`❌ Error reading ${configPath || "config path"}:`, error.message);
				return undefined

			}
		}

		// Check Next.js version
		let nextVersion;
		try {
			const packageJsonPath = path.resolve(process.cwd(), 'package.json');
			const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
			nextVersion = packageJson.dependencies.next || packageJson.devDependencies.next;
		} catch (error) {
			console.error("❌ Error reading package.json for checking next js version:", error.message);
			return undefined
		}

		const isNext14OrAbove = nextVersion && parseInt(nextVersion.split('.')[0].replace(/\D/g, '')) >= 14;

		return {
			isTypeScript,
			configPath,
			config,
			hasSrcDir,
			hasAppDir,
			hasPagesDir,
			isNext14OrAbove
		};
	}
	catch (error) {
		console.error('❌ Determining project setup failed:', error?.message);
		return undefined
	}

};

const updatePathAliases = (setup, rethrowError = false) => {
	const { config, configPath, isTypeScript } = setup;

	// Ensure compilerOptions and paths exist
	if (!config.compilerOptions) config.compilerOptions = {};
	if (!config.compilerOptions.paths) config.compilerOptions.paths = {};

	// Define the alias to be added or updated
	const aliasKey = "@next-server-actions/*";
	const aliasValue = ["./*"];

	// Add or update the alias
	config.compilerOptions.paths[aliasKey] = aliasValue;

	// Write the updated config back to the file or create the file if it doesn't exist
	try {
		fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
		console.log(`✅ ${isTypeScript ? 'tsconfig.json' : 'jsconfig.json'} updated with path alias: ${aliasKey}`);
	} catch (error) {
		console.error(`❌ Error writing to ${configPath}:`, error.message);
		if (rethrowError) {
			throw error
		}
	}
};

const createJsConfig = (hasSrcDir, rethrowError = false) => {
	const config = {
		compilerOptions: {
			baseUrl: ".",
			paths: {
				"@next-server-actions/*": ["./*"]
			}
		},
		include: ["**/*.js", "**/*.jsx"],
		exclude: ["node_modules"]
	};

	try {
		fs.writeFileSync(path.resolve(process.cwd(), 'jsconfig.json'), JSON.stringify(config, null, 2), 'utf8');
		console.log(`✅ Created jsconfig.json with path alias: @/*`);
	} catch (error) {
		console.error(`❌ Error creating jsconfig.json:`, error.message);
		if (rethrowError) {
			throw error
		}
	}
};
const loadConfig = () => {
	const projectRoot = process.cwd();
	const configPath = path.join(projectRoot, 'nextServerActionTesterConfig.js');

	let userConfig = {};


	try {
		if (require.resolve(configPath)) {
			delete require.cache[require.resolve(configPath)];
			userConfig = require(configPath);
		}
	} catch (error) {
		console.error(
			'ℹ️ Could not found nextServerActionTesterConfig.js file. Using default configuration.');
	}


	const finalConfig = {
		...defaultConfig,
		...userConfig,
	};

	configCache = finalConfig;
}

const configChangeListener = () => {
	// Watch for changes to nextServerActionTesterConfig.js
	const projectRoot = process.cwd();
	const configPath = path.join(projectRoot, 'nextServerActionTesterConfig.js');

	if (fs.existsSync(configPath)) {
		fs.watch(configPath, (eventType, filename) => {
			if (eventType === 'change' || eventType === 'rename') {
				console.log('ℹ️ Next server action tester config file changed, reloading...');
				loadConfig();
			}
		});
	} else {
		console.warn('⚠️ Next server action tester config file does not exist.');
	}

}

const getConfig = () => {
	if (!configCache) {
		loadConfig();
	}
	return configCache;
}


const prepareFilePaths = (setup) => {
	const extension = setup.isTypeScript ? 'ts' : 'js';
	const baseDir = setup.hasSrcDir ? 'src' : '';

	const config = getConfig();
	if (!config) {
		throw new Error('Configuration not found. Please check your setup.');
	}

	const folders = [
		// api folder
		{ src: path.join('api', extension), dest: path.join(baseDir, 'app', 'api', config.apiName) },
		// page folder
		{ src: path.join('page', extension), dest: path.join(baseDir, 'app', config.pageName) },

		// Add more folders as needed
	];

	return folders;
};

const copyFolders = async (srcFolders, rethrowError = false, replacements) => {
	try {
		if (!Array.isArray(srcFolders) || srcFolders.length === 0) {
			console.error("❌ No folders to copy.");
			return;
		}

		await Promise.all(srcFolders.map(async (folder) => {
			if (!folder.src || !folder.dest) {
				console.error(`❌ Invalid folder paths: ${JSON.stringify(folder)}`);
				return;
			}

			const srcPath = path.resolve(__dirname, folder?.src);
			const destPath = path.resolve(process.cwd(), folder?.dest);

			await fsExtra.copy(srcPath, destPath, {
				overwrite: true
			});

			// Optimize by batching file processing and using async map
			const allFiles = await collectFiles(destPath);
			await Promise.all(allFiles.map((filePath) => replaceText(filePath, replacements)));
		}));

		console.log("✅ Folders copied and text replaced successfully.");
	}
	catch (error) {
		console.error("❌ Error occurred while copying folders:", error?.message);
		if (rethrowError) {
			throw error;
		}
	}
};

const collectFiles = async (folderPath) => {

	try {
		const files = await fsPromise.readdir(folderPath);
		const filePaths = await Promise.all(files.map(async (file) => {
			const filePath = path.join(folderPath, file);
			const stats = await fsPromise.stat(filePath);
			if (stats.isFile()) {
				return filePath;
			} else if (stats.isDirectory()) {
				return collectFiles(filePath); // Recursively collect files
			}
		}));
		return filePaths.flat(); // Flatten the array of file paths

	}
	catch (error) {
		throw error;
	}

};

const replaceText = async (filePath, replacements) => {
	try {
		const content = await fsPromise.readFile(filePath, 'utf8');
		let newContent = content;
		replacements.forEach(({ searchValue, newValue }) => {
			const regex = new RegExp(searchValue, 'g');
			newContent = newContent.replace(regex, newValue);
		});
		if (newContent !== content) {
			await fsPromise.writeFile(filePath, newContent, 'utf8');
		}
	} catch (error) {
		console.error(`❌ Error occurred while replacing text in file ${filePath}:`, error.message);
		throw error;
	}
};

const addGitIgnoreFiles = async () => {
	try {
		const projectSetup = determineProjectSetup();
		const config = getConfig();
		const gitIgnorePath = path.resolve(process.cwd(), '.gitignore');

		const filesToIgnore = [
			`/public/${config.actionsPathFileName}.json`,
		];

		if (projectSetup?.hasSrcDir) {
			filesToIgnore.push(
				`/src/app/api/${config.apiName}`,
				`/src/app/${config.pageName}`,
			);
		} else {
			filesToIgnore.push(
				`/app/api/${config.apiName}`,
				`/app/${config.pageName}`,
			);
		}

		// Define the comment marker
		const commentMarker = '# nextjs-server-action-tester';

		// Check if .gitignore exists, and create it if it doesn't
		let existingContent = '';
		try {
			existingContent = await fsPromise.readFile(gitIgnorePath, 'utf8');
		} catch (error) {
			if (error.code === 'ENOENT') {
				// File doesn't exist, we'll create it
				await fsPromise.writeFile(gitIgnorePath, '');
			} else {
				throw error;
			}
		}

		// Split the existing content into lines
		const existingLines = existingContent.split('\n');

		// Find the index of the comment marker
		let markerIndex = existingLines.findIndex(line => line.trim() === commentMarker);

		// If the marker doesn't exist, add it to the end
		if (markerIndex === -1) {
			existingLines.push('', commentMarker);
			markerIndex = existingLines.length - 1;
		}

		// Filter out files that are already in .gitignore
		const newFilesToIgnore = filesToIgnore.filter(file => !existingLines.includes(file));

		if (newFilesToIgnore.length > 0) {
			// Insert new files right after the comment marker
			existingLines.splice(markerIndex + 1, 0, ...newFilesToIgnore);

			// Join the lines back into a single string
			const updatedContent = existingLines.join('\n');

			// Write the updated content back to the file
			await fsPromise.writeFile(gitIgnorePath, updatedContent);
			console.log('✅ Successfully updated .gitignore');
		} else {
			console.log('ℹ️ No new files to add to .gitignore');
		}
	} catch (error) {
		console.error("❌ Adding items to .gitignore failed:", error?.message);
	}
};



module.exports = {
	determineProjectSetup,
	loadConfig,
	configChangeListener,
	getConfig,
	prepareFilePaths,
	copyFolders,
	updatePathAliases,
	createJsConfig,
	replaceText,
	addGitIgnoreFiles
}
