// Keep the accepted inscription at least as large as any saved paper page.
// Joining independent blocks can add one separator per block.
export const PAPER_LIMITS=Object.freeze({pages:32,blocks:24,text:1200,characters:48000,minSize:12,maxSize:44});
export const INSCRIPTION_TEXT_LIMIT=PAPER_LIMITS.characters+PAPER_LIMITS.blocks;
