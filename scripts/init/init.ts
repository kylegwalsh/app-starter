import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import axios, { AxiosError, type AxiosInstance } from 'axios';
import { addEnvVar } from '../../apps/backend/scripts/env/add-env.js';
import { pullEnvVars } from '../../apps/backend/scripts/env/pull-env.js';
import { promptSelect, promptUser, promptYesNo } from '../utils/input.js';

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
    name: 'vercel',
    versionCmd: 'vercel --version',
    url: 'https://vercel.com/docs/cli',
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
    console.log(
      "❌ GitHub CLI is not authenticated. Please run 'gh auth login' and try again.\n"
    );
    process.exit(1);
  }
};

/** Check if the user is authenticated with Vercel CLI */
const checkVercelAuth = () => {
  try {
    execSync('vercel whoami', { stdio: 'ignore' });
  } catch {
    console.log(
      "❌ Vercel CLI is not authenticated. Please run 'vercel login' and try again.\n"
    );
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
  // Check that the user is authenticated with vercel
  checkVercelAuth();

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

      let urlToUse: string | undefined;

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
        urlToUse = newUrl;
      } else {
        if (!currentUrl) {
          console.log(
            '❌ No GitHub URL available. Please provide a GitHub repo URL.\n'
          );
          continue;
        }
        console.log('✔ Using current repo\n');
        urlToUse = currentUrl;
      }

      // Validate that we can parse the repo from the URL
      if (!urlToUse) {
        console.log('❌ Unable to configure GitHub URL. Please try again.\n');
        continue;
      }

      // Parse the repo from the URL
      const match = urlToUse.match(/[:/]([^/]+\/[^/.]+)(?:\.git)?$/);
      const repo = match ? match[1] : '';
      if (!repo) {
        console.log(
          '❌ Unable to parse GitHub repo from remote URL. Please verify the URL format.\n'
        );
        continue;
      }

      return { url: urlToUse, repo };
    } catch {
      console.log(
        '❌ Unable to connect to the provided GitHub URL. Please verify the URL and try again.\n'
      );
    }
  }
};

/** Store secrets and environment variables in GitHub using the gh CLI */
const setupGithubSecrets = ({
  githubConfig,
  vercelConfig,
  dbConfig,
  posthogConfig,
}: {
  githubConfig: Awaited<ReturnType<typeof configureGithubUrl>>;
  vercelConfig: Awaited<ReturnType<typeof setupVercel>>;
  dbConfig: Awaited<ReturnType<typeof setupSupabase>>;
  posthogConfig: Awaited<ReturnType<typeof setupPosthog>>;
}) => {
  console.log('Setting up GitHub environments and secrets...');

  // Create environments (idempotent)
  execSync(
    `gh api --method PUT -H "Accept: application/vnd.github+json" repos/${githubConfig.repo}/environments/dev`
  );
  execSync(
    `gh api --method PUT -H "Accept: application/vnd.github+json" repos/${githubConfig.repo}/environments/prod`
  );

  // Vercel token for CI deploys (repo-wide secret)
  execSync(`gh secret set VERCEL_TOKEN -a actions -b "${vercelConfig.token}"`);

  // Set database secrets (for each environment)
  execSync(
    `gh secret set DATABASE_URL -a actions -b "${dbConfig.prod.dbUrl}" -e prod`
  );
  execSync(
    `gh secret set DIRECT_DATABASE_URL -a actions -b "${dbConfig.prod.directUrl}" -e prod`
  );
  execSync(
    `gh secret set DATABASE_URL -a actions -b "${dbConfig.dev.dbUrl}" -e dev`
  );
  execSync(
    `gh secret set DIRECT_DATABASE_URL -a actions -b "${dbConfig.dev.directUrl}" -e dev`
  );

  // If we aren't given a posthog details, we'll skip this step
  if (posthogConfig) {
    // Set up the CLI token
    execSync(
      `gh secret set POSTHOG_CLI_TOKEN -a actions -b "${posthogConfig.cliToken}"`
    );
    // Set project ids (for each environment)
    execSync(
      `gh variable set POSTHOG_CLI_ENV_ID -b "${posthogConfig.devProjectId}" -e dev`
    );
    execSync(
      `gh variable set POSTHOG_CLI_ENV_ID -b "${posthogConfig.prodProjectId}" -e prod`
    );
  }

  console.log('✔ GitHub environments and secrets have been set up.\n');
};

// ---------- PROJECT DETAIL HELPERS ----------
/** Prompt for and update the project name if still default */
const getProjectName = async () => {
  console.log('Checking for the project name...');
  // Check for the app name in the config file
  const configPath = path.resolve('packages/config/config.ts');
  let configContent = fs.readFileSync(configPath, 'utf8');
  const appNameMatch = configContent.match(
    /app:\s*{[^}]*name:\s*['"]([^'"]*)['"]/s
  );
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
      (_m, g1, quote) => `app: {${g1}name: ${quote}${newName}${quote}`
    );
    fs.writeFileSync(configPath, configContent);

    // Convert to kebab-case for other config files
    const kebabName = newName.replaceAll(' ', '-').toLowerCase();

    // Update package.json
    const pkgPath = path.resolve('package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.name = kebabName;
    fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, undefined, 2)}\n`);
    appName = newName;

    console.log(`✔ Project name updated to: ${newName}\n`);
  } else {
    console.log(`✔ Project name already configured: ${appName}\n`);
  }
  return appName;
};

/** Prompt for and update the website domain if still default */
export const getDomain = async () => {
  console.log('Checking for the project domain...');
  // Check for the domain in the config file
  const configPath = path.resolve('packages/config/config.ts');
  let configContent = fs.readFileSync(configPath, 'utf8');
  const domainMatch = configContent.match(
    /app:\s*{[^}]*domain:\s*['"]([^'"]*)['"]/s
  );
  const existingDomain = domainMatch ? domainMatch[1] : undefined;

  // If the domain exists and is not empty, we'll use it
  if (existingDomain && existingDomain !== '') {
    console.log(`✔ Domain already configured: ${existingDomain}\n`);
    return existingDomain;
  }

  // If we didn't find a value, we'll prompt the user for a custom domain
  const wantsCustomDomain = await promptYesNo(
    'Would you like to use a custom domain for your app? (y/n) '
  );
  if (!wantsCustomDomain) {
    console.log('Custom domain setup skipped.\n');
    return;
  }

  // Get a new domain
  let baseDomain = '';
  while (!baseDomain) {
    const input = await promptUser(
      'Enter your base domain (e.g., example.com): '
    );
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

  // Write domain to config.ts
  configContent = configContent.replace(
    /app:\s*{([^}]*)domain:\s*['"][^'"]*['"]/s,
    (_m, g1) => `app: {${g1}domain: '${baseDomain}'`
  );
  fs.writeFileSync(configPath, configContent);
  console.log(`✔ Domain set to: ${baseDomain}\n`);

  return baseDomain;
};

/** The environment variables from our dev environment */
let devEnv: Record<string, string> = {};
/** The environment variables from our prod environment */
let prodEnv: Record<string, string> = {};
/** Initialize the environment variables */
const initEnv = () => {
  devEnv = pullEnvVars({
    env: 'development',
  });
  prodEnv = pullEnvVars({
    env: 'production',
  });
};

// ---------- VERCEL HELPERS ----------
/** Vercel team information */
type VercelTeam = {
  id: string;
  slug: string;
  name: string;
};

/** Vercel project information */
type VercelProject = {
  id: string;
  name: string;
};

/** User's selection for Vercel team/account */
type VercelSelection =
  | { type: 'personal' }
  | { type: 'team'; team: VercelTeam };

/** Top-level Vercel API instance (initialized after token/team selection) */
let vercelApi: AxiosInstance;

/** Initialize the Vercel API instance */
const initVercelApi = ({
  token,
  teamId,
}: {
  token: string;
  teamId?: string;
}): void => {
  vercelApi = axios.create({
    baseURL: 'https://api.vercel.com',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    params: teamId ? { teamId } : undefined,
  });
};

/** List all teams the user has access to */
const listTeams = async (): Promise<VercelTeam[]> => {
  const res = await vercelApi.get<{ teams: VercelTeam[] }>('/v2/teams');
  return res.data.teams ?? [];
};

/** Create a new Vercel team */
const createTeam = async ({ name }: { name: string }): Promise<VercelTeam> => {
  const res = await vercelApi.post<VercelTeam>('/v1/teams', { name });
  return res.data;
};

/** Get a Vercel project by ID or name (returns null if not found) */
const getProject = async ({
  idOrName,
}: {
  idOrName: string;
}): Promise<VercelProject | null> => {
  try {
    const res = await vercelApi.get<VercelProject>(`/v9/projects/${idOrName}`);
    return res.data;
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

/** Create a new Vercel project (or return existing if already exists) */
const createProject = async ({
  name,
  rootDirectory,
  gitRepository,
}: {
  name: string;
  rootDirectory: string;
  gitRepository?: {
    type: 'github';
    repo: string; // "owner/repo"
  };
}): Promise<VercelProject> => {
  try {
    const res = await vercelApi.post<VercelProject>('/v11/projects', {
      name,
      rootDirectory,
      gitRepository,
    });
    return res.data;
  } catch (error) {
    // If it already exists, retrieve it.
    if (error instanceof AxiosError && error.response?.status === 409) {
      const existing = await getProject({ idOrName: name });
      if (existing) {
        return existing;
      }
    }
    throw error;
  }
};

/** Add a custom domain to a Vercel project */
const addDomainToProject = async ({
  projectIdOrName,
  domain,
  gitBranch,
}: {
  projectIdOrName: string;
  domain: string;
  gitBranch?: string;
}): Promise<void> => {
  try {
    // Add the domain
    await vercelApi.post(`/v10/projects/${projectIdOrName}/domains`, {
      name: domain,
    });

    // If gitBranch is specified, assign the domain to that branch
    if (gitBranch) {
      try {
        await vercelApi.patch(
          `/v9/projects/${projectIdOrName}/domains/${domain}`,
          {
            gitBranch,
          }
        );
      } catch (branchError) {
        // If branch assignment fails, log but don't fail the whole operation
        // (domain is still added, just not branch-assigned)
        if (branchError instanceof AxiosError) {
          console.warn(
            `⚠️  Could not assign ${domain} to branch ${gitBranch}: ${branchError.response?.statusText || branchError.message}`
          );
        }
      }
    }
  } catch (error) {
    // Ignore "already exists" style errors.
    if (error instanceof AxiosError) {
      const code = error.response?.status;
      if (code === 409 || code === 400) {
        return;
      }
    }
    throw error;
  }
};

const checkExistingVercelConfig = async () => {
  const webVercel = fs.existsSync(path.resolve('apps/web/.vercel'));
  const backendVercel = fs.existsSync(path.resolve('apps/backend/.vercel'));
  const docsVercel = fs.existsSync(path.resolve('apps/docs/.vercel'));

  if (webVercel || backendVercel || docsVercel) {
    const skipSetup = await promptYesNo(
      'Vercel projects appear to be already configured. Skip project setup? (y/n) '
    );
    if (skipSetup) {
      const relink = await promptYesNo(
        'Would you like to re-link local folders to Vercel projects? (y/n) '
      );
      return { skip: true, relink };
    }
  }

  return { skip: false, relink: true }; // Always link when creating projects
};

const setupVercel = async ({
  projectName,
  githubRepo,
  domain,
}: {
  projectName: string;
  githubRepo: string;
  domain?: string;
}): Promise<{
  token: string;
  selection: VercelSelection;
  projects: {
    web: VercelProject;
    backend: VercelProject;
    docs?: VercelProject;
  };
}> => {
  // Transform project name (Title Case) to kebab-case for use as prefix
  const projectPrefix = projectName.replaceAll(' ', '-').toLowerCase();

  // Prompt for optional deployments
  const enableOptionalDeployments = async () => {
    const docs = await promptYesNo(
      'Would you like to set up a website for documentation? (y/n) '
    );
    if (!docs) {
      console.log('Docs site setup skipped.\n');
    }
    return { docs };
  };

  const optionalDeployments = await enableOptionalDeployments();

  const { skip, relink } = await checkExistingVercelConfig();

  // Prompt for Vercel token
  let token = '';
  while (!token) {
    token = (
      await promptUser('Enter your Vercel token (for API + CI): ')
    ).trim();
    if (!token) {
      console.log('Please enter a valid Vercel token.');
    }
  }

  console.log('Setting up Vercel projects...');

  const selection = await selectOrCreateTeam({ token });
  const teamId = selection.type === 'team' ? selection.team.id : undefined;
  const teamSlug = selection.type === 'team' ? selection.team.slug : undefined;

  // Re-initialize API with token + team ID
  initVercelApi({ token, teamId });

  if (skip) {
    // If the user wants to skip project setup, optionally re-link projects
    if (relink) {
      linkVercelProject({
        cwd: 'apps/web',
        projectName: `${projectPrefix}-web`,
        scope: teamSlug,
      });
      linkVercelProject({
        cwd: 'apps/backend',
        projectName: `${projectPrefix}-api`,
        scope: teamSlug,
      });
      if (optionalDeployments.docs) {
        linkVercelProject({
          cwd: 'apps/docs',
          projectName: `${projectPrefix}-docs`,
          scope: teamSlug,
        });
      }
    }

    // We can't reliably know IDs if we skipped; return placeholder names as IDs.
    return {
      token,
      selection,
      projects: {
        web: { id: `${projectPrefix}-web`, name: `${projectPrefix}-web` },
        backend: { id: `${projectPrefix}-api`, name: `${projectPrefix}-api` },
        docs: optionalDeployments.docs
          ? { id: `${projectPrefix}-docs`, name: `${projectPrefix}-docs` }
          : undefined,
      },
    };
  }

  const gitRepository = { type: 'github' as const, repo: githubRepo };

  const webProject = await createProject({
    name: `${projectPrefix}-web`,
    rootDirectory: 'apps/web',
    gitRepository,
  });

  const backendProject = await createProject({
    name: `${projectPrefix}-api`,
    rootDirectory: 'apps/backend',
    gitRepository,
  });

  const docsProject = optionalDeployments.docs
    ? await createProject({
        name: `${projectPrefix}-docs`,
        rootDirectory: 'apps/docs',
        gitRepository,
      })
    : undefined;

  // Link local folders to created projects (vercel link is idempotent)
  linkVercelProject({
    cwd: 'apps/web',
    projectName: webProject.name,
    scope: teamSlug,
  });
  linkVercelProject({
    cwd: 'apps/backend',
    projectName: backendProject.name,
    scope: teamSlug,
  });
  if (docsProject) {
    linkVercelProject({
      cwd: 'apps/docs',
      projectName: docsProject.name,
      scope: teamSlug,
    });
  }

  if (domain) {
    // Optional: domain + URL env vars.
    const appProd = `app.${domain}`;
    const appDev = `dev.app.${domain}`;
    const apiProd = `api.${domain}`;
    const apiDev = `dev.api.${domain}`;

    // Production domains (assigned to production branch automatically by Vercel)
    await addDomainToProject({
      projectIdOrName: webProject.id,
      domain: appProd,
    });
    await addDomainToProject({
      projectIdOrName: backendProject.id,
      domain: apiProd,
    });

    // Dev domains (assigned to main branch for automatic preview deployments)
    await addDomainToProject({
      projectIdOrName: webProject.id,
      domain: appDev,
      gitBranch: 'main',
    });
    await addDomainToProject({
      projectIdOrName: backendProject.id,
      domain: apiDev,
      gitBranch: 'main',
    });

    if (docsProject) {
      // Production docs domain
      await addDomainToProject({
        projectIdOrName: docsProject.id,
        domain: `docs.${domain}`,
      });
      // Dev docs domain (assigned to main branch)
      await addDomainToProject({
        projectIdOrName: docsProject.id,
        domain: `dev.docs.${domain}`,
        gitBranch: 'main',
      });
    }

    console.log(
      '\n⚠️  Note: You may need to manually set NEXT_PUBLIC_APP_URL and NEXT_PUBLIC_API_URL\n' +
        '   for the web project in Vercel dashboard or via CLI.\n'
    );

    // Output DNS instructions
    console.log('\n--- DNS Configuration Required ---');
    console.log('Add these DNS records to your domain provider:\n');
    console.log('CNAME  app      → cname.vercel-dns.com');
    console.log('CNAME  dev.app  → cname.vercel-dns.com');
    console.log('CNAME  api      → cname.vercel-dns.com');
    console.log('CNAME  dev.api  → cname.vercel-dns.com');
    if (docsProject) {
      console.log('CNAME  docs     → cname.vercel-dns.com');
      console.log('CNAME  dev.docs → cname.vercel-dns.com');
    }
    console.log('\nNote: DNS propagation can take up to 48 hours.');
    await promptUser('\nPress enter once you have added the DNS records...');
    console.log('✔ DNS setup acknowledged.\n');
  }

  return {
    token,
    selection,
    projects: { web: webProject, backend: backendProject, docs: docsProject },
  };
};

const selectOrCreateTeam = async ({
  token,
}: {
  token: string;
}): Promise<VercelSelection> => {
  // Initialize API with token (no team yet)
  initVercelApi({ token });
  const teams = await listTeams();

  const choices = [
    'Use personal account (no team)',
    ...teams.map((t) => t.name),
    'Create new team...',
  ];

  const selected = await promptSelect('Select a Vercel team:', choices);
  if (selected === 'Use personal account (no team)') {
    return { type: 'personal' };
  }

  if (selected === 'Create new team...') {
    let teamName = '';
    while (!teamName) {
      teamName = (await promptUser('Enter a name for the new team: ')).trim();
      if (!teamName) {
        console.log('Please enter a valid team name.');
      }
    }
    const newTeam = await createTeam({ name: teamName });
    return { type: 'team', team: newTeam };
  }

  const existing = teams.find((t) => t.name === selected);
  if (!existing) {
    throw new Error('Failed to resolve selected Vercel team');
  }
  return { type: 'team', team: existing };
};

const linkVercelProject = ({
  cwd,
  projectName,
  scope,
}: {
  cwd: string;
  projectName: string;
  scope?: string;
}) => {
  // vercel link is idempotent - safe to run even if already linked
  const args = [
    'vercel',
    'link',
    '--yes',
    `--project ${projectName}`,
    scope ? `--scope ${scope}` : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  execSync(args, {
    stdio: 'inherit',
    cwd: path.resolve(cwd),
  });
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
  const directUrl = urlWithPassword
    .replace(/:(\d+)(\/postgres)/, ':5432$2')
    .replace(/\?.*$/, '');
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
 * Guides the user through setting up Supabase, generates DATABASE_URL and DIRECT_DATABASE_URL
 * for dev and prod, and calls the env:add script to store them.
 */
const setupSupabase = async ({ projectName }: { projectName: string }) => {
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
  if (Object.keys(devEnv).length === 0) {
    initEnv();
  }

  // Check if Supabase is already configured
  let alreadyConfigured = false;
  // Extract database URLs from the parsed secrets
  databaseConfig.dev = {
    dbUrl: devEnv.DATABASE_URL || '',
    directUrl: devEnv.DIRECT_DATABASE_URL || '',
  };
  databaseConfig.prod = {
    dbUrl: prodEnv.DATABASE_URL || '',
    directUrl: prodEnv.DIRECT_DATABASE_URL || '',
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

  console.log(
    'Sign up or log in to Supabase: https://supabase.com/dashboard/organizations'
  );
  console.log(
    'You can have 2 free databases (dev/prod) per account. You may want to create a fresh account per project.'
  );
  await promptUser('Press enter to continue...');

  // --- Production ---
  console.log(
    `\nCreate a production project in Supabase (e.g. '${projectName}')`
  );
  const prodPassword = await promptUser(
    'Enter the password you set for your production database: '
  );
  const prodBaseUrl = await promptValidSupabaseUrl(
    "After your project is created, click 'Connect' and copy the 'Transaction pooler' URL (starts with postgresql://...): "
  );

  // --- Development ---
  console.log(
    `\nCreate a dev project in Supabase (e.g. '${projectName} (dev)')`
  );
  const devPassword = await promptUser(
    'Enter the password you set for your dev database: '
  );
  const devBaseUrl = await promptValidSupabaseUrl(
    "After your project is created, click 'Connect' and copy the 'Transaction pooler' URL (starts with postgresql://...): "
  );

  const prodUrls = generateSupabaseUrls(prodBaseUrl, prodPassword);
  const devUrls = generateSupabaseUrls(devBaseUrl, devPassword);

  // Save environment variables
  console.log('\nAdding Supabase environment variables to Vercel...');
  await addEnvVar({
    name: 'DIRECT_DATABASE_URL',
    devValue: devUrls.directUrl,
    prodValue: prodUrls.directUrl,
  });
  await addEnvVar({
    name: 'DATABASE_URL',
    devValue: devUrls.dbUrl,
    prodValue: prodUrls.dbUrl,
  });
  console.log('✔ Supabase environment variables have been set.\n');

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
      console.log('✔ No existing migrations to apply.\n');
      return;
    }

    const entries = fs.readdirSync(migrationsPath, { withFileTypes: true });
    const migrationDirs = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    if (migrationDirs.length === 0) {
      console.log('✔ No existing migrations to apply.\n');
      return;
    }

    console.log(
      `Found ${migrationDirs.length} migration(s) to mark as applied...`
    );

    // Mark each migration as applied
    for (const migrationDir of migrationDirs) {
      try {
        execSync(
          `bun backend db:get-url "prisma migrate resolve --applied ${migrationDir}"`,
          {
            stdio: 'ignore',
          }
        );
      } catch {
        // Track migrations that failed
        failedMigrations.push(migrationDir);
      }
    }

    // If any migrations failed, throw an error
    if (failedMigrations.length > 0) {
      throw new Error(
        `Failed to apply ${failedMigrations.length} migration(s)`
      );
    }

    console.log('✔ Database migrations have been marked as applied.\n');
  } catch {
    // Print the failed migrations with dashes
    if (failedMigrations.length > 0) {
      console.log('Failed migrations:');
      for (const migration of failedMigrations) {
        console.log(`  - ${migration}`);
      }
    }

    console.log(
      '\n⚠️ Could not mark existing migrations as applied. You may need to manually apply them.\n'
    );
  }
};

// ---------- BETTER AUTH HELPERS ----------
/** Guides the user through setting up Better Auth */
const setupBetterAuth = async () => {
  console.log('Setting up Better Auth...');

  // If the secrets haven't been setup yet, let's try to init them
  if (Object.keys(devEnv).length === 0) {
    initEnv();
  }

  // Check if BETTER_AUTH_SECRET is already configured in SST secrets
  if (devEnv.BETTER_AUTH_SECRET && prodEnv.BETTER_AUTH_SECRET) {
    console.log('✔ Better Auth secret already configured.\n');
    return true;
  }

  // Generate a random 32-character string
  const randomString = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 36).toString(36)
  ).join('');

  // Save environment variables
  console.log('Adding Better Auth environment variables to Vercel...');
  await addEnvVar({
    name: 'BETTER_AUTH_SECRET',
    devValue: randomString,
    prodValue: randomString,
  });
  console.log('✔ Better Auth environment variables have been set.\n');

  return true;
};

// ---------- POSTHOG HELPERS ----------
// Types for PostHog API responses
type PosthogOrg = { id: string; name: string };
type PosthogProject = { id: string; api_token: string };

/** Guides the user through setting up PostHog, including API key, org/project selection/creation, and saves config */
const setupPosthog = async ({ projectName }: { projectName: string }) => {
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

  let cliToken: string;
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
        '\nSign up or login (you will need to be on the pay as you go plan), then create a personal API key (with "Organization", "Project", and "Error tracking" permissions): https://app.posthog.com/settings/user-api-keys#variables'
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
      const orgsRes = await posthogApi.get<{ results: PosthogOrg[] }>(
        'organizations/'
      );
      const orgsData = orgsRes.data;

      // Create a list of organizations to choose from
      const orgChoices: { name: string; value: string }[] =
        orgsData.results.map((org) => ({
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
        const newOrgName = await promptUser(
          'Enter a name for the new organization: '
        );
        const createOrgRes = await posthogApi.post<PosthogOrg>(
          'organizations/',
          {
            name: newOrgName,
          }
        );
        const newOrg = createOrgRes.data;
        orgId = newOrg.id;
        console.log(`✔ Created new organization: ${newOrgName}`);
      }

      // Sanity check to narrow the types (we should never run this)
      if (!orgId) {
        throw new Error('Failed to create new organization');
      }

      // Create projects for prod and dev
      async function createProject(
        orgId: string,
        name: string
      ): Promise<PosthogProject> {
        const res = await posthogApi.post<PosthogProject>('projects/', {
          name,
          organization: orgId,
        });
        return res.data;
      }

      console.log('\nCreating projects...');
      const prodProject = await createProject(orgId, projectName);
      const devProject = await createProject(orgId, `${projectName} (dev)`);
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
    } catch (error) {
      if (error instanceof AxiosError) {
        console.log(
          `\n❌ An error occurred during PostHog setup: ${error.response?.data?.detail || error.message}\n\nRestarting PostHog setup...`
        );
      } else {
        console.log(
          `\n❌ An error occurred during PostHog setup: ${error}\n\nRestarting PostHog setup...`
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
    'Would you like to receive notifications for CI in Slack? (y/n) '
  );
  // If they don't want slack, we'll skip the rest of the setup
  if (!wantsSlack) {
    console.log('Slack setup skipped.\n');
    return;
  }

  // If they do want slack, we'll guide them through the setup
  const parsedGithubUrl = githubUrl.replace('.git', '');
  console.log('\nTo receive notifications, please:');
  console.log(
    '1. Install the GitHub app in your Slack workspace: https://slack.github.com/'
  );
  console.log(
    '2. In the Slack channel where you want notifications, run the following command:'
  );
  console.log(
    `\n/github subscribe ${parsedGithubUrl} workflows:{event:"pull_request","push" branch:"main","staging","dev"}`
  );
  await promptUser(
    "\nPress enter to continue after you've set up Slack notifications..."
  );
  console.log('✔ Slack setup step complete.\n');
};

// ---------- CRISP CHAT HELPERS ----------
/** Guides the user through setting up Crisp chat for their site */
const setupCrispChat = async () => {
  console.log('Setting up Crisp Chat...');

  const configPath = path.resolve('packages/config/config.ts');
  let configContent = fs.readFileSync(configPath, 'utf8');

  // Check if Crisp is already set up
  const websiteIdMatch = configContent.match(
    /crisp:\s*{[^}]*websiteId:\s*['"]([^'"]*)['"]/
  );
  const websiteId = websiteIdMatch ? websiteIdMatch[1] : undefined;
  if (websiteId && websiteId !== '') {
    console.log('✔ Crisp Chat already configured.\n');
    return;
  }

  // Ask if they want to set up Crisp Chat
  const doSetup = await promptYesNo(
    'Would you like to set up Crisp live chat support? (y/n) '
  );
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
      console.log(
        'Please enter a valid CRISP_WEBSITE_ID (alphanumeric and hyphens only).'
      );
      newWebsiteId = '';
    }
  }

  // Save the websiteId to config.ts
  configContent = configContent.replace(
    /websiteId:\s*['"][^'"]*['"]/, // match both single and double quotes
    `websiteId: '${newWebsiteId}'`
  );
  fs.writeFileSync(configPath, configContent);
  console.log('✔ Crisp Chat websiteId saved to config.\n');
};

// ---------- AXIOM HELPERS ----------
/** Guides the user through setting up Axiom observability */
const setupAxiom = async (): Promise<boolean> => {
  console.log('Setting up Axiom observability...');

  // If the secrets haven't been setup yet, let's try to init them
  if (Object.keys(devEnv).length === 0) {
    initEnv();
  }

  // Check if Axiom is already configured in SST secrets
  if (
    devEnv.AXIOM_TOKEN &&
    prodEnv.AXIOM_TOKEN &&
    devEnv.AXIOM_DATASET &&
    prodEnv.AXIOM_DATASET
  ) {
    console.log('✔ Axiom already configured.\n');
    return true;
  }

  console.log(
    'Axiom provides enhanced log searching and monitoring beyond Vercel logs.'
  );
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
  console.log(
    '2. Create an API token at: https://app.axiom.co/settings/api-tokens'
  );

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

  // Save environment variables
  console.log('\nAdding Axiom environment variables to Vercel...');
  await addEnvVar({
    name: 'AXIOM_TOKEN',
    devValue: token,
    prodValue: token,
  });
  await addEnvVar({
    name: 'AXIOM_DATASET',
    devValue: dataset,
    prodValue: dataset,
  });
  console.log('✔ Axiom environment variables have been set.\n');

  return true;
};

// ---------- LANGFUSE HELPERS ----------
const setupLangfuse = async () => {
  console.log('Setting up Langfuse...');

  // If the secrets haven't been setup yet, let's try to init them
  if (Object.keys(devEnv).length === 0) {
    initEnv();
  }

  // Check if Langfuse is already configured in SST secrets
  if (
    devEnv.LANGFUSE_SECRET_KEY &&
    prodEnv.LANGFUSE_SECRET_KEY &&
    devEnv.LANGFUSE_PUBLIC_KEY &&
    prodEnv.LANGFUSE_PUBLIC_KEY
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

  // Save environment variables
  console.log('\nAdding Langfuse environment variables to Vercel...');
  await addEnvVar({
    name: 'LANGFUSE_SECRET_KEY',
    devValue: secretKey,
    prodValue: secretKey,
  });
  await addEnvVar({
    name: 'LANGFUSE_PUBLIC_KEY',
    devValue: publicKey,
    prodValue: publicKey,
  });
  console.log('✔ Langfuse environment variables have been set.\n');

  return true;
};

// ---------- LOOPS SETUP HELPER ----------
/** Guides the user through setting up Loops for emails */
const setupLoops = async () => {
  console.log('Setting up Loops...');

  // Read config
  const configPath = path.resolve('packages/config/config.ts');
  let configContent = fs.readFileSync(configPath, 'utf8');
  const resetPasswordMatch = configContent.match(
    /resetPassword:\s*['"]([^'"]*)['"]/
  );
  const resetPasswordId = resetPasswordMatch ? resetPasswordMatch[1] : '';

  // If the secrets haven't been setup yet, let's try to init them
  if (Object.keys(devEnv).length === 0) {
    initEnv();
  }

  // Check if Loops is already configured (API key in secrets and resetPassword in config)
  if (
    devEnv.LOOPS_API_KEY &&
    prodEnv.LOOPS_API_KEY &&
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

  // Save environment variables
  console.log('\nAdding Loops environment variables to Vercel...');
  await addEnvVar({
    name: 'LOOPS_API_KEY',
    devValue: apiKey,
    prodValue: apiKey,
  });
  console.log('✔ Loops environment variables have been set.\n');

  // Guide to creating the transactional email
  console.log(
    '3. Clone the reset password template: https://app.loops.so/templates?templateId=clfn0wbo0000008mr1fri2516'
  );
  console.log(
    '   - Click the "Reset Password" button and click the "Link" option in the sidebar.'
  );
  console.log(
    '   - Click the icon in the link area to add a data variable called `resetLink`.'
  );
  console.log('   - Publish the email.');
  console.log(
    '   - Click the review button in the left sidebar and copy the Transactional ID.'
  );

  // Prompt for the transactional email ID
  let transactionalId = '';
  while (!transactionalId) {
    const input = await promptUser(
      'Enter the Transactional ID for your reset password email: '
    );
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
  } catch (error) {
    if (error instanceof AxiosError) {
      console.log(
        `❌ Failed to create webhook at ${url}: ${error?.response?.data?.error?.message || error.message}`
      );
    } else {
      console.log(`❌ Failed to create webhook at ${url}: ${error}`);
    }
    return null;
  }
};

/** Guides the user through setting up Stripe for payments */
export const setupStripe = async ({ domain }: { domain?: string } = {}) => {
  console.log('Setting up Stripe...');

  // If the secrets haven't been setup yet, let's try to init them
  if (Object.keys(devEnv).length === 0) {
    initEnv();
  }

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
  let prodSecretKey = prodEnv.STRIPE_SECRET_KEY || '';
  let devSecretKey = devEnv.STRIPE_SECRET_KEY || '';
  let prodWebhookSecret = prodEnv.STRIPE_WEBHOOK_SECRET || '';
  let devWebhookSecret = devEnv.STRIPE_WEBHOOK_SECRET || '';

  // Check if Stripe is already configured (secret key in secrets and publishable key in config)
  if (
    devEnv.STRIPE_SECRET_KEY &&
    prodEnv.STRIPE_SECRET_KEY &&
    devEnv.STRIPE_WEBHOOK_SECRET &&
    prodEnv.STRIPE_WEBHOOK_SECRET &&
    devPublishableKey &&
    devPublishableKey !== '' &&
    prodPublishableKey &&
    prodPublishableKey !== ''
  ) {
    console.log('✔ Stripe is already configured.\n');
    return { didSetup: true, didSetupProd: true };
  }

  // Ask if they want to set up Stripe
  const doSetup = await promptYesNo(
    'Would you like to set up Stripe for payments? (y/n) '
  );
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
  if (!(devPublishableKey && devSecretKey)) {
    console.log(
      '\n1. Sign up or log in to Stripe: https://dashboard.stripe.com/register'
    );
    console.log(
      '2. In your sandbox, get the API keys (use the switcher at the top left to enter your sandbox): https://dashboard.stripe.com/test/apikeys'
    );

    // Prompt for sandbox keys if they're empty
    while (!devPublishableKey) {
      const input = await promptUser(
        'Enter your sandbox publishable key (starts with pk_test_): '
      );
      devPublishableKey = input.trim();
      if (!devPublishableKey.startsWith('pk_test_')) {
        console.log(
          'Please enter a valid sandbox publishable key (should start with pk_test_).'
        );
        devPublishableKey = '';
      }
    }

    while (!devSecretKey) {
      const input = await promptUser(
        'Enter your sandbox secret key (starts with sk_test_): '
      );
      devSecretKey = input.trim();
      if (!devSecretKey.startsWith('sk_test_')) {
        console.log(
          'Please enter a valid sandbox secret key (should start with sk_test_).'
        );
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
  if (!(prodPublishableKey && prodSecretKey)) {
    // Ask about live account setup
    console.log(
      "\nFor production, you need to complete Stripe's onboarding process at: https://dashboard.stripe.com/profile/account/onboarding"
    );
    console.log(
      'This process takes time and requires verification. You can always finish this later and re-configure Stripe with `bun run init:stripe`.'
    );
    console.log(
      'You will still be able to test with your sandbox keys, but the live account will be required for production.'
    );

    const hasLiveAccount = await promptYesNo(
      'Have you already been approved and set up your live Stripe account? (y/n) '
    );

    // If they want to proceed with a live account, get the live keys
    if (hasLiveAccount) {
      console.log(
        '\nGet your live API keys: https://dashboard.stripe.com/apikeys'
      );

      // Prompt for production keys if they're empty
      while (!prodPublishableKey) {
        const input = await promptUser(
          'Enter your live publishable key (starts with pk_live_): '
        );
        prodPublishableKey = input.trim();
        if (!prodPublishableKey.startsWith('pk_live_')) {
          console.log(
            'Please enter a valid live publishable key (should start with pk_live_).'
          );
          prodPublishableKey = '';
        }
      }

      while (!prodSecretKey) {
        const input = await promptUser(
          'Enter your live secret key (starts with sk_live_): '
        );
        prodSecretKey = input.trim();
        if (!prodSecretKey.startsWith('sk_live_')) {
          console.log(
            'Please enter a valid live secret key (should start with sk_live_).'
          );
          prodSecretKey = '';
        }
      }
    }
    // Otherwise, skip it for now
    else {
      console.log(
        '✔ Skipping live keys setup. You can update your live keys later with `bun run init:stripe`.'
      );
    }
  }

  // Save environment variables
  console.log('\nAdding Stripe environment variables to Vercel...');
  await addEnvVar({
    name: 'STRIPE_SECRET_KEY',
    devValue: devSecretKey,
    prodValue: hasLiveAccount ? prodSecretKey : undefined,
  });
  console.log('✔ Stripe environment variables have been set.\n');

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
    // This regex matches the entire stripe block from "// stripePlugin({" to "// }),"
    const stripeBlockRegex =
      /^(\s*)\/\/ stripePlugin\(\{[\s\S]*?^(\s*)\/\/ \}\),$/gm;

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
      console.log(
        '✔ Stripe plugin has been enabled in apps/backend/core/auth.ts.\n'
      );
    } else {
      console.log(
        '⚠ Could not find stripe configuration block in auth.ts to uncomment.\n'
      );
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
      const secret = await createStripeWebhookForBetterAuth(
        devWebhookUrl,
        devSecretKey
      );
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
        const secret = await createStripeWebhookForBetterAuth(
          prodWebhookUrl,
          prodSecretKey
        );
        if (secret) {
          prodWebhookSecret = secret;
          console.log(`✔ Created prod webhook: ${prodWebhookUrl}`);
        } else {
          console.log('You will need to create the prod webhook manually.');
        }
      }
    } else {
      console.log(
        'Skipping prod webhook setup since the live account is not configured.'
      );
    }

    // Set webhook secrets if we have them
    console.log('\nAdding Stripe webhook secret to Vercel...');
    await addEnvVar({
      name: 'STRIPE_WEBHOOK_SECRET',
      devValue: devWebhookSecret,
      prodValue: prodWebhookSecret,
    });

    console.log('✔ Stripe webhook setup complete!');
  } else {
    // No domain available, provide manual instructions
    console.log('⚠ No custom domain configured for webhook creation.\n');
    console.log(
      'Tip: You can re-run this setup script with a custom domain to automate webhook creation.\n'
    );
    console.log('To set up Stripe webhooks manually:');
    console.log(
      '1. Deploy your backend first (preview and production) and note the API URL from the output:'
    );
    console.log('   - bun backend deploy');
    console.log('   - bun backend deploy:prod');
    console.log(
      '2. Go to https://dashboard.stripe.com/webhooks (do this in both test/sandbox and live accounts)'
    );
    console.log(
      '3. Create a new webhook endpoint with URL: https://<your-api-url>/api/auth/stripe/webhook'
    );
    console.log('4. Select the following events:');
    console.log('   - checkout.session.completed');
    console.log('   - customer.subscription.updated');
    console.log('   - customer.subscription.deleted');
    console.log('5. Copy the webhook signing secret and set it as a secret:');
    console.log(
      '   bun backend env:add STRIPE_WEBHOOK_SECRET "your-dev-webhook-secret" "your-prod-webhook-secret"\n'
    );
    await promptUser('Press enter to continue...');
  }

  console.log('✔ Stripe setup complete!\n');
  return { didSetup: true, didSetupProd: hasLiveAccount };
};

// ---------- NOTES HELPERs ----------
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
  console.log('--- Final Notes ---');
  console.log('You can start the app with: bun dev\n');

  // Mention Stripe setup if they configured it
  if (stripeConfig.didSetup) {
    if (!stripeConfig.didSetupProd) {
      console.log(
        '- Production Stripe is not yet configured. Finish your Stripe onboarding and re-run the stripe-specific setup with: bun run init:stripe'
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

  console.log('✔ Setup complete! Happy coding!\n');
};

// ---------- MAIN ----------
/** Initializes everything we need to get started with this repo */
const init = async () => {
  console.log('Setting up starter...\n');

  // Check that all CLI tools are setup
  checkCLIs();

  // Select the GitHub repo we'll be pushing to
  const githubConfig = await configureGithubUrl();

  // Get and possibly update the project name
  const projectName = await getProjectName();

  // Get and possibly update the web url
  const domain = await getDomain();

  // Setup Vercel
  const vercelConfig = await setupVercel({
    projectName,
    githubRepo: githubConfig.repo,
    domain,
  });

  // Pull existing environment variables to check what's already configured
  initEnv();

  // Setup Supabase
  const dbConfig = await setupSupabase({ projectName });

  // Mark existing migrations as applied (to avoid prisma being out of sync)
  applyExistingMigrations();

  // Setup Better Auth
  await setupBetterAuth();

  // Setup PostHog
  const posthogConfig = await setupPosthog({ projectName });

  // Setup GitHub secrets
  setupGithubSecrets({
    githubConfig,
    vercelConfig,
    dbConfig,
    posthogConfig,
  });

  // Setup Slack
  await setupSlack({ githubUrl: githubConfig.url });

  // Setup Crisp Chat
  await setupCrispChat();

  // Setup Axiom observability
  await setupAxiom();

  // Setup Loops emails
  const loopsSetup = await setupLoops();

  // Setup Langfuse
  await setupLangfuse();

  // Setup Stripe
  const stripeConfig = await setupStripe({ domain });

  // Print final notes
  printFinalNotes({ posthogSetup: !!posthogConfig, loopsSetup, stripeConfig });

  // End the script
  process.exit(0);
};

// Only run init if this file is executed directly (not imported)
const currentFile = fileURLToPath(import.meta.url).replace(/\.ts$/, '');
const executedFile = process.argv[1].replace(/\.ts$/, '');
if (currentFile === executedFile) {
  init();
}
