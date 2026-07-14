import {buildLegacyTheme} from 'sanity'

export const theme = buildLegacyTheme({
  '--black': '#0b0e14',
  '--white': '#ffffff',
  '--gray': '#8b93a7',
  '--gray-base': '#8b93a7',

  '--component-bg': '#ffffff',
  '--component-text-color': '#1a2233',

  '--brand-primary': '#6d5cff',

  '--default-button-color': '#8b93a7',
  '--default-button-primary-color': '#6d5cff',
  '--default-button-success-color': '#22c55e',
  '--default-button-warning-color': '#f59e0b',
  '--default-button-danger-color': '#ef4444',

  '--state-info-color': '#6d5cff',
  '--state-success-color': '#22c55e',
  '--state-warning-color': '#f59e0b',
  '--state-danger-color': '#ef4444',

  '--main-navigation-color': '#0b0e14',
  '--main-navigation-color--inverted': '#ffffff',

  '--focus-color': '#6d5cff',
})
