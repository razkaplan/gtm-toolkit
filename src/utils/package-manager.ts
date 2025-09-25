// Package manager utilities
import { execSync } from 'child_process';
import { existsSync } from 'fs';

export function detectPackageManager(): 'npm' | 'yarn' | 'pnpm' {
  if (existsSync('pnpm-lock.yaml')) return 'pnpm';
  if (existsSync('yarn.lock')) return 'yarn';
  return 'npm';
}

export function installDependencies(dependencies: string[], isDev: boolean = false): void {
  const packageManager = detectPackageManager();
  const devFlag = isDev ? (packageManager === 'npm' ? '--save-dev' : '--dev') : '';
  
  const installCommand = {
    npm: `npm install ${devFlag} ${dependencies.join(' ')}`,
    yarn: `yarn add ${devFlag} ${dependencies.join(' ')}`,
    pnpm: `pnpm add ${devFlag} ${dependencies.join(' ')}`
  };

  try {
    execSync(installCommand[packageManager], { stdio: 'inherit' });
  } catch (error) {
    console.error(`Failed to install dependencies with ${packageManager}:`, error);
  }
}

export function runScript(script: string): void {
  const packageManager = detectPackageManager();
  const runCommand = {
    npm: `npm run ${script}`,
    yarn: `yarn ${script}`,
    pnpm: `pnpm ${script}`
  };

  try {
    execSync(runCommand[packageManager], { stdio: 'inherit' });
  } catch (error) {
    console.error(`Failed to run script '${script}' with ${packageManager}:`, error);
  }
}
