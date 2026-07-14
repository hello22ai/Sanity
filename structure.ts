import type {StructureResolver} from 'sanity/structure'
import {
  DocumentsIcon,
  EditIcon,
  CheckmarkCircleIcon,
  ClockIcon,
} from '@sanity/icons'

const API_VERSION = '2025-01-01'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Dashboard')
    .items([
      S.listItem()
        .title('All Posts')
        .icon(DocumentsIcon)
        .child(
          S.documentTypeList('post')
            .title('All Posts')
            .defaultOrdering([{field: 'publishedAt', direction: 'desc'}]),
        ),
      S.divider(),
      S.listItem()
        .title('Published')
        .icon(CheckmarkCircleIcon)
        .child(
          S.documentList()
            .title('Published Posts')
            .schemaType('post')
            .apiVersion(API_VERSION)
            .filter('_type == "post" && !(_id in path("drafts.**"))')
            .defaultOrdering([{field: 'publishedAt', direction: 'desc'}]),
        ),
      S.listItem()
        .title('Drafts')
        .icon(EditIcon)
        .child(
          S.documentList()
            .title('Draft Posts')
            .schemaType('post')
            .apiVersion(API_VERSION)
            .filter('_type == "post" && _id in path("drafts.**")')
            .defaultOrdering([{field: '_updatedAt', direction: 'desc'}]),
        ),
      S.listItem()
        .title('Recently Updated')
        .icon(ClockIcon)
        .child(
          S.documentList()
            .title('Recently Updated')
            .schemaType('post')
            .apiVersion(API_VERSION)
            .filter('_type == "post"')
            .defaultOrdering([{field: '_updatedAt', direction: 'desc'}]),
        ),
    ])
