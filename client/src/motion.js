// Round 212: the game ignores the system's "Reduce motion" setting. Its animations are part of the game (the camera's
// walks, a character sinking, the lightning, the clouds' drift), and the owner plays it in development with the
// setting as it is. Every view asks here; this answers no. The owner's rule for later rounds: honour the setting only
// for something that could truly harm (CLAUDE.md, "Reduce motion").
export const prefersReducedMotion = () => false;
