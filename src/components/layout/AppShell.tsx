import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { TopBar } from './TopBar';
import { SideNav } from './SideNav';
import { BottomNav, type BottomNavKey } from './BottomNav';
import { Avatar, SideDrawer } from '../ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { clearAuth } from '../../store/slices/auth-slice';
import { clearPermissions, usePermissionCheck } from '../../store/slices/permissions-slice';
import { Resources } from '../../lib/api/permission';
import { tokenStore } from '../../lib/api/utils';
import queryClient from '../../lib/query-client';

const WIDE_BREAKPOINT = 768;

// Which bottom-nav section a route belongs to. Screens reached via the Menu
// drawer (e.g. Manage Shifts) still highlight "Menu", not "Schedule" — the
// active tab reflects the section you're in, not literally which route is
// mounted. Add an entry here whenever a new screen is wired up.
const NAV_KEY_BY_ROUTE: Record<string, BottomNavKey> = {
  '/schedules': 'schedule',
  '/shifts': 'menu',
  '/team': 'menu',
  '/designations': 'menu',
  '/shift-history': 'menu',
};

export interface AppShellProps {
  children: React.ReactNode;
  /** Hide the bottom tab bar — for modal-like screens (e.g. Create Shift) that aren't one of the main tabs. */
  hideBottomNav?: boolean;
}

function notImplemented(label: string) {
  Alert.alert(label, 'Coming soon.');
}

export function AppShell({ children, hideBottomNav }: AppShellProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;
  const router = useRouter();
  const pathname = usePathname();
  const activeNavKey = NAV_KEY_BY_ROUTE[pathname] ?? 'schedule';
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const organization = useAppSelector((state) => state.auth.organization);
  const can = usePermissionCheck();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const userName = user?.name || user?.username || 'Account';

  // `router.push` always pushes a new screen instance onto the stack, even
  // if you're already on that exact route — tapping a Menu link for the
  // page you're currently viewing was silently re-navigating (and, since
  // these push a fresh instance, remounting the screen and duplicating the
  // stack entry). Guard every Menu-link navigation through this instead of
  // calling `router.push` directly.
  const navigateTo = (route: string) => {
    setMenuOpen(false);
    if (pathname !== route) {
      router.push(route);
    }
  };

  // Add a new Menu item by appending one entry here — `visible` gates it on
  // a permission via `can(resource, action)`, called inline (a plain
  // function, not a hook, so it's safe to call however many times here).
  // Omit `visible` for links with no matching resource, e.g. Team
  // Settings/Reports below.
  const menuLinks: { key: string; icon: keyof typeof MaterialIcons.glyphMap; label: string; onPress: () => void; visible?: boolean }[] = [
    {
      key: 'manage-shifts',
      icon: 'calendar-today',
      label: 'Manage Schedules',
      visible: can(Resources.SCHEDULE, 'view'),
      onPress: () => navigateTo('/shifts'),
    },
    {
      key: 'employees',
      icon: 'person-add',
      label: 'Employees',
      visible: can(Resources.EMPLOYEE, 'view'),
      onPress: () => navigateTo('/team'),
    },
    {
      key: 'designations',
      icon: 'badge',
      label: 'Designations',
      visible: can(Resources.DESIGNATION, 'view'),
      onPress: () => navigateTo('/designations'),
    },
    {
      key: 'shift-history',
      icon: 'history',
      label: 'My Schedules',
      // No permission gate, unlike the links above — viewing your own past
      // shifts isn't an admin capability, it's personal data, same "same
      // for everyone" treatment as the homepage itself.
      onPress: () => navigateTo('/shift-history'),
    },
    {
      key: 'team-settings',
      icon: 'settings',
      label: 'Team Settings',
      onPress: () => notImplemented('Team Settings'),
    },
    {
      key: 'reports',
      icon: 'assessment',
      label: 'Reports',
      onPress: () => notImplemented('Reports'),
    },
  ];

  const handleSignOut = () => {
    setMenuOpen(false);
    setProfileOpen(false);
    tokenStore.clear();
    dispatch(clearAuth());
    dispatch(clearPermissions());
    // The TanStack Query cache is a singleton independent of Redux — it
    // isn't cleared just because auth/permissions are. Without this, a
    // different user logging in right after would see the previous
    // session's still-"fresh" cached data (schedules, employees,
    // designations, ...) until each query's staleTime happened to expire.
    queryClient.clear();
    router.replace('/');
  };

  const handleSwitchWorkspace = () => notImplemented('Switch Workspace');

  const handleBottomNavSelect = (key: BottomNavKey) => {
    if (key === 'menu') setMenuOpen(true);
    else if (key === 'profile') setProfileOpen(true);
    else if (key === 'notifications') notImplemented('Notifications');
    // 'schedule' is the only remaining real tab — used to call `router.back()`
    // here, assuming the current screen was always reached by pushing on top
    // of `/schedules`. That assumption doesn't always hold (e.g. no prior
    // stack entry to pop), which threw "The action 'GO_BACK' was not handled
    // by any navigator." Navigate to the actual destination instead, same
    // guarded helper the Menu links use.
    else if (key === 'schedule') navigateTo('/schedules');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={isWide ? ['top', 'bottom'] : ['top']}>
      <View style={styles.row}>
        {isWide ? (
          <SideNav
            userName={userName}
            roleLabel={organization?.designation}
            organizationName={organization?.name}
            onSwitchWorkspace={handleSwitchWorkspace}
            onNotImplemented={notImplemented}
            onSignOut={handleSignOut}
          />
        ) : null}

        <View style={styles.content}>
          {!isWide ? <TopBar onSwitchWorkspace={handleSwitchWorkspace} /> : null}
          <View style={styles.body}>{children}</View>
          {!isWide && !hideBottomNav ? <BottomNav active={activeNavKey} onSelect={handleBottomNavSelect} /> : null}
        </View>
      </View>

      <SideDrawer visible={menuOpen} onClose={() => setMenuOpen(false)}>
        <DrawerHeader title="Menu" onClose={() => setMenuOpen(false)} />
        {menuLinks
          .filter((link) => link.visible !== false)
          .map((link) => (
            <DrawerLink key={link.key} icon={link.icon} label={link.label} onPress={link.onPress} />
          ))}
      </SideDrawer>

      <SideDrawer visible={profileOpen} onClose={() => setProfileOpen(false)}>
        <View style={styles.drawerProfile}>
          <Avatar label={userName} size={48} />
          <View style={styles.drawerProfileText}>
            <Text style={styles.drawerName}>{userName}</Text>
            {organization?.designation ? <Text style={styles.drawerRole}>{organization.designation}</Text> : null}
            {organization?.name ? <Text style={styles.drawerOrg}>{organization.name}</Text> : null}
          </View>
        </View>
        <DrawerLink icon="account-circle" label="My Profile" onPress={() => notImplemented('My Profile')} />
        <DrawerLink icon="settings" label="Account Settings" onPress={() => notImplemented('Account Settings')} />
        <DrawerLink icon="logout" label="Logout" onPress={handleSignOut} />
      </SideDrawer>
    </SafeAreaView>
  );
}

function DrawerHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={styles.drawerHeader}>
      <Text style={styles.drawerTitle}>{title}</Text>
      <Pressable onPress={onClose} hitSlop={8}>
        <MaterialIcons name="close" size={22} color={Colors.onSurfaceVariant} />
      </Pressable>
    </View>
  );
}

function DrawerLink({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.drawerLink} onPress={onPress}>
      <MaterialIcons name={icon} size={20} color={Colors.onSurfaceVariant} />
      <Text style={styles.drawerLinkLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  content: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.containerPaddingMobile,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  drawerTitle: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  drawerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gutter,
    padding: Spacing.containerPaddingMobile,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  drawerProfileText: {
    flex: 1,
  },
  drawerName: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  drawerRole: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  drawerOrg: {
    ...Typography.labelSm,
    color: Colors.secondary,
  },
  drawerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gutter,
    padding: Spacing.containerPaddingMobile,
  },
  drawerLinkLabel: {
    ...Typography.bodyLg,
    color: Colors.onSurfaceVariant,
  },
});
