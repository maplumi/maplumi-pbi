#!/usr/bin/env tsx

/**
 * Syncs version between package.json and pbiviz.json
 * Ensures Power BI's 4-digit versioning requirement is met
 */

import { sanitizeAndValidate, readProjectVersions, writeProjectVersions } from './version-utils';

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

function syncVersions(): void {
    try {
    const { packageJson, pbivizJson, packagePath, pbivizPath } = readProjectVersions();
    const fourDigitVersion = sanitizeAndValidate(packageJson.version);
    writeProjectVersions(fourDigitVersion, { packageJson, pbivizJson, packagePath, pbivizPath });
        
        console.log(`✅ Version synced to ${fourDigitVersion}`);
        console.log(`   📦 package.json: ${fourDigitVersion}`);
        console.log(`   🎨 pbiviz.json: ${fourDigitVersion}`);
        
    } catch (error) {
        console.error('❌ Error syncing versions:', (error as Error).message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    syncVersions();
}

export { syncVersions };
