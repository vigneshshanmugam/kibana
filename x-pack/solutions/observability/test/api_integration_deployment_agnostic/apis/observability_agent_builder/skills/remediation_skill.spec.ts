/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { InternalRequestHeader, RoleCredentials } from '@kbn/ftr-common-functional-services';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

const REMEDIATION_SKILL_ID = 'observability.remediation';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const roleScopedSupertest = getService('roleScopedSupertest');

  describe('skill: observability.remediation registration', function () {
    let roleAuthc: RoleCredentials;
    let internalReqHeader: InternalRequestHeader;

    before(async () => {
      internalReqHeader = samlAuth.getInternalRequestHeader();
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('editor');
    });

    after(async () => {
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('is listed in the skills registry', async () => {
      const supertest = await roleScopedSupertest.getSupertestWithRoleScope(roleAuthc, {
        withInternalHeaders: true,
      });

      const res = await supertest
        .get('/api/agent_builder/skills')
        .set(internalReqHeader)
        .expect(200);

      const skills: Array<{ id: string; name: string; description: string }> = res.body.results;
      const remediationSkill = skills.find((s) => s.id === REMEDIATION_SKILL_ID);

      expect(remediationSkill).to.be.ok();
      expect(remediationSkill!.name).to.eql('remediation');
      expect(remediationSkill!.description).to.contain('remediation');
    });

    it('exposes the expected tool IDs', async () => {
      const supertest = await roleScopedSupertest.getSupertestWithRoleScope(roleAuthc, {
        withInternalHeaders: true,
      });

      const res = await supertest
        .get(`/api/agent_builder/skills/${REMEDIATION_SKILL_ID}`)
        .set(internalReqHeader)
        .expect(200);

      const skill = res.body;
      const toolIds: string[] = skill.tools ?? [];

      expect(toolIds).to.contain('platform.core.execute_esql');
      expect(toolIds).to.contain('platform.core.generate_esql');
      expect(toolIds).to.contain('observability.get_logs');
      expect(toolIds).to.contain('observability.run_log_rate_analysis');
      expect(toolIds).to.contain('observability.get_index_info');
      expect(toolIds).to.contain('observability.get_alerts');
    });
  });
}
