const fs = require('fs-extra');

const { determineProjectSetup, updatePathAliases, createJsConfig, copyFolders, prepareFilePaths, getConfig, addGitIgnoreFiles } = require("./utils")


async function setup() {
	try {
		console.log("🔄 Running setup...");
		const projectSetup = determineProjectSetup()

		// ask for is it using next js 14 version if not exit
		if (!projectSetup?.isNext14OrAbove) {
			console.error("❌ This library requires Next.js version 14 or above.");
			return { success: false }
		}
		//  add path alias if needed
		if (projectSetup.isTypeScript) {
			updatePathAliases(projectSetup, true);
		} else {
			if (fs.existsSync(projectSetup.configPath)) {
				updatePathAliases(projectSetup, true);
			} else {
				createJsConfig(projectSetup.hasSrcDir, true);
			}
		}

		// Copy folders 
		const srcFolders = prepareFilePaths(projectSetup)
		const replacements = [
			{ searchValue: '{API_NAME}', newValue: getConfig().apiName },
			{ searchValue: '{ACTIONS_PATH_FILENAME}', newValue: getConfig().actionsPathFileName }
		];
		await copyFolders(srcFolders, true, replacements)

		// add files to gitignore
		await addGitIgnoreFiles()
		console.log('✅ Setup complete.');
		return { success: true }

	} catch (error) {
		console.error('❌ Setup failed:', error);
		return { success: false }

	}
}


module.exports = setup