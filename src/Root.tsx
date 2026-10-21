import React from 'react';
import {Composition} from 'remotion';
import {StoneLabs} from './StoneLabs';
import {FPS, TOTAL} from './timeline';
import {W, H} from './format';

export const Root: React.FC = () => (
  <Composition
    id="StoneLabs"
    component={StoneLabs}
    durationInFrames={Math.round(TOTAL * FPS)}
    fps={FPS}
    width={W}
    height={H}
  />
);
