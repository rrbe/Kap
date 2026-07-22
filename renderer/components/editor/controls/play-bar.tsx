import VideoTimeContainer from '../video-time-container';
import {useState, useRef} from 'react';
import VideoControlsContainer from '../video-controls-container';
import Preview from './preview';

const PlayBar = () => {
  const [resizing, setResizing] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);
  const progress = useRef<HTMLProgressElement>();

  const {play, pause} = VideoControlsContainer.useContainer();
  const {
    currentTime,
    duration,
    startTime,
    endTime,
    updateTime,
    updateStartTime,
    updateEndTime
  } = VideoTimeContainer.useContainer();

  const total = endTime - startTime;
  const current = currentTime - startTime;

  const getTimeFromEvent = event => {
    const cursorX = event.clientX;
    const {x, width} = progress.current.getBoundingClientRect();

    const percent = (cursorX - x) / width;
    const time = startTime + ((endTime - startTime) * percent);

    return Math.max(0, time);
  };

  const seek = event => {
    const time = getTimeFromEvent(event);

    if (startTime <= time && time <= endTime) {
      updateTime(time);
    }
  };

  const updatePreview = event => {
    setHoverTime(getTimeFromEvent(event));
  };

  const startResizing = () => {
    setResizing(true);
    pause();
  };

  const stopResizing = () => {
    setResizing(false);
    play();
  };

  const setStartTime = event => {
    updateStartTime(Number.parseFloat(event.target.value));
  };

  const setEndTime = event => {
    updateEndTime(Number.parseFloat(event.target.value));
  };

  const previewTime = resizing ? currentTime : hoverTime;
  const previewLabelTime = resizing ? currentTime : (startTime <= hoverTime && hoverTime <= endTime ? hoverTime - startTime : hoverTime);
  const previewDuration = resizing ? total : (startTime <= hoverTime && hoverTime <= endTime ? total : undefined);

  return (
    <div className="container" onMouseUp={seek} onMouseMove={updatePreview}>
      <div className="progress-bar-container">
        <div className="progress-bar">
          <progress ref={progress} max={total} value={current}/>
          <div className="preview">
            <Preview time={previewTime} labelTime={previewLabelTime} duration={previewDuration} hidePreview={resizing}/>
          </div>
          <input
            type="range"
            className="slider start"
            value={startTime}
            min={0}
            max={duration}
            step={0.00001}
            onChange={setStartTime}
            onMouseDown={startResizing}
            onMouseUp={stopResizing}/>
          <input
            type="range"
            className="slider end"
            value={endTime}
            min={0}
            max={duration}
            step={0.00001}
            onChange={setEndTime}
            onMouseDown={startResizing}
            onMouseUp={stopResizing}/>
        </div>
      </div>
      <style jsx>{`
            .container {
              flex: 1;
              display: flex;
              align-items: center;
              z-index: 25;
              overflow: visible;
              height: 50%;
            }

            .progress-bar-container {
              position: absolute;
              width: 100%;
              display: flex;
              bottom: 30px;
              left: 50%;
              transform: translateX(-50%);
              width: 60%;
              transition: all 0.12s ease-in-out;
            }

            .progress-bar {
              width: 100%;
              height: 4px;
              display: flex;
              background: rgba(255, 255, 255, 0.2);
              border-radius: 4px;
              position: relative;
            }

            progress {
              position: absolute;
              top: 0;
              width: ${total * 100 / duration}%;
              left: ${startTime * 100 / duration}%;
              -webkit-appearance: none;
              height: 4px;
              border-radius: 4px;
            }

            progress::-webkit-progress-bar {
              background-color: rgba(255, 255, 255, 0.4);
              border-radius: 4px;
            }

            progress::-webkit-progress-value {
              border-radius: 4px;
              background-image: linear-gradient(90deg, #9300ff 0%, #5272e2 49%, #05e6b5 98%);
              box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.1);
            }

            .slider {
              width: 100%;
              height: 4px;
              position: absolute;
              margin: 0;
              top: 0;
              -webkit-appearance: none;
              outline: none;
              background: transparent;
              pointer-events: none;
            }

            .slider::-ms-track {
              width: 100%;
              height: 0;
              border-color: transparent;
              color: transparent;
              background: transparent;
              pointer-events: none;
              z-index: -1;
            }

            .slider::-webkit-slider-thumb {
              width: 5px;
              height: 16px;
              background: #fff;
              border-radius: 2px;
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
              transition: all 0.16s ease-in-out;
              -webkit-appearance: none;
              pointer-events: auto;
              z-index: 20;
            }

            .preview {
              position: absolute;
              left: ${hoverTime * 100 / duration}%;
              transform: translateX(-50%);
              bottom: 20px;
              width: 132px;
              height: 88px;
              display: none;
            }

            .container:hover .preview {
              display: flex;
            }
        `}</style>
    </div>
  );
};

export default PlayBar;
