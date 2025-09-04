#!/usr/bin/env tsx

/**
 * DEPRECATED: Replaced by ci-auto-version.ts
 * Legacy CI/CD version automation for Power BI visuals.
 * Retained temporarily for reference; will be removed in a future cleanup.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface GitInfo {
    /** The base semantic tag (no build or with build .0) */
    semanticTag: string; // e.g. 1.4.2
    /** Commits since that semantic tag */
    commitsSinceSemantic: number;
    /** Short HEAD hash */
    hash: string;
}

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

/**
 * Find the most recent *semantic* tag (vX.Y.Z or vX.Y.Z.0) to serve as the base.
 * Falls back to 1.0.0 if none exists.
 */
function getVersionFromGit(): GitInfo {
    try {
        const allTagsRaw = execSync('git tag --list "v*" --sort=-v:refname', { encoding: 'utf8' }).trim();
        const tags = allTagsRaw.split(/\r?\n/).filter(Boolean);

        let semanticBase: string | undefined;
        for (const tag of tags) {
            const cleaned = tag.replace(/^v/, '');
            const parts = cleaned.split('.');
            // Accept 3-part tags OR 4-part where 4th === '0'
            if (parts.length === 3 || (parts.length === 4 && parts[3] === '0')) {
                // Ensure numeric
                if (parts.every(p => /^\d+$/.test(p))) {
                    semanticBase = parts.slice(0, 3).join('.');
                    break; // first (latest sorted) match
                }
            }
        }

        if (!semanticBase) {
            console.log('No semantic tags found (vX.Y.Z or vX.Y.Z.0). Using default 1.0.0');
            semanticBase = '1.0.0';
        }

        // Count commits since the *semantic* base tag (accept either vX.Y.Z or vX.Y.Z.0 existing)
        let commitCount = 0;
        try {
            // Prefer exact matches; check both forms
            const tagCandidates = [`v${semanticBase}`, `v${semanticBase}.0`];
            let matchedTag: string | undefined;
            for (const candidate of tagCandidates) {
                try {
                    execSync(`git rev-parse --verify ${candidate}^{commit}`, { stdio: 'ignore' });
                    matchedTag = candidate;
                    break;
                } catch {
                    /* continue */
                }
            }
            if (matchedTag) {
                const raw = execSync(`git rev-list ${matchedTag}..HEAD --count`, { encoding: 'utf8' }).trim();
                commitCount = parseInt(raw, 10) || 0;
            } else {
                // No matching tag actually exists yet (fresh repo) -> all commits count from base 1.0.0
                const raw = execSync('git rev-list HEAD --count', { encoding: 'utf8' }).trim();
                commitCount = parseInt(raw, 10) || 0;
            }
        } catch (e) {
            console.log('Unable to count commits since semantic tag; defaulting to 0');
        }

        const shortHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();

        return {
            semanticTag: semanticBase,
            commitsSinceSemantic: commitCount,
            hash: shortHash
        };
    } catch (error) {
        console.log('Git inspection failed; using fallback version 1.0.0.0');
        return {
            semanticTag: '1.0.0',
            commitsSinceSemantic: 0,
            hash: 'dev'
        };
    }
}

function generateCIVersion(): void {
    try {
        const packagePath = path.join(__dirname, '..', 'package.json');
        const pbivizPath = path.join(__dirname, '..', 'pbiviz.json');
        
        const packageJson: PackageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        const pbivizJson: PbivizJson = JSON.parse(fs.readFileSync(pbivizPath, 'utf8'));
        
        // Get version info
        const gitInfo = getVersionFromGit();
        const baseVersion = gitInfo.semanticTag; // X.Y.Z

        // Build number strategy: commits since last semantic tag unless explicitly overridden
        const override = process.env.BUILD_NUMBER || process.env.BUILD_ID;
        const buildNumber = override ? parseInt(override, 10) : gitInfo.commitsSinceSemantic;

        let newVersion = `${baseVersion}.${buildNumber}`;
        console.log(`🔧 Derived build number: ${buildNumber} (commits since semantic tag ${baseVersion})`);
        if (override) {
            console.log(`⚙️ Override environment variable detected (BUILD_NUMBER / BUILD_ID) → using ${buildNumber}`);
        }
        
        // Ensure 4-digit format
        const versionParts = newVersion.split('.');
        while (versionParts.length < 4) {
            versionParts.push('0');
        }
        const finalVersion = versionParts.slice(0, 4).join('.');
        
        // Update files - both use same 4-digit version
        packageJson.version = finalVersion;
        pbivizJson.visual.version = finalVersion;
        pbivizJson.version = finalVersion;
        
        fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
        fs.writeFileSync(pbivizPath, JSON.stringify(pbivizJson, null, 4));
        
        console.log(`✅ Version generated: ${finalVersion}`);
        console.log(`   📦 package.json: ${finalVersion}`);
        console.log(`   🎨 pbiviz.json: ${finalVersion}`);
    console.log(`   🔖 Semantic base: ${gitInfo.semanticTag}`);
    console.log(`   📝 Commits since base: ${gitInfo.commitsSinceSemantic}`);
    console.log(`   🔨 Build number used: ${buildNumber}`);
        
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
