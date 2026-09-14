import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { PermissionsMatrixScreen } from '../permissions/PermissionsMatrixScreen';
import { employeeApi } from '../../lib/api/employee';
import { employeePermissionApi } from '../../lib/api/permission';

export function EmployeePermissionsScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>();

  // Same cache the Team Directory list already populated — read the name
  // from it rather than issuing a second request just for that.
  const { data: employeesData } = useQuery({ queryKey: ['employees'], queryFn: employeeApi.list });
  const employee = employeesData?.results.find((e) => e.uuid === uuid);
  const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : undefined;

  return (
    <PermissionsMatrixScreen
      subtitle={employeeName ? `Choose what ${employeeName} can do.` : 'Choose what this employee can do.'}
      queryKey={['employee-permissions', uuid]}
      enabled={!!uuid}
      fetchMatrix={() => employeePermissionApi.get(uuid)}
      saveMatrix={(permissions) => employeePermissionApi.update(uuid, { permissions })}
    />
  );
}
