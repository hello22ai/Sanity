import type {StructureResolver} from 'sanity/structure'
// @sanity/icons v5 ka root entry sirf {Icon, icons} export karta hai — har icon apne
// subpath par chala gaya hai. Root se named import karne par dev server/build
// "does not provide an export named 'DocumentsIcon'" ke saath fail hota hai, aur
// TypeScript ise pakadta nahi kyunki .d.ts me ye naam ab bhi (deprecated) maujood hain.
import {DocumentsIcon} from '@sanity/icons/Documents'
import {EditIcon} from '@sanity/icons/Edit'
import {CheckmarkCircleIcon} from '@sanity/icons/CheckmarkCircle'
import {ClockIcon} from '@sanity/icons/Clock'

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
