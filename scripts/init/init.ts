import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import axios from 'axios';

import { promptSelect, promptUser, promptYesNo } from '../utils/input.js';

// ---------- CLI HELPERS ----------
/** The CLIs we require to run the initialization script */
const CLI_REQUIREMENTS = [
  {
    name: 'pnpm',
    versionCmd: 'pnpm --version',
    url: 'https://pnpm.io/installation',
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
    console.log("❌ GitHub CLI is not authenticated. Please run 'gh auth login' and try again.\n");
    process.exit(1);
  }
};

/** Check if required CLIs are installed */
export const checkCLIs = () => {
  console.log('Checking CLI tools...');

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

  console.log('✔ All CLI tools are installed\n');
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

      // Ask if they want to use a different repo
      const useDifferentRepo = await promptYesNo(
        'Would you like to use a different GitHub repo? (y/n) '
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

        console.log('✔ Updated repo\n');
        return newUrl;
      } else {
        console.log('✔ Using current repo\n');
        return currentUrl;
      }
    } catch {
      console.log(
        '❌ Unable to connect to the provided GitHub URL. Please verify the URL and try again.\n'
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
  console.log('Setting up GitHub...');

  // Configure the GitHub URL and extract the repo path
  const githubUrl = (await configureGithubUrl())!;
  const match = githubUrl.match(/[:/]([^/]+\/[^/.]+)(?:\.git)?$/);
  const repo = match ? match[1] : '';

  console.log(`Setting up GitHub environments and secrets...`);

  // Create environments (idempotent)
  execSync(
    `gh api --method PUT -H "Accept: application/vnd.github+json" repos/${repo}/environments/dev`
  );
  execSync(
    `gh api --method PUT -H "Accept: application/vnd.github+json" repos/${repo}/environments/prod`
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

  console.log('✔ GitHub environments and secrets have been set up.\n');

  return githubUrl;
};

// ---------- PROJECT DETAIL HELPERS ----------
/** Prompt for and update the project name if still default */
const getProjectName = async () => {
  console.log('Checking for the project name...');
  // Check for the app name in the config file
  const configPath = path.resolve('packages/config/config.ts');
  let configContent = fs.readFileSync(configPath, 'utf8');
  const appNameMatch = configContent.match(/app:\s*{[^}]*name:\s*['"][^'"]*['"]/s);
  let appName = appNameMatch ? appNameMatch[1] : undefined;

  // If the app name doesn't exist, we'll prompt the user for a new one
  if (!appName || appName === 'My App') {
    // Get a new name
    let newName = '';
    while (!newName) {
      const input = await promptUser(
        "Enter a name for your project (Title Case, e.g. 'My Project'): "
      );
      newName = input.trim();
      if (!/^([A-Z][a-z]+)( [A-Z][a-z]+)*$/.test(newName)) {
        console.log(
          "Please use Title Case (e.g. 'My Project'). Each word should start with a capital letter."
        );
        newName = '';
      }
    }

    // Write Title Case to config.ts
    configContent = configContent.replace(
      /app:\s*{([^}]*)name:\s*(['"])[^'"]*\2/s,
      (m, g1, quote) => `app: {${g1}name: ${quote}${newName}${quote}`
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
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, undefined, 2) + '\n');
    appName = newName;

    console.log(`✔ Project name updated to: ${newName}\n`);
  } else {
    console.log(`✔ Project name already configured: ${appName}\n`);
  }
  return appName;
};

/** Prompt for and update the website domain if still default */
export const getDomain = async () => {
  console.log('Checking for the website domain...');
  const constantsPath = path.resolve('infra/constants.ts');
  let constantsContent = fs.readFileSync(constantsPath, 'utf8');

  // Regex to match: const baseDomain = ...;
  const baseDomainRegex = /const\s+baseDomain(?:\s*:\s*string)?\s*=\s*(['"])([^'\"]*)\1/;
  const match = constantsContent.match(baseDomainRegex);

  // If we don't find a match, we are missing something important in the constants file
  if (!match) {
    console.log('❌ Could not find the baseDomain assignment in infra/constants.ts.');
    process.exit(1);
  }

  // Extract the value from the match
  const currentValue = match[2];

  // If baseDomain is set, we'll use that
  if (currentValue) {
    console.log(`✔ Web domain already configured: ${currentValue}\n`);
    return currentValue;
  }
  // If we don't find a value, we'll prompt the user for a custom domain
  else {
    const wantsCustomDomain = await promptYesNo(
      'Would you like to use a custom domain for your app? (y/n) '
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
        console.log(
          '\n❌ Please enter a valid domain (e.g., example.com). Do not include subdomains or protocols (e.g., https://).'
        );
        continue;
      }
      baseDomain = trimmed;
    }

    // Replace only the empty string at the end of the baseDomain line
    constantsContent = constantsContent.replace(
      baseDomainRegex,
      `const baseDomain: string = '${baseDomain}'`
    );
    fs.writeFileSync(constantsPath, constantsContent);
    console.log(`✔ Web base domain set to: ${baseDomain}\n`);
    return baseDomain;
  }
};

/** Get or create the user's personal environment stage */
export const getOrCreateStage = async () => {
  console.log("Checking for the user's personal environment stage...");

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
      console.log(`✔ Using existing stage '${stage}'!\n`);
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
        'Please use only letters, numbers, dashes, or underscores for the environment name.'
      );
      stage = '';
    }
  }

  // Write the final result to the .sst/stage file
  fs.writeFileSync(stagePath, stage + '\n');
  console.log(`✔ Created .sst/stage with value '${stage}'!\n`);
  return stage;
};

/**
 * Parse the output from 'pnpm sst secret list' and extract all secrets
 * @param output The stdout from the secret list command
 * @returns Object containing all secrets as key-value pairs
 */
const getAllSecrets = (stage: string) => {
  const result: Record<string, string> = {};
  const output = execSync(`pnpm sst secret list --stage ${stage}`).toString();

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
    if (!line.trim()) continue;
    // For dev stage: only use fallback values
    if (isDevStage && !inFallbackSection) continue;
    // For other stages: skip fallback values and use stage-specific values
    if (!isDevStage && inFallbackSection) continue;

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
const addSecretScript = path.resolve('apps/backend/scripts/add-secret.ts');
/** SST secrets for dev environment */
let devSecrets: Record<string, string> = {};
/** SST secrets for prod environment */
let prodSecrets: Record<string, string> = {};

/** Initialize both our global secret variables */
const initSecrets = () => {
  try {
    devSecrets = getAllSecrets('dev');
    prodSecrets = getAllSecrets('prod');
  } catch {}
};

// ---------- AWS HELPERS ----------
/**
 * Prompt the user to select an AWS profile or create a new one.
 * Updates ~/.aws/credentials, ~/.aws/config, and .vscode/settings.json as needed.
 * Returns the selected profile name and credentials for personal and CI.
 */
export const selectOrCreateAwsProfile = async () => {
  console.log('Setting up AWS profile...');

  const homedir = os.homedir();
  const credPath = path.join(homedir, '.aws/credentials');
  const configPath = path.join(homedir, '.aws/config');
  const vscodeSettingsPath = path.resolve('.vscode/settings.json');

  // ---------- PERSONAL CREDENTIALS ----------
  // Read existing profiles
  let profiles: string[] = [];
  if (fs.existsSync(credPath)) {
    const credContent = fs.readFileSync(credPath, 'utf8');
    profiles = [...credContent.matchAll(/^\[([^\]]+)\]/gm)].map((m) => m[1]);
  }

  const choices = [...profiles, 'Create new profile...'];
  const selected = await promptSelect('Which AWS profile would you like to use?', choices);

  let profile = selected;
  let accessKey = '';
  let secretKey = '';
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
    while (!accessKey) {
      const accessKeyInput = await promptUser('Enter AWS Access Key ID: ');
      accessKey = accessKeyInput.trim();
      if (!accessKey) {
        console.log('AWS Access Key ID cannot be empty.');
      }
    }

    while (!secretKey) {
      const secretKeyInput = await promptUser('Enter AWS Secret Access Key: ');
      secretKey = secretKeyInput.trim();
      if (!secretKey) {
        console.log('AWS Secret Access Key cannot be empty.');
      }
    }

    const regionInput = await promptUser(
      'Enter AWS Region (press enter for default of us-east-1): '
    );
    const region = regionInput.trim() || 'us-east-1';

    // Append to credentials file
    const credEntry = `\n[${profile}]\naws_access_key_id=${accessKey}\naws_secret_access_key=${secretKey}\nregion=${region}\n`;
    fs.appendFileSync(credPath, credEntry);

    // Append to config file
    const configEntry = `\n[profile ${profile}]\nregion = ${region}\n`;
    fs.appendFileSync(configPath, configEntry);

    console.log(`✔ Created new AWS profile: ${profile}`);
  } else {
    // If selecting an existing profile, try to read the keys from the credentials file
    if (fs.existsSync(credPath)) {
      const credContent = fs.readFileSync(credPath, 'utf8');
      const profileRegex = new RegExp(`\\[${profile}\\]([\\s\\S]*?)(?=\\n\\[|$)`, 'g');
      const match = profileRegex.exec(credContent);
      if (match && match[1]) {
        const sectionContent = match[1];
        const keyMatch = sectionContent.match(/aws_access_key_id\s*=\s*([^\n]+)/);
        const secretMatch = sectionContent.match(/aws_secret_access_key\s*=\s*([^\n]+)/);
        accessKey = keyMatch ? keyMatch[1].trim() : '';
        secretKey = secretMatch ? secretMatch[1].trim() : '';
      }
    }
  }

  // If we don't have any keys at this point, we'll just fail out
  if (!accessKey || !secretKey) process.exit(1);

  // Update .vscode/settings.json
  if (fs.existsSync(vscodeSettingsPath)) {
    let settings = fs.readFileSync(vscodeSettingsPath, 'utf8');
    settings = settings.replaceAll(
      /(['"]AWS_PROFILE['"]\s*:\s*['"])[^'"]*(['"])/g,
      `$1${profile}$2`
    );
    fs.writeFileSync(vscodeSettingsPath, settings);
    console.log(`✔ Updated .vscode/settings.json to use AWS profile: ${profile}\n`);
  }

  // Run aws configure to set the current active profile (helpful for the rest of this run)
  try {
    execSync(`aws configure set profile ${profile}`);
  } catch {}

  // ---------- CI CREDENTIALS ----------
  // Ask if they want to use the same credentials for Github Actions CI
  const useSameForCI = await promptYesNo(
    'Would you like to use the same AWS credentials for your Github Actions CI deployments? (y/n) '
  );

  let ciAccessKey = '';
  let ciSecretKey = '';
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

  console.log('✔ Configured AWS credentials for CI.\n');

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
  const dbUrl =
    urlWithPassword.replace(/:(\d+)(\/postgres)/, ':6543$2').replace(/\?.*$/, '') +
    '?pgbouncer=true';
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
      "Please enter a valid Supabase Transaction pooler URL (must start with 'postgresql://', contain '@', mention 'aws', and end with '/postgres')."
    );
  }
};

/**
 * Guides the user through setting up Supabase, generates DATABASE_URL and DIRECT_DATABASE_URL for dev and prod,
 * and calls the add-secret script to store them.
 */
const setupSupabase = async (projectName: string) => {
  console.log('Setting up Supabase...');

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
  if (Object.keys(devSecrets).length === 0) initSecrets();

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
      'It looks like Supabase is already configured. Would you like to update the Supabase connection? (y/n) '
    );
    if (!shouldUpdate) {
      console.log('Skipping Supabase setup.\n');
      return databaseConfig;
    }
  }

  console.log('Sign up or log in to Supabase: https://supabase.com/dashboard/organizations');
  console.log(
    'You can have 2 free databases (dev/prod) per account. You may want to create a fresh account per project.'
  );
  await promptUser('Press enter to continue...');

  // --- Production ---
  console.log(`\nCreate a production project in Supabase (e.g. '${projectName}')`);
  const prodPassword = await promptUser(
    'Enter the password you set for your production database: '
  );
  const prodBaseUrl = await promptValidSupabaseUrl(
    "After your project is created, click 'Connect' and copy the 'Transaction pooler' URL (starts with postgresql://...): "
  );

  // --- Development ---
  console.log(`\nCreate a dev project in Supabase (e.g. '${projectName} (dev)')`);
  const devPassword = await promptUser('Enter the password you set for your dev database: ');
  const devBaseUrl = await promptValidSupabaseUrl(
    "After your project is created, click 'Connect' and copy the 'Transaction pooler' URL (starts with postgresql://...): "
  );

  const prodUrls = generateSupabaseUrls(prodBaseUrl, prodPassword);
  const devUrls = generateSupabaseUrls(devBaseUrl, devPassword);

  // --- Call add-secret script for each secret ---
  console.log('\nAdding Supabase secrets to SST...');
  // For prod
  execSync(
    `pnpm tsx ${addSecretScript} DIRECT_DATABASE_URL "${devUrls.directUrl}" "${prodUrls.directUrl}"`
  );
  execSync(`pnpm tsx ${addSecretScript} DATABASE_URL "${devUrls.dbUrl}" "${prodUrls.dbUrl}"`);
  console.log('✔ Supabase secrets have been set in SST.\n');

  // Update the config object with the new values
  databaseConfig.prod = prodUrls;
  databaseConfig.dev = devUrls;

  return databaseConfig;
};

// ---------- BETTER AUTH HELPERS ----------
/** Guides the user through setting up Better Auth */
const setupBetterAuth = () => {
  console.log('Setting up Better Auth...');

  // If the secrets haven't been setup yet, let's try to init them
  if (Object.keys(devSecrets).length === 0) initSecrets();

  // Check if BETTER_AUTH_SECRET is already configured in SST secrets
  if (devSecrets.BETTER_AUTH_SECRET && prodSecrets.BETTER_AUTH_SECRET) {
    console.log('✔ Better Auth secret already configured.\n');
    return true;
  }

  // Generate a random 32-character string
  const randomString = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 36).toString(36)
  ).join('');

  // Add secret to SST
  console.log('Adding Better Auth secret to SST...');
  execSync(`pnpm tsx ${addSecretScript} BETTER_AUTH_SECRET "${randomString}" "${randomString}"`);
  console.log('✔ Better Auth secret has been set in SST.\n');

  return true;
};

// ---------- POSTHOG HELPERS ----------
// Types for PostHog API responses
type PosthogOrg = { id: string; name: string };
type PosthogProject = { id: string; api_token: string };

/** Guides the user through setting up PostHog, including API key, org/project selection/creation, and saves config */
const setupPosthog = async (projectName: string) => {
  console.log('Setting up PostHog...');

  const configPath = path.resolve('packages/config/config.ts');
  let configContent = fs.readFileSync(configPath, 'utf8');

  // Check if PostHog is already set up
  const apiKeyMatch = configContent.match(
    /posthog:\s*{[^}]*apiKey:\s*isProd\s*\?\s*['"]([^'"]*)['"]\s*:\s*['"]([^'"]*)['"]/
  );
  const prodApiKey = apiKeyMatch ? apiKeyMatch[1] : undefined;
  const devApiKey = apiKeyMatch ? apiKeyMatch[2] : undefined;
  if (prodApiKey || devApiKey) {
    console.log('✔ PostHog already configured.\n');
    return;
  }

  let cliToken;
  while (true) {
    try {
      // Ask if they want to set up PostHog
      const doSetup = await promptYesNo(
        'Do you want to set up PostHog for analytics and error tracking? (y/n) '
      );
      if (!doSetup) {
        console.log('PostHog setup skipped.\n');
        return;
      }

      // Guide to signup/login and API key creation
      console.log(
        '\nSign up or login, then create a personal API key (with "Organization", "Project", and "Error tracking" permissions): https://app.posthog.com/settings/user-api-keys#variables'
      );

      // Prompt for personal API key and create the API connection
      cliToken = await promptUser(
        "Enter your PostHog personal API key (with 'Organization' and 'Project' permissions): "
      );
      const posthogApi = axios.create({
        baseURL: 'https://app.posthog.com/api/',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cliToken}`,
        },
      });

      // Try to retrieve organizations
      const orgsRes = await posthogApi.get<{ results: PosthogOrg[] }>('organizations/');
      const orgsData = orgsRes.data;

      // Create a list of organizations to choose from
      const orgChoices: { name: string; value: string }[] = orgsData.results.map((org) => ({
        name: org.name,
        value: org.id,
      }));
      orgChoices.push({ name: 'Create new organization...', value: 'new' });
      const selectedOrgId = await promptSelect(
        'Select a PostHog organization:',
        orgChoices.map((o) => o.name)
      );
      let orgId = orgChoices.find((o) => o.name === selectedOrgId)?.value;

      // If the user wants to create a new organization, prompt for a name and create it
      if (orgId === 'new') {
        const newOrgName = await promptUser('Enter a name for the new organization: ');
        const createOrgRes = await posthogApi.post<PosthogOrg>('organizations/', {
          name: newOrgName,
        });
        const newOrg = createOrgRes.data;
        orgId = newOrg.id;
        console.log(`✔ Created new organization: ${newOrgName}`);
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
      const prodProject = await createProject(orgId!, projectName);
      const devProject = await createProject(orgId!, `${projectName} (dev)`);
      console.log('✔ PostHog projects have been created.');

      // Save API key in config file
      configContent = configContent.replace(
        /apiKey:\s*isProd \? ['"][^'"]*['"] : ['"][^'"]*['"]/,
        `apiKey: isProd ? '${prodProject.api_token}' : '${devProject.api_token}'`
      );
      fs.writeFileSync(configPath, configContent);
      console.log('✔ PostHog has been added to the config.\n');
      return {
        prodProjectId: prodProject.id,
        devProjectId: devProject.id,
        cliToken,
      };
    } catch (error: any) {
      console.log(
        `\n❌ An error occurred during PostHog setup: ${error?.response?.data?.detail || error?.message}\n\nRestarting PostHog setup...`
      );
      // The loop will restart from the setup prompt
    }
  }
};

// ---------- SLACK HELPERS ----------
/**
 * Guides the user through setting up Slack notifications for CI.
 * If the user opts in, instructs them to install the GitHub app and run the subscribe command.
 */
const setupSlack = async (repo: string) => {
  const wantsSlack = await promptYesNo(
    'Would you like to receive notifications for CI in Slack? (y/n) '
  );
  // If they don't want slack, we'll skip the rest of the setup
  if (!wantsSlack) {
    console.log('Slack setup skipped.\n');
    return;
  }

  // If they do want slack, we'll guide them through the setup
  const parsedGithubUrl = repo.replace('.git', '');
  console.log('\nTo receive notifications, please:');
  console.log('1. Install the GitHub app in your Slack workspace: https://slack.github.com/');
  console.log('2. In the Slack channel where you want notifications, run the following command:');
  console.log(
    `\n/github subscribe ${parsedGithubUrl} workflows:{event:"pull_request","push" branch:"main","staging","dev"}`
  );
  await promptUser("\nPress enter to continue after you've set up Slack notifications...");
  console.log('✔ Slack setup step complete.\n');
};

// ---------- CRISP CHAT HELPERS ----------
/** Guides the user through setting up Crisp chat for their site */
const setupCrispChat = async () => {
  console.log('Setting up Crisp Chat...');

  const configPath = path.resolve('packages/config/config.ts');
  let configContent = fs.readFileSync(configPath, 'utf8');

  // Check if Crisp is already set up
  const websiteIdMatch = configContent.match(/crisp:\s*{[^}]*websiteId:\s*['"]([^'"]*)['"]/);
  const websiteId = websiteIdMatch ? websiteIdMatch[1] : undefined;
  if (websiteId && websiteId !== '') {
    console.log('✔ Crisp Chat already configured.\n');
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
    `websiteId: '${newWebsiteId}'`
  );
  fs.writeFileSync(configPath, configContent);
  console.log(`✔ Crisp Chat websiteId saved to config.\n`);
};

// ---------- DOCS SITE HELPER ----------
/** Sets up the docs site if the user wants it */
const setupDocsSite = async ({ domain }: { domain?: string }) => {
  console.log('Setting up docs site...');

  const sstConfigPath = path.resolve('sst.config.ts');
  let sstConfig = fs.readFileSync(sstConfigPath, 'utf8');

  // Check if the docs site is already enabled (uncommented in sst.config.ts)
  if (!/\/\/\s*await import\(['"]\.\/infra\/docs['"]\);/.test(sstConfig)) {
    console.log('✔ Docs site already configured.\n');
    return;
  }

  // Ask if they want to set up the docs site
  const doSetup = await promptYesNo('Would you like to set up a website for documentation? (y/n) ');
  if (!doSetup) {
    console.log('Docs site setup skipped.\n');
    return;
  }

  // If they have a domain, update infra/docs.ts with the new domain template
  if (domain) {
    const docsPath = path.resolve('infra/docs.ts');
    let docsContent = fs.readFileSync(docsPath, 'utf8');

    // Replace the undefined domain line with the new template
    const domainTemplate = `$app.stage === 'prod' ? 'docs.${domain}' : \`\${$app.stage}.docs.${domain}\``;
    docsContent = docsContent.replace(/domain\s*=\s*undefined/, `domain = ${domainTemplate}`);
    fs.writeFileSync(docsPath, docsContent);
    console.log(
      `✔ Docs site domain set to docs.${domain} (prod) and <stage>.docs.${domain} (other stages).`
    );
  } else {
    console.log('✔ Docs site will be set up without a custom domain.');
  }

  // Update sst.config.ts to uncomment the docs import
  sstConfig = sstConfig.replace(
    /\s*\/\/\s*await import\(['"]\.\/infra\/docs['"]\);/,
    '\n    await import("./infra/docs");'
  );
  fs.writeFileSync(sstConfigPath, sstConfig);
  console.log('✔ Enabled docs site stack in sst.config.ts.\n');
};

// ---------- AXIOM HELPERS ----------
/** Guides the user through setting up Axiom observability */
const setupAxiom = async (): Promise<boolean> => {
  console.log('Setting up Axiom observability...');

  // If the secrets haven't been setup yet, let's try to init them
  if (Object.keys(devSecrets).length === 0) initSecrets();

  // Check if Axiom is already configured in SST secrets
  if (
    devSecrets.AXIOM_TOKEN &&
    prodSecrets.AXIOM_TOKEN &&
    devSecrets.AXIOM_DATASET &&
    prodSecrets.AXIOM_DATASET
  ) {
    console.log('✔ Axiom already configured.\n');
    return true;
  }

  console.log('Axiom provides enhanced log searching and monitoring beyond AWS CloudWatch.');
  // Ask if they want to set up Axiom
  const doSetup = await promptYesNo(
    'Would you like to set up Axiom for enhanced observability? (y/n) '
  );
  if (!doSetup) {
    console.log('Axiom setup skipped.\n');
    return false;
  }

  // Guide the user through the setup steps
  console.log('\nSign up or log in at: https://axiom.co/');
  console.log('1. Create a new dataset');
  console.log('2. Create an API token at: https://app.axiom.co/settings/api-tokens');

  // Prompt for the API token
  let token = '';
  while (!token) {
    const input = await promptUser('Enter your Axiom API token: ');
    token = input.trim();
    if (!token) {
      console.log('Please enter a valid Axiom API token.');
      token = '';
    }
  }

  // Prompt for the ingestion URL
  let dataset = '';
  while (!dataset) {
    const input = await promptUser('Enter your Axiom dataset name: ');
    dataset = input.trim().toLowerCase();
    if (!dataset) {
      console.log('Please enter a valid Axiom dataset.');
      dataset = '';
    }
  }

  // Add secrets to SST
  console.log('\nAdding Axiom secrets to SST...');
  execSync(`pnpm tsx ${addSecretScript} AXIOM_TOKEN "${token}" "${token}"`);
  execSync(`pnpm tsx ${addSecretScript} AXIOM_DATASET "${dataset}" "${dataset}"`);

  // Uncomment secrets in infra/secrets.ts
  const secretsPath = path.resolve('infra/secrets.ts');
  let secretsContent = fs.readFileSync(secretsPath, 'utf8');
  secretsContent = secretsContent.replaceAll(
    '// export const AXIOM_TOKEN',
    'export const AXIOM_TOKEN'
  );
  secretsContent = secretsContent.replaceAll(
    '// export const AXIOM_DATASET',
    'export const AXIOM_DATASET'
  );
  fs.writeFileSync(secretsPath, secretsContent);
  console.log('✔ Axiom secrets have been set in SST.\n');

  return true;
};

// ---------- LANGFUSE HELPERS ----------
const setupLangfuse = async () => {
  console.log('Setting up Langfuse...');

  // If the secrets haven't been setup yet, let's try to init them
  if (Object.keys(devSecrets).length === 0) initSecrets();

  // Check if Langfuse is already configured in SST secrets
  if (
    devSecrets.LANGFUSE_SECRET_KEY &&
    prodSecrets.LANGFUSE_SECRET_KEY &&
    devSecrets.LANGFUSE_PUBLIC_KEY &&
    prodSecrets.LANGFUSE_PUBLIC_KEY
  ) {
    console.log('✔ Langfuse already configured.\n');
    return true;
  }

  const doSetup = await promptYesNo(
    'Would you like to set up Langfuse for AI traces, evals, and prompt management? (y/n) '
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
  execSync(`pnpm tsx ${addSecretScript} LANGFUSE_SECRET_KEY "${secretKey}" "${secretKey}"`);
  execSync(`pnpm tsx ${addSecretScript} LANGFUSE_PUBLIC_KEY "${publicKey}" "${publicKey}"`);

  // Uncomment secrets in infra/secrets.ts
  const secretsPath = path.resolve('infra/secrets.ts');
  let secretsContent = fs.readFileSync(secretsPath, 'utf8');
  secretsContent = secretsContent.replaceAll(
    '// export const LANGFUSE_SECRET_KEY',
    'export const LANGFUSE_SECRET_KEY'
  );
  secretsContent = secretsContent.replaceAll(
    '// export const LANGFUSE_PUBLIC_KEY',
    'export const LANGFUSE_PUBLIC_KEY'
  );
  fs.writeFileSync(secretsPath, secretsContent);
  console.log('✔ Langfuse secrets have been set in SST.\n');

  return true;
};

// ---------- LOOPS SETUP HELPER ----------
/** Guides the user through setting up Loops for emails */
const setupLoops = async () => {
  console.log('Setting up Loops...');

  // Read config
  const configPath = path.resolve('packages/config/config.ts');
  let configContent = fs.readFileSync(configPath, 'utf8');
  const resetPasswordMatch = configContent.match(/resetPassword:\s*['"]([^'"]*)['"]/);
  const resetPasswordId = resetPasswordMatch ? resetPasswordMatch[1] : '';

  // If the secrets haven't been setup yet, let's try to init them
  if (Object.keys(devSecrets).length === 0) initSecrets();

  // Check if Loops is already configured (API key in secrets and resetPassword in config)
  if (
    devSecrets.LOOPS_API_KEY &&
    prodSecrets.LOOPS_API_KEY &&
    resetPasswordId &&
    resetPasswordId !== ''
  ) {
    console.log('✔ Loops is already configured.\n');
    return true;
  }

  // Ask if they want to set up Loops
  const doSetup = await promptYesNo(
    'Would you like to set up Loops for emails (required for reset password)? (y/n) '
  );
  if (!doSetup) {
    console.log('Loops setup skipped.\n');
    return false;
  }

  // Guide to signup and API key
  console.log(
    '\n1. Sign up or log in to Loops and then set up your DNS records: https://app.loops.so/register'
  );
  console.log('2. Generate an API key: https://app.loops.so/settings?page=api');
  // Prompt for API key
  let apiKey = '';
  while (!apiKey) {
    const input = await promptUser('Enter your Loops API key: ');
    apiKey = input.trim();
    if (!apiKey) {
      console.log('Please enter a valid Loops API key.');
      apiKey = '';
    }
  }

  // Store the API key as a secret for both dev and prod
  execSync(`pnpm tsx ${addSecretScript} LOOPS_API_KEY "${apiKey}" "${apiKey}"`);

  // Uncomment secrets in infra/secrets.ts
  const secretsPath = path.resolve('infra/secrets.ts');
  let secretsContent = fs.readFileSync(secretsPath, 'utf8');
  secretsContent = secretsContent.replaceAll(
    '// export const LOOPS_API_KEY',
    'export const LOOPS_API_KEY'
  );
  fs.writeFileSync(secretsPath, secretsContent);
  console.log('✔ Loops API key has been set in SST.\n');

  // Guide to creating the transactional email
  console.log(
    '3. Clone the reset password template: https://app.loops.so/templates?templateId=clfn0wbo0000008mr1fri2516'
  );
  console.log('   - Click the "Reset Password" button and click the "Link" option in the sidebar.');
  console.log('   - Click the icon in the link area to add a data variable called `resetLink`.');
  console.log('   - Publish the email.');
  console.log('   - Click the review button in the left sidebar and copy the Transactional ID.');

  // Prompt for the transactional email ID
  let transactionalId = '';
  while (!transactionalId) {
    const input = await promptUser('Enter the Transactional ID for your reset password email: ');
    transactionalId = input.trim();
    if (!transactionalId) {
      console.log('Please enter a valid Transactional ID.');
      transactionalId = '';
    }
  }

  // Update the config file with the transactionalId
  configContent = configContent.replace(
    /resetPassword:\s*['"][^'"]*['"]/, // match both single and double quotes
    `resetPassword: '${transactionalId}'`
  );
  fs.writeFileSync(configPath, configContent);
  console.log('✔ Loops reset password transactional ID saved to config.\n');

  console.log('Loops setup complete!');
  return true;
};

// ---------- STRIPE SETUP HELPERS ----------
/** Create a Stripe webhook endpoint for Better Auth*/
const createStripeWebhookForBetterAuth = async (
  url: string,
  secretKey: string
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
          {} as Record<string, string>
        ),
      }).toString(),
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return response.data.secret as string;
  } catch (error: any) {
    console.log(
      `❌ Failed to create webhook at ${url}: ${error?.response?.data?.error?.message || error.message}`
    );
    return null;
  }
};

/** Guides the user through setting up Stripe for payments */
export const setupStripe = async ({ domain }: { domain?: string } = {}) => {
  console.log('Setting up Stripe...');

  // If the secrets haven't been setup yet, let's try to init them
  if (Object.keys(devSecrets).length === 0) initSecrets();

  // Read config
  const configPath = path.resolve('packages/config/config.ts');
  let configContent = fs.readFileSync(configPath, 'utf8');

  // Read config
  const publishableKeyMatch = configContent.match(
    /stripe:\s*{[^}]*publishableKey:\s*isProd\s*\?\s*['"]([^'"]*)['"]\s*:\s*['"]([^'"]*)['"]/
  );

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
    console.log('✔ Stripe is already configured.\n');
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
      'Sandbox keys are already configured. Do you want to enter new sandbox keys? (y/n) '
    );
    if (resetSandboxKeys) {
      devPublishableKey = '';
      devSecretKey = '';
    } else {
      console.log('✔ Using existing sandbox keys');
    }
  }

  // Set up sandbox keys
  if (!devPublishableKey || !devSecretKey) {
    console.log('\n1. Sign up or log in to Stripe: https://dashboard.stripe.com/register');
    console.log(
      '2. In your sandbox, get the API keys (use the switcher at the top left to enter your sandbox): https://dashboard.stripe.com/test/apikeys'
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
      'Live keys are already configured. Do you want to enter new live keys? (y/n) '
    );
    if (resetProdKeys) {
      prodPublishableKey = '';
      prodSecretKey = '';
    } else {
      console.log('✔ Using existing live keys');
      hasLiveAccount = true;
    }
  }

  // Set up live keys
  if (!prodPublishableKey || !prodSecretKey) {
    // Ask about live account setup
    console.log(
      "\nFor production, you need to complete Stripe's onboarding process at: https://dashboard.stripe.com/profile/account/onboarding"
    );
    console.log(
      'This process takes time and requires verification. You can always finish this later and re-configure Stripe with `pnpm run init:stripe`.'
    );
    console.log(
      'You will still be able to test with your sandbox keys, but the live account will be required for production.'
    );

    const hasLiveAccount = await promptYesNo(
      'Have you already been approved and set up your live Stripe account? (y/n) '
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
      console.log(
        '✔ Skipping live keys setup. You can update your live keys later with `pnpm run init:stripe`.'
      );
    }
  }

  // Store the secret keys in SST secrets
  console.log('\nAdding Stripe secrets to SST...');
  if (hasLiveAccount)
    execSync(`pnpm tsx ${addSecretScript} STRIPE_SECRET_KEY "${devSecretKey}" "${prodSecretKey}"`);
  else execSync(`pnpm sst secret set STRIPE_SECRET_KEY "${devSecretKey}" --fallback`);

  // Uncomment secrets in infra/secrets.ts
  const secretsPath = path.resolve('infra/secrets.ts');
  let secretsContent = fs.readFileSync(secretsPath, 'utf8');
  secretsContent = secretsContent.replaceAll(
    '// export const STRIPE_SECRET_KEY',
    'export const STRIPE_SECRET_KEY'
  );
  secretsContent = secretsContent.replaceAll(
    '// export const STRIPE_WEBHOOK_SECRET',
    'export const STRIPE_WEBHOOK_SECRET'
  );
  fs.writeFileSync(secretsPath, secretsContent);
  console.log('✔ Stripe secret keys have been set in SST.');

  // Update config with publishable keys
  configContent = configContent.replace(
    /publishableKey:\s*isProd \? ['"][^'"]*['"] : ['"][^'"]*['"]/,
    `publishableKey: isProd ? '${prodPublishableKey}' : '${devPublishableKey}'`
  );
  fs.writeFileSync(configPath, configContent);
  console.log('✔ Stripe publishable keys have been saved to config.');

  // Uncomment stripe plugin in auth.ts
  const authPath = path.resolve('apps/backend/core/auth.ts');
  if (fs.existsSync(authPath)) {
    let authContent = fs.readFileSync(authPath, 'utf8');

    // Find and uncomment the entire stripe block using regex
    // This regex matches the entire stripe block from "// stripe({" to "// }),"
    const stripeBlockRegex = /^(\s*)\/\/ stripe\(\{[\s\S]*?^(\s*)\/\/ \}\),$/gm;

    const hasStripeBlock = stripeBlockRegex.test(authContent);

    if (hasStripeBlock) {
      // Reset regex since test() consumed it
      stripeBlockRegex.lastIndex = 0;

      authContent = authContent.replaceAll(stripeBlockRegex, (match) => {
        // Split the match into lines and process each one
        return match
          .split('\n')
          .map((line) => {
            // Remove "// " from the beginning of lines that start with "// "
            if (/^(\s*)\/\/ /.test(line)) {
              return line.replace(/^(\s*)\/\/ /, '$1');
            }
            return line;
          })
          .join('\n');
      });

      fs.writeFileSync(authPath, authContent);
      console.log('✔ Stripe plugin has been enabled in apps/backend/core/auth.ts.\n');
    } else {
      console.log('⚠ Could not find stripe configuration block in auth.ts to uncomment.\n');
    }
  }

  // ---------- WEBHOOK SETUP ----------
  console.log('Setting up Stripe webhook...');

  if (domain) {
    // We have a domain, so we can create the webhook automatically
    console.log(`Using domain: ${domain} for webhook creation`);

    // Check dev webhook setup
    if (devWebhookSecret) {
      const resetDevWebhook = await promptYesNo(
        'Dev webhook secret already exists. Do you want to create a new dev webhook? (y/n) '
      );
      if (resetDevWebhook) {
        devWebhookSecret = '';
      } else {
        console.log('✔ Using existing dev webhook secret');
      }
    }

    // Create dev webhook if needed
    if (!devWebhookSecret) {
      console.log('Creating dev webhook endpoint...');
      const devWebhookUrl = `https://dev.api.${domain}/api/auth/stripe/webhook`;
      const secret = await createStripeWebhookForBetterAuth(devWebhookUrl, devSecretKey);
      if (secret) {
        devWebhookSecret = secret;
        console.log(`✔ Created dev webhook: ${devWebhookUrl}`);
      } else {
        console.log('You will need to create the dev webhook manually.');
      }
    }

    // Check prod webhook setup (only if they have live keys)
    if (prodSecretKey) {
      if (prodWebhookSecret) {
        const resetProdWebhook = await promptYesNo(
          'Prod webhook secret already exists. Do you want to create a new prod webhook? (y/n) '
        );
        if (resetProdWebhook) {
          prodWebhookSecret = '';
        } else {
          console.log('✔ Using existing prod webhook secret');
        }
      }

      // Create prod webhook if needed
      if (hasLiveAccount && !prodWebhookSecret) {
        console.log('Creating prod webhook endpoint...');
        const prodWebhookUrl = `https://api.${domain}/api/auth/stripe/webhook`;
        const secret = await createStripeWebhookForBetterAuth(prodWebhookUrl, prodSecretKey);
        if (secret) {
          prodWebhookSecret = secret;
          console.log(`✔ Created prod webhook: ${prodWebhookUrl}`);
        } else {
          console.log('You will need to create the prod webhook manually.');
        }
      }
    } else {
      console.log('Skipping prod webhook setup since the live account is not configured.');
    }

    // Set webhook secrets if we have them
    console.log('\nAdding webhook secrets to SST...');
    if (prodWebhookSecret)
      execSync(
        `pnpm tsx ${addSecretScript} STRIPE_WEBHOOK_SECRET "${devWebhookSecret}" "${prodWebhookSecret}"`
      );
    else execSync(`pnpm sst secret set STRIPE_WEBHOOK_SECRET "${devWebhookSecret}" --fallback`);

    console.log('✔ Stripe webhook setup complete!');
  } else {
    // No domain available, provide manual instructions
    console.log('⚠ No custom domain configured for webhook creation.\n');
    console.log(
      'Tip: You can re-run this setup script with a custom domain to automate webhook creation.\n'
    );
    console.log('To set up Stripe webhooks manually:');
    console.log(
      '1. Deploy your infrastructure first (dev and prod) and note the API URL from the output:'
    );
    console.log('   - pnpm deploy');
    console.log('   - pnpm deploy --stage prod');
    console.log(
      '2. Go to https://dashboard.stripe.com/webhooks (do this in both test/sandbox and live accounts)'
    );
    console.log(
      '3. Create a new webhook endpoint with URL: https://your-sst-api-url.com/api/auth/stripe/webhook'
    );
    console.log('4. Select the following events:');
    console.log('   - checkout.session.completed');
    console.log('   - customer.subscription.updated');
    console.log('   - customer.subscription.deleted');
    console.log('5. Copy the webhook signing secret and set it as a secret:');
    console.log(
      '   pnpm backend add-secret STRIPE_WEBHOOK_SECRET "your-dev-webhook-secret" "your-prod-webhook-secret"\n'
    );
    await promptUser('Press enter to continue...');
  }

  console.log('✔ Stripe setup complete!\n');
  return { didSetup: true, didSetupProd: hasLiveAccount };
};

// ---------- AI SETUP HELPER ----------
/** Guides the user through setting up AI */
const setupAI = async () => {
  console.log('Setting up AI...');

  // Ask if they want to set up AI
  const doSetup = await promptYesNo('Would you like to set up AI (AWS Bedrock)? (y/n) ');
  if (!doSetup) {
    console.log('AI setup skipped.\n');
    return false;
  }

  // Guide the user through the setup steps
  console.log('\nTo enable AI models in AWS Bedrock:');
  console.log(
    '1. Go to https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess'
  );
  console.log('2. Request access to at least the Anthropic models.');
  await promptUser('Press enter to continue after you have requested model access...');
  console.log('✔ AI setup step complete.\n');
  return true;
};

// ---------- NOTES HELPERs ----------
/** Prints tips and disclosures for the user. */
const printTips = async () => {
  console.log('--- Tips and Disclosures ---');
  console.log(
    '- This script works best if you already have a domain purchased and managed by AWS Route 53.\n'
  );
  await promptUser('Press enter to continue...\n');
};

/** Prints final setup instructions and tips for the user. */
const printFinalNotes = ({
  posthogSetup,
  loopsSetup,
  stripeConfig,
}: {
  posthogSetup: boolean;
  loopsSetup: boolean;
  stripeConfig: Awaited<ReturnType<typeof setupStripe>>;
}) => {
  console.log('--- Final Steps ---');
  console.log('You can start the app with: pnpm dev\n');

  // Mention Stripe setup if they configured it
  if (stripeConfig.didSetup) {
    if (!stripeConfig.didSetupProd) {
      console.log(
        '- Production Stripe is not yet configured. Finish your Stripe onboarding and re-run the stripe-specific setup with: pnpm run init:stripe'
      );
    }
    console.log(
      '- If you want to support subscriptions with Stripe, set up your plans in apps/backend/core/auth.ts'
    );
  }

  // Only mention the error tracking setup if they opted in
  if (posthogSetup) {
    console.log(
      '- Set up error notifications for Slack: https://us.posthog.com/error_tracking/configuration?tab=error-tracking-alerting#selectedSetting=error-tracking-alerting'
    );

    // If they also set up loops, mention that they can trigger email campaigns based on events
    if (loopsSetup) {
      console.log(
        '- Add Loops as a PostHog destination and set up an onboarding campaign based on the "User Signed Up" event.'
      );
    }
  }

  console.log(
    '- Make sure you restart your terminal for your AWS profile changes to take effect.\n'
  );
  console.log('✔ Setup complete! Happy coding!\n');
};

// ---------- MAIN ----------
/** Initializes everything we need to get started with this repo */
const init = async () => {
  console.log('Setting up starter...\n');

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
  const dbConfig = await setupSupabase(projectName);

  // Setup Better Auth
  setupBetterAuth();

  // Setup PostHog
  const posthogConfig = await setupPosthog(projectName);

  // Configure github url and secrets
  const githubUrl = await setupGithub({
    awsConfig,
    dbConfig,
    posthogConfig,
  });

  // Setup Slack
  await setupSlack(githubUrl);

  // Setup Crisp Chat
  await setupCrispChat();

  // Setup docs site
  await setupDocsSite({ domain });

  // Setup Axiom observability
  await setupAxiom();

  // Setup Loops emails
  const loopsSetup = await setupLoops();

  // Setup AI
  const didSetupAI = await setupAI();

  // Setup Langfuse
  if (didSetupAI) await setupLangfuse();

  // Setup Stripe
  const stripeConfig = await setupStripe({ domain });

  // Print final notes
  printFinalNotes({ posthogSetup: !!posthogConfig, loopsSetup, stripeConfig });
};

// Only run init if this file is executed directly (not imported)
const currentFile = fileURLToPath(import.meta.url).replace(/\.ts$/, '');
const executedFile = process.argv[1].replace(/\.ts$/, '');
if (currentFile === executedFile) {
  void init();
}
