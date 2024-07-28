const { addScripts } = require("./utils")

const postInstall = async () => {
	try {
		await addScripts()
	}
	catch (error) {
		console.error("😔 post install steps failed", error?.message)
	}
}

postInstall()