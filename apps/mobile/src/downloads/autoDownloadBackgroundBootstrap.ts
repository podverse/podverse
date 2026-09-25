/**
 * Side-effect import: defines TaskManager tasks for silent-push and background-fetch auto download.
 * Must load from the app entry before any silent push can arrive.
 */
import './autoDownloadBackgroundNotificationTask';
import './autoDownloadBackgroundFetch';

export { registerAutoDownloadBackgroundFetch } from './autoDownloadBackgroundFetch';
export { registerAutoDownloadBackgroundNotificationTask } from './autoDownloadBackgroundNotificationTask';
