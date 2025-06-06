import { z } from 'zod'

const v38MuteSchema = z
  .object({
    migrateToPylon: z.boolean().default(true)
  })
  .passthrough()
  .default({})

const v38ConnectionSchema = z
  .object({
    current: z.enum(['local', 'custom', 'infura', 'alchemy', 'pylon', 'poa']),
    custom: z.string().default('')
  })
  .passthrough()

export const v38ChainSchema = z
  .object({
    id: z.coerce.number(),
    connection: z.object({
      primary: v38ConnectionSchema,
      secondary: v38ConnectionSchema
    })
  })
  .passthrough()

export const v38ChainMetadataSchema = z.object({
  ethereum: z.object({}).passthrough()
})

const EthereumChainsSchema = z.record(z.coerce.number(), v38ChainSchema)

export const v38ChainsSchema = z.object({
  ethereum: EthereumChainsSchema
})

export const v38MainSchema = z
  .object({
    networks: v38ChainsSchema,
    networksMeta: v38ChainMetadataSchema,
    mute: v38MuteSchema
  })
  .passthrough()

export const v38StateSchema = z
  .object({
    main: v38MainSchema
  })
  .passthrough()

export type v38Connection = z.infer<typeof v38ConnectionSchema>
export type v38Chain = z.infer<typeof v38ChainSchema>
