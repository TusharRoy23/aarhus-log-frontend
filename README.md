# Aarhus Log

A multi-tenant workforce management app for scheduling, time tracking, and employee requests. Built with Expo (React Native) so the same codebase runs on iOS, Android, and web.

## Features

- **Scheduling**
  - Individual shift creation and editing, with QR or manual clock-in
  - Bulk weekly schedule builder — assign multiple employees across a week, grouped by shared shift times
  - Open (unassigned) shifts that any employee can pick up later
  - Draft and published schedule states, with per-shift autosave
  - Per-day and per-week estimated labor cost
  - Rule-violation checking on schedule changes (e.g. rest-period or hour-limit conflicts)
  - Copying/viewing published schedules, shift history, and "people on the floor" status

- **Time tracking**
  - Start/stop shifts via QR scan or manual entry
  - Break time tracking
  - Hours summary with breakdowns for night-shift, weekend, and festival hours

- **Employee & team management**
  - Employee directory with invite flow and activation status
  - Designations (job titles/roles) with configurable permissions
  - Per-employee wage history and effective-dated pay rates

- **Wage configuration**
  - Festival, night-shift, and weekend wage premiums
  - Date and time-scoped rules, optionally limited to specific employees

- **Organization rules**
  - Configurable rule sections and rules (number, option, or text inputs) enforced org-wide
  - Per-employee rule overrides and section exemptions

- **Applications**
  - Employees can apply for absence, with date/time range and notes
  - Admin review queue to approve or decline absence applications
  - Scaffolded for future application types (e.g. overtime, shift swap)

- **Permissions**
  - Role-based access control by resource and action
  - Per-designation and per-employee permission matrices

- **AI assistant**
  - In-app chat assistant for schedule and workforce-related questions

- **Platform**
  - Multi-tenant organization selection and switching
  - Authentication with OTP verification and token refresh
  - Responsive layout (side navigation on wide screens, bottom tabs on mobile)

## Future Integrations

- Auto scheduling with AI assistant
- Salary management
- Employee performance indicator
- Granular cost analysis
- Multi-lingual integration

## Tech Stack

- [Expo](https://expo.dev) / React Native, with [Expo Router](https://docs.expo.dev/router/introduction/) for file-based navigation
- [TanStack Query](https://tanstack.com/query) for server state
- [Redux Toolkit](https://redux-toolkit.js.org/) + redux-persist for client/auth state
- Axios for API access
