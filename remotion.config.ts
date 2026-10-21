import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('png');
Config.setChromiumOpenGlRenderer('angle');
Config.setConcurrency(6);
Config.setCodec('h264');
Config.setCrf(14);
Config.setPixelFormat('yuv420p');
