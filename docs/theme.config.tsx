import React from 'react'
import { DocsThemeConfig } from 'nextra-theme-docs'

const config: DocsThemeConfig = {
  logo: <span>Singlish</span>,
  project: {
    link: 'https://github.com/remeinium/siyabasa-singlish',
  },
  chat: {
    link: 'https://discord.gg/remeinium',
  },
  docsRepositoryBase: 'https://github.com/remeinium/siyabasa-singlish/blob/main/docs',
  footer: {
    text: '© 2024 Remeinium Labs | Siyabasa Sinhala NLP Department',
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content="Singlish - Remeinium Labs" />
      <meta property="og:description" content="Industry-grade Singlish to Sinhala conversion library." />
    </>
  ),
  useNextSeoProps() {
    return {
      titleTemplate: '%s – Singlish'
    }
  },
  sidebar: {
    defaultMenuCollapseLevel: 1,
    toggleButton: true
  },
  navigation: {
    prev: true,
    next: true
  }
}

export default config
