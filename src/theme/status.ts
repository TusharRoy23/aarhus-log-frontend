export type ShiftStatus = 'confirmed' | 'pending';

// Semantic status colors for shift cards. Not part of the core "Kinetic
// Enterprise" palette (theme/colors.ts) — those are Confirmed/Pending
// specific, not general-purpose surface/primary roles.
export const StatusColors: Record<ShiftStatus, { background: string; text: string; strip: string }> = {
  confirmed: { background: '#ecfdf5', text: '#047857', strip: '#10b981' },
  pending: { background: '#fffbeb', text: '#b45309', strip: '#f59e0b' },
};

// Employment status (`is_active`) — separate from invite status
// (`is_invited`, see EmployeeCard's `isInvited` prop). A deactivated
// employee and one who hasn't accepted their invite yet are independent
// states; a card can show both a "Not Active" badge and a "Resend Invite"
// link at once.
export type EmployeeStatus = 'active' | 'inactive';

export const EmployeeStatusColors: Record<EmployeeStatus, { background: string; text: string; strip: string }> = {
  active: { background: '#ecfdf5', text: '#047857', strip: '#10b981' },
  inactive: { background: '#fef2f2', text: '#b91c1c', strip: '#f59e0b' },
};
