const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('intake', Object.freeze({
  chooseAudio: () => ipcRenderer.invoke('audio:choose'),
  dropAudio: file => ipcRenderer.invoke('audio:drop', webUtils.getPathForFile(file)),
  inspect: (id, testMode) => ipcRenderer.invoke('audio:inspect', { id, testMode }),
  exportReport: report => ipcRenderer.invoke('report:save', report),
  onOpen: callback => { const listener = () => callback(); ipcRenderer.on('menu:open', listener); return () => ipcRenderer.removeListener('menu:open', listener); },
}));
