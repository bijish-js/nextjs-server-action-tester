#!/usr/bin/env node

const setup = require("./setup");
const scan = require("./scan");

async function main() {
	try {
		const result = await setup();

		if (result?.success) {
			scan();
		} else {
			console.error('❌ Scanning cannot be performed.');
		}
	} catch (error) {
		console.error('❌ An error occurred during the process:', error?.message);
	}
}

main();
