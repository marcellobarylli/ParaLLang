// Round 115: the client's shape of a dungeon. Pure, so the server's contract test builds the same object from the
// content file without Vite. A site's characterName comes later, from the server (GET /api/dungeons/:id).
export function toClientDungeon(file) {
  return Object.freeze({
    id: file.id,
    name: file.name,
    level: file.level,
    sites: file.sites.map((site) => Object.freeze({ encounterId: site.encounter, name: site.name, at: [...site.at], characterName: null })),
    route: file.route.map((point) => [...point]),
  });
}
