import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  guideSidebar: [
    {
      type: 'doc',
      id: 'intro',
      label: 'Introduction',
    },
    {
      type: 'category',
      label: 'User Guide',
      collapsed: false,
      items: [
        'guide/dashboard',
        'guide/meetings',
        'guide/tasks',
        'guide/projects',
        'guide/messaging',
        'guide/meeting-requests',
        'guide/people',
        'guide/goals',
        'guide/analytics',
        'guide/timesheets',
        'guide/settings',
        'guide/client-portals',
        'guide/intake-forms',
      ],
    },
    {
      type: 'category',
      label: 'Admins & Managers',
      collapsed: false,
      items: [
        'guide/triage',
      ],
    },
  ],
  referenceSidebar: [
    {
      type: 'category',
      label: 'Reference',
      collapsed: false,
      items: [
        'reference/permissions',
        'reference/notifications',
      ],
    },
  ],
};

export default sidebars;
