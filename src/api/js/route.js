"use server";

const aggregate = require("./aggregator");

export const POST = async (req) => {
	const body = await req.json();
	const { functionName, id, args } = body;

	try {
		const nameOfFunction = `${functionName}_${id}`;
		// Access the function in the module
		const action = aggregate[nameOfFunction];

		// Log the action to debug
		console.log(`Resolved action:`, action);

		// Ensure the action is a function
		if (typeof action === 'function') {
			// Execute the function with the provided arguments
			let result = null;
			if (args) {
				result = await action(...args);
			} else {
				result = await action();
			}
			console.log('Function result:', result);
			return new Response(JSON.stringify({ result: result } || "SUCCESS"), {
				status: 200,
			});
		} else {
			console.error('Action is not a function:', action);
			return new Response(JSON.stringify('FAILED'), {
				status: 400,
				statusText: 'Action is not a function',
			});
		}
	} catch (error) {
		console.error('Error loading module:', error);
		return new Response(JSON.stringify('FAILED'), {
			status: 400,
			statusText: error.message,
		});
	}
};
