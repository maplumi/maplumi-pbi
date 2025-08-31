#!/usr/bin/env tsx

/**
 * CI/CD version automation for Power BI visuals
 * Supports Git-based versioning and CI environment variables
 */

import { execSync } from 'child_process';
import { sanitizeAndValidate, readProjectVersions, writeProjectVersions } from './version-utils';

interface GitInfo {
    tag: string;
    commits: number;
    hash: string;
}

function getVersionFromGit(): GitInfo {
    try {
        // Get latest git tag
        const latestTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
        
        // Get commits since tag
        const commitsSinceTag = execSync(`git rev-list ${latestTag}..HEAD --count`, { encoding: 'utf8' }).trim();
        
        // Get short commit hash
        const shortHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
        
        return {
            tag: latestTag.replace('v', ''),
            commits: parseInt(commitsSinceTag),
            hash: shortHash
        };
    } catch (error) {
        console.log('No git tags found, using base version');
        return {
            tag: '1.0.0',
            commits: 0,
            hash: 'dev'
        };
    }
}

function generateCIVersion(): void {
    try {
    const { packageJson, pbivizJson, packagePath, pbivizPath } = readProjectVersions();
        
        // Get version info
        const gitInfo = getVersionFromGit();
    const baseVersion = sanitizeAndValidate(gitInfo.tag);
        
        // CI/CD environment detection
        const isCI = process.env.CI === 'true';
        const buildNumber = process.env.BUILD_NUMBER || 
                           process.env.GITHUB_RUN_NUMBER || 
                           process.env.BUILD_ID || 
                           gitInfo.commits.toString();
        
        // Generate version based on environment
        let newVersion: string;
        if (isCI) {
            // CI: Use build number as 4th digit
            newVersion = `${baseVersion}.${buildNumber}`;
            console.log(`🤖 CI Build detected - using build number: ${buildNumber}`);
        } else {
            // Local: Use commits since tag
            newVersion = gitInfo.commits > 0 ? 
                `${baseVersion}.${gitInfo.commits}` : 
                `${baseVersion}.0`;
            console.log(`💻 Local build - commits since tag: ${gitInfo.commits}`);
        }
        
        // Ensure 4-digit format
        const versionParts = newVersion.split('.');
        while (versionParts.length < 4) {
            versionParts.push('0');
        }
        const finalVersion = versionParts.slice(0, 4).join('.');
        
        // Update files - both use same 4-digit version
        // If running on CI with a tag and SKIP_CI_WRITE=1, just echo the version (no file write)
        const isTaggedBuild = !!process.env.GITHUB_REF && process.env.GITHUB_REF.startsWith('refs/tags/');
        if (isCI && isTaggedBuild && process.env.SKIP_CI_WRITE === '1') {
            console.log(`ℹ️ Tagged CI build (no write due to SKIP_CI_WRITE=1). Version would be: ${finalVersion}`);
        } else {
            writeProjectVersions(finalVersion, { packageJson, pbivizJson, packagePath, pbivizPath });
        }
        
        console.log(`✅ Version generated: ${finalVersion}`);
        console.log(`   📦 package.json: ${finalVersion}`);
        console.log(`   🎨 pbiviz.json: ${finalVersion}`);
        console.log(`   🔖 Git tag: ${gitInfo.tag}`);
        console.log(`   📝 Commits: ${gitInfo.commits}`);
        console.log(`   🔨 Build: ${buildNumber}`);
        
    } catch (error) {
        console.error('❌ Error generating CI version:', (error as Error).message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    generateCIVersion();
}

export { generateCIVersion };
