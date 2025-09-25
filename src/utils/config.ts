import { getDefaultConfig, loadConfig as loadCoreConfig } from '../core/config';
import type { GTMConfig } from '../types';

export async function loadConfig(path: string = 'gtm.config.js'): Promise<GTMConfig> {
  const config = loadCoreConfig(path);
  if (config) {
    return config;
  }

  return getDefaultConfig();
}
