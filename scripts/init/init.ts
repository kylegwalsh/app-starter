// oxlint-disable no-await-in-loop, no-unsafe-member-access, no-unsafe-assignment -- We allow certain patterns in this script
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import axios, { AxiosError, type AxiosInstance } from 'axios';

import {
  type EmailTemplateDefinition,
  initialEmailTemplates,
} from '../../packages/email/templates/index.js';
import { promptSelect, promptUser, promptYesNo } from '../utils/input.js';
import { log } from '../utils/log.js';

// ---------- CLI HELPERS ----------
/** The CLIs we require to run the initialization script */
const CLI_REQUIREMENTS = [
  {
    name: 'bun',
    versionCmd: 'bun --version',
    url: 'https://bun.sh/docs/installation',
  },
  {
    name: 'gh',
    versionCmd: 'gh --version',
    url: 'https://github.com/cli/cli#installation',
  },
  {
    name: 'aws',
    versionCmd: 'aws --version',
    url: 'https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html',
  },
  {
    name: 'docker',
    versionCmd: 'docker --version',
    url: 'https://docs.docker.com/get-docker/',
  },
];

/** Check if the user is authenticated with GitHub CLI */
const checkGhAuth = () => {
  try {
    execSync('gh auth status');
  } catch {
    log.error("GitHub CLI is not authenticated. Please run 'gh auth login' and try again.\n");
    process.exit(1);
  }
};

/** Check if the user is authenticated with GitHub CLI */
const installSstProviders = () => {
  try {
    execSync('bun sst install', { stdio: 'inherit' });
  } catch {
    log.error("Failed to install SST providers. Please run 'bun sst install' and try again.\n");
    process.exit(1);
  }
};

/** Check if required CLIs are installed */
export const checkCLIs = () => {
  log.step('Checking CLI tools...');

  // Check to ensure the user has all the CLI tools installed
  const missing: { name: string; url: string }[] = [];
  for (const cli of CLI_REQUIREMENTS) {
    try {
      execSync(cli.versionCmd);
    } catch {
      missing.push({ name: cli.name, url: cli.url });
    }
  }
  if (missing.length > 0) {
    console.log('Missing required CLI tools:');
    for (const m of missing) {
      console.log(`- ${m.name}: ${m.url}`);
    }
    console.log('\nPlease install the missing tools and try again.');
    process.exit(1);
  }

  // Check that the user is authenticated with gh
  checkGhAuth();

  installSstProviders();

  log.success('All CLI tools are installed\n');
};

// ---------- GIT HELPERS ----------
/** Get the user's current GitHub repo (if it exists) */
const getCurrentGitUrl = () => {
  try {
    return execSync('git remote get-url origin').toString().trim();
  } catch {
    return;
  }
};

/** Configure the GitHub Url for the repo */
const configureGithubUrl = async () => {
  // Keep looping until we get a valid URL
  while (true) {
    try {
      // Get the user's current repo
      const currentUrl = getCurrentGitUrl();
      if (currentUrl) {
        console.log(`Current GitHub repo: ${currentUrl}`);
      } else {
        console.log("No GitHub remote 'origin' is set.");
      }

      let urlToUse: string | undefined;

      // Ask if they want to use a different repo
      const useDifferentRepo = await promptYesNo(
        'Would you like to use a different GitHub repo? (y/n) ',
      );
      if (useDifferentRepo) {
        let newUrl = '';

        // Loop until they provide a valid URL
        while (!newUrl) {
          const input = await promptUser('Enter new GitHub repo URL: ');
          newUrl = input.trim();
          if (!newUrl) {
            console.log('Please enter a valid GitHub repo URL.');
          }
        }

        // If they had a url already, we'll update it
        if (currentUrl) {
          execSync(`git remote set-url origin ${newUrl}`);
        }
        // Otherwise, we'll add it as a new remote
        else {
          execSync(`git remote add origin ${newUrl}`);
        }

        // Check whether it's a valid repo
        execSync(`git ls-remote ${newUrl}`);

        log.success('Updated repo\n');
        urlToUse = newUrl;
      } else {
        if (!currentUrl) {
          log.error('No GitHub URL available. Please provide a GitHub repo URL.\n');
          continue;
        }
        log.success('Using current repo\n');
        urlToUse = currentUrl;
      }

      // Validate that we can parse the repo from the URL
      if (!urlToUse) {
        log.error('Unable to configure GitHub URL. Please try again.\n');
        continue;
      }

      // Parse the repo from the URL
      const match = urlToUse.match(/[:/]([^/]+\/[^/.]+)(?:\.git)?$/);
      const repo = match ? match[1] : '';
      if (!repo) {
        log.error('Unable to parse GitHub repo from remote URL. Please verify the URL format.\n');
        continue;
      }

      return { url: urlToUse, repo };
    } catch {
      log.error(
        'Unable to connect to the provided GitHub URL. Please verify the URL and try again.\n',
      );
    }
  }
};

/** Store secrets and environment variables in GitHub using the gh CLI */
const setupGithub = async ({
  awsConfig,
  dbConfig,
  posthogConfig,
}: {
  awsConfig: Awaited<ReturnType<typeof selectOrCreateAwsProfile>>;
  dbConfig: Awaited<ReturnType<typeof setupSupabase>>;
  posthogConfig: Awaited<ReturnType<typeof setupPosthog>>;
}) => {
  log.step('Setting up GitHub...');

  // Configure the GitHub URL and extract the repo path
  const githubConfig = await configureGithubUrl();
  const { repo } = githubConfig;

  log.step('Setting up GitHub environments and secrets...');

  // Create environments (idempotent)
  execSync(
    `gh api --method PUT -H "Accept: application/vnd.github+json" repos/${repo}/environments/dev`,
  );
  execSync(
    `gh api --method PUT -H "Accept: application/vnd.github+json" repos/${repo}/environments/prod`,
  );

  // Set AWS secrets
  execSync(`gh secret set AWS_ACCESS_KEY_ID -a actions -b "${awsConfig.ci.awsAccessKey}"`);
  execSync(`gh secret set AWS_SECRET_ACCESS_KEY -a actions -b "${awsConfig.ci.awsSecretKey}"`);

  // Set sst stage (for each environment)
  execSync(`gh variable set SST_STAGE -b "dev" -e dev`);
  execSync(`gh variable set SST_STAGE -b "prod" -e prod`);

  // Set database secrets (for each environment)
  execSync(`gh secret set DATABASE_URL -a actions -b "${dbConfig.prod.dbUrl}" -e prod`);
  execSync(`gh secret set DIRECT_DATABASE_URL -a actions -b "${dbConfig.prod.directUrl}" -e prod`);
  execSync(`gh secret set DATABASE_URL -a actions -b "${dbConfig.dev.dbUrl}" -e dev`);
  execSync(`gh secret set DIRECT_DATABASE_URL -a actions -b "${dbConfig.dev.directUrl}" -e dev`);

  // If we aren't given a posthog details, we'll skip this step
  if (posthogConfig) {
    // Set up the CLI token
    execSync(`gh secret set POSTHOG_CLI_TOKEN -a actions -b "${posthogConfig.cliToken}"`);
    // Set project ids (for each environment)
    execSync(`gh variable set POSTHOG_CLI_ENV_ID -b "${posthogConfig.devProjectId}" -e dev`);
    execSync(`gh variable set POSTHOG_CLI_ENV_ID -b "${posthogConfig.prodProjectId}" -e prod`);
  }

  log.success('GitHub environments and secrets have been set up.\n');

  return githubConfig;
};

// ---------- PROJECT DETAIL HELPERS ----------
/** Matches a `key: isProd ? 'prod value' : 'dev value'` pair in the config file */
const configPairRegex = (key: string) =>
  new RegExp(String.raw`${key}:\s*isProd\s*\?\s*['"]([^'"]*)['"]\s*:\s*['"]([^'"]*)['"]`);

/** Reads a `key: isProd ? 'prod' : 'dev'` pair from the config file */
const readConfigPair = (content: string, key: string) => {
  const match = content.match(configPairRegex(key));
  return { prod: match?.[1] ?? '', dev: match?.[2] ?? '' };
};

/** Writes one or both values of a `key: isProd ? 'prod' : 'dev'` pair in the config file */
const writeConfigPair = (
  content: string,
  key: string,
  values: Partial<ReturnType<typeof readConfigPair>>,
) => {
  const pair = { ...readConfigPair(content, key), ...values };
  return content.replace(configPairRegex(key), `${key}: isProd ? '${pair.prod}' : '${pair.dev}'`);
};

/** Uncomments lines in files to enable features */
const uncommentLines = (targets: { filePath: string; line: RegExp }[]) => {
  const contents = new Map<string, string>();
  for (const { filePath, line } of targets) {
    const content = contents.get(filePath) ?? fs.readFileSync(filePath, 'utf8');
    // Only match whitespace within the line, so surrounding blank lines and line endings are kept
    const regex = new RegExp(String.raw`^([ \t]*)//[ \t]*(${line.source})(?=[ \t]*\r?$)`, 'm');
    if (!regex.test(content)) {
      return false;
    }
    contents.set(filePath, content.replace(regex, '$1$2'));
  }

  for (const [filePath, content] of contents) {
    fs.writeFileSync(filePath, content);
  }
  return true;
};

/** Prompt for and update the project name if still default */
const getProjectName = async () => {
  log.step('Checking for the project name...');
  // Check for the app name in the config file
  const configPath = path.resolve('packages/config/config.ts');
  let configContent = fs.readFileSync(configPath, 'utf8');
  const appNameMatch = configContent.match(/app:\s*{[^}]*name:\s*['"]([^'"]*)['"]/s);
  let appName = appNameMatch ? appNameMatch[1] : undefined;

  // If the app name doesn't exist, we'll prompt the user for a new one
  if (!appName || appName === 'My App') {
    // Get a new name
    let newName = '';
    while (!newName) {
      const input = await promptUser(
        "Enter a name for your project (Title Case, e.g. 'My Project'): ",
      );
      newName = input.trim();
      if (!/^([A-Z][a-z]+)( [A-Z][a-z]+)*$/.test(newName)) {
        console.log(
          "Please use Title Case (e.g. 'My Project'). Each word should start with a capital letter.",
        );
        newName = '';
      }
    }

    // Write Title Case to config.ts
    configContent = configContent.replace(
      /app:\s*{([^}]*)name:\s*(['"])[^'"]*\2/s,
      (_m, g1, quote) => `app: {${g1}name: ${quote}${newName}${quote}`,
    );
    fs.writeFileSync(configPath, configContent);

    // Convert to kebab-case for other config files
    const kebabName = newName.replaceAll(' ', '-').toLowerCase();

    // Update sst.config.ts, always use single quotes
    const sstConfigPath = path.resolve('sst.config.ts');
    let sstConfig = fs.readFileSync(sstConfigPath, 'utf8');
    sstConfig = sstConfig.replace(/name:\s*['"][^'"]*['"]/, `name: '${kebabName}'`);
    fs.writeFileSync(sstConfigPath, sstConfig);

    // Update package.json
    const pkgPath = path.resolve('package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.name = kebabName;
    fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, undefined, 2)}\n`);
    appName = newName;

    log.success(`Project name updated to: ${newName}\n`);
  } else {
    log.success(`Project name already configured: ${appName}\n`);
  }
  return appName;
};

/** Prompt for and update the website domain if still default */
export const getDomain = async () => {
  log.step('Checking for the website domain...');
  const utilsPath = path.resolve('infra/utils.ts');
  let utilsContent = fs.readFileSync(utilsPath, 'utf8');

  // Regex to match: const baseDomain = ...;
  const baseDomainRegex = /const\s+baseDomain(?:\s*:\s*string)?\s*=\s*(['"])([^'"]*)\1/;
  const match = utilsContent.match(baseDomainRegex);

  // If we don't find a match, we are missing something important in the utils file
  if (!match) {
    log.error('Could not find the baseDomain assignment in infra/utils.ts.');
    process.exit(1);
  }

  // Extract the value from the match
  const currentValue = match[2];

  // If baseDomain is set, we'll use that
  if (currentValue) {
    log.success(`Web domain already configured: ${currentValue}\n`);
    return currentValue;
  }
  // If we don't find a value, we'll prompt the user for a custom domain

  const wantsCustomDomain = await promptYesNo(
    'Would you like to use a custom domain for your app? (y/n) ',
  );

  if (!wantsCustomDomain) {
    console.log('Custom domain setup skipped.\n');
    return;
  }

  let baseDomain = '';
  while (!baseDomain) {
    const input = await promptUser('Enter your base domain (e.g., example.com): ');
    const trimmed = input.trim().toLowerCase();
    // Validate: must be a valid domain, no protocol, no subdomain, no trailing dot
    if (!/^[a-z0-9-]+\.[a-z]{2,}$/.test(trimmed)) {
      log.error(
        '\nPlease enter a valid domain (e.g., example.com). Do not include subdomains or protocols (e.g., https://).',
      );
      continue;
    }
    baseDomain = trimmed;
  }

  // Replace only the empty string at the end of the baseDomain line
  utilsContent = utilsContent.replace(baseDomainRegex, `const baseDomain = '${baseDomain}'`);
  fs.writeFileSync(utilsPath, utilsContent);
  log.success(`Web base domain set to: ${baseDomain}\n`);
  return baseDomain;
};

/** Get or create the user's personal environment stage */
export const getOrCreateStage = async () => {
  log.step("Checking for the user's personal environment stage...");

  // Check if the user has a .sst/stage file
  const stagePath = path.resolve('.sst/stage');

  // Create .sst directory if it doesn't exist
  const sstDir = path.dirname(stagePath);
  if (!fs.existsSync(sstDir)) {
    fs.mkdirSync(sstDir, { recursive: true });
  }

  if (fs.existsSync(stagePath)) {
    const stage = fs.readFileSync(stagePath, 'utf8').trim();

    // If we locate the stage value, we'll use that and skip this step
    if (stage) {
      log.success(`Using existing stage '${stage}'!\n`);
      return stage;
    }
  }

  // If we don't find a stage, we'll prompt the user to enter one
  let stage = '';
  while (!stage) {
    const input = await promptUser("Enter a name for your personal environment (e.g. 'kwalsh'): ");
    stage = input.trim();
    if (!/^[a-zA-Z0-9_-]+$/.test(stage)) {
      console.log(
        'Please use only letters, numbers, dashes, or underscores for the environment name.',
      );
      stage = '';
    }
  }

  // Write the final result to the .sst/stage file
  fs.writeFileSync(stagePath, `${stage}\n`);
  log.success(`Created .sst/stage with value '${stage}'!\n`);
  return stage;
};

/**
 * Parse the output from 'bun sst secret list' and extract all secrets
 * @param output The stdout from the secret list command
 * @returns Object containing all secrets as key-value pairs
 */
const getAllSecrets = (stage: string) => {
  const result: Record<string, string> = {};
  const output = execSync(`bun sst secret list --stage ${stage}`).toString();

  /** Extract all the lines from the output */
  const lines = output.split('\n');

  /** Track whether we're reading the fallback section's variables */
  let inFallbackSection = false;
  /** Whether we're in the dev stage */
  const isDevStage = stage === 'dev';

  for (const line of lines) {
    // Check for section headers
    if (line.startsWith('#')) {
      inFallbackSection = line.trim() === '# fallback';
      continue;
    }

    // Skip empty lines
    if (!line.trim()) {
      continue;
    }
    // For dev stage: only use fallback values
    if (isDevStage && !inFallbackSection) {
      continue;
    }
    // For other stages: skip fallback values and use stage-specific values
    if (!isDevStage && inFallbackSection) {
      continue;
    }

    // Look for lines that contain secret key-value pairs
    // Based on the format: "SECRET_NAME=secret_value"
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (match) {
      const [, key, value] = match;
      result[key] = value.trim();
    }
  }

  return result;
};

/** Script for adding secrets to SST */
const addEnvScript = path.resolve('apps/backend/scripts/add-env.ts');
/** SST secrets for dev environment */
let devSecrets: Record<string, string> = {};
/** SST secrets for prod environment */
let prodSecrets: Record<string, string> = {};

/** Initialize both our global secret variables */
const initSecrets = () => {
  devSecrets = getAllSecrets('dev');
  prodSecrets = getAllSecrets('prod');
};

// ---------- AWS HELPERS ----------
/**
 * Prompt the user to select an AWS profile or create a new one.
 * Updates ~/.aws/credentials, ~/.aws/config, .vscode/settings.json, and .zed/settings.json as needed.
 * Returns the selected profile name and credentials for personal and CI.
 */
export const selectOrCreateAwsProfile = async ({
  existing,
}: {
  existing?: boolean;
} = {}) => {
  log.step('Setting up AWS profile...');

  const homedir = os.homedir();
  const credPath = path.join(homedir, '.aws/credentials');
  const configPath = path.join(homedir, '.aws/config');
  const vscodeSettingsPath = path.resolve('.vscode/settings.json');
  const zedSettingsPath = path.resolve('.zed/settings.json');

  let profile = '';
  let accessKey = '';
  let secretKey = '';

  // If existing, read profile from vscode settings
  if (existing && fs.existsSync(vscodeSettingsPath)) {
    const settingsContent = fs.readFileSync(vscodeSettingsPath, 'utf8');
    const profileMatch = settingsContent.match(
      /"terminal\.integrated\.env\.osx"[^}]*"AWS_PROFILE"\s*:\s*"([^"]+)"/,
    );
    profile = profileMatch ? profileMatch[1] : '';
  }

  // ---------- PERSONAL CREDENTIALS ----------
  // Read existing profiles
  let profiles: string[] = [];
  if (fs.existsSync(credPath)) {
    const credContent = fs.readFileSync(credPath, 'utf8');
    profiles = [...credContent.matchAll(/^\[([^\]]+)\]/gm)].map((m) => m[1]);
  }

  // Helper function to read credentials from a profile
  const readProfileCredentials = (profileName: string) => {
    if (fs.existsSync(credPath)) {
      const credContent = fs.readFileSync(credPath, 'utf8');
      const profileRegex = new RegExp(`\\[${profileName}\\]([\\s\\S]*?)(?=\\n\\[|$)`, 'g');
      const match = profileRegex.exec(credContent);
      if (match?.[1]) {
        const sectionContent = match[1];
        const keyMatch = sectionContent.match(/aws_access_key_id\s*=\s*([^\n]+)/);
        const secretMatch = sectionContent.match(/aws_secret_access_key\s*=\s*([^\n]+)/);
        const regionMatch = sectionContent.match(/region\s*=\s*([^\n]+)/);
        return {
          accessKey: keyMatch ? keyMatch[1].trim() : '',
          secretKey: secretMatch ? secretMatch[1].trim() : '',
          region: regionMatch ? regionMatch[1].trim() : '',
        };
      }
    }
    return { accessKey: '', secretKey: '', region: '' };
  };

  // Helper function to prompt for AWS credentials and generate config entries
  const promptAndGenerateAwsConfig = async ({
    profileName,
    existingAccessKey,
    existingSecretKey,
    existingRegion,
  }: {
    profileName: string;
    existingAccessKey?: string;
    existingSecretKey?: string;
    existingRegion?: string;
  }) => {
    let accessKey = existingAccessKey;
    let secretKey = existingSecretKey;
    let region = existingRegion;

    // Prompt for access key if not provided
    if (!accessKey) {
      while (!accessKey) {
        const accessKeyInput = await promptUser('Enter AWS Access Key ID: ');
        accessKey = accessKeyInput.trim();
        if (!accessKey) {
          console.log('AWS Access Key ID cannot be empty.');
        }
      }
    }

    // Prompt for secret key if not provided
    if (!secretKey) {
      while (!secretKey) {
        const secretKeyInput = await promptUser('Enter AWS Secret Access Key: ');
        secretKey = secretKeyInput.trim();
        if (!secretKey) {
          console.log('AWS Secret Access Key cannot be empty.');
        }
      }
    }

    // Prompt for region if not provided
    if (!region) {
      const regionInput = await promptUser(
        'Enter AWS Region (press enter for default of us-east-1): ',
      );
      region = regionInput.trim() || 'us-east-1';
    }

    // Generate config entries
    const credEntry = `\n[${profileName}]\naws_access_key_id=${accessKey}\naws_secret_access_key=${secretKey}\nregion=${region}\n`;
    const configEntry = `\n[profile ${profileName}]\nregion = ${region}\n`;

    // Update AWS files
    fs.appendFileSync(credPath, credEntry);
    fs.appendFileSync(configPath, configEntry);

    return { accessKey, secretKey, region };
  };

  // If we're initializing an existing project, our flow is slightly different
  // because we want to use the same profile specified in the .vscode/settings.json
  if (existing && profile) {
    // Check if profile already exists if we're initializing for an existing project
    const locatedProfile = profiles.includes(profile);

    // If the profile exists, just read the credentials
    if (locatedProfile) {
      const credentials = readProfileCredentials(profile);
      accessKey = credentials.accessKey;
      secretKey = credentials.secretKey;
      log.success(`Using existing AWS profile: ${profile}\n`);
    }
    // If the profile from settings doesn't exist in credentials, we need to create it
    else if (!locatedProfile) {
      const choices = [
        ...profiles.map((p) => `Use existing profile: ${p}`),
        'Create new profile...',
      ];
      const selected = await promptSelect({
        message: `Profile "${profile}" not found in AWS credentials. What would you like to do?`,
        choices,
      });

      // If the user wants to create a new profile, prompt for the credentials
      if (selected === 'Create new profile...') {
        const config = await promptAndGenerateAwsConfig({
          profileName: profile,
        });
        accessKey = config.accessKey;
        secretKey = config.secretKey;

        log.success(`Created new AWS profile: ${profile}\n`);
      }
      // If they want to use an existing profile, read the credentials from the selected profile
      else {
        const sourceProfile = selected.replace('Use existing profile: ', '');
        const credentials = readProfileCredentials(sourceProfile);

        if (!(credentials.accessKey && credentials.secretKey)) {
          log.error(`Failed to read credentials from profile: ${sourceProfile}`);
          process.exit(1);
        }

        // Copy credentials to new profile with the name from settings
        const config = await promptAndGenerateAwsConfig({
          profileName: profile,
          existingAccessKey: credentials.accessKey,
          existingSecretKey: credentials.secretKey,
          existingRegion: credentials.region,
        });
        accessKey = config.accessKey;
        secretKey = config.secretKey;

        log.success(`Created AWS profile "${profile}" using credentials from "${sourceProfile}"`);
      }
    }
  }
  // Otherwise, we're initializing a new project and need to prompt the user for a profile
  else {
    const choices = [...profiles, 'Create new profile...'];
    const selected = await promptSelect({
      message: 'Which AWS profile would you like to use?',
      choices,
    });

    if (selected === 'Create new profile...') {
      // Prompt for new profile details
      while (true) {
        const profileInput = await promptUser('Enter a name for the new AWS profile: ');
        profile = profileInput.trim();
        if (!profile) {
          console.log('Profile name cannot be empty.');
          continue;
        }
        if (profiles.includes(profile)) {
          console.log('Profile already exists. Please choose a different name.');
          continue;
        }
        break;
      }

      // Get the user's AWS details
      const config = await promptAndGenerateAwsConfig({ profileName: profile });
      accessKey = config.accessKey;
      secretKey = config.secretKey;

      log.success(`Created new AWS profile: ${profile}`);
    }
    // If they want to use an existing profile, just read the credentials
    else {
      profile = selected;
      const credentials = readProfileCredentials(profile);
      accessKey = credentials.accessKey;
      secretKey = credentials.secretKey;
    }
  }

  // If we don't have any keys at this point, we'll just fail out
  if (!(accessKey && secretKey)) {
    process.exit(1);
  }

  // Set the AWS_PROFILE environment variable for the rest of this script execution
  process.env.AWS_PROFILE = profile;

  // ---------- CI CREDENTIALS ----------
  let ciAccessKey = '';
  let ciSecretKey = '';

  // If we're initializing for the first time, need to do a few things
  if (!existing) {
    // Make sure we update our .vscode/settings.json so it defaults to this AWS profile in the future
    if (fs.existsSync(vscodeSettingsPath)) {
      let settings = fs.readFileSync(vscodeSettingsPath, 'utf8');
      settings = settings.replaceAll(
        /(['"]AWS_PROFILE['"]\s*:\s*['"])[^'"]*(['"])/g,
        `$1${profile}$2`,
      );
      fs.writeFileSync(vscodeSettingsPath, settings);
      log.success(`Updated .vscode/settings.json to use AWS profile: ${profile}`);
    }

    // Make sure we update our .zed/settings.json so it defaults to this AWS profile in the future
    if (fs.existsSync(zedSettingsPath)) {
      let settings = fs.readFileSync(zedSettingsPath, 'utf8');
      settings = settings.replaceAll(
        /(['"]AWS_PROFILE['"]\s*:\s*['"])[^'"]*(['"])/g,
        `$1${profile}$2`,
      );
      fs.writeFileSync(zedSettingsPath, settings);
      log.success(`Updated .zed/settings.json to use AWS profile: ${profile}\n`);
    }

    // Ask if they want to use the same credentials for Github Actions CI
    const useSameForCI = await promptYesNo(
      'Would you like to use the same AWS credentials for your Github Actions CI deployments? (y/n) ',
    );
    if (useSameForCI) {
      ciAccessKey = accessKey;
      ciSecretKey = secretKey;
    } else {
      // Prompt for CI credentials
      while (!ciAccessKey) {
        const ciAccessKeyInput = await promptUser('Enter AWS Access Key ID for CI: ');
        ciAccessKey = ciAccessKeyInput.trim();
        if (!ciAccessKey) {
          console.log('AWS Access Key ID for CI cannot be empty.');
        }
      }
      while (!ciSecretKey) {
        const ciSecretKeyInput = await promptUser('Enter AWS Secret Access Key for CI: ');
        ciSecretKey = ciSecretKeyInput.trim();
        if (!ciSecretKey) {
          console.log('AWS Secret Access Key for CI cannot be empty.');
        }
      }
    }

    log.success('Configured AWS credentials for CI.\n');
  }

  return {
    personal: {
      awsProfile: profile,
      awsAccessKey: accessKey,
      awsSecretKey: secretKey,
    },
    ci: {
      awsProfile: 'ci',
      awsAccessKey: ciAccessKey,
      awsSecretKey: ciSecretKey,
    },
  };
};

// ---------- SUPABASE HELPERS ----------
/** Generate the URLs for the Supabase database using a template URL and password */
const generateSupabaseUrls = (baseUrl: string, password: string) => {
  // Replace the password in the base URL (between the last ':' before @ and the @)
  const urlWithPassword = baseUrl.replace(/:(?:[^:@]+)@/, `:${password}@`);
  // For DATABASE_URL: port 6543, add ?pgbouncer=true
  const dbUrl = `${urlWithPassword
    .replace(/:(\d+)(\/postgres)/, ':6543$2')
    .replace(/\?.*$/, '')}?pgbouncer=true`;
  // For DIRECT_DATABASE_URL: port 5432, no query string
  const directUrl = urlWithPassword.replace(/:(\d+)(\/postgres)/, ':5432$2').replace(/\?.*$/, '');
  return { directUrl, dbUrl };
};

/**
 * Prompt the user for a Supabase Transaction pooler URL and validate its format.
 * Keeps prompting until a valid URL is entered.
 */
const promptValidSupabaseUrl = async (promptMsg: string): Promise<string> => {
  while (true) {
    const input = await promptUser(promptMsg);
    const url = input.trim();
    if (/^postgresql:\/\/.+@.+\/postgres$/.test(url) && /aws/i.test(url)) {
      return url;
    }
    console.log(
      "Please enter a valid Supabase Transaction pooler URL (must start with 'postgresql://', contain '@', mention 'aws', and end with '/postgres').",
    );
  }
};

/**
 * Guides the user through setting up Supabase, generates DATABASE_URL and DIRECT_DATABASE_URL
 * for dev and prod, and calls the env:add script to store them.
 */
const setupSupabase = async ({ projectName }: { projectName: string }) => {
  log.step('Setting up Supabase...');

  const databaseConfig = {
    prod: {
      dbUrl: '',
      directUrl: '',
    },
    dev: {
      dbUrl: '',
      directUrl: '',
    },
  };

  // If the secrets haven't been setup yet, let's try to init them
  if (Object.keys(devSecrets).length === 0) {
    initSecrets();
  }

  // Check if Supabase is already configured
  let alreadyConfigured = false;
  // Extract database URLs from the parsed secrets
  databaseConfig.dev = {
    dbUrl: devSecrets.DATABASE_URL || '',
    directUrl: devSecrets.DIRECT_DATABASE_URL || '',
  };
  databaseConfig.prod = {
    dbUrl: prodSecrets.DATABASE_URL || '',
    directUrl: prodSecrets.DIRECT_DATABASE_URL || '',
  };

  // Check if both dev and prod have all their secrets configured
  if (
    databaseConfig.dev.dbUrl &&
    databaseConfig.prod.dbUrl &&
    databaseConfig.dev.directUrl &&
    databaseConfig.prod.directUrl
  ) {
    alreadyConfigured = true;
  }

  // See what the user would like to do if it's already setup
  if (alreadyConfigured) {
    const shouldUpdate = await promptYesNo(
      'It looks like Supabase is already configured. Would you like to update the Supabase connection? (y/n) ',
    );
    if (!shouldUpdate) {
      console.log('Skipping Supabase setup.\n');
      return databaseConfig;
    }
  }

  console.log('Sign up or log in to Supabase: https://supabase.com/dashboard/organizations');
  console.log(
    'You can have 2 free databases (dev/prod) per account. You may want to create a fresh account per project.',
  );
  await promptUser('Press enter to continue...');

  // --- Production ---
  console.log(`\nCreate a production project in Supabase (e.g. '${projectName}')`);
  const prodPassword = await promptUser(
    'Enter the password you set for your production database: ',
  );
  const prodBaseUrl = await promptValidSupabaseUrl(
    "After your project is created, click 'Connect' and copy the 'Transaction pooler' URL (starts with postgresql://...): ",
  );

  // --- Development ---
  console.log(`\nCreate a dev project in Supabase (e.g. '${projectName} (dev)')`);
  const devPassword = await promptUser('Enter the password you set for your dev database: ');
  const devBaseUrl = await promptValidSupabaseUrl(
    "After your project is created, click 'Connect' and copy the 'Transaction pooler' URL (starts with postgresql://...): ",
  );

  const prodUrls = generateSupabaseUrls(prodBaseUrl, prodPassword);
  const devUrls = generateSupabaseUrls(devBaseUrl, devPassword);

  // --- Call env:add script for each secret ---
  console.log('\nAdding Supabase secrets to SST...');
  // For prod
  execSync(
    `bun tsx ${addEnvScript} DIRECT_DATABASE_URL "${devUrls.directUrl}" "${prodUrls.directUrl}"`,
  );
  execSync(`bun tsx ${addEnvScript} DATABASE_URL "${devUrls.dbUrl}" "${prodUrls.dbUrl}"`);
  log.success('Supabase secrets have been set in SST.\n');

  // Update the config object with the new values
  databaseConfig.prod = prodUrls;
  databaseConfig.dev = devUrls;

  return databaseConfig;
};

// ---------- DATABASE MIGRATION HELPERS ----------
/** Marks all existing migrations as applied */
const applyExistingMigrations = () => {
  console.log('Marking existing database migrations as applied...\n');

  // Track which migrations failed (outside try-catch so we can access in catch)
  const failedMigrations: string[] = [];

  try {
    // Get all migration directories
    const migrationsPath = path.resolve('apps/backend/db/migrations');
    if (!fs.existsSync(migrationsPath)) {
      log.success('No existing migrations to apply.\n');
      return;
    }

    const entries = fs.readdirSync(migrationsPath, { withFileTypes: true });
    const migrationDirs = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .toSorted();

    if (migrationDirs.length === 0) {
      log.success('No existing migrations to apply.\n');
      return;
    }

    console.log(`Found ${migrationDirs.length} migration(s) to mark as applied...`);

    // Mark each migration as applied
    for (const migrationDir of migrationDirs) {
      try {
        execSync(`bun backend db:get-url "prisma migrate resolve --applied ${migrationDir}"`, {
          stdio: 'ignore',
        });
      } catch {
        // Track migrations that failed
        failedMigrations.push(migrationDir);
      }
    }

    // If any migrations failed, throw an error
    if (failedMigrations.length > 0) {
      throw new Error(`Failed to apply ${failedMigrations.length} migration(s)`);
    }

    log.success('Database migrations have been marked as applied.\n');
  } catch {
    // Print the failed migrations with dashes
    if (failedMigrations.length > 0) {
      console.log('Failed migrations:');
      for (const migration of failedMigrations) {
        console.log(`  - ${migration}`);
      }
    }

    log.warn(
      '\nCould not mark existing migrations as applied. You may need to manually apply them.\n',
    );
  }
};

// ---------- BETTER AUTH HELPERS ----------
/** Guides the user through setting up Better Auth */
const setupBetterAuth = () => {
  log.step('Setting up Better Auth...');

  // If the secrets haven't been setup yet, let's try to init them
  if (Object.keys(devSecrets).length === 0) {
    initSecrets();
  }

  // Check if BETTER_AUTH_SECRET is already configured in SST secrets
  if (devSecrets.BETTER_AUTH_SECRET && prodSecrets.BETTER_AUTH_SECRET) {
    log.success('Better Auth secret already configured.\n');
    return true;
  }

  // Generate a random 32-character string
  const randomString = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 36).toString(36),
  ).join('');

  // Add secret to SST
  console.log('Adding Better Auth secret to SST...');
  execSync(`bun tsx ${addEnvScript} BETTER_AUTH_SECRET "${randomString}" "${randomString}"`);
  log.success('Better Auth secret has been set in SST.\n');

  return true;
};

// ---------- POSTHOG HELPERS ----------
// Types for PostHog API responses
type PosthogOrg = { id: string; name: string };
type PosthogProject = { id: string; api_token: string };

/** A personal API key, as PostHog returns it to the key itself */
type PosthogPersonalApiKey = {
  scopes: string[];
  /** The projects the key is limited to (empty means every project) */
  scoped_teams?: number[] | null;
};

/**
 * Checks a setup key by reading its own scopes (any personal key can look itself up). Prints
 * what's wrong and returns undefined, or returns an API client for a key with everything setup needs.
 */
const checkPosthogSetupKey = async ({
  setupKey,
  scopes,
  projectIds,
}: {
  setupKey: string;
  scopes: SetupKeyScope[];
  /** Our project IDs, or undefined when they don't exist yet (so the key needs every project) */
  projectIds?: string[];
}) => {
  const posthogApi = axios.create({
    baseURL: `${POSTHOG_APP_HOST}/api/`,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${setupKey}` },
  });

  let key: PosthogPersonalApiKey;
  try {
    ({ data: key } = await posthogApi.get<PosthogPersonalApiKey>('personal_api_keys/@current/'));
  } catch (error) {
    // An invalid key can't look itself up
    if (error instanceof AxiosError && error.response?.status === 401) {
      log.error("That key isn't valid.");
      return;
    }
    throw error;
  }

  // "All access" keys carry `*`, otherwise every scope (or its write version) has to be there
  const keyScopes = new Set(key.scopes);
  const missingScopes = keyScopes.has('*')
    ? []
    : scopes.filter(
        (scope) => !keyScopes.has(scope) && !keyScopes.has(`${scope.split(':')[0]}:write`),
      );
  if (missingScopes.length > 0) {
    log.error(
      `That key is missing these scopes: ${missingScopes.map((scope) => SETUP_KEY_SCOPE_LABELS[scope]).join(', ')}.`,
    );
  }

  // A key limited to certain projects has to include ours (or every project, before they exist)
  const scopedTeams = key.scoped_teams ?? [];
  const hasProjectAccess =
    scopedTeams.length === 0 ||
    (!!projectIds && projectIds.every((projectId) => scopedTeams.includes(Number(projectId))));
  if (!hasProjectAccess) {
    log.error('That key is limited to certain projects. Give it access to all projects.');
  }

  if (missingScopes.length > 0 || !hasProjectAccess) {
    return;
  }
  return posthogApi;
};

/**
 * Asks for a setup key with these scopes (explaining how to create one), checks it right away,
 * and keeps asking until it's good. Setup keys are only used while setting up and never stored.
 */
const promptForPosthogSetupKey = async ({
  scopes,
  projectIds,
  setupKey: initialKey,
}: {
  scopes: SetupKeyScope[];
  /** Our project IDs, or undefined when they don't exist yet (so the key needs every project) */
  projectIds?: string[];
  /** A key from an earlier step, checked before asking for a new one */
  setupKey?: string;
}) => {
  let setupKey = initialKey;
  while (true) {
    if (!setupKey) {
      console.log(
        `\nCreate a personal API key for setup with these scopes: ${scopes.map((scope) => SETUP_KEY_SCOPE_LABELS[scope]).join(', ')}: ${POSTHOG_APP_HOST}/settings/user-api-keys`,
      );
      setupKey = await promptRequired('Enter your PostHog setup API key: ');
    }

    const posthogApi = await checkPosthogSetupKey({ setupKey, scopes, projectIds });
    if (posthogApi) {
      return { setupKey, posthogApi };
    }
    setupKey = undefined;
  }
};

/** Guides the user through setting up PostHog, including API key, org/project selection/creation, and saves config */
const setupPosthog = async ({ projectName }: { projectName: string }) => {
  log.step('Setting up PostHog...');

  const configPath = path.resolve('packages/config/config.ts');
  let configContent = fs.readFileSync(configPath, 'utf8');

  // Check if PostHog is already set up
  const apiKeyMatch = configContent.match(
    /analytics:\s*{[^}]*apiKey:\s*isProd\s*\?\s*['"]([^'"]*)['"]\s*:\s*['"]([^'"]*)['"]/,
  );
  const prodApiKey = apiKeyMatch ? apiKeyMatch[1] : undefined;
  const devApiKey = apiKeyMatch ? apiKeyMatch[2] : undefined;
  if (prodApiKey || devApiKey) {
    log.success('PostHog already configured.\n');
    return;
  }

  let setupKey: string;
  while (true) {
    try {
      // Ask if they want to set up PostHog
      console.log(
        "\nPostHog powers product analytics, error tracking, logs, and session replay, and can also send your app's emails (password resets, invitations, and contact form messages).",
      );
      console.log('We strongly recommend it for any customer-facing app.\n');
      const doSetup = await promptYesNo('Would you like to set up PostHog? (y/n) ');
      if (!doSetup) {
        console.log('PostHog setup skipped.\n');
        return;
      }

      // The setup key creates the projects now and sets up emails later, so check it can do both
      // (the projects don't exist yet, so it needs access to every project)
      console.log(
        '\nSign up or log in to PostHog (you will need to be on the pay as you go plan).',
      );
      let posthogApi: AxiosInstance;
      ({ setupKey, posthogApi } = await promptForPosthogSetupKey({
        scopes: ['organization:write', ...EMAIL_SETUP_SCOPES],
      }));

      // Try to retrieve organizations
      const orgsRes = await posthogApi.get<{ results: PosthogOrg[] }>('organizations/');
      const orgsData = orgsRes.data;

      // Create a list of organizations to choose from
      const orgChoices: { name: string; value: string }[] = orgsData.results.map((org) => ({
        name: org.name,
        value: org.id,
      }));
      orgChoices.push({ name: 'Create new organization...', value: 'new' });
      const selectedOrgId = await promptSelect({
        message: 'Select a PostHog organization:',
        choices: orgChoices.map((o) => o.name),
      });
      let orgId = orgChoices.find((o) => o.name === selectedOrgId)?.value;

      // If the user wants to create a new organization, prompt for a name and create it
      if (orgId === 'new') {
        const newOrgName = await promptUser('Enter a name for the new organization: ');
        const createOrgRes = await posthogApi.post<PosthogOrg>('organizations/', {
          name: newOrgName,
        });
        const newOrg = createOrgRes.data;
        orgId = newOrg.id;
        log.success(`Created new organization: ${newOrgName}`);
      }

      // Sanity check to narrow the types (we should never run this)
      if (!orgId) {
        throw new Error('Failed to create new organization');
      }

      // Create projects for prod and dev
      async function createProject(orgId: string, name: string): Promise<PosthogProject> {
        const res = await posthogApi.post<PosthogProject>('projects/', {
          name,
          organization: orgId,
        });
        return res.data;
      }

      console.log('\nCreating projects...');
      const prodProject = await createProject(orgId, projectName);
      const devProject = await createProject(orgId, `${projectName} (dev)`);
      log.success('PostHog projects have been created.');

      // Save the API keys in the config file, plus the project IDs (emails are sent through these projects)
      configContent = writeConfigPair(configContent, 'apiKey', {
        prod: prodProject.api_token,
        dev: devProject.api_token,
      });
      configContent = writeConfigPair(configContent, 'projectId', {
        prod: String(prodProject.id),
        dev: String(devProject.id),
      });
      fs.writeFileSync(configPath, configContent);
      log.success('PostHog has been added to the config.\n');

      // CI uploads source maps with its own key. It's stored as a GitHub secret, so it only gets
      // the one scope it needs (PostHog keys can't create other keys, so this one is made by hand)
      console.log(
        'CI uploads source maps (for readable error stack traces) with a separate key, stored as a GitHub secret.',
      );
      console.log(
        'Create a second personal API key with only "Error tracking" (write, under Error tracking, logs & tracing), so a leaked CI secret can\'t change anything else: https://app.posthog.com/settings/user-api-keys#variables',
      );
      const cliToken = await promptRequired('Enter your PostHog CI API key: ');

      log.success('\nBasic PostHog setup complete.\n');

      return {
        prodProjectId: prodProject.id,
        devProjectId: devProject.id,
        /** Error tracking only, stored in CI for source map uploads */
        cliToken,
        /** Broader access for setup (also used by the email step), never stored */
        setupKey,
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        log.error(
          `\nAn error occurred during PostHog setup: ${error.response?.data?.detail || error.message}\n\nRestarting PostHog setup...`,
        );
      } else {
        log.error(
          `\nAn error occurred during PostHog setup: ${String(error)}\n\nRestarting PostHog setup...`,
        );
      }
      // The loop will restart from the setup prompt
    }
  }
};

// ---------- SLACK HELPERS ----------
/**
 * Guides the user through setting up Slack notifications for CI.
 * If the user opts in, instructs them to install the GitHub app and run the subscribe command.
 */
const setupSlack = async ({ githubUrl }: { githubUrl: string }) => {
  const wantsSlack = await promptYesNo(
    'Would you like to receive notifications for CI in Slack? (y/n) ',
  );
  // If they don't want slack, we'll skip the rest of the setup
  if (!wantsSlack) {
    console.log('Slack setup skipped.\n');
    return;
  }

  // If they do want slack, we'll guide them through the setup
  const parsedGithubUrl = githubUrl.replace('.git', '');
  console.log('\nTo receive notifications, please:');
  console.log('1. Install the GitHub app in your Slack workspace: https://slack.github.com/');
  console.log('2. In the Slack channel where you want notifications, run the following command:');
  console.log(
    `\n/github subscribe ${parsedGithubUrl} workflows:{event:"pull_request","push" branch:"main","staging","dev"}`,
  );
  await promptUser("\nPress enter to continue after you've set up Slack notifications...");
  log.success('Slack setup step complete.\n');
};

// ---------- CRISP CHAT HELPERS ----------
/** Guides the user through setting up Crisp chat for their site */
const setupCrispChat = async () => {
  log.step('Setting up Crisp Chat...');

  const configPath = path.resolve('packages/config/config.ts');
  let configContent = fs.readFileSync(configPath, 'utf8');

  // Check if Crisp is already set up
  const websiteIdMatch = configContent.match(/crisp:\s*{[^}]*websiteId:\s*['"]([^'"]*)['"]/);
  const websiteId = websiteIdMatch ? websiteIdMatch[1] : undefined;
  if (websiteId && websiteId !== '') {
    log.success('Crisp Chat already configured.\n');
    return;
  }

  // Ask if they want to set up Crisp Chat
  const doSetup = await promptYesNo('Would you like to set up Crisp live chat support? (y/n) ');
  if (!doSetup) {
    console.log('Crisp Chat setup skipped.\n');
    return;
  }

  // Guide the user through the setup steps
  console.log('\nSign up or log in at: https://app.crisp.chat/initiate/login/');
  console.log('1. Create a new workspace and enter your site details.');
  console.log('2. Click "Install on website" > "HTML".');
  console.log('3. Copy the CRISP_WEBSITE_ID value from the code snippet.\n');

  // Prompt for the websiteId
  let newWebsiteId = '';
  while (!newWebsiteId) {
    const input = await promptUser('Enter your CRISP_WEBSITE_ID: ');
    newWebsiteId = input.trim();
    if (!/^[a-zA-Z0-9-]+$/.test(newWebsiteId)) {
      console.log('Please enter a valid CRISP_WEBSITE_ID (alphanumeric and hyphens only).');
      newWebsiteId = '';
    }
  }

  // Save the websiteId to config.ts
  configContent = configContent.replace(
    /websiteId:\s*['"][^'"]*['"]/, // match both single and double quotes
    `websiteId: '${newWebsiteId}'`,
  );
  fs.writeFileSync(configPath, configContent);
  log.success('Crisp Chat websiteId saved to config.\n');
};

// ---------- DOCS SITE HELPER ----------
/** Sets up the docs site if the user wants it */
const setupDocsSite = async ({ domain }: { domain?: string }) => {
  log.step('Setting up docs site...');

  const sstConfigPath = path.resolve('sst.config.ts');
  let sstConfig = fs.readFileSync(sstConfigPath, 'utf8');

  // Check if the docs site is already enabled (uncommented in sst.config.ts)
  if (!/\/\/\s*await import\(['"]\.\/infra\/docs['"]\);/.test(sstConfig)) {
    log.success('Docs site already configured.\n');
    return;
  }

  // Ask if they want to set up the docs site
  const doSetup = await promptYesNo('Would you like to set up a website for documentation? (y/n) ');
  if (!doSetup) {
    console.log('Docs site setup skipped.\n');
    return;
  }

  // Let them know what the docs site domain will be
  if (domain) {
    log.success(
      `Docs site domain set to docs.${domain} (prod) and <stage>.docs.${domain} (other stages).`,
    );
  } else {
    log.success('Docs site will be set up without a custom domain.');
  }

  // Update sst.config.ts to uncomment the docs import
  sstConfig = sstConfig.replace(
    /\s*\/\/\s*await import\(['"]\.\/infra\/docs['"]\);/,
    '\n    await import("./infra/docs");',
  );
  fs.writeFileSync(sstConfigPath, sstConfig);
  log.success('Enabled docs site stack in sst.config.ts.\n');
};

// ---------- MARKETING SITE HELPER ----------
/** Sets up the marketing site if the user wants it */
const setupMarketingSite = async ({ domain }: { domain?: string }) => {
  log.step('Setting up marketing site...');

  const sstConfigPath = path.resolve('sst.config.ts');
  const apiPath = path.resolve('infra/api.ts');

  // Check if the marketing site is already enabled (uncommented in sst.config.ts)
  const sstConfig = fs.readFileSync(sstConfigPath, 'utf8');
  if (!/\/\/\s*await import\(['"]\.\/infra\/marketing['"]\);/.test(sstConfig)) {
    log.success('Marketing site already configured.\n');
    return;
  }

  // Ask if they want to set up the marketing site
  const doSetup = await promptYesNo(
    'Would you like to set up a marketing site (served at your root domain)? (y/n) ',
  );
  if (!doSetup) {
    console.log('Marketing site setup skipped.\n');
    return;
  }

  // Let them know what the marketing site domain will be
  if (domain) {
    log.success(
      `Marketing site domain set to ${domain} (prod) and <stage>.${domain} (other stages). The web app lives at app.${domain}.`,
    );
  } else {
    log.success('Marketing site will be set up without a custom domain.');
  }

  // Deploy the stack, and link it to the API so the backend allows its origin (CORS) for the contact form
  const isEnabled = uncommentLines([
    { filePath: sstConfigPath, line: /await import\(['"]\.\/infra\/marketing['"]\);/ },
    {
      filePath: apiPath,
      line: /const \{ marketing \} = await import\(['"]\.\/marketing['"]\);/,
    },
    { filePath: apiPath, line: /marketing,?/ },
  ]);
  if (!isEnabled) {
    log.warn(
      'Could not find every marketing line to uncomment, so nothing was changed. Uncomment `marketing` in sst.config.ts and infra/api.ts manually.\n',
    );
    return;
  }

  log.success('Enabled marketing site stack in sst.config.ts and linked it in infra/api.ts.');
  console.log(
    'The email step sets up the contact form email (or later with: bun run init:email).\n',
  );
};

// ---------- LANGFUSE HELPERS ----------
const setupLangfuse = async () => {
  // Check if Langfuse is already configured in SST secrets
  if (
    devSecrets.LANGFUSE_SECRET_KEY &&
    prodSecrets.LANGFUSE_SECRET_KEY &&
    devSecrets.LANGFUSE_PUBLIC_KEY &&
    prodSecrets.LANGFUSE_PUBLIC_KEY
  ) {
    log.success('Langfuse already configured.\n');
    return true;
  }

  const doSetup = await promptYesNo(
    'Would you like to set up Langfuse for AI traces, evals, and prompt management? (y/n) ',
  );
  if (!doSetup) {
    console.log('Langfuse setup skipped.\n');
    return false;
  }

  // Guide the user through the setup steps
  console.log('\nSign up at: https://langfuse.com/');
  console.log('1. Create an organization');
  console.log('2. Create a project');
  console.log('3. Create an API key');

  // Prompt for the API keys
  let secretKey = '';
  while (!secretKey) {
    const input = await promptUser('Enter your Langfuse Secret Key: ');
    secretKey = input.trim();
    if (!secretKey) {
      console.log('Please enter a valid Langfuse Secret Key.');
      secretKey = '';
    }
  }

  let publicKey = '';
  while (!publicKey) {
    const input = await promptUser('Enter your Langfuse Public Key: ');
    publicKey = input.trim();
    if (!publicKey) {
      console.log('Please enter a valid Langfuse Public Key.');
      publicKey = '';
    }
  }

  // Add secrets to SST
  console.log('\nAdding Langfuse secrets to SST...');
  execSync(`bun tsx ${addEnvScript} LANGFUSE_SECRET_KEY "${secretKey}" "${secretKey}"`);
  execSync(`bun tsx ${addEnvScript} LANGFUSE_PUBLIC_KEY "${publicKey}" "${publicKey}"`);

  // Uncomment secrets in infra/secrets.ts
  const secretsPath = path.resolve('infra/secrets.ts');
  uncommentLines([
    { filePath: secretsPath, line: /export const LANGFUSE_SECRET_KEY = .*/ },
    { filePath: secretsPath, line: /export const LANGFUSE_PUBLIC_KEY = .*/ },
  ]);
  log.success('Langfuse secrets have been set in SST.\n');

  return true;
};

// ---------- DAYTONA HELPERS ----------
/** Sets up Daytona, the sandbox chat runs code in */
const setupDaytona = async () => {
  // Check if Daytona is already configured in SST secrets
  if (devSecrets.DAYTONA_API_KEY && prodSecrets.DAYTONA_API_KEY) {
    log.success('Daytona already configured.\n');
    return true;
  }

  const doSetup = await promptYesNo(
    "Would you like to set up a code execution sandbox with Daytona? It lets the chat agent run Python to analyze data, make charts and open files it can't read on its own (y/n) ",
  );
  if (!doSetup) {
    console.log('Daytona setup skipped. Chat will run without code execution.\n');
    return false;
  }

  // Guide the user through the setup steps
  console.log('\nSign up at: https://app.daytona.io/');
  console.log('1. Open https://app.daytona.io/dashboard/keys and click "Create Key"');
  console.log('2. Give it the Sandboxes permissions (at least write:sandboxes)');
  console.log('3. Copy the key (it is only shown once)');

  let apiKey = '';
  while (!apiKey) {
    const input = await promptUser('Enter your Daytona API Key: ');
    apiKey = input.trim();
    if (!apiKey) {
      console.log('Please enter a valid Daytona API Key.');
    }
  }

  // Add the secret to SST and declare it, which turns code execution on for the API and web app
  console.log('\nAdding the Daytona secret to SST...');
  execSync(`bun tsx ${addEnvScript} DAYTONA_API_KEY "${apiKey}" "${apiKey}"`);
  uncommentLines([
    { filePath: path.resolve('infra/secrets.ts'), line: /export const DAYTONA_API_KEY = .*/ },
  ]);
  log.success('Daytona secret set in SST and code execution enabled.\n');

  return true;
};

// ---------- AI HELPERS ----------
/** Sets up the optional services around chat's AI (the models themselves need no setup) */
const setupAi = async () => {
  log.step('Setting up AI features...');
  console.log(
    'Chat runs on AWS Bedrock through the AWS account you configured above, so the models need no API keys.\n',
  );

  // If the secrets haven't been setup yet, let's try to init them
  if (Object.keys(devSecrets).length === 0) {
    initSecrets();
  }

  await setupLangfuse();
  await setupDaytona();
};

// ---------- EMAIL SETUP HELPERS ----------
/** PostHog's private API host (US cloud) */
const POSTHOG_APP_HOST = 'https://us.posthog.com';

/** The stages we set up email for, each with its own PostHog project */
const EMAIL_STAGES = ['dev', 'prod'] as const;
type EmailStage = (typeof EMAIL_STAGES)[number];

/** Where email setup ended up for one PostHog project */
type EmailStageResult = {
  projectId: string;
  status: 'ready' | 'configured' | 'no-sender' | 'error';
};

/** The outcome of the email step (undefined when emails were skipped) */
export type EmailSetupResult = Partial<Record<EmailStage, EmailStageResult>> | undefined;

type PosthogEmailSender = { id: number; display_name: string };
type PosthogMessageTemplate = {
  id: string;
  name: string;
  deleted?: boolean;
  transactional_hog_flow_id: string | null;
};

/** Describes an API error in one line */
const describePosthogError = (error: unknown) => {
  if (error instanceof AxiosError) {
    const detail: unknown = error.response?.data?.detail;
    return typeof detail === 'string' ? detail : error.message;
  }
  return String(error);
};

/** Every scope a setup key can need, named (and grouped) the way PostHog's key screen shows them */
const SETUP_KEY_SCOPE_LABELS = {
  'organization:write': '"Organization" (write, under Organization & account)',
  'project:write': '"Project" (write, under Organization & account)',
  'hog_flow:write': '"Workflow" (write, under Data warehouse & pipelines)',
  'integration:read': '"Integration" (read, under Setup & data management)',
} as const;
type SetupKeyScope = keyof typeof SETUP_KEY_SCOPE_LABELS;

/** The scopes email setup needs (to upload templates, find senders, and create project keys) */
const EMAIL_SETUP_SCOPES: SetupKeyScope[] = ['project:write', 'hog_flow:write', 'integration:read'];

/** The PostHog page where a project's email senders are managed */
const emailChannelsUrl = (projectId: string) =>
  `${POSTHOG_APP_HOST}/project/${projectId}/workflows/channels`;

/** Prompts until the user enters something */
const promptRequired = async (question: string) => {
  let answer = '';
  while (!answer) {
    const input = await promptUser(question);
    answer = input.trim();
  }
  return answer;
};

/** Finds the project's email sender, guiding the user to add one when there isn't one yet */
const selectEmailSender = async ({
  posthogApi,
  projectId,
  domain,
}: {
  posthogApi: AxiosInstance;
  projectId: string;
  domain?: string;
}) => {
  while (true) {
    const { data } = await posthogApi.get<{ results: PosthogEmailSender[] }>(
      `projects/${projectId}/integrations/`,
      { params: { kind: 'email' } },
    );
    const senders = data.results;

    // One sender: use it. Several: ask which one.
    if (senders.length === 1) {
      log.success(`Sending from ${senders[0].display_name}`);
      return senders[0].id;
    }
    if (senders.length > 1) {
      const choice = await promptSelect({
        message: 'Which sender should emails come from?',
        choices: senders.map((sender) => sender.display_name),
      });
      return senders.find((sender) => sender.display_name === choice)?.id;
    }

    // Without a domain there's nothing to send from yet, so this has to wait
    if (!domain) {
      console.log(
        "No email sender yet, and there's no domain to send from. Once you have one, add a sender and run: bun run init:email",
      );
      return;
    }

    // Adding a sender is only possible in the PostHog app (there's no API for it yet)
    console.log(`Add an email sender in PostHog: ${emailChannelsUrl(projectId)}`);
    console.log('Click "New channel", choose Email, and fill in:');
    console.log("  - From name: your app's name");
    console.log(
      `  - Email address: account@mail.${domain} (usually best to use a subdomain to protect main domains reputation)`,
    );
    console.log('  - MAIL FROM subdomain: feedback');
    console.log(`  - Default reply-to: an inbox you read, like support@${domain}`);
    console.log(
      `PostHog then shows DNS records to add to ${domain}. Emails only send once they're verified, but you can carry on before then.`,
    );
    const answer = await promptUser(
      'Press Enter once you have added the sender (or type "skip" to finish this later): ',
    );
    if (answer.trim().toLowerCase() === 'skip') {
      return;
    }
  }
};

/** Creates a template (or updates the one with the same name) and makes it sendable through the API */
const upsertEmailTemplate = async ({
  posthogApi,
  projectId,
  template,
  senderId,
}: {
  posthogApi: AxiosInstance;
  projectId: string;
  template: EmailTemplateDefinition;
  senderId: number;
}) => {
  const body = {
    name: template.name,
    description: template.description,
    type: 'email',
    sensitive: template.sensitive,
    content: {
      templating: 'liquid',
      email: {
        subject: template.subject,
        text: template.text,
        design: template.design,
        ...(template.replyTo && { replyTo: template.replyTo }),
      },
    },
  };

  // Templates are found again by name, so re-running setup updates them instead of duplicating them
  const templatesPath = `projects/${projectId}/messaging_templates/`;
  const { data: list } = await posthogApi.get<{ results: PosthogMessageTemplate[] }>(
    templatesPath,
    { params: { limit: 500 } },
  );
  const existing = list.results.find((item) => item.name === template.name && !item.deleted);
  const { data: saved } = existing
    ? await posthogApi.patch<PosthogMessageTemplate>(`${templatesPath}${existing.id}/`, body)
    : await posthogApi.post<PosthogMessageTemplate>(templatesPath, body);

  // Making a template transactional can't be undone, and calling it again changes nothing
  if (!saved.transactional_hog_flow_id) {
    await posthogApi.post(`${templatesPath}${saved.id}/make_transactional/`, {
      from_integration_id: senderId,
    });
  }

  log.success(`${existing ? 'Updated' : 'Created'} the "${template.name}" email`);
  return saved.id;
};

/** Creates a project secret key that can only send emails (it isn't tied to anyone's account) */
const createEmailSecretKey = async ({
  posthogApi,
  projectId,
}: {
  posthogApi: AxiosInstance;
  projectId: string;
}) => {
  try {
    const { data } = await posthogApi.post<{ value: string }>(
      `projects/${projectId}/project_secret_api_keys/`,
      { label: 'Transactional email', scopes: ['hog_flow:write'] },
    );
    log.success('Created a project secret key for sending emails.');
    return data.value;
  } catch (error) {
    // Project secret keys are rolling out gradually, so fall back to one the user creates
    console.log(
      `Couldn't create a project secret key automatically (${describePosthogError(error)}).`,
    );
    console.log(
      `Create one with "Workflows" write access: ${POSTHOG_APP_HOST}/project/${projectId}/settings/project-secret-api-keys`,
    );
    return await promptRequired('Enter the project secret key: ');
  }
};

/** Asks for the support inbox (which receives contact form messages) if it isn't set yet */
const requestSupportEmail = async () => {
  const configPath = path.resolve('packages/config/config.ts');
  const configContent = fs.readFileSync(configPath, 'utf8');
  const supportEmailRegex = /supportEmail:\s*['"]([^'"]*)['"]/;
  if (configContent.match(supportEmailRegex)?.[1]) {
    return;
  }

  console.log('\nWhich inbox should receive messages from your contact form?');
  console.log(
    'A Google Group like support@example.com works best, so several people can read and reply from one address.',
  );
  let supportEmail = '';
  while (!supportEmail.includes('@')) {
    const input = await promptUser('Support email: ');
    supportEmail = input.trim();
  }

  fs.writeFileSync(
    configPath,
    configContent.replace(supportEmailRegex, `supportEmail: '${supportEmail}'`),
  );
  log.success('Support email saved to the config.\n');
};

/**
 * Sets up transactional emails (password reset, invitations, contact form) through PostHog: finds
 * each project's sender, uploads our templates, and stores a project secret key for sending them.
 * `force` re-checks everything without asking (used by `bun run init:email`).
 */
export const setupPosthogEmail = async ({
  domain,
  personalApiKey,
  force = false,
}: {
  domain?: string;
  /** The personal API key from the PostHog step, if it ran (only used during setup, never stored) */
  personalApiKey?: string;
  force?: boolean;
}): Promise<EmailSetupResult> => {
  log.step('Setting up emails...');

  const configPath = path.resolve('packages/config/config.ts');
  let configContent = fs.readFileSync(configPath, 'utf8');

  // Emails are sent through PostHog, so it has to be set up first
  const analyticsKeys = readConfigPair(configContent, 'apiKey');
  if (!analyticsKeys.dev && !analyticsKeys.prod) {
    console.log("Emails are sent through PostHog, which isn't set up, so emails were skipped.\n");
    return undefined;
  }

  // If the secrets haven't been loaded yet, load them
  if (Object.keys(devSecrets).length === 0) {
    initSecrets();
  }

  // The templates we manage in code (emails built only in PostHog have their IDs set by hand)
  const templateKeys = Object.keys(initialEmailTemplates);

  // Check if emails are already configured (a secret key, plus every template for both projects)
  const secretKeys: Partial<Record<EmailStage, string>> = {
    dev: devSecrets.POSTHOG_SECRET_KEY,
    prod: prodSecrets.POSTHOG_SECRET_KEY,
  };
  const projectIds = readConfigPair(configContent, 'projectId');
  const isConfigured = EMAIL_STAGES.every(
    (stage) =>
      secretKeys[stage] &&
      projectIds[stage] &&
      templateKeys.every((key) => readConfigPair(configContent, key)[stage]),
  );
  if (isConfigured && !force) {
    log.success('Emails are already configured (re-check them with: bun run init:email).\n');
    return Object.fromEntries(
      EMAIL_STAGES.map((stage) => [stage, { projectId: projectIds[stage], status: 'configured' }]),
    );
  }

  // Ask if they want to send emails through PostHog
  if (!force) {
    const doSetup = await promptYesNo(
      'Would you like PostHog to send your emails (required for password reset and invitations)? (y/n) ',
    );
    if (!doSetup) {
      console.log("Email setup skipped. Password reset and invitations won't send.\n");
      return undefined;
    }
  }

  // Contact form messages are emailed to a support inbox (reload the config, since this may save it)
  await requestSupportEmail();
  configContent = fs.readFileSync(configPath, 'utf8');

  // The projects to set up (asked for if they're missing from the config)
  for (const stage of EMAIL_STAGES) {
    if (!readConfigPair(configContent, 'projectId')[stage]) {
      const projectId = await promptRequired(
        `Enter your ${stage} PostHog project ID (Project settings → Project ID): `,
      );
      configContent = writeConfigPair(configContent, 'projectId', { [stage]: projectId });
      fs.writeFileSync(configPath, configContent);
    }
  }
  const stageProjectIds = readConfigPair(configContent, 'projectId');

  // A setup key creates the templates and project keys (the PostHog step's key if it ran).
  // It's checked before anything changes.
  let posthogApi: AxiosInstance;
  try {
    ({ posthogApi } = await promptForPosthogSetupKey({
      scopes: EMAIL_SETUP_SCOPES,
      projectIds: EMAIL_STAGES.map((stage) => stageProjectIds[stage]),
      setupKey: personalApiKey,
    }));
  } catch (error) {
    // Something other than the key itself (e.g. PostHog being unreachable), so stop here
    log.error(`Couldn't check the API key: ${describePosthogError(error)}`);
    return Object.fromEntries(
      EMAIL_STAGES.map((stage) => [stage, { projectId: stageProjectIds[stage], status: 'error' }]),
    );
  }

  // Set up each PostHog project (dev, then prod)
  const results: NonNullable<EmailSetupResult> = {};
  const newSecretKeys: Partial<Record<EmailStage, string>> = {};
  for (const stage of EMAIL_STAGES) {
    const projectId = stageProjectIds[stage];
    console.log(`\nSetting up emails for the ${stage} project (${projectId})...`);

    try {
      const senderId = await selectEmailSender({ posthogApi, projectId, domain });
      if (!senderId) {
        results[stage] = { projectId, status: 'no-sender' };
        continue;
      }

      // Upload the templates and save their IDs (config keys match the template keys)
      for (const [templateKey, template] of Object.entries(initialEmailTemplates)) {
        const templateId = await upsertEmailTemplate({
          posthogApi,
          projectId,
          template,
          senderId,
        });
        configContent = writeConfigPair(configContent, templateKey, { [stage]: templateId });
      }
      fs.writeFileSync(configPath, configContent);

      // Re-use the stored key, otherwise create one for this project
      if (!secretKeys[stage]) {
        newSecretKeys[stage] = await createEmailSecretKey({ posthogApi, projectId });
        secretKeys[stage] = newSecretKeys[stage];
      }
      results[stage] = { projectId, status: 'ready' };
    } catch (error) {
      results[stage] = { projectId, status: 'error' };
      log.error(`Email setup failed for the ${stage} project: ${describePosthogError(error)}`);
    }
  }

  // Store any new keys (dev uses the fallback value, prod its own stage), and enable the secret
  if (newSecretKeys.dev) {
    execSync(`bun sst secret set POSTHOG_SECRET_KEY "${newSecretKeys.dev}" --fallback`, {
      stdio: 'inherit',
    });
  }
  if (newSecretKeys.prod) {
    execSync(`bun sst secret set POSTHOG_SECRET_KEY "${newSecretKeys.prod}" --stage prod`, {
      stdio: 'inherit',
    });
  }
  if (newSecretKeys.dev || newSecretKeys.prod) {
    uncommentLines([
      { filePath: path.resolve('infra/secrets.ts'), line: /export const POSTHOG_SECRET_KEY = .*/ },
    ]);
    log.success('\nThe PostHog secret key has been set in SST.');
  }

  log.success('\nEmail setup complete!\n');
  return results;
};

// ---------- STRIPE SETUP HELPERS ----------
/** Create a Stripe webhook endpoint for Better Auth*/
const createStripeWebhookForBetterAuth = async (
  url: string,
  secretKey: string,
): Promise<string | null> => {
  /** The webhook events we need to listen to for Better Auth */
  const webhookEvents = [
    'checkout.session.completed',
    'customer.subscription.updated',
    'customer.subscription.deleted',
  ];

  try {
    const response = await axios.post(
      'https://api.stripe.com/v1/webhook_endpoints',
      new URLSearchParams({
        url,
        ...webhookEvents.reduce(
          (acc, event, index) => {
            acc[`enabled_events[${index}]`] = event;
            return acc;
          },
          {} as Record<string, string>,
        ),
      }).toString(),
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    return response.data.secret as string;
  } catch (error) {
    if (error instanceof AxiosError) {
      log.error(
        `Failed to create webhook at ${url}: ${error?.response?.data?.error?.message || error.message}`,
      );
    } else {
      log.error(`Failed to create webhook at ${url}: ${String(error)}`);
    }
    return null;
  }
};

/** Guides the user through setting up Stripe for payments */
export const setupStripe = async ({ domain }: { domain?: string } = {}) => {
  log.step('Setting up Stripe...');

  // If the secrets haven't been setup yet, let's try to init them
  if (Object.keys(devSecrets).length === 0) {
    initSecrets();
  }

  // Read config
  const configPath = path.resolve('packages/config/config.ts');
  let configContent = fs.readFileSync(configPath, 'utf8');
  const publishableKeyRegex =
    /const publishableKey\s*=\s*isProd\s*\?\s*['"]([^'"]*)['"]\s*:\s*['"]([^'"]*)['"]/;
  const publishableKeyMatch = configContent.match(publishableKeyRegex);

  // Initialize all the required variables
  let prodPublishableKey = publishableKeyMatch?.[1] || '';
  let devPublishableKey = publishableKeyMatch?.[2] || '';
  let prodSecretKey = prodSecrets.STRIPE_SECRET_KEY || '';
  let devSecretKey = devSecrets.STRIPE_SECRET_KEY || '';
  let prodWebhookSecret = prodSecrets.STRIPE_WEBHOOK_SECRET || '';
  let devWebhookSecret = devSecrets.STRIPE_WEBHOOK_SECRET || '';

  // Check if Stripe is already configured (secret key in secrets and publishable key in config)
  if (
    devSecrets.STRIPE_SECRET_KEY &&
    prodSecrets.STRIPE_SECRET_KEY &&
    devSecrets.STRIPE_WEBHOOK_SECRET &&
    prodSecrets.STRIPE_WEBHOOK_SECRET &&
    devPublishableKey &&
    devPublishableKey !== '' &&
    prodPublishableKey &&
    prodPublishableKey !== ''
  ) {
    log.success('Stripe is already configured.\n');
    return { didSetup: true, didSetupProd: true };
  }

  // Ask if they want to set up Stripe
  const doSetup = await promptYesNo('Would you like to set up Stripe for payments? (y/n) ');
  if (!doSetup) {
    console.log('Stripe setup skipped.\n');
    return { didSetup: false, didSetupProd: false };
  }

  // Check if sandbox keys are already configured and ask if user wants to reset
  if (devPublishableKey && devSecretKey) {
    const resetSandboxKeys = await promptYesNo(
      'Sandbox keys are already configured. Do you want to enter new sandbox keys? (y/n) ',
    );
    if (resetSandboxKeys) {
      devPublishableKey = '';
      devSecretKey = '';
    } else {
      log.success('Using existing sandbox keys');
    }
  }

  // Set up sandbox keys
  if (!(devPublishableKey && devSecretKey)) {
    console.log('\n1. Sign up or log in to Stripe: https://dashboard.stripe.com/register');
    console.log(
      '2. In your sandbox, get the API keys (use the switcher at the top left to enter your sandbox): https://dashboard.stripe.com/test/apikeys',
    );

    // Prompt for sandbox keys if they're empty
    while (!devPublishableKey) {
      const input = await promptUser('Enter your sandbox publishable key (starts with pk_test_): ');
      devPublishableKey = input.trim();
      if (!devPublishableKey.startsWith('pk_test_')) {
        console.log('Please enter a valid sandbox publishable key (should start with pk_test_).');
        devPublishableKey = '';
      }
    }

    while (!devSecretKey) {
      const input = await promptUser('Enter your sandbox secret key (starts with sk_test_): ');
      devSecretKey = input.trim();
      if (!devSecretKey.startsWith('sk_test_')) {
        console.log('Please enter a valid sandbox secret key (should start with sk_test_).');
        devSecretKey = '';
      }
    }
  }

  // Check if production keys are already configured and ask if user wants to reset
  let hasLiveAccount = false;
  if (prodPublishableKey && prodSecretKey) {
    const resetProdKeys = await promptYesNo(
      'Live keys are already configured. Do you want to enter new live keys? (y/n) ',
    );
    if (resetProdKeys) {
      prodPublishableKey = '';
      prodSecretKey = '';
    } else {
      log.success('Using existing live keys');
      hasLiveAccount = true;
    }
  }

  // Set up live keys
  if (!(prodPublishableKey && prodSecretKey)) {
    // Ask about live account setup
    console.log(
      "\nFor production, you need to complete Stripe's onboarding process at: https://dashboard.stripe.com/profile/account/onboarding",
    );
    console.log(
      'This process takes time and requires verification. You can always finish this later and re-configure Stripe with `bun run init:stripe`.',
    );
    console.log(
      'You will still be able to test with your sandbox keys, but the live account will be required for production.',
    );

    const hasLiveAccount = await promptYesNo(
      'Have you already been approved and set up your live Stripe account? (y/n) ',
    );

    // If they want to proceed with a live account, get the live keys
    if (hasLiveAccount) {
      console.log('\nGet your live API keys: https://dashboard.stripe.com/apikeys');

      // Prompt for production keys if they're empty
      while (!prodPublishableKey) {
        const input = await promptUser('Enter your live publishable key (starts with pk_live_): ');
        prodPublishableKey = input.trim();
        if (!prodPublishableKey.startsWith('pk_live_')) {
          console.log('Please enter a valid live publishable key (should start with pk_live_).');
          prodPublishableKey = '';
        }
      }

      while (!prodSecretKey) {
        const input = await promptUser('Enter your live secret key (starts with sk_live_): ');
        prodSecretKey = input.trim();
        if (!prodSecretKey.startsWith('sk_live_')) {
          console.log('Please enter a valid live secret key (should start with sk_live_).');
          prodSecretKey = '';
        }
      }
    }
    // Otherwise, skip it for now
    else {
      log.success(
        'Skipping live keys setup. You can update your live keys later with `bun run init:stripe`.',
      );
    }
  }

  // Store the secret keys in SST secrets
  console.log('\nAdding Stripe secrets to SST...');
  if (hasLiveAccount) {
    execSync(`bun tsx ${addEnvScript} STRIPE_SECRET_KEY "${devSecretKey}" "${prodSecretKey}"`);
  } else {
    execSync(`bun sst secret set STRIPE_SECRET_KEY "${devSecretKey}" --fallback`);
  }

  // Uncomment secrets in infra/secrets.ts
  const secretsPath = path.resolve('infra/secrets.ts');
  uncommentLines([
    { filePath: secretsPath, line: /export const STRIPE_SECRET_KEY = .*/ },
    { filePath: secretsPath, line: /export const STRIPE_WEBHOOK_SECRET = .*/ },
  ]);
  log.success('Stripe secret keys have been set in SST.');

  // Update config with publishable keys
  configContent = configContent.replace(
    publishableKeyRegex,
    `const publishableKey = isProd ? '${prodPublishableKey}' : '${devPublishableKey}'`,
  );
  fs.writeFileSync(configPath, configContent);
  log.success('Stripe publishable keys have been saved to config.\n');

  // ---------- WEBHOOK SETUP ----------
  log.step('Setting up Stripe webhook...');

  if (domain) {
    // We have a domain, so we can create the webhook automatically
    console.log(`Using domain: ${domain} for webhook creation`);

    // Check dev webhook setup
    if (devWebhookSecret) {
      const resetDevWebhook = await promptYesNo(
        'Dev webhook secret already exists. Do you want to create a new dev webhook? (y/n) ',
      );
      if (resetDevWebhook) {
        devWebhookSecret = '';
      } else {
        log.success('Using existing dev webhook secret');
      }
    }

    // Create dev webhook if needed
    if (!devWebhookSecret) {
      console.log('Creating dev webhook endpoint...');
      const devWebhookUrl = `https://dev.api.${domain}/api/auth/stripe/webhook`;
      const secret = await createStripeWebhookForBetterAuth(devWebhookUrl, devSecretKey);
      if (secret) {
        devWebhookSecret = secret;
        log.success(`Created dev webhook: ${devWebhookUrl}`);
      } else {
        console.log('You will need to create the dev webhook manually.');
      }
    }

    // Check prod webhook setup (only if they have live keys)
    if (prodSecretKey) {
      if (prodWebhookSecret) {
        const resetProdWebhook = await promptYesNo(
          'Prod webhook secret already exists. Do you want to create a new prod webhook? (y/n) ',
        );
        if (resetProdWebhook) {
          prodWebhookSecret = '';
        } else {
          log.success('Using existing prod webhook secret');
        }
      }

      // Create prod webhook if needed
      if (hasLiveAccount && !prodWebhookSecret) {
        console.log('Creating prod webhook endpoint...');
        const prodWebhookUrl = `https://api.${domain}/api/auth/stripe/webhook`;
        const secret = await createStripeWebhookForBetterAuth(prodWebhookUrl, prodSecretKey);
        if (secret) {
          prodWebhookSecret = secret;
          log.success(`Created prod webhook: ${prodWebhookUrl}`);
        } else {
          console.log('You will need to create the prod webhook manually.');
        }
      }
    } else {
      console.log('Skipping prod webhook setup since the live account is not configured.');
    }

    // Set webhook secrets if we have them
    console.log('\nAdding webhook secrets to SST...');
    if (prodWebhookSecret) {
      execSync(
        `bun tsx ${addEnvScript} STRIPE_WEBHOOK_SECRET "${devWebhookSecret}" "${prodWebhookSecret}"`,
      );
    } else {
      execSync(`bun sst secret set STRIPE_WEBHOOK_SECRET "${devWebhookSecret}" --fallback`);
    }

    log.success('Stripe webhook setup complete!');
  } else {
    // No domain available, provide manual instructions
    log.warn('No custom domain configured for webhook creation.\n');
    console.log(
      'Tip: You can re-run this setup script with a custom domain to automate webhook creation.\n',
    );
    console.log('To set up Stripe webhooks manually:');
    console.log(
      '1. Deploy your infrastructure first (dev and prod) and note the API URL from the output:',
    );
    console.log('   - bun run deploy');
    console.log('   - bun run deploy --stage prod');
    console.log(
      '2. Go to https://dashboard.stripe.com/webhooks (do this in both test/sandbox and live accounts)',
    );
    console.log(
      '3. Create a new webhook endpoint with URL: https://your-sst-api-url.com/api/auth/stripe/webhook',
    );
    console.log('4. Select the following events:');
    console.log('   - checkout.session.completed');
    console.log('   - customer.subscription.updated');
    console.log('   - customer.subscription.deleted');
    console.log('5. Copy the webhook signing secret and set it as a secret:');
    console.log(
      '   bun backend env:add STRIPE_WEBHOOK_SECRET "your-dev-webhook-secret" "your-prod-webhook-secret"\n',
    );
    await promptUser('Press enter to continue...');
  }

  log.success('Stripe setup complete!\n');
  return { didSetup: true, didSetupProd: hasLiveAccount };
};

// ---------- NOTES HELPERs ----------
/** Prints tips and disclosures for the user. */
const printTips = async () => {
  log.step('--- Tips and Disclosures ---');
  console.log(
    '- This script works best if you already have a domain purchased and managed by AWS Route 53.\n',
  );
  await promptUser('Press enter to continue...\n');
};

/** Prints email-specific setup instructions */
export const printEmailFinalNotes = (result: EmailSetupResult) => {
  if (!result) {
    return;
  }

  // Only mention the stages that still need work
  const notes = EMAIL_STAGES.flatMap((stage) => {
    const stageResult = result[stage];
    if (stageResult?.status === 'no-sender') {
      const channelsUrl = emailChannelsUrl(stageResult.projectId);
      return [
        `- Email (${stage}): no sender yet. Add one at ${channelsUrl} once you have a domain, then run: "bun run init:email"`,
      ];
    }
    if (stageResult?.status === 'error') {
      return [`- Email (${stage}): email setup failed. Run it again with: "bun run init:email"`];
    }
    return [];
  });
  if (notes.length === 0) {
    return;
  }

  console.log('Email setup...');
  console.log(`${notes.join('\n')}\n`);
};

/** Prints Stripe-specific setup instructions */
export const printStripeFinalNotes = (stripeConfig: Awaited<ReturnType<typeof setupStripe>>) => {
  if (!stripeConfig.didSetup) {
    return;
  }

  console.log('Stripe setup...');
  if (!stripeConfig.didSetupProd) {
    console.log(
      '- Production Stripe is not yet configured. Finish your Stripe onboarding and re-run the stripe-specific setup with: "bun run init:stripe"',
    );
  }
  console.log(
    '- Finish creating plans at https://dashboard.stripe.com/test/products, then add the pricing IDs to packages/constants/plans.ts',
  );
  console.log(
    '- Configure the Billing Portal to enable those plans: https://dashboard.stripe.com/test/settings/billing/portal\n',
  );
};

/** Prints final setup instructions and tips for the user. */
const printFinalNotes = ({
  posthogSetup,
  emailSetup,
  stripeConfig,
}: {
  posthogSetup: boolean;
  emailSetup: EmailSetupResult;
  stripeConfig: Awaited<ReturnType<typeof setupStripe>>;
}) => {
  log.step('--- Final Notes ---');
  console.log('You can start the app with: bun dev\n');

  // Only mention the error tracking setup if they opted in
  if (posthogSetup) {
    console.log(
      '- Set up error notifications for Slack: https://us.posthog.com/error_tracking/configuration?tab=error-tracking-alerting#selectedSetting=error-tracking-alerting',
    );

    // If they also set up emails, mention that they can run email campaigns based on events
    if (emailSetup) {
      console.log(
        '- Build onboarding emails in PostHog Workflows, triggered by the "User Signed Up" event: https://us.posthog.com/workflows',
      );
    }
  }

  console.log(
    '- Make sure you restart your terminal for your AWS profile changes to take effect.\n',
  );

  // Mention anything left to do for email setup
  printEmailFinalNotes(emailSetup);

  // Mention Stripe setup if they configured it
  printStripeFinalNotes(stripeConfig);

  log.success('Setup complete! Happy coding!\n');
};

// ---------- MAIN ----------
/** Initializes everything we need to get started with this repo */
const init = async () => {
  log.step('Setting up starter...\n');

  // Check that all CLI tools are setup
  checkCLIs();

  // Mention some tips and disclosures
  await printTips();

  // Get and possibly update the project name
  const projectName = await getProjectName();

  // Get and possibly update the web url
  const domain = await getDomain();

  // Get or create the user's personal environment stage
  await getOrCreateStage();

  // Select or create an AWS profile
  const awsConfig = await selectOrCreateAwsProfile();

  // Setup Supabase
  const dbConfig = await setupSupabase({ projectName });

  // Mark existing migrations as applied (to avoid prisma being out of sync)
  applyExistingMigrations();

  // Setup Better Auth
  setupBetterAuth();

  // Setup PostHog
  const posthogConfig = await setupPosthog({ projectName });

  // Setup emails (sent through PostHog)
  const emailSetup = await setupPosthogEmail({
    domain,
    personalApiKey: posthogConfig?.setupKey,
  });

  // Configure github url and secrets
  const githubConfig = await setupGithub({
    awsConfig,
    dbConfig,
    posthogConfig,
  });

  // Setup Slack
  await setupSlack({ githubUrl: githubConfig.url });

  // Setup Crisp Chat
  await setupCrispChat();

  // Setup marketing site
  await setupMarketingSite({ domain });

  // Setup docs site
  await setupDocsSite({ domain });

  // Setup the AI extras
  await setupAi();

  // Setup Stripe
  const stripeConfig = await setupStripe({ domain });

  // Print final notes
  printFinalNotes({
    posthogSetup: !!posthogConfig,
    emailSetup,
    stripeConfig,
  });

  // End the script
  process.exit(0);
};

// Only run init if this file is executed directly (not imported)
const currentFile = fileURLToPath(import.meta.url).replace(/\.ts$/, '');
const executedFile = process.argv[1].replace(/\.ts$/, '');
if (currentFile === executedFile) {
  await init();
}
