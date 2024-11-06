import { z } from 'zod';
import { IntegrationEntityType } from '../models/integration-entity.model'; // export const contactsSchema: ValidationSchema = {

// export const contactsSchema: ValidationSchema = {
//   title: 'Contacts',
//   type: 'array',
//   items: {
//     type: 'object',
//     properties: {
//       fillDefaults: true,
//       id: {
//         type: 'string',
//       },
//       email: {
//         type: ['string', 'null'],
//       },
//       organization: {
//         type: ['string', 'null'],
//       },
//       contactUrl: {
//         type: ['string', 'null'],
//       },
//       avatarUrl: {
//         type: ['string', 'null'],
//       },
//       name: {
//         type: ['string', 'null'],
//       },
//       firstName: {
//         type: ['string', 'null'],
//       },
//       lastName: {
//         type: ['string', 'null'],
//       },
//       readonly: {
//         type: ['boolean'],
//       },
//       phoneNumbers: {
//         type: 'array',
//         items: {
//           type: 'object',
//           properties: {
//             fillDefaults: true,
//             label: {
//               type: 'string',
//             },
//             phoneNumber: {
//               type: 'string',
//             },
//           },
//           required: ['label', 'phoneNumber'],
//         },
//       },
//     },
//     required: [
//       'id',
//       'name',
//       'firstName',
//       'lastName',
//       'email',
//       'organization',
//       'contactUrl',
//       'avatarUrl',
//       'phoneNumbers',
//     ],
//   },
// };

const integrationEntitySchema = z.object({
  id: z.string(),
  type: z.nativeEnum(IntegrationEntityType),
  source: z.string(),
  label: z.string().optional().nullable(),
  logId: z.string().optional().nullable(),
});

export const contactSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string().nullable(),
  organization: z.string().nullable(),
  contactUrl: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  readonly: z.boolean().optional(),
  phoneNumbers: z.array(
    z.object({
      label: z.string(),
      phoneNumber: z.string(),
    }),
  ),
  type: z.nativeEnum(IntegrationEntityType).optional(),
  relatesTo: z.array(integrationEntitySchema).optional(),
});

export const contactsGetSchema = z.array(contactSchema);

export const contactCreateSchema = z.object({
  name: z.string().nullable().optional().default(null),
  firstName: z.string().nullable().optional().default(null),
  lastName: z.string().nullable().optional().default(null),
  email: z.string().nullable().optional().default(null),
  organization: z.string().nullable().optional().default(null),
  contactUrl: z.string().nullable().optional().default(null),
  avatarUrl: z.string().nullable().optional().default(null),
  phoneNumbers: z.array(
    z.object({
      label: z.string(),
      phoneNumber: z.string(),
    }),
  ),
  type: z.nativeEnum(IntegrationEntityType).optional(),
});
