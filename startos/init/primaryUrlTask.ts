import { i18n } from '../i18n'
import { primaryUrl } from '../primaryUrl'

export const primaryUrlTask = primaryUrl.setupTask('important', {
  reason: i18n(
    'Choose the URL Documenso puts in signing links and emails. Recipients must be able to reach it.',
  ),
})
