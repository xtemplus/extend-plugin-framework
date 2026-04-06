declare module 'semver' {
  const semver: {
    coerce(version: string | null | undefined): { major: number } | null
    satisfies(version: string, range: string, options?: { includePrerelease?: boolean }): boolean
  }
  export default semver
}
