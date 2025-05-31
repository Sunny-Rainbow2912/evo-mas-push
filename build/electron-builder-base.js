const config = {
  appId: 'com.evotrade.wallet',
  productName: 'EvoTradeWallet',
  files: [
    'compiled/**/*',
    'bundle/**/*',
    '!compiled/main/dev/**',
 //   "dist/**/*",
      "node_modules/**/*",
 //     "package.json",
      "!node_modules/**/build/node_gyp_bins/**",
      "!node_modules/**/*.{c,mk,a,o,h,md,gz,txt,markdown,Makefile}",
      "!node_modules/**/test/**",
      "!node_modules/**/tests/**",
      "!node_modules/**/doc/**",
      "!node_modules/**/docs/**",
      "!node_modules/**/*.d.ts",
      "!**/*.map"
  ],
  //asar: false,
  mac: {
    category: "public.app-category.finance",
    target: [
      { target: "mas", arch: "universal" },
      //{ target: "mas", arch: "arm64" }
    ],
    asarUnpack: [
        "**/*.node",
        "**/node_modules/{nodegit,sqlite3}/**"
      ],
    hardenedRuntime: true,
    //mergeASARs: false,
    entitlements: "entitlements.mas.plist",
    entitlementsInherit: "entitlements.mas.inherit.plist",
    gatekeeperAssess: true,
    sandbox: true
  }
}

module.exports = config
