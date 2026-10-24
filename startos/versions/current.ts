import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '26.2:11',
  releaseNotes: {
    en_US: `- Stops trusting certificates from a compromised certificate authority (eMudhra).
- Includes the October 2026 Node.js security fixes.`,
    es_ES: `- Deja de confiar en los certificados de una autoridad de certificación comprometida (eMudhra).
- Incluye las correcciones de seguridad de Node.js de octubre de 2026.`,
    de_DE: `- Vertraut Zertifikaten einer kompromittierten Zertifizierungsstelle (eMudhra) nicht mehr.
- Enthält die Node.js-Sicherheitskorrekturen vom Oktober 2026.`,
    pl_PL: `- Przestaje ufać certyfikatom przejętego urzędu certyfikacji (eMudhra).
- Zawiera poprawki bezpieczeństwa Node.js z października 2026.`,
    fr_FR: `- Ne fait plus confiance aux certificats d'une autorité de certification compromise (eMudhra).
- Inclut les correctifs de sécurité Node.js d'octobre 2026.`,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
