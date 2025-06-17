import { exec, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { promisify } from 'node:util';

import axios from 'axios';
import inquirer from 'inquirer';

// Promisify exec for async/await usage
const execAsync = promisify(exec);

// ---------- INPUT HELPERS ----------
/** Prompt the user for input */
const promptUser = async (question: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
};

/** Prompt the user for a yes/no answer */
const promptYesNo = async (question: string): Promise<boolean> => {
  while (true) {
    const rawAnswer = await promptUser(question);
    const answer = rawAnswer.trim().toLowerCase();
    if (['y', 'yes'].includes(answer)) return true;
    if (['n', 'no'].includes(answer)) return false;
    console.log("Please enter 'y' or 'n'.");
  }
};

/**
 * Prompt the user to select from a list of choices using arrow keys.
 * @param message The message to display
 * @param choices The list of choices (array of strings)
 * @returns The selected choice (string)
 */
export const promptSelect = async (message: string, choices: string[]): Promise<string> => {
  const response = await inquirer.prompt<{
    selected: string;
  }>([
    {
      type: 'list',
      name: 'selected',
      message,
      choices,
    },
  ]);
  return response.selected;
};

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
];

/** Check if the user is authenticated with GitHub CLI */
const checkGhAuth = async () => {
  try {
    await execAsync('gh auth status');
  } catch {
    console.log("❌ GitHub CLI is not authenticated. Please run 'gh auth login' and try again.\n");
    process.exit(1);
  }
};

/** Check if required CLIs are installed */
const checkCLIs = async () => {
  console.log('Checking CLI tools...');

  // Check to ensure the user has all the CLI tools installed
  const missing: { name: string; url: string }[] = [];
  for (const cli of CLI_REQUIREMENTS) {
    try {
      await execAsync(cli.versionCmd);
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
  await checkGhAuth();

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
        await execAsync(`git ls-remote ${newUrl}`);

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
  await execAsync(
    `gh api --method PUT -H "Accept: application/vnd.github+json" repos/${repo}/environments/dev`
  );
  await execAsync(
    `gh api --method PUT -H "Accept: application/vnd.github+json" repos/${repo}/environments/prod`
  );

  // Set AWS secrets
  await execAsync(`gh secret set AWS_ACCESS_KEY_ID -a actions -b "${awsConfig.ci.awsAccessKey}"`);
  await execAsync(
    `gh secret set AWS_SECRET_ACCESS_KEY -a actions -b "${awsConfig.ci.awsSecretKey}"`
  );

  // Set sst stage (for each environment)
  await execAsync(`gh variable set SST_STAGE -b "dev" -e dev`);
  await execAsync(`gh variable set SST_STAGE -b "prod" -e prod`);

  // Set database secrets (for each environment)
  await execAsync(`gh secret set DATABASE_URL -a actions -b "${dbConfig.prod.dbUrl}" -e prod`);
  await execAsync(
    `gh secret set DIRECT_DATABASE_URL -a actions -b "${dbConfig.prod.directUrl}" -e prod`
  );
  await execAsync(`gh secret set DATABASE_URL -a actions -b "${dbConfig.dev.dbUrl}" -e dev`);
  await execAsync(
    `gh secret set DIRECT_DATABASE_URL -a actions -b "${dbConfig.dev.directUrl}" -e dev`
  );

  // If we aren't given a posthog details, we'll skip this step
  if (posthogConfig) {
    // Set up the CLI token
    await execAsync(`gh secret set POSTHOG_CLI_TOKEN -a actions -b "${posthogConfig.cliToken}"`);
    // Set project ids (for each environment)
    await execAsync(`gh variable set POSTHOG_CLI_ENV_ID -b "${posthogConfig.devProjectId}" -e dev`);
    await execAsync(
      `gh variable set POSTHOG_CLI_ENV_ID -b "${posthogConfig.prodProjectId}" -e prod`
    );
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
const getBaseDomain = (domain: string) => {
  const parts = domain.split('.');
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }
  return domain;
};

/** Prompt for and update the website domain if still default */
const getDomain = async () => {
  console.log('Checking for the website domain...');
  const webPath = path.resolve('infra/web.ts');
  let webContent = fs.readFileSync(webPath, 'utf8');

  // Check if domain is undefined, we haven't set this up yet
  if (webContent.includes('domain = undefined')) {
    // Ask if they want to use a custom domain
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

    // Replace the undefined domain line with the new template
    const domainTemplate = `$app.stage === 'prod' ? 'app.${baseDomain}' : \`\${$app.stage}.${baseDomain}\``;
    webContent = webContent.replace(/domain\s*=\s*undefined/, `domain = ${domainTemplate}`);
    fs.writeFileSync(webPath, webContent);
    console.log(
      `✔ Web domain set to app.${baseDomain} (prod) and <stage>.${baseDomain} (other stages).\n`
    );
    return baseDomain;
  } else {
    // Extract the domain from the file
    const domainPropMatch = webContent.match(/domain\s*=\s*[\s\S]*?['"`]app\.([^'"`]+)['"`]/);
    if (domainPropMatch) {
      const baseDomain = domainPropMatch[1];
      console.log(`✔ Web domain already configured: ${baseDomain}\n`);
      return baseDomain;
    }

    // Sanity check (should never happen)
    console.log('❌ Could not determine the current domain.\n');
    process.exit(1);
  }
};

/** Get or create the user's personal environment stage */
const getOrCreateStage = async () => {
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
const getAllSecrets = async (stage: string) => {
  const result: Record<string, string> = {};
  const { stdout: output } = await execAsync(`pnpm sst secret list --stage ${stage}`);

  const lines = output.split('\n');
  for (const line of lines) {
    // Skip lines containing # (like #fallback) or empty lines
    if (line.startsWith('#') || !line.trim()) continue;

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
      const profileRegex = new RegExp(`\[${profile}\][^\[]*`, 'g');
      const match = credContent.match(profileRegex);
      if (match && match[0]) {
        const keyMatch = match[0].match(/aws_access_key_id=([^\n]+)/);
        const secretMatch = match[0].match(/aws_secret_access_key=([^\n]+)/);
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
    await execAsync(`aws configure set profile ${profile}`);
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

  // Check if Supabase is already configured
  let alreadyConfigured = false;
  try {
    // Retrieve the secrets for dev and prod
    const devSecrets = await getAllSecrets('dev');
    const prodSecrets = await getAllSecrets('prod');

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
  } catch {}

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
  const addSecretScript = path.resolve('apps/backend/scripts/add-secret.ts');
  // For prod
  await execAsync(
    `pnpm tsx ${addSecretScript} DIRECT_DATABASE_URL "${devUrls.directUrl}" "${prodUrls.directUrl}"`
  );
  await execAsync(
    `pnpm tsx ${addSecretScript} DATABASE_URL "${devUrls.dbUrl}" "${prodUrls.dbUrl}"`
  );
  console.log('✔ Supabase secrets have been set in SST.\n');

  // Update the config object with the new values
  databaseConfig.prod = prodUrls;
  databaseConfig.dev = devUrls;

  return databaseConfig;
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
        `apiKey: isProd ? "${prodProject.api_token}" : "${devProject.api_token}"`
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
  console.log(
    'To set up a custom docs site domain, you must have your domain managed by AWS Route 53.'
  );
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

// ---------- BETTER STACK HELPERS ----------
/** Guides the user through setting up Better Stack observability */
const setupBetterStack = async (): Promise<boolean> => {
  console.log('Setting up Better Stack observability...');

  // Check if Better Stack is already configured in SST secrets
  try {
    // Retrieve the secrets for dev and prod
    const devSecrets = await getAllSecrets('dev');
    const prodSecrets = await getAllSecrets('prod');

    // Check if both dev and prod have their secrets configured
    if (
      devSecrets.BETTER_STACK_SOURCE_TOKEN &&
      prodSecrets.BETTER_STACK_SOURCE_TOKEN &&
      devSecrets.BETTER_STACK_INGESTING_URL &&
      prodSecrets.BETTER_STACK_INGESTING_URL
    ) {
      console.log('✔ Better Stack already configured.\n');
      return true;
    }
  } catch {}

  console.log('Better Stack provides enhanced log searching and monitoring beyond AWS CloudWatch.');
  // Ask if they want to set up Better Stack
  const doSetup = await promptYesNo(
    'Would you like to set up Better Stack for enhanced observability? (y/n) '
  );
  if (!doSetup) {
    console.log('Better Stack setup skipped.\n');
    return false;
  }

  // Guide the user through the setup steps
  console.log('\nSign up or log in at: https://betterstack.com/');
  console.log('1. Create a new NodeJS project.');
  console.log('2. Copy the source token and ingestion URL from the project settings.\n');

  // Prompt for the source token
  let sourceToken = '';
  while (!sourceToken) {
    const input = await promptUser('Enter your Better Stack source token: ');
    sourceToken = input.trim();
    if (!sourceToken) {
      console.log('Please enter a valid Better Stack source token.');
      sourceToken = '';
    }
  }

  // Prompt for the ingestion URL
  let ingestionUrl = '';
  while (!ingestionUrl) {
    const input = await promptUser('Enter your Better Stack ingestion URL: ');
    ingestionUrl = input.trim();
    if (!ingestionUrl.includes('.com')) {
      console.log('Please enter a valid Better Stack ingestion URL.');
      ingestionUrl = '';
    }
  }
  // Add https:// to the URL
  ingestionUrl = `https://${ingestionUrl}`;

  // Add secrets to SST
  console.log('\nAdding Better Stack secrets to SST...');
  const addSecretScript = path.resolve('apps/backend/scripts/add-secret.ts');
  await execAsync(
    `pnpm tsx ${addSecretScript} BETTER_STACK_SOURCE_TOKEN "${sourceToken}" "${sourceToken}"`
  );
  await execAsync(
    `pnpm tsx ${addSecretScript} BETTER_STACK_INGESTING_URL "${ingestionUrl}" "${ingestionUrl}"`
  );

  // Uncomment secrets in infra/secrets.ts
  const secretsPath = path.resolve('infra/secrets.ts');
  let secretsContent = fs.readFileSync(secretsPath, 'utf8');
  // Uncomment the secret declarations
  secretsContent = secretsContent.replaceAll(
    '// export const BETTER_STACK_SOURCE_TOKEN',
    'export const BETTER_STACK_SOURCE_TOKEN'
  );
  secretsContent = secretsContent.replaceAll(
    '// export const BETTER_STACK_INGESTING_URL',
    'export const BETTER_STACK_INGESTING_URL'
  );
  // Uncomment the secrets in the array
  secretsContent = secretsContent.replaceAll(
    '// BETTER_STACK_SOURCE_TOKEN',
    'BETTER_STACK_SOURCE_TOKEN'
  );
  secretsContent = secretsContent.replaceAll(
    '// BETTER_STACK_INGESTING_URL',
    'BETTER_STACK_INGESTING_URL'
  );
  fs.writeFileSync(secretsPath, secretsContent);
  console.log('✔ Better Stack secrets have been set in SST.\n');

  return true;
};

// ---------- FINAL NOTES HELPER ----------
/** Prints final setup instructions and tips for the user. */
const printFinalNotes = ({
  setupPosthog,
  setupBetterStack,
}: {
  setupPosthog: boolean;
  setupBetterStack: boolean;
}) => {
  console.log('--- Final Steps ---');
  console.log('You can start the app with: pnpm start\n');

  // Only mention the error tracking setup if they opted in
  if (setupPosthog) {
    console.log(
      '- Consider setting up error notifications for Slack: https://us.posthog.com/error_tracking/configuration?tab=error-tracking-alerting#selectedSetting=error-tracking-alerting'
    );
    console.log(
      '- You can set up an email system by connecting Posthog to Loops or another email service.'
    );
  }

  // Only mention Better Stack if they opted in
  if (setupBetterStack) {
    console.log(
      '- Set up uptime monitoring in your Better Stack dashboard: https://betterstack.com/'
    );
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
  await checkCLIs();

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

  // Setup Better Stack observability
  const betterStackConfig = await setupBetterStack();

  // Print final notes
  printFinalNotes({ setupPosthog: !!posthogConfig, setupBetterStack: betterStackConfig });
};

void init();
