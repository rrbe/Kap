import {CancelIcon, SpinnerIcon} from 'vectors';
import {UseConversion, UseConversionState} from 'hooks/editor/use-conversion';
import {ExportStatus} from 'common/types';
import useEditorWindowState from 'hooks/editor/use-editor-window-state';
import useConversionIdContext from 'hooks/editor/use-conversion-id';
import {flags} from '../../../utils/flags';
import {useState} from 'react';
import {ipcRenderer} from 'electron-better-ipc';

const VideoPreview = ({conversion, cancel, showInFolder}: {conversion: UseConversionState; cancel: () => any; showInFolder: () => any}) => {
  const {conversionId} = useConversionIdContext();
  const {filePath} = useEditorWindowState();
  const [tooltipShowing, setTooltipShowing] = useState(!flags.get('editorDragTooltip'));
  const src = `file://${filePath}`;

  const percentage = conversion?.progress ?? 0;
  const done = conversion && (conversion?.status !== ExportStatus.inProgress);

  const onDragStart = (event: any) => {
    event.preventDefault();
    ipcRenderer.send('drag-export', conversionId);
  };

  const onTooltipClick = event => {
    event.stopPropagation();
    setTooltipShowing(false);
    flags.set('editorDragTooltip', true);
  };

  return (
    <div
      draggable={done}
      className="video-preview"
      onDragStart={onDragStart}
      onClick={showInFolder}
    >
      {
        done && conversion?.canPreviewExport ?
          <img src={`file://${conversion?.filePath}`}/> :
          <video src={src}/>
      }
      <div className="overlay" style={{display: done ? 'none' : 'flex'}}>
        <div className="progress-indicator">
          {
            percentage === 0 ?
              <IndeterminateSpinner/> :
              <ProgressCircle percent={percentage}/>
          }
        </div>
        <div className="cancel" title="Cancel" onClick={cancel}>
          <CancelIcon fill="white" hoverFill="white" activeFill="white" size="100%"/>
        </div>
      </div>
      {done && tooltipShowing && (
        <div className="tooltip-content" onClick={onTooltipClick}>Drag and drop to copy the recording to your desktop or an application. Click to open its parent directory</div>
      )}
      <style jsx>{`
        .video-preview {
          width: 100%;
          height: wrap-content;
          background: black;
          position: relative;
          flex: 1;
          height: 0;
          -webkit-app-region: no-drag;
          max-height: 200px;
        }

        video, img {
          width: 100%;
          height: 100%;
        }

        img {
          object-fit: contain;
        }

        .overlay {
          width: 100%;
          height: 100%;
          position: absolute;
          top: 0;
          left: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, .5);
        }

        .progress-indicator, .cancel {
          width: 48px;
          height: 48px;
          position: absolute;
          transition: opacity 0.35s ease-in-out;
        }

        .cancel {
          width: 24px;
          height: 24px;
          pointer-events: none;
          opacity: 0;
        }

        .overlay:hover .cancel {
          opacity: 1;
          pointer-events: auto;
        }

        .tooltip-content {
          position: absolute;
          top: calc(100% + 8px);
          left: 50%;
          z-index: 2;
          width: 258px;
          padding: 8px 21px;
          transform: translateX(-50%);
          border: 1px solid rgba(255, 255, 255, 0.4);
          border-radius: 4px;
          background: var(--background-color);
          color: white;
          font-size: 12px;
          line-height: 16px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

const IndeterminateSpinner = () => (
  <div className="container">
    <SpinnerIcon stroke="#fff"/>
    <style jsx>{`
          .container {
            width: 100%;
            height: 100%;
            animation: spin 3s linear infinite;
          }

          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }

            50% {
              transform: rotate(720deg);
            }

            100% {
              transform: rotate(1080deg);
            }
          }
        `}</style>
  </div>
);

const ProgressCircle = ({percent}: {percent: number}) => {
  const circumference = 12 * 2 * Math.PI;
  const offset = circumference * (1 - percent);

  return (
    <svg viewBox="0 0 24 24">
      <circle stroke="white" strokeWidth="2" fill="transparent" cx="12" cy="12" r="12"/>
      <style jsx>{`
          svg {
            width: 100%;
            height: 100%;
            overflow: visible;
            transform: rotate(-90deg);
          }

          circle {
            stroke-dasharray: ${circumference} ${circumference};
            stroke-dashoffset: ${offset};
            ${percent === 0 ? '' : 'transition: stroke-dashoffset 0.35s;'}
          }
        `}</style>
    </svg>
  );
};

export default VideoPreview;
