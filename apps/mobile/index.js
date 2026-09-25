import './src/shims/webCrypto';
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

import './src/downloads/autoDownloadBackgroundBootstrap';
import App from './App';

registerRootComponent(App);
