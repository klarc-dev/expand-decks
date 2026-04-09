/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import config from '@payload-config';
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts';
import { importMap } from './admin/importMap';
import React from 'react';
import type { ServerFunctionClient } from 'payload';

// Pre-compiled Payload admin SCSS — imported as static CSS to ensure
// theme variables (--font-body, --theme-bg, etc.) survive Next.js CSS optimization.
// Regenerate with: npx sass --no-source-map --style=compressed node_modules/@payloadcms/ui/dist/scss/app.scss src/app/\(payload\)/payload-admin.css
import './payload-admin.css';

type Args = {
  children: React.ReactNode;
};

const serverFunction: ServerFunctionClient = async (args) => {
  'use server';
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  });
};

const Layout = ({ children }: Args) => (
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    {children}
  </RootLayout>
);

export default Layout;
