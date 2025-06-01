
const config = {
  appId: 'com.evotrade.wallet',
  productName: 'EvoTradeWallet',
  files: [
    'compiled/**/*',
    'bundle/**/*',
    '!compiled/main/dev/**',
      "node_modules/**/*",
      "!node_modules/**/build/node_gyp_bins/**",
      "!node_modules/**/*.{c,mk,a,o,h,md,gz,txt,markdown,Makefile}",
      "!node_modules/**/test/**",
      "!node_modules/**/tests/**",
      "!node_modules/**/doc/**",
      "!node_modules/**/docs/**",
      "!node_modules/**/*.d.ts",
      "!**/*.map"
  ],
  
  mac: {
    category: "public.app-category.finance",
    target: [
      { target: "mas", arch: "universal" },
    ],
    icon: "build/icon.icns",
    asarUnpack: [
      "**/*.node",
      "**/node_modules/{nodegit,sqlite3}/**"
    ],
    hardenedRuntime: false,
    bundleVersion: "114",
    gatekeeperAssess: true,
    entitlements: 'build/entitlements.mas.plist',
    entitlementsInherit: "build/entitlements.mas.inherit.plist",
    provisioningProfile: "build/EvoTradeWallet_Dist.provisionprofile",
  },
}
  
module.exports = config
