import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'MeetPlanner Docs',
  tagline: 'Turn every meeting into action.',
  favicon: 'img/favicon.svg',

  url: 'https://docs.meetplanner.vercel.app',
  baseUrl: '/',

  organizationName: 'duckercreative',
  projectName: 'meetplanner-docs',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/docs',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.png',
    navbar: {
      title: 'MeetPlanner',
      logo: {
        alt: 'MeetPlanner Logo',
        src: 'img/logo.svg',
        srcDark: 'img/logo-dark.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'guideSidebar',
          position: 'left',
          label: 'User Guide',
        },
        {
          type: 'docSidebar',
          sidebarId: 'referenceSidebar',
          position: 'left',
          label: 'Reference',
        },
        {
          href: 'https://meetplanner.vercel.app',
          label: 'Open App',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'User Guide',
          items: [
            { label: 'Getting Started', to: '/docs/intro' },
            { label: 'Task Board', to: '/docs/guide/tasks' },
            { label: 'Meetings', to: '/docs/guide/meetings' },
            { label: 'Messaging', to: '/docs/guide/messaging' },
          ],
        },
        {
          title: 'Advanced',
          items: [
            { label: 'Triage Queue', to: '/docs/guide/triage' },
            { label: 'Projects', to: '/docs/guide/projects' },
            { label: 'Goals & OKRs', to: '/docs/guide/goals' },
            { label: 'Analytics', to: '/docs/guide/analytics' },
          ],
        },
        {
          title: 'Reference',
          items: [
            { label: 'Role Permissions', to: '/docs/reference/permissions' },
            { label: 'Notifications', to: '/docs/reference/notifications' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Ducker Creative. Built with Docusaurus.`,
    },
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
    algolia: undefined,
  } satisfies Preset.ThemeConfig,
};

export default config;
