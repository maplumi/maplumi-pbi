#!/usr/bin/env tsx

/**
 * Power BI Visual Version Management
 * Handles 4-digit versioning throughout (no npm registry concerns)
 */

import * as fs from 'fs';
import * as path from 'path';

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
        const packagePath = path.join(__dirname, '..', 'package.json');
        const pbivizPath = path.join(__dirname, '..', 'pbiviz.json');
        
        const packageJson: PackageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        const pbivizJson: PbivizJson = JSON.parse(fs.readFileSync(pbivizPath, 'utf8'));
        
        // Get current version (should be 4-digit)
        const currentVersion = packageJson.version;
        
        // Ensure 4-digit format
        const versionParts = currentVersion.split('.');
        while (versionParts.length < 4) {
            versionParts.push('0');
        }
        
        // Convert to numbers for incrementing
        const [major, minor, patch, build] = versionParts.map(Number);
        
        let newVersion: string;
        switch (type.toLowerCase()) {
            case 'major':
                newVersion = `${major + 1}.0.0.0`;
                break;
            case 'minor':
                newVersion = `${major}.${minor + 1}.0.0`;
                break;
            case 'patch':
                newVersion = `${major}.${minor}.${patch + 1}.0`;
                break;
            case 'build':
            default:
                newVersion = `${major}.${minor}.${patch}.${build + 1}`;
                break;
        }
        
        // Update both files with same version
        packageJson.version = newVersion;
        pbivizJson.visual.version = newVersion;
        pbivizJson.version = newVersion;
        
        // Write files
        fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
        fs.writeFileSync(pbivizPath, JSON.stringify(pbivizJson, null, 4));
        
        console.log(`✅ Version incremented (${type}): ${currentVersion} → ${newVersion}`);
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
