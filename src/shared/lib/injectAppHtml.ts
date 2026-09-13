const MOUNT_POINT = /(<div id="root"[^>]*>)\s*(<\/div>)/;

export function injectAppHtml(template: string, appHtml: string): string {
  if (!MOUNT_POINT.test(template)) {
    throw new Error('injectAppHtml: в шаблоне не найден <div id="root"></div>');
  }
  return template.replace(MOUNT_POINT, `$1${appHtml}$2`);
}
