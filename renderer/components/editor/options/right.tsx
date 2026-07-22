import OptionsContainer from '../options-container';
import Select from './select';
import useConversionIdContext from 'hooks/editor/use-conversion-id';
import useEditorWindowState from 'hooks/editor/use-editor-window-state';
import VideoTimeContainer from '../video-time-container';
import VideoControlsContainer from '../video-controls-container';
import useExportDestinations from 'hooks/editor/use-export-destinations';
import VideoMetadataContainer from '../video-metadata-container';
import {hasExportEdits} from 'common/export-edits';

const FormatSelect = () => {
  const {formats, format, updateFormat} = OptionsContainer.useContainer();
  const options = formats.map(format => ({label: format.prettyFormat, value: format.format}));

  return <Select options={options} value={format} onChange={updateFormat}/>;
};

const DestinationSelect = () => {
  const {menuOptions, label, onChange} = useExportDestinations();
  return <Select options={menuOptions} customLabel={label} onChange={onChange}/>;
};

const ConvertButton = () => {
  const {startConversion} = useConversionIdContext();
  const options = OptionsContainer.useContainer();
  const {filePath} = useEditorWindowState();
  const {startTime, endTime} = VideoTimeContainer.useContainer();
  const {isMuted} = VideoControlsContainer.useContainer();
  const metadata = VideoMetadataContainer.useContainer();

  const onClick = () => {
    const hasEdits = hasExportEdits({
      width: options.width,
      height: options.height,
      fps: options.fps,
      startTime,
      endTime
    }, {
      width: metadata.width,
      height: metadata.height,
      fps: options.originalFps,
      duration: metadata.duration
    });
    startConversion({
      filePath,
      conversionOptions: {
        width: options.width,
        height: options.height,
        startTime,
        endTime,
        fps: options.fps,
        shouldMute: isMuted,
        shouldCrop: hasEdits,
        isUnedited: !hasEdits
      },
      format: options.format,
      destination: options.destination,
      app: options.app
    });
  };

  return (
    <button type="button" className="start-export" onClick={onClick}>
      Convert
      <style jsx>{`
        button {
          padding: 4px 8px;
          background: rgba(255, 255, 255, 0.1);
          font-size: 12px;
          line-height: 12px;
          color: white;
          height: 24px;
          border-radius: 4px;
          text-align: center;
          border: none;
          box-shadow: inset 0px 1px 0px 0px rgba(255, 255, 255, 0.04), 0px 1px 2px 0px rgba(0, 0, 0, 0.2);
        }

        button:hover,
        button:focus {
          background: hsla(0, 0%, 100%, 0.2);
          outline: none;
        }

        .start-export {
          width: 72px;
        }
      `}</style>
    </button>
  );
};

const RightOptions = () => {
  return (
    <div className="container">
      <div className="format"><FormatSelect/></div>
      <div className="destination"><DestinationSelect/></div>
      <ConvertButton/>
      <style jsx>{`
          .container {
            height: 100%;
            display: flex;
            align-items: center;
          }

          .label {
            font-size: 12px;
            margin-right: 8px;
            color: white;
          }

          .format {
            height: 24px;
            width: 112px;
            margin-right: 8px;
          }

          .destination {
            height: 24px;
            width: 128px;
            margin-right: 8px;
          }
        `}</style>
    </div>
  );
};

export default RightOptions;
