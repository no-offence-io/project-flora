import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: '559r73zo',
    dataset: 'production',
  },

  /**
   * TypeGen reads the GROQ queries out of the Next.js app next door and writes their result types
   * back into it, so a query and the type the app trusts can't drift apart. Types regenerate during
   * `sanity dev` and `sanity build`; run `npm run typegen` here after editing queries otherwise.
   */
  typegen: {
    enabled: true,
    path: '../src/**/*.{ts,tsx}',
    schema: 'schema.json',
    generates: '../src/sanity/sanity.types.ts',
    overloadClientMethods: true,
  },

  deployment: {
    /** Sanity-hosted Studio: https://prosjectflora-admin.sanity.studio (deploy with `npx sanity deploy`). */
    appId: 'ohermo3dlte6uycuhrtkt6br',
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
  },
})
