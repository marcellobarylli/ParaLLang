// Round 118: the id of this build, the same string as version.json on the site (vite.config.js defines it).
/* global __PARALLANG_BUILD__ */
export const BUILD_ID = typeof __PARALLANG_BUILD__ === 'string' ? __PARALLANG_BUILD__ : 'dev';
