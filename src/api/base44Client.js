import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { augmentClient } from '@/lib/entityCache';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

export const base44 = augmentClient(
  createClient({
    appId,
    token,
    functionsVersion,
    serverUrl: '',
    appBaseUrl,
  })
);