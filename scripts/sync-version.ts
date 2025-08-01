#!/usr/bin/env tsx

/**
 * Syncs version between package.json and pbiviz.json
 * Ensures Power BI's 4-digit versioning requirement is met
 */

import * as fs from 'fs';
import * as path from 'path';

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
        // Read package.json
        const packagePath = path.join(__dirname, '..', 'package.json');
        const packageJson: PackageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        
        // Read pbiviz.json
        const pbivizPath = path.join(__dirname, '..', 'pbiviz.json');
        const pbivizJson: PbivizJson = JSON.parse(fs.readFileSync(pbivizPath, 'utf8'));
        
        // Use package.json as source of truth
        let version = packageJson.version;
        
        // Ensure 4-digit format for Power BI visuals
        const versionParts = version.split('.');
        while (versionParts.length < 4) {
            versionParts.push('0');
        }
        const fourDigitVersion = versionParts.slice(0, 4).join('.');
        
        // Update pbiviz.json to match package.json
        pbivizJson.visual.version = fourDigitVersion;
        pbivizJson.version = fourDigitVersion;
        
        // Also ensure package.json uses 4-digit version
        packageJson.version = fourDigitVersion;
        
        // Write back to both files
        fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
        fs.writeFileSync(pbivizPath, JSON.stringify(pbivizJson, null, 4));
        
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
