import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { PermissionsMatrixScreen } from '../permissions/PermissionsMatrixScreen';
import { designationApi } from '../../lib/api/designation';
import { designationPermissionApi } from '../../lib/api/permission';

export function DesignationPermissionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // Same cache the Designations list already populated — read the name from
  // it rather than issuing a second request just for that.
  const { data: designationsData } = useQuery({ queryKey: ['designations'], queryFn: designationApi.list });
  const designationName = designationsData?.results.find((d) => d.uuid === id)?.name;

  return (
    <PermissionsMatrixScreen
      subtitle={designationName ? `Choose what the ${designationName} role can do.` : 'Choose what this role can do.'}
      queryKey={['designation-permissions', id]}
      enabled={!!id}
      fetchMatrix={() => designationPermissionApi.get(id)}
      saveMatrix={(permissions) => designationPermissionApi.update(id, { permissions })}
    />
  );
}
