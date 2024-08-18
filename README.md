# nextjs-server-action-tester

**`nextjs-server-action-tester`** is a tool for scanning and testing server actions in Next.js projects. It automates setup, generates metadata, and provides a UI to list, search, and execute server functions. It supports both JavaScript and TypeScript, with customizable configurations and light/dark mode options.

![nextjs-server-action-tester](https://github.com/user-attachments/assets/0dbf3b6e-3ac5-44eb-9769-417c0d992c27)

## Video Demonstration 🎥

Watch the video demonstration of the `nextjs-server-action-tester` tool to see how it works in action:

[![Next.js Server Action Tester Video](https://img.youtube.com/vi/ypyj3fUJJlo/0.jpg)](https://youtu.be/ypyj3fUJJlo?si=r_XBQrp11cawbe5j)


## Table of Contents 📑

- [Installation](#Installation)
- [Usage](#Usage)
- [Setup Process](#Setup-Process)
- [Configuration](#Configuration)
- [Scanning](#Scanning)
- [Flow of Execution](#Flow-of-Execution)
- [UI Functionality](#UI-Functionality)
- [Generated Files and Changes](#Generated-Files-and-Changes)
- [Contributing](#Contributing)
- [License](#License)

## Installation ⚙️

To install the package, run the following command in your project directory:

```bash
npm install nextjs-server-action-tester
```

## Usage 🚀

After installation, you can use the `actions-scan` command to scan and test server actions in your Next.js project:

```bash
npx actions-scan
```

This command will set up the necessary files for testing server actions and  initiate the scanning process.

## Setup Process 🛠️

The setup process involves several steps:

### Next.js Version Check

- **Verifies that the project is using Next.js version 14 or above.** This ensures compatibility with the features required by the tool.
- **If the version is below 14,** the setup process exits with an error message indicating that the library cannot be used with older versions.

### Project Structure Detection

- **Determines if the project uses a `src` folder.** This affects file locations and path resolutions.
- **Checks if the project is using TypeScript or JavaScript.** The configuration setup will differ based on this.

### Configuration File Setup

- **For TypeScript Projects:** Updates path aliases in `tsconfig.json` to ensure proper resolution of imports and exports.
- **For JavaScript Projects:**
  - **If `jsconfig.json` exists:** Updates path aliases.
  - **If `jsconfig.json` does not exist:** Creates a new `jsconfig.json` with the necessary path aliases.

### File Copying

- **Copies the appropriate page and API files** to the project directory based on the detected setup (TypeScript/JavaScript and the presence of the `src` folder).
- **Replaces placeholders** in the copied files with values from the configuration, such as the API name and actions path filename.

### Git Ignore Update

- **Adds relevant files and paths** to the `.gitignore` file under the `# nextjs-server-action-tester` comment to ensure they are excluded from version control.

## Configuration 🔧

Create a `nextServerActionTesterConfig.js` file in the root of your project to customize:

```jsx
const config = {
	apiName: "list-actions",
	pageName: "list-actions",
	actionsPathFileName: "server-actions",
	excludeDirs: ['node_modules', '.git', '.next'],
	maxDepth: 10,
}

module.exports = config
```

- **`apiName`:** Name of the API route for handling actions.
- **`pageName`:** Name of the page where actions are listed and tested. e.g., [http://localhost:3000/list-actions](http://localhost:3000/list-actions).
- **`actionsPathFileName`:** Name of the JSON file created in the `public` directory containing metadata.
- **`excludeDirs`:** List of directories to exclude from  scanning.
- **`maxDepth`:** Maximum depth for scanning the project directory (default is 10).

## Scanning 🔍

1. The **scanning process** in the `nextjs-server-action-tester` tool utilizes [`@babel/parser`](https://www.npmjs.com/package/@babel/parser) and [`@babel/traverse`](https://www.npmjs.com/package/@babel/traverse) to parse JavaScript/TypeScript code into an Abstract Syntax Tree (AST) and analyze it for functions marked with the 'use server' directive.
2. The tool reads the project setup, generates ASTs for relevant files, and identifies server actions by traversing the AST to extract function names and types.
3. It then compiles metadata about these actions into a JSON file and creates an aggregator file with import and export statements for easier management.
4. The result is a comprehensive setup that documents server actions and prepares them for testing.

## Flow of Execution 🔄

1. **Run `npx actions-scan`:** Triggers the scanning process.
2. **Setup Phase:** Checks the Next.js version, project structure, and creates or updates configuration files as needed.
3. **File Management:** Copies necessary files and updates the `.gitignore` file.
4. **Scan and Metadata Generation:** Scans the codebase for server actions and generates a metadata JSON file.
5. **UI Setup:** Adds a new page and API route for interacting with the server actions.

## UI Functionality 💻

The UI provided by the tool offers:

- **Listing Server Actions:** View all detected server actions.
- **Search Functionality:** Find specific server actions.
- **Execution of Server Functions:** Run server functions with parameters and view results.
- **Parameter Input:** Enter parameters for server functions.
- **Light and Dark Mode:** Switch between light and dark themes.
- **Result Display:** Show the output of executed server actions.

## Generated Files and Changes 📂

- **Configuration Files:** `tsconfig.json` or `jsconfig.json` updated or created.
- **Page and API Files:** Copied to your project with necessary modifications.
- **Metadata JSON File:** Generated in the `public` directory.
- **Git Ignore Updates:** New entries added under `# nextjs-server-action-tester`.

## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request with improvements or bug fixes.

## License 📜

This project is licensed under the ISC License.

For more detailed information or specific use cases, please refer to the [GitHub repository](https://github.com/bijish-js/nextjs-server-action-tester) or contact the [maintainer](https://bijishob.com).

