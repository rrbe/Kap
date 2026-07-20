// Vendored: https://github.com/sindresorhus/macos-release

const nameMap = {
  26: 'Tahoe',
  15: 'Sequoia',
  14: 'Sonoma',
  13: 'Ventura'
} as const;

export default function macosRelease(version = process.getSystemVersion()) {
  const majorVersion = Number.parseInt(version, 10) as keyof typeof nameMap;

  return {
    name: nameMap[majorVersion] ?? 'Unknown',
    version
  };
}
