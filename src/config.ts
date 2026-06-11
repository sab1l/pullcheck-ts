/*
 * Central configuration for runtime settings that may be overridden via environment
 * variables. Tests and other consumers import from here instead of hardcoding values inline.
 */

/**
 * The GitHub repository under test in "owner/name" format.
 * Override with the TARGET_REPO environment variable to target a different repo without
 * editing test source files.
 *
 * @example TARGET_REPO=microsoft/vscode npm test
 */
export const TARGET_REPO = process.env.TARGET_REPO ?? 'appwrite/appwrite';

/**
 * Base URL for all GitHub REST API requests.
 * Override with the GITHUB_API_BASE environment variable to target a different
 * endpoint, e.g. a GitHub Enterprise instance.
 *
 * @example GITHUB_API_BASE=https://github.example.com/api/v3 npm test
 */
export const GITHUB_API_BASE = process.env.GITHUB_API_BASE ?? 'https://api.github.com';
