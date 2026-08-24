/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { AuthenticatedUser, KibanaRequest, ServiceAccount } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { mockAuthenticatedUser } from '@kbn/core-security-common/mocks';
import { HTTPAuthorizationHeader } from '@kbn/core-security-server';
import type { Logger } from '@kbn/logging';
import type {
  CheckPrivileges,
  CheckPrivilegesResponse,
  CheckPrivilegesWithRequest,
} from '@kbn/security-plugin-types-server';

import { SERVICE_ACCOUNT_TOKEN_RETRY_REUSE_MS } from './fake_requests';
import { ServiceAccountTokenExchangeError } from './token_exchange_error';
import { UiamServiceAccounts } from './uiam_service_accounts';
import type { ListedServiceAccount } from './types';
import type { SecurityLicense } from '../../common';
import { licenseMock } from '../../common/licensing/index.mock';
import { SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH } from '../../common/service_accounts';
import type { UiamServicePublic } from '../uiam';
import { uiamServiceMock } from '../uiam/uiam_service.mock';

describe('UiamServiceAccounts', () => {
  let serviceAccounts: UiamServiceAccounts;
  let mockLicense: jest.Mocked<SecurityLicense>;
  let mockUiam: jest.Mocked<UiamServicePublic>;
  let mockCheckPrivileges: jest.Mocked<CheckPrivileges>;
  let mockCheckPrivilegesWithRequest: jest.Mocked<CheckPrivilegesWithRequest>;
  let logger: Logger;
  let getCurrentUser: jest.Mock<AuthenticatedUser | null, [KibanaRequest]>;

  const clusterPrivilegesResponse = (authorized: boolean): CheckPrivilegesResponse => ({
    hasAllRequested: authorized,
    username: 'elastic',
    privileges: {
      kibana: [],
      elasticsearch: { cluster: [{ privilege: 'manage_security', authorized }], index: {} },
    },
  });

  const createParams = { name: 'nightshift-relay' };

  const createMockRequest = (authHeader?: string): KibanaRequest =>
    httpServerMock.createKibanaRequest({
      headers: authHeader ? { authorization: authHeader } : {},
    });

  const validResponse: ServiceAccount = {
    id: 'service-account-id',
    type: 'project' as const,
    name: 'nightshift-relay',
    organization_id: 'organization-id',
    role_assignments: { limit: { access: ['application'], resource: ['project'] } },
    assumable_by: [
      {
        type: 'project-service-account' as const,
        organization_id: 'organization-id',
        project_type: 'security',
        project_id: 'project-id',
      },
    ],
  };

  const listedAccount: ListedServiceAccount = {
    ...validResponse,
    creator: {
      type: 'user',
      id: 'user-id',
      first_name: 'Ada',
      last_name: 'Lovelace',
    },
  };

  beforeEach(() => {
    mockLicense = licenseMock.create();
    mockLicense.isEnabled.mockReturnValue(true);
    logger = loggingSystemMock.create().get('service-accounts');
    mockUiam = uiamServiceMock.create();
    getCurrentUser = jest.fn().mockReturnValue(null);
    mockCheckPrivileges = {
      atSpace: jest.fn(),
      atSpaces: jest.fn(),
      globally: jest.fn().mockResolvedValue(clusterPrivilegesResponse(true)),
    };
    mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);

    serviceAccounts = new UiamServiceAccounts({
      logger,
      requestLifetimeMs: 600_000,
      license: mockLicense,
      uiam: mockUiam,
      checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
      getCurrentUser,
      cloudProjectContext: {
        organizationId: 'organization-id',
        projectId: 'project-id',
        projectType: 'security',
      },
    });
  });

  describe('#create', () => {
    it('forwards the caller credential, organization, fixed role assignments and derived assumable_by', async () => {
      mockUiam.createServiceAccount.mockResolvedValue(validResponse);

      await expect(
        serviceAccounts.create(createMockRequest('Bearer essu_my_token'), createParams)
      ).resolves.toEqual(validResponse);

      expect(mockUiam.createServiceAccount).toHaveBeenCalledWith(
        new HTTPAuthorizationHeader('Bearer', 'essu_my_token'),
        {
          organization_id: 'organization-id',
          name: 'nightshift-relay',
          role_assignments: { limit: { access: ['application'], resource: ['project'] } },
          assumable_by: [
            {
              type: 'project-service-account',
              organization_id: 'organization-id',
              project_type: 'security',
              project_id: 'project-id',
            },
          ],
        },
        { includeClientAuthentication: true }
      );
    });

    it.each([true, false])('preserves API-key authentication when internal=%s', async (internal) => {
      getCurrentUser.mockReturnValue(
        mockAuthenticatedUser({
          authentication_type: 'api_key',
          api_key: { id: 'key-id', name: 'key-name', managed_by: 'cloud', internal },
        })
      );
      mockUiam.createServiceAccount.mockResolvedValue(validResponse);

      await serviceAccounts.create(createMockRequest('ApiKey essu_key'), createParams);

      expect(mockUiam.createServiceAccount).toHaveBeenCalledWith(
        new HTTPAuthorizationHeader('ApiKey', 'essu_key'),
        expect.objectContaining({ organization_id: 'organization-id' }),
        { includeClientAuthentication: internal }
      );
    });

    it('rejects when security features are disabled in Elasticsearch', async () => {
      mockLicense.isEnabled.mockReturnValue(false);

      await expect(
        serviceAccounts.create(createMockRequest('Bearer essu_my_token'), createParams)
      ).rejects.toMatchObject({ output: { statusCode: 403 } });
    });

    it('rejects when the caller lacks manage_security', async () => {
      mockCheckPrivileges.globally.mockResolvedValue(clusterPrivilegesResponse(false));

      await expect(
        serviceAccounts.create(createMockRequest('Bearer essu_my_token'), createParams)
      ).rejects.toMatchObject({ output: { statusCode: 403 } });

      expect(mockUiam.createServiceAccount).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'Service account creation denied: missing `manage_security` cluster privilege'
      );
    });

    it.each<{ assumableBy: ServiceAccount['assumable_by'] }>([
      { assumableBy: validResponse.assumable_by },
      {
        assumableBy: [{ type: 'platform-service-account', service_account_id: 'nightshift-relay' }],
      },
      {
        assumableBy: [
          ...validResponse.assumable_by,
          { type: 'platform-service-account', service_account_id: 'nightshift-relay' },
        ],
      },
    ])('accepts supported principals in the UIAM response', async ({ assumableBy }) => {
      const result = { ...validResponse, assumable_by: assumableBy };
      mockUiam.createServiceAccount.mockResolvedValue(result);

      await expect(
        serviceAccounts.create(createMockRequest('Bearer essu_my_token'), createParams)
      ).resolves.toEqual(result);
    });

    it.each([
      { id: 'service-account-id' } as ServiceAccount,
      { ...validResponse, assumable_by: [{ type: 'project-service-account' }] } as ServiceAccount,
      { ...validResponse, id: 'a'.repeat(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH + 1) },
      {
        ...validResponse,
        assumable_by: [{ type: 'platform-service-account' }],
      } as ServiceAccount,
    ])('logs validation failures and returns the original create response', async (result) => {
      mockUiam.createServiceAccount.mockResolvedValue(result);

      await expect(
        serviceAccounts.create(createMockRequest('Bearer essu_my_token'), createParams)
      ).resolves.toBe(result);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('failed validation'));
    });
  });

  describe('#list', () => {
    it('calls UIAM as Kibana and returns the service account page', async () => {
      mockUiam.listServiceAccounts.mockResolvedValue({ service_accounts: [listedAccount] });

      await expect(
        serviceAccounts.list(createMockRequest('Bearer essu_my_token'))
      ).resolves.toEqual({ service_accounts: [listedAccount] });

      expect(mockUiam.listServiceAccounts).toHaveBeenCalledWith({});
    });

    it('forwards limit, after, and q', async () => {
      const params = { limit: 25, after: 'cursor', q: 'name:nightshift' };
      mockUiam.listServiceAccounts.mockResolvedValue({ service_accounts: [listedAccount] });

      await serviceAccounts.list(createMockRequest('Bearer essu_my_token'), params);

      expect(mockUiam.listServiceAccounts).toHaveBeenCalledWith(params);
    });

    it('rejects when the upstream response does not match the expected shape', async () => {
      mockUiam.listServiceAccounts.mockResolvedValue({ service_accounts: [validResponse] });

      await expect(
        serviceAccounts.list(createMockRequest('Bearer essu_my_token'))
      ).rejects.toThrowError('Error occurred during service account listing');
    });
  });

  describe('#get', () => {
    it('returns a service account with its creator', async () => {
      mockUiam.getServiceAccount.mockResolvedValue(listedAccount);

      await expect(
        serviceAccounts.get(createMockRequest('Bearer essu_my_token'), 'service-account-id')
      ).resolves.toEqual(listedAccount);

      expect(mockUiam.getServiceAccount).toHaveBeenCalledWith('service-account-id');
    });

    it('accepts an api-key creator', async () => {
      const withApiKeyCreator: ListedServiceAccount = {
        ...validResponse,
        creator: {
          type: 'api-key',
          id: 'api-key-id',
          description: 'nightshift key',
        },
      };
      mockUiam.getServiceAccount.mockResolvedValue(withApiKeyCreator);

      await expect(
        serviceAccounts.get(createMockRequest('Bearer essu_my_token'), 'service-account-id')
      ).resolves.toEqual(withApiKeyCreator);
    });

    it('rejects when creator is missing', async () => {
      mockUiam.getServiceAccount.mockResolvedValue(validResponse as never);

      await expect(
        serviceAccounts.get(createMockRequest('Bearer essu_my_token'), 'service-account-id')
      ).rejects.toThrowError('Error occurred during service account retrieval');
    });
  });

  describe('fake request lifecycle', () => {
    beforeEach(() => {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
      jest.setSystemTime(new Date('2026-08-20T12:00:00.000Z'));

      let counter = 0;
      mockUiam.exchangeServiceAccountToken.mockImplementation(async () => ({
        token: `essu_token_${++counter}`,
      }));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('mints a token and returns a service-account-bound fake request', async () => {
      const request = await serviceAccounts.createFakeRequest({
        serviceAccountId: 'service-account-id',
        spaceId: 'marketing',
      });

      expect(mockUiam.exchangeServiceAccountToken).toHaveBeenCalledWith('service-account-id');
      expect(request.isFakeRequest).toBe(true);
      expect(request.headers.authorization).toBe('Bearer essu_token_1');
      expect(request.spaceId).toBe('marketing');
      expect(request.auth.isAuthenticated).toBe(true);
    });

    it('wraps malformed exchange responses in a token exchange error', async () => {
      mockUiam.exchangeServiceAccountToken.mockResolvedValue({ credential: 'nope' } as never);

      await expect(
        serviceAccounts.createFakeRequest({ serviceAccountId: 'service-account-id' })
      ).rejects.toBeInstanceOf(ServiceAccountTokenExchangeError);
    });

    it.each([408, 429, 500, 502, 503, 504])(
      'classifies HTTP %s as retryable and preserves its cause',
      async (statusCode) => {
        const cause = new Boom.Boom('temporary failure', { statusCode });
        mockUiam.exchangeServiceAccountToken.mockRejectedValue(cause);

        await expect(
          serviceAccounts.createFakeRequest({ serviceAccountId: 'service-account-id' })
        ).rejects.toMatchObject({ cause, retryable: true });
      }
    );

    it.each([400, 401, 403, 404, 409, 501])(
      'classifies HTTP %s as terminal',
      async (statusCode) => {
        const cause = new Boom.Boom('rejected', { statusCode });
        mockUiam.exchangeServiceAccountToken.mockRejectedValue(cause);

        await expect(
          serviceAccounts.createFakeRequest({ serviceAccountId: 'service-account-id' })
        ).rejects.toMatchObject({ cause, retryable: false });
      }
    );

    it('mints a replacement and updates the request once the reuse window has passed', async () => {
      const request = await serviceAccounts.createFakeRequest({
        serviceAccountId: 'service-account-id',
      });
      mockUiam.exchangeServiceAccountToken.mockClear();

      jest.advanceTimersByTime(SERVICE_ACCOUNT_TOKEN_RETRY_REUSE_MS);

      await expect(serviceAccounts.reauthenticateFakeRequest(request)).resolves.toEqual({
        authorization: 'Bearer essu_token_2',
      });
      expect(request.headers.authorization).toBe('Bearer essu_token_2');
    });

    it('returns null without minting once the request lease has expired', async () => {
      const request = await serviceAccounts.createFakeRequest({
        serviceAccountId: 'service-account-id',
        maxLifetimeMs: 1_000,
      });
      mockUiam.exchangeServiceAccountToken.mockClear();

      jest.advanceTimersByTime(1_001);

      await expect(serviceAccounts.reauthenticateFakeRequest(request)).resolves.toBeNull();
      expect(mockUiam.exchangeServiceAccountToken).not.toHaveBeenCalled();
    });

    it('permanently disables credential replacement when released', async () => {
      const request = await serviceAccounts.createFakeRequest({
        serviceAccountId: 'service-account-id',
      });
      mockUiam.exchangeServiceAccountToken.mockClear();

      serviceAccounts.releaseFakeRequest(request);
      jest.advanceTimersByTime(SERVICE_ACCOUNT_TOKEN_RETRY_REUSE_MS);

      await expect(serviceAccounts.reauthenticateFakeRequest(request)).resolves.toBeNull();
      expect(mockUiam.exchangeServiceAccountToken).not.toHaveBeenCalled();
    });
  });
});
