import Video from './video';
import LeftControls from './controls/left';
import RightControls from './controls/right';
import PlayBar from './controls/play-bar';

const VideoPlayer = () => {
  return (
    <div className="container">
      <Video/>
      <div className="video-controls">
        <div className="controls left"><LeftControls/></div>
        <div className="controls center"><PlayBar/></div>
        <div className="controls right"><RightControls/></div>
      </div>
      <style jsx>{`
        .container {
          flex: 1;
          display: flex;
          position: relative;
          background: #000;
        }

        .video-controls {
          position: absolute;
          width: 100%;
          height: 64px;
          bottom: -64px;
          left: 0;
          background-image: linear-gradient(-180deg,transparent,rgba(0, 0, 0, 0.4));
          padding: 16px 0;
          display: flex;
          align-items: center;
          transition: bottom 0.12s ease-in-out;
          -webkit-app-region: no-drag;
        }

        .left,
        .right {
          width: 20%;
        }

        .center {
          width: 60%;
          align-items: center;
        }

        .controls {
          height: 100%;
          display: flex;
        }
      `}</style>
    </div>
  );
};

export default VideoPlayer;
