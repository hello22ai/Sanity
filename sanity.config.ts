import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {table} from '@sanity/table'
import {schemaTypes} from './schemaTypes'
import {structure} from './structure'
import {theme} from './theme'
import {Logo} from './components/Logo'

export default defineConfig({
  name: 'default',
  title: 'Blog Studio',
  subtitle: 'Content Dashboard',
  icon: Logo,

  projectId: 'lesy43y1',
  dataset: 'production',

  theme,

  // table() = body editor mein Table block (grid editing UI ke saath)
  plugins: [structureTool({structure}), visionTool(), table()],

  schema: {
    types: schemaTypes,
  },
})
