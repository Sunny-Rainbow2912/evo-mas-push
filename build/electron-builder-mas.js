// build config for every platform and architecture EXCEPT linux arm64

//const baseConfig = require('./electron-builder-base.js')

const config = {
  //...baseConfig,
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

  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64']
      },
      {
        target: 'deb',
        arch: ['x64']
      },
      {
        target: 'snap',
        arch: ['x64']
      },
      {
        target: 'tar.gz',
        arch: ['x64']
      }
    ]
  },
  
  mac: {
    category: "public.app-category.finance",
    target: [
      { target: "mas", arch: "universal" },
      //{ target: "mas", arch: "arm64" }
    ],
    icon: "build/icon.icns",
    asarUnpack: [
      "**/*.node",
      "**/node_modules/{nodegit,sqlite3}/**"
    ],
    notarize: true,
    hardenedRuntime: true,
    bundleVersion: "112", // CFBundleVersion
    gatekeeperAssess: true,
    entitlements: 'build/entitlements.mas.plist',
    entitlementsInherit: "build/entitlements.mas.inherit.plist",
    // extendInfo: {
    //   ITSAppUsesNonExemptEncryption: true
    // },
    //requirements: 'build/electron-builder-requirements.txt',
    provisioningProfile: "build/EvoTradeWallet_Dist.provisionprofile",
    // sandbox: true
  },
  mas: {
    type: "distribution",
  },
  
  win: {
    publisherName: 'EvoTrade',
    signAndEditExecutable: true,
    icon: 'build/icons/icon.png'
  }
    
}
  

module.exports = config
