// This policy runs before the runtime, styles, host listeners or API clients.
export const PUBLIC_SERVER_MESSAGE = 'RoleForge ไม่รองรับการใช้งานบนเซิร์ฟเวอร์สาธารณะนี้ กรุณาใช้งานบนเครื่องส่วนตัวหรือเซิร์ฟเวอร์ส่วนตัว / RoleForge does not support this public server. Use a personal installation or private server.';
export function isBlockedHost(location = globalThis.location) {
    const hostname = String(location?.hostname || '').toLowerCase().replace(/\.+$/u, '');
    return hostname === 'chat.rolezy.com' || hostname.endsWith('.chat.rolezy.com');
}
export function showHostBlocked(doc = globalThis.document) {
    globalThis.TretaresiaHostBlocked = true;
    if (!doc) return;
    const display = () => {
        if (doc.getElementById('roleforge-host-blocked')) return;
        const notice = doc.createElement('div'); notice.id = 'roleforge-host-blocked';
        notice.className = 'extension_container'; notice.setAttribute('role', 'alert');
        const title = doc.createElement('strong'); title.textContent = 'RoleForge · ใช้งานไม่ได้ / Unavailable';
        const reason = doc.createElement('p'); reason.textContent = PUBLIC_SERVER_MESSAGE;
        notice.append(title, reason);
        (doc.getElementById('extensions_settings2') || doc.body)?.append(notice);
        globalThis.toastr?.warning(PUBLIC_SERVER_MESSAGE, 'RoleForge', {escapeHtml:true,timeOut:12000});
    };
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', display, {once:true});
    else display();
}
