import { electronAPI, exposeInMainWorld } from '@electron-toolkit/preload'

import '../renderer/backend-preload/index'

exposeInMainWorld('electron', electronAPI)
