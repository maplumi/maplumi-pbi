// Moved from root: dataRoleService.test.ts
import { DataRoleService } from '../../../src/services/DataRoleService';

describe('DataRoleService', () => {
  it('builds role lookup', () => {
    const categorical:any={ categories:[{source:{roles:{AdminPCodeNameID:true}}, values:['A']}], values:[{source:{roles:{Color:true}}}]};
    const svc = new DataRoleService();
  const toggles = DataRoleService.computeAutoToggles(categorical);
  expect(toggles.choropleth).toBe(true);
  });
});
