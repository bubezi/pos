const { contextBridge } = require('electron')

console.log('[preload] loaded')

contextBridge.exposeInMainWorld('posAPI', {
  ping: () => 'pong',
})