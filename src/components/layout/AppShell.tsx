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
import { tokenStore } from '../../lib/api/base_api';

const WIDE_BREAKPOINT = 768;

// Which bottom-nav section a route belongs to. Screens reached via the Menu
// drawer (e.g. Manage Shifts) still highlight "Menu", not "Schedule" — the
// active tab reflects the section you're in, not literally which route is
// mounted. Add an entry here whenever a new screen is wired up.
const NAV_KEY_BY_ROUTE: Record<string, BottomNavKey> = {
  '/schedules': 'schedule',
  '/shifts': 'menu',
  '/team': 'menu',
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

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const userName = user?.name || user?.username || 'Account';

  const handleSignOut = () => {
    setMenuOpen(false);
    setProfileOpen(false);
    tokenStore.clear();
    dispatch(clearAuth());
    router.replace('/');
  };

  const handleSwitchWorkspace = () => notImplemented('Switch Workspace');

  const handleBottomNavSelect = (key: BottomNavKey) => {
    if (key === 'menu') setMenuOpen(true);
    else if (key === 'profile') setProfileOpen(true);
    else if (key === 'notifications') notImplemented('Notifications');
    else {
      const route = Object.entries(NAV_KEY_BY_ROUTE).find(([, navKey]) => navKey === key)?.[0];
      if (route) router.back();
    }
    // 'schedule' is the only real screen so far — nothing to do.
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
        <DrawerLink
          icon="calendar-today"
          label="Manage Shifts"
          onPress={() => {
            setMenuOpen(false);
            router.push('/shifts');
          }}
        />
        <DrawerLink
          icon="person-add"
          label="Employees"
          onPress={() => {
            setMenuOpen(false);
            router.push('/team');
          }}
        />
        <DrawerLink icon="settings" label="Team Settings" onPress={() => notImplemented('Team Settings')} />
        <DrawerLink icon="assessment" label="Reports" onPress={() => notImplemented('Reports')} />
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
