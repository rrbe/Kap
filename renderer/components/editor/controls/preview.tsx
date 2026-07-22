import formatTime from '../../../utils/format-time';
import {useRef, useEffect} from 'react';
import useEditorWindowState from 'hooks/editor/use-editor-window-state';

type Props = {
  time: number;
  labelTime: number;
  duration: number;
  hidePreview: boolean;
};

const Preview = ({time, labelTime, duration, hidePreview}: Props) => {
  const videoRef = useRef<HTMLVideoElement>();
  const {filePath} = useEditorWindowState();
  const src = `file://${filePath}`;

  useEffect(() => {
    if (!hidePreview) {
      videoRef.current.currentTime = time;
    }
  }, [time, hidePreview]);

  return (
    <div
      className="container" onMouseMove={event => {
        event.stopPropagation();
      }}
    >
      <video ref={videoRef} preload="auto" src={src}/>
      <div className="time">{formatTime(labelTime, {extra: duration})}</div>
      <style jsx>{`
          .container {
            flex: 1;
            position: relative;
          }

          .time {
            position: absolute;
            bottom: 8px;
            left: 50%;
            transform: translateX(-50%);
            width: max-content;
            height: 24px;
            background: rgba(0, 0, 0, 0.4);
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            font-size: 12px;
            padding: 4px 8px;
          }

          video {
            width: 100%;
            height: 100%;
            border-radius: 4px;
            box-shadow: 0px 0px 16px rgba(0, 0, 0, 0.1);
            ${hidePreview ? 'display: none;' : ''}
          }
        `}</style>
    </div>
  );
};

export default Preview;
