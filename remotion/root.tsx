import React from 'react';
import {Composition} from 'remotion';
import {VincentioVideo, VideoProps} from './video';
import sample from './sample-props.json';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="VincentioVideo"
    component={VincentioVideo}
    width={1920}
    height={1080}
    fps={30}
    durationInFrames={Math.ceil(sample.duration * 30)}
    defaultProps={sample as VideoProps}
    calculateMetadata={({props}) => ({durationInFrames: Math.max(1, Math.ceil(props.duration * 30))})}
  />
);
