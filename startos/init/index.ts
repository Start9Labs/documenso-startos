import { actions } from '../actions'
import { restoreInit } from '../backups'
import { dependencies } from '../dependencies'
import { setInterfaces } from '../interfaces'
import { sdk } from '../sdk'
import { versionGraph } from '../versions'
import { initializeService } from './initializeService'
import { primaryUrlTask } from './primaryUrlTask'
import { signingCertificate } from './signingCertificate'
import { smtpTask } from './smtpTask'
import { watchAdmin } from './watchAdmin'

export const init = sdk.setupInit(
  restoreInit,
  versionGraph,
  initializeService,
  signingCertificate,
  setInterfaces,
  actions,
  primaryUrlTask,
  watchAdmin,
  smtpTask,
  dependencies,
)

export const uninit = sdk.setupUninit(versionGraph)
