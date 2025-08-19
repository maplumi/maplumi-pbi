import powerbiVisualsConfigs from "eslint-plugin-powerbi-visuals";

export default [
    powerbiVisualsConfigs.configs.recommended,
    {
        ignores: [
            "node_modules/**", 
            "dist/**", 
            ".vscode/**", 
            ".tmp/**",
            "scripts/**",  // Ignore scripts directory for now
            "coverage/**",
            "tests/**"
        ],
    },
    {
        files: ["**/*.ts"],
        languageOptions: {
            parserOptions: {
                project: ["./tsconfig.eslint.json"],
                tsconfigRootDir: process.cwd(),
            },
        },
    },
    {
        // Configuration for Node.js TypeScript scripts
        files: ["scripts/*.ts"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                console: "readonly",
                process: "readonly"
            }
        },
        rules: {
            // Allow console.log in scripts
            "no-console": "off"
        }
    }
];