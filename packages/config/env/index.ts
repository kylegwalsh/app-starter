import { Resource } from 'sst';

// Extract only the keys where type is 'sst.sst.Secret'
type SecretKeys = {
  [K in keyof Resource]: Resource[K] extends { type: 'sst.sst.Secret' } ? K : never;
}[keyof Resource];

// Object type with only the secret entries
type SecretResources = Pick<Resource, SecretKeys>;

/** Defines environment variables from SST secrets */
export const env = Object.fromEntries(
  Object.entries(Resource)
    .filter(([_, value]) => value.type === 'sst.sst.Secret')
    .map(([key, value]) => [key, value.value])
) as { [K in keyof SecretResources]: SecretResources[K]['value'] };
