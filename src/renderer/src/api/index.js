/**
 * API abstraction layer — desktop (Electron)
 * Wraps window.api (IPC bridge) so components are platform-agnostic.
 * The mobile version replaces this file with direct Firebase Web SDK calls.
 */
const api = {
  ...window.api,
  async uploadCommentPhoto(file) {
    const buffer = await file.arrayBuffer()
    return window.api.uploadCommentPhoto(buffer, file.name, file.type)
  }
}
export default api
