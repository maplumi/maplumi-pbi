#!/usr/bin/env tsx

/**
 * Power BI Visual Version Management
 * Handles 4-digit versioning throughout (no npm registry concerns)
 */

import { parseVersion, formatVersion, readProjectVersions, writeProjectVersions, ensureGitClean } from './version-utils';

type VersionType = 'major' | 'minor' | 'patch' | 'build';

interface PackageJson {
    version: string;
    [key: string]: any;
}

interface PbivizJson {
    visual: {
        version: string;
        [key: string]: any;
    };
    version: string;
    [key: string]: any;
}

function incrementVersion(type: VersionType = 'build'): void {
    try {
        const { packageJson, pbivizJson, packagePath, pbivizPath } = readProjectVersions();
        const current = parseVersion(packageJson.version);

        const semantic = ['major','minor','patch'];
        if (semantic.includes(type.toLowerCase())) {
            ensureGitClean();
        }

        let next = { ...current };
        switch (type.toLowerCase()) {
            case 'major':
                next = { ...next, major: next.major + 1, minor: 0, patch: 0, build: 0 };
                break;
            case 'minor':
                next = { ...next, minor: next.minor + 1, patch: 0, build: 0 };
                break;
            case 'patch':
                next = { ...next, patch: next.patch + 1, build: 0 };
                break;
            case 'build':
            default:
                next = { ...next, build: next.build + 1 };
                break;
        }

        const newVersion = formatVersion(next);
        writeProjectVersions(newVersion, { packageJson, pbivizJson, packagePath, pbivizPath });
        console.log(`✅ Version incremented (${type}): ${current.sanitized} → ${newVersion}`);
        console.log(`   📦 package.json: ${newVersion}`);
        console.log(`   🎨 pbiviz.json: ${newVersion}`);
        
    } catch (error) {
        console.error('❌ Error incrementing version:', (error as Error).message);
        process.exit(1);
    }
}

// Get increment type from command line argument
const incrementType = (process.argv[2] as VersionType) || 'build';

// Run if called directly
if (require.main === module) {
    incrementVersion(incrementType);
}

export { incrementVersion };
