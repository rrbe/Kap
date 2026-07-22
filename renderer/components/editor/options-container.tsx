import {useState, useEffect, useMemo} from 'react';
import {createContainer} from 'unstated-next';
import {debounce, DebouncedFunc} from 'lodash';

import VideoMetadataContainer from './video-metadata-container';
import VideoControlsContainer from './video-controls-container';
import useEditorOptions from 'hooks/editor/use-editor-options';
import {App, ExportDestination, Format} from 'common/types';
import useEditorWindowState from 'hooks/editor/use-editor-window-state';

type Destination = {
  destination: ExportDestination;
  app?: App;
};

const isFormatMuted = (format: Format) => ['gif', 'apng'].includes(format);
const canCopyFormat = (format: Format) => [Format.gif, Format.apng, Format.mp4].includes(format);

const useOptions = () => {
  const {fps: originalFps} = useEditorWindowState();
  const {
    state: {
      formats,
      fpsHistory
    },
    updateFpsUsage,
    isLoading
  } = useEditorOptions();

  const metadata = VideoMetadataContainer.useContainer();
  const {isMuted, mute, unmute} = VideoControlsContainer.useContainer();

  const [format, setFormat] = useState<Format>();
  const [fps, setFps] = useState<number>();
  const [width, setWidth] = useState<number>();
  const [height, setHeight] = useState<number>();
  const [destination, setDestination] = useState<ExportDestination>('save');
  const [app, setApp] = useState<App>();

  const [wasMuted, setWasMuted] = useState(false);

  const debouncedUpdateFpsUsage = useMemo(() => {
    if (!updateFpsUsage) {
      return;
    }

    return debounce(updateFpsUsage, 1000);
  }, [updateFpsUsage]);

  const updateFps = (newFps: number, formatName = format) => {
    setFps(newFps);
    debouncedUpdateFpsUsage?.({format: formatName, fps: newFps});
  };

  const updateDestination = (value: Destination) => {
    setDestination(value.destination);
    setApp(value.app);
  };

  const updateFormat = (formatName: Format) => {
    debouncedUpdateFpsUsage.flush();

    if (metadata.hasAudio) {
      if (isFormatMuted(formatName) && !isFormatMuted(format)) {
        setWasMuted(isMuted);
        mute();
      } else if (!isFormatMuted(formatName) && isFormatMuted(format) && !wasMuted) {
        unmute();
      }
    }

    const formatOption = formats.find(option => option.format === formatName);

    setFormat(formatName);
    if (destination === 'copy' && !canCopyFormat(formatName)) {
      setDestination('save');
    } else if (destination === 'open') {
      const selectedApp = formatOption?.apps.find(option => option.url === app?.url) ?? formatOption?.apps[0];
      if (selectedApp) {
        setApp(selectedApp);
      } else {
        setDestination('save');
        setApp(undefined);
      }
    }

    updateFps(Math.min(originalFps, fpsHistory[formatName]), formatName);
  };

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const firstFormat = formats[0];
    const formatName = firstFormat.format;

    setFormat(formatName);
    updateFps(Math.min(originalFps, fpsHistory[formatName]), formatName);
  }, [isLoading]);

  useEffect(() => {
    setWidth(metadata.width);
    setHeight(metadata.height);
  }, [metadata]);

  const setDimensions = (dimensions: {width: number; height: number}) => {
    setWidth(dimensions.width);
    setHeight(dimensions.height);
  };

  return {
    width,
    height,
    format,
    fps,
    originalFps,
    formats,
    destination,
    app,
    updateDestination,
    updateFps,
    updateFormat,
    setDimensions
  };
};

const OptionsContainer = createContainer(useOptions);

export default OptionsContainer;
