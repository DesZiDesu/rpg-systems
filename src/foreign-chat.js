// Other trackers own their protocol and storage. Read only the story when
// inferring RoleForge changes; never consume MVU's JSONPatch as story evidence.
const code = /```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)|`[^`\n]*`|<(pre|code|script|style|custom-style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const foreignBlock = '<(UpdateVariable|UpdateAnalysis|JSONPatch)\\b[^>]*>[\\s\\S]*?(?:<\\/\\2\\s*>|$)';
const ownBlocks = '<!--\\s*tretaresia_patch\\s*:[\\s\\S]*?(?:-->|$)|<tretaresia_patch>[\\s\\S]*?(?:<\\/tretaresia_patch>|$)|\\[\\[?\\s*tretaresia[_ -]?patch\\s*\\]?\\][\\s\\S]*?(?:\\[\\[?\\s*\\/\\s*tretaresia[_ -]?patch\\s*\\]?\\]|$)|tretaresia[_ -]?patch\\s*:[\\s\\S]*$';
const boundaries = new RegExp(code.source+'|'+foreignBlock+'|'+ownBlocks,'gi');
const reasoningStart=/^<(?:think|thinking|analysis|reasoning|planning)\b/i;
const cleaningBoundaries=new RegExp('<(?:think|thinking|analysis|reasoning|planning)\\b[^>]*>[\\s\\S]*?<\\/(?:think|thinking|analysis|reasoning|planning)\\s*>|'+boundaries.source,'gi');
const ownStart = /^(?:```(?:tretaresia[_ -]?patch|json\s+tretaresia[_ -]?patch)\b|<!--\s*tretaresia_patch\s*:|<tretaresia_patch>|\[\[?\s*tretaresia[_ -]?patch\s*\]?\]|tretaresia[_ -]?patch\s*:)/i;
function mapProtected(source, transform, pattern, protectedText=text=>text) {
    const text = String(source ?? '');let cursor = 0, output = '';
    for (const match of text.matchAll(pattern)) {
        output += transform(text.slice(cursor, match.index)) + protectedText(match[0]);
        cursor = match.index + match[0].length;
    }
    return output + transform(text.slice(cursor));
}
export function mapChatProse(source, transform) {
    return mapProtected(source,transform,code);
}
export function mapRoleForgeProse(source, transform) {
    return mapProtected(source,transform,boundaries,text=>ownStart.test(text)?transform(text):text);
}
export function cleanChatProse(source, clean) {
    const transform = text => {
        if (!text.trim()) return text;
        // Cleaners commonly trim their output. Keep separators around code
        // fences/HTML: losing the preceding newline turns a frontend into text.
        const leading=text.match(/^\s*/u)[0],trailing=text.match(/\s*$/u)[0];
        return leading+clean(text.trim()).trim()+trailing;
    };
    return mapProtected(source,transform,cleaningBoundaries,text=>reasoningStart.test(text.slice(0,30))?transform(text):text);
}
export function hasForeignTrackerData(source) {
    let found = false;
    mapProtected(source, text => {
        found ||= /<(?:StatusPlaceHolderImpl|GameStartMenu|gametxt)\b/i.test(text);
        return text;
    },boundaries,text=>{found ||= /^<(?:UpdateVariable|UpdateAnalysis|JSONPatch)\b/i.test(text);return text;});
    return found;
}
export function stripForeignTrackerData(source) {
    return mapProtected(source, text => text.replace(/<\/?(?:StatusPlaceHolderImpl|GameStartMenu)\b[^>]*>/gi, ''),boundaries,
        text=>/^<(?:UpdateVariable|UpdateAnalysis|JSONPatch)\b/i.test(text)?'':text).trimEnd();
}
