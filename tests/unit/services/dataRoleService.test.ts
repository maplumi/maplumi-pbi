// Moved from root: dataRoleService.test.ts
import { DataRoleService } from '../../../src/services/DataRoleService';
import { RoleNames } from '../../../src/constants/roles';

describe('DataRoleService', () => {
  it('builds role lookup', () => {
    const categorical:any={ categories:[{source:{roles:{AdminPCodeNameID:true}}, values:['A']}], values:[{source:{roles:{Color:true}}}]};
    const svc = new DataRoleService();
  const toggles = DataRoleService.computeAutoToggles(categorical);
  expect(toggles.choropleth).toBe(true);
  });

  it('returns first string value for credential roles', () => {
    const categorical: any = {
      values: [
        {
          source: { roles: { [RoleNames.MapboxAccessToken]: true } },
          values: ['  token-from-role  ']
        }
      ]
    };

    const value = DataRoleService.getFirstStringValueForRole(categorical, RoleNames.MapboxAccessToken);
    expect(value).toBe('token-from-role');
  });
});
