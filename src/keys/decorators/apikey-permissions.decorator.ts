import { SetMetadata } from '@nestjs/common';

// metadata key used by guards
export const APIKEY_PERMISSIONS_KEY = 'apikey_permissions';
export const ApiKeyPermissions = (...permissions: string[]) => SetMetadata(APIKEY_PERMISSIONS_KEY, permissions);

export const Permissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);