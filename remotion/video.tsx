import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';

export type Scene = {index:number;start:number;end:number;narration:string;image_path?:string|null};
export type Caption = {start:number;end:number;text:string};
export type VideoProps = {title:string;duration:number;audio_path?:string;scenes:Scene[];captions:Caption[]};

const SceneCard: React.FC<{scene: Scene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 150], [1, 1.055], {extrapolateRight:'clamp'});
  return <AbsoluteFill style={{background:'#15231f',overflow:'hidden'}}>
    {scene.image_path ? <Img src={staticFile(scene.image_path)} style={{width:'100%',height:'100%',objectFit:'cover',transform:`scale(${scale})`}}/> :
      <AbsoluteFill style={{background:'radial-gradient(circle at 35% 25%, #d9bc76 0, transparent 24%), linear-gradient(145deg,#14231f,#536456)'}}/>}
    <AbsoluteFill style={{background:'linear-gradient(180deg,transparent 50%,rgba(8,16,13,.82))'}}/>
  </AbsoluteFill>;
};

export const VincentioVideo: React.FC<VideoProps> = ({title,audio_path,scenes,captions}) => (
  <AbsoluteFill style={{background:'#15231f',fontFamily:'serif'}}>
    {audio_path ? <Audio src={staticFile(audio_path)}/> : null}
    {scenes.map((scene) => <Sequence key={scene.index} from={Math.round(scene.start*30)} durationInFrames={Math.max(1,Math.round((scene.end-scene.start)*30))}><SceneCard scene={scene}/></Sequence>)}
    <AbsoluteFill style={{justifyContent:'flex-start',padding:'64px 90px',color:'#f8f1df'}}><div style={{fontSize:24,letterSpacing:6,opacity:.8}}>빈첸시오 말씀방</div></AbsoluteFill>
    {captions.map((caption,index) => <Sequence key={index} from={Math.round(caption.start*30)} durationInFrames={Math.max(1,Math.round((caption.end-caption.start)*30))}>
      <AbsoluteFill style={{justifyContent:'flex-end',alignItems:'center',padding:'0 150px 92px'}}><div style={{fontFamily:'sans-serif',fontSize:54,fontWeight:700,lineHeight:1.45,color:'white',textAlign:'center',textShadow:'0 3px 12px #000',background:'rgba(0,0,0,.38)',padding:'14px 28px'}}>{caption.text}</div></AbsoluteFill>
    </Sequence>)}
    <Sequence from={0} durationInFrames={90}><AbsoluteFill style={{alignItems:'center',justifyContent:'center',color:'#fff',fontSize:74,textShadow:'0 4px 20px #000'}}>{title}</AbsoluteFill></Sequence>
  </AbsoluteFill>
);

